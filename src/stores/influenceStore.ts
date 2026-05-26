import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './gameStore.js'
import { useMarketStore } from './marketStore.js'
import { usePortfolioStore } from './portfolioStore.js'
import { round2 } from '@/utils/marketEngine.js'

export const useInfluenceStore = defineStore('influence', () => {
  // Heat: 0-100. Decays 1/day. At 60+ risk investigation. At 100 guaranteed.
  const heat = ref(0)
  const activeEffects = ref<any[]>([])
  const actionLog = ref<any[]>([])
  const investigationCooldown = ref(0)
  const tradingBanned = ref(false)
  const tradingBanUntil = ref(0)

  const heatLevel = computed(() => {
    if (heat.value >= 80) return { label: '🔥🔥🔥 Extreme', color: '#dc2626', risk: 0.8 }
    if (heat.value >= 60) return { label: '🔥🔥 High', color: '#f55753', risk: 0.4 }
    if (heat.value >= 30) return { label: '🔥 Moderate', color: '#e8b32d', risk: 0.1 }
    return { label: '❄️ Low', color: '#6b7d95', risk: 0 }
  })

  // --- Action definitions ---
  const ACTIONS = {
    insider_info: {
      name: 'Buy Insider Information',
      icon: '🕵️',
      desc: 'Receive a tip about an upcoming company event. 70-90% accuracy depending on price.',
      costRange: [5000, 50000],
      heatRange: [15, 30],
      requiresCompany: true
    },
    short_attack: {
      name: 'Hire Short Attackers',
      icon: '🐻',
      desc: 'Pay a group to aggressively short a company, driving its price down 2-8% over time.',
      costRange: [10000, 100000],
      heatRange: [20, 40],
      requiresCompany: true
    },
    pump_and_dump: {
      name: 'Pump & Dump Campaign',
      icon: '📢',
      desc: 'Launch a social media campaign to hype a stock. Temporary 5-15% boost that fades.',
      costRange: [5000, 50000],
      heatRange: [25, 50],
      requiresCompany: true
    },
    bribe_analyst: {
      name: 'Bribe an Analyst',
      icon: '💵',
      desc: 'Pay for a favorable upgrade on a company you hold shares in.',
      costRange: [15000, 15000],
      heatRange: [20, 35],
      requiresCompany: true,
      requiresHolding: true
    },
    false_rumors: {
      name: 'Spread False Rumors',
      icon: '🗣️',
      desc: 'Plant negative rumors about a competitor to drive their price down.',
      costRange: [3000, 20000],
      heatRange: [15, 40],
      requiresCompany: true
    },
    lobby: {
      name: 'Lobby Politician',
      icon: '🏛️',
      desc: 'Influence regulation to help an entire sector for 5-10 days.',
      costRange: [25000, 100000],
      heatRange: [10, 20],
      requiresCompany: true
    },
    media_blitz: {
      name: 'Media Blitz',
      icon: '📺',
      desc: 'Pay for positive media coverage. Boosts a stock 3-6% over several days.',
      costRange: [10000, 50000],
      heatRange: [15, 25],
      requiresCompany: true
    },
    sabotage: {
      name: 'Corporate Sabotage',
      icon: '💣',
      desc: 'High-risk operation to damage a competitor. Can cause 10-25% drop but generates extreme heat.',
      costRange: [50000, 200000],
      heatRange: [40, 70],
      requiresCompany: true
    }
  }

  function getActions() {
    return Object.entries(ACTIONS).map(([key, val]) => ({ key, ...val }))
  }

  /** Execute an influence action */
  function executeAction(actionKey, companyId, spendAmount) {
    const game = useGameStore()
    const market = useMarketStore()
    const def = ACTIONS[actionKey]
    if (!def) return { ok: false, msg: 'Unknown action' }
    if (tradingBanned.value) return { ok: false, msg: 'Cannot influence while under trading ban!' }

    const stock = market.getStock(companyId)
    if (!stock && def.requiresCompany) return { ok: false, msg: 'Invalid company' }

    if (def.requiresHolding) {
      const pf = usePortfolioStore()
      if (!pf.holdings[companyId]) return { ok: false, msg: 'You must hold shares in this company' }
    }

    if (game.cash < spendAmount) return { ok: false, msg: 'Not enough cash!' }

    // Deduct cost
    game.removeCash(spendAmount)

    // Calculate heat (proportional to spend within the range)
    const costRatio = (spendAmount - def.costRange[0]) / (def.costRange[1] - def.costRange[0])
    const heatGain = Math.floor(def.heatRange[0] + (def.heatRange[1] - def.heatRange[0]) * costRatio)
    heat.value = Math.min(100, heat.value + heatGain)

    // Apply effects based on action type
    let effectDesc = ''
    const companyName = stock ? stock.name : companyId

    switch (actionKey) {
      case 'insider_info': {
        const upcoming = getUpcomingEvents(companyId)
        const accuracy = 0.7 + costRatio * 0.2 // 70-90% accurate

        if (upcoming.length > 0) {
          effectDesc = `Tip: ${companyName} may have ${upcoming.join(', ')} coming up. (${(accuracy*100).toFixed(0)}% reliable)`
        } else {
          // Generate a useful tip based on fundamentals and market conditions
          effectDesc = generateSmartTip(stock, companyId, costRatio)
        }
        break
      }
      case 'short_attack': {
        const drop = 0.02 + costRatio * 0.06 // 2-8% drop
        stock.currentPrice = round2(Math.max(0.01, stock.currentPrice * (1 - drop)))
        activeEffects.value.push({
          id: Date.now(), type: 'short_attack', companyId,
          remaining: 20 + Math.floor(costRatio * 40), // 20-60 ticks
          effect: { driftPenalty: -0.001 * (1 + costRatio) }
        })
        effectDesc = `${companyName} price dropped ${(drop*100).toFixed(1)}% — short pressure continues.`
        break
      }
      case 'pump_and_dump': {
        const boost = 0.05 + costRatio * 0.10 // 5-15% boost
        stock.currentPrice = round2(stock.currentPrice * (1 + boost))
        activeEffects.value.push({
          id: Date.now(), type: 'pump_and_dump', companyId,
          remaining: 15 + Math.floor(costRatio * 20), // 15-35 ticks
          effect: { driftBonus: 0.002 * (1 + costRatio), fadeRate: 0.0003 }
        })
        effectDesc = `${companyName} pumped ${(boost*100).toFixed(1)}% — hype will fade.`
        break
      }
      case 'bribe_analyst': {
        // Immediate upgrade effect
        stock.currentPrice = round2(stock.currentPrice * 1.03)
        market.newsFeed.unshift({
          id: 'influence-' + Date.now(), companyId, companyName: stock.name,
          sector: stock.sector, headline: `${stock.name} receives analyst upgrade — target raised.`,
          eventIcon: '⭐', eventLabel: 'Analyst Upgrade', category: 'analyst',
          impact: 0.03, day: game.day, isResult: true, published: true
        })
        effectDesc = `${companyName} upgraded by analyst (+3%).`
        break
      }
      case 'false_rumors': {
        const drop = 0.03 + costRatio * 0.07 // 3-10% drop
        stock.currentPrice = round2(Math.max(0.01, stock.currentPrice * (1 - drop)))
        activeEffects.value.push({
          id: Date.now(), type: 'false_rumors', companyId,
          remaining: 10 + Math.floor(costRatio * 25),
          effect: { driftPenalty: -0.0008 * (1 + costRatio) }
        })
        effectDesc = `${companyName} dropped ${(drop*100).toFixed(1)}% on rumors.`
        break
      }
      case 'lobby': {
        const sector = stock.sector
        // Boost all companies in the same sector
        for (const [id, s] of Object.entries(market.stocks)) {
          if (s.sector === sector) {
            s.currentPrice = round2(s.currentPrice * 1.02)
          }
        }
        activeEffects.value.push({
          id: Date.now(), type: 'lobby', companyId,
          remaining: 60 + Math.floor(costRatio * 80),
          effect: { sectorBoost: 0.0005, sector }
        })
        effectDesc = `Lobbied for ${sector} sector — all ${sector} stocks +2%.`
        break
      }
      case 'media_blitz': {
        const boost = 0.03 + costRatio * 0.03
        stock.currentPrice = round2(stock.currentPrice * (1 + boost))
        activeEffects.value.push({
          id: Date.now(), type: 'media_blitz', companyId,
          remaining: 30 + Math.floor(costRatio * 40),
          effect: { driftBonus: 0.001 * (1 + costRatio) }
        })
        effectDesc = `${companyName} getting positive media coverage (+${(boost*100).toFixed(1)}%).`
        break
      }
      case 'sabotage': {
        const drop = 0.10 + costRatio * 0.15
        stock.currentPrice = round2(Math.max(0.01, stock.currentPrice * (1 - drop)))
        effectDesc = `${companyName} devastated by sabotage (-${(drop*100).toFixed(1)}%)!`
        break
      }
      default:
        effectDesc = 'Action executed.'
    }

    // Log
    actionLog.value.unshift({
      time: game.day, timeStr: `Day ${game.day}`,
      action: def.name, icon: def.icon,
      company: companyName, cost: spendAmount, heat: heatGain,
      result: effectDesc
    })
    if (actionLog.value.length > 50) actionLog.value.pop()

    game.addNotification(`${def.icon} ${def.name}: ${effectDesc} (Heat +${heatGain})`, 'warning')

    // Check for investigation
    checkInvestigation()

    return { ok: true, msg: effectDesc, heat: heatGain }
  }

  /** Check if player's recent trades look suspicious given a price event */
  function checkSuspiciousTrade(companyId, priceChangePct, eventDay) {
    const pf = usePortfolioStore()
    const game = useGameStore()
    const market = useMarketStore()
    const stock = market.getStock(companyId)
    if (!stock || Math.abs(priceChangePct) < 3) return // Only flag moves >3%

    const lookbackDays = 5
    let suspiciousProfit = 0
    const suspiciousTrades = []

    for (const tx of pf.transactions) {
      // Try to determine the day of the transaction
      let txDay = game.day
      if (tx.day) txDay = tx.day
      else if (tx.time) {
        const m = tx.time.match(/Day (\d+)/)
        if (m) txDay = parseInt(m[1])
      }
      if (txDay < eventDay - lookbackDays || txDay > eventDay) continue
      if (tx.companyId !== companyId) continue

      const shares = tx.shares || 0
      const txPrice = tx.price || 0
      const curPrice = stock.currentPrice

      // Buy before big positive move
      if ((tx.type === 'buy' || tx.type === 'limit_buy') && priceChangePct > 3) {
        const profit = round2(shares * curPrice - shares * txPrice)
        if (profit > 500) {
          suspiciousProfit += profit
          suspiciousTrades.push(`Bought ${shares} shares ${eventDay - txDay}d before +${priceChangePct.toFixed(1)}% move`)
        }
      }
      // Short before big negative move
      if (tx.type === 'short_sell' && priceChangePct < -3) {
        const profit = round2(shares * txPrice - shares * curPrice)
        if (profit > 500) {
          suspiciousProfit += profit
          suspiciousTrades.push(`Shorted ${shares} shares ${eventDay - txDay}d before ${priceChangePct.toFixed(1)}% drop`)
        }
      }
      // Sell right before big negative move
      if ((tx.type === 'sell' || tx.type === 'limit_sell') && priceChangePct < -3) {
        const avoided = round2(shares * txPrice - shares * curPrice)
        if (avoided > 500) {
          suspiciousProfit += avoided
          suspiciousTrades.push(`Sold ${shares} shares ${eventDay - txDay}d before ${priceChangePct.toFixed(1)}% drop`)
        }
      }
    }

    if (suspiciousTrades.length > 0 && suspiciousProfit > 1000) {
      const heatGain = Math.min(35, Math.floor(suspiciousProfit / 5000) + 5 * suspiciousTrades.length)
      heat.value = Math.min(100, heat.value + heatGain)

      game.addNotification(
        `🔍 SUS activity on ${stock.name}: ${suspiciousTrades[0]}. Heat +${heatGain}`,
        'warning'
      )
      actionLog.value.unshift({
        time: game.day, timeStr: `Day ${game.day}`,
        action: 'Suspicious Trading', icon: '🔍',
        company: stock.name, cost: 0, heat: heatGain,
        result: `${suspiciousTrades[0]} — $${suspiciousProfit.toLocaleString()} profit raised flags.`
      })
      checkInvestigation()
    }
  }

  function generateSmartTip(stock, companyId, costRatio) {
    const game = useGameStore()
    const accuracy = 0.7 + costRatio * 0.2
    const reliability = `(${(accuracy * 100).toFixed(0)}% reliable)`
    const name = stock.name

    // Check various signals
    const tips = []

    // 1. Sentiment-based tip
    if (stock.sentiment === 'bullish') {
      tips.push(`Insiders are accumulating ${name} — strong buy signal from executives. ${reliability}`)
    } else if (stock.sentiment === 'bearish') {
      tips.push(`Multiple executives at ${name} have been selling shares recently. Consider reducing exposure. ${reliability}`)
    }

    // 2. Fundamental analysis
    if (stock.profitMargin > 0.20) {
      tips.push(`${name} has exceptional profit margins (${(stock.profitMargin*100).toFixed(0)}%) — well above industry average. Strong moat detected. ${reliability}`)
    } else if (stock.profitMargin < 0) {
      tips.push(`${name} is burning cash — profit margins are negative. Unless a turnaround is imminent, this is risky. ${reliability}`)
    }

    // 3. Debt warning
    if (stock.debtToEquity > 2) {
      tips.push(`⚠️ ${name} carries dangerously high debt (D/E: ${stock.debtToEquity.toFixed(1)}). Rising rates could crush them. ${reliability}`)
    } else if (stock.debtToEquity < 0.3) {
      tips.push(`${name} has a pristine balance sheet (D/E: ${stock.debtToEquity.toFixed(1)}) — nearly debt-free. Safe haven potential. ${reliability}`)
    }

    // 4. Valuation
    const market = useMarketStore()
    const pe = market.getPE(companyId)
    if (pe !== null && pe > 50) {
      tips.push(`${name} trades at a frothy P/E of ${pe} — priced for perfection. Any earnings miss could be devastating. ${reliability}`)
    } else if (pe !== null && pe < 12 && pe > 0) {
      tips.push(`${name} is deeply undervalued at P/E ${pe} — potential value play if earnings hold. ${reliability}`)
    }

    // 5. Price momentum
    const hist = stock.priceHistory
    if (hist.length > 20) {
      const recent = hist.slice(-20)
      const start = recent[0].price
      const end = recent[recent.length - 1].price
      const change = ((end - start) / start) * 100
      if (change > 8) {
        tips.push(`${name} is up ${change.toFixed(1)}% recently — momentum is strong but watch for profit-taking. ${reliability}`)
      } else if (change < -8) {
        tips.push(`${name} is down ${Math.abs(change).toFixed(1)}% — could be oversold. Contrarian opportunity? ${reliability}`)
      } else if (Math.abs(change) < 1) {
        tips.push(`${name} has been trading flat — a breakout may be coming. Watch for catalysts. ${reliability}`)
      }
    }

    // 6. Sector context
    const sectorStocks = Object.values(market.stocks).filter(s => s.sector === stock.sector && s.id !== companyId)
    if (sectorStocks.length > 0) {
      const avgChange = sectorStocks.reduce((sum, s) => {
        const sh = s.priceHistory
        if (sh.length < 20) return sum
        return sum + ((s.currentPrice - sh[sh.length - 20].price) / sh[sh.length - 20].price) * 100
      }, 0) / sectorStocks.length
      if (avgChange > 5) {
        tips.push(`The entire ${stock.sector} sector is rallying — ${name} may benefit from sector momentum. ${reliability}`)
      } else if (avgChange < -5) {
        tips.push(`The ${stock.sector} sector is under pressure — even strong companies like ${name} may face headwinds. ${reliability}`)
      }
    }

    // 7. World event context
    if (market.activeWorldEvent) {
      const we = market.activeWorldEvent
      const fx = we.effects?.find(e => e.sector === stock.sector)
      if (fx) {
        const dir = fx.impact >= 0 ? 'positive' : 'negative'
        tips.push(`🌍 The ongoing "${we.name}" is creating ${dir} pressure on ${stock.sector} stocks. ${reliability}`)
      }
    }

    // Pick 1-3 tips based on spend
    const numTips = 1 + Math.floor(costRatio * 2) // 1-3 tips
    const shuffled = tips.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, numTips).join(' | ')
  }

  function getUpcomingEvents(companyId) {
    const market = useMarketStore()
    const game = useGameStore()
    const events = []
    for (let d = game.day + 1; d <= game.day + 20; d++) {
      const dayEvts = market.eventCalendar[d]
      if (!dayEvts) continue
      for (const evt of dayEvts) {
        if (evt.companyId === companyId) {
          events.push(evt.eventType.replace(/([A-Z])/g, ' $1').toLowerCase().trim())
        }
      }
    }
    return [...new Set(events)]
  }

  function checkInvestigation() {
    const game = useGameStore()
    if (investigationCooldown.value > 0) return

    const risk = heatLevel.value.risk
    if (Math.random() < risk) {
      investigationCooldown.value = 30 // 30 day cooldown
      const roll = Math.random()
      
      if (heat.value >= 100 || roll < 0.1) {
        // SEC Lawsuit - game over risk
        const fine = Math.floor(Math.random() * 500000) + 100000
        if (game.cash >= fine) {
          game.removeCash(fine)
          game.addNotification(`⚖️ SEC Investigation! Fined $${fine.toLocaleString()} for market manipulation. Heat reduced.`, 'error')
        } else {
          game.gameOver = true
          game.gameOverReason = 'SEC Lawsuit — convicted of market manipulation. Your trading empire collapses.'
          game.isRunning = false
          game.addNotification('⚖️ SEC Lawsuit — Game Over!', 'error')
          return
        }
        heat.value = Math.max(0, heat.value - 50)
      } else if (roll < 0.4) {
        // Trading ban
        const banDays = 1 + Math.floor(Math.random() * 3)
        tradingBanned.value = true
        tradingBanUntil.value = game.day + banDays
        game.addNotification(`🚫 Investigated! Trading banned for ${banDays} day(s). Heat reduced.`, 'error')
        heat.value = Math.max(0, heat.value - 30)
      } else {
        // Warning
        game.addNotification('⚠️ SEC inquiry — you\'re on their radar. Heat reduced slightly.', 'warning')
        heat.value = Math.max(0, heat.value - 15)
      }
    }
  }

  /** Called each tick to decay heat and process effects */
  function tick() {
    const game = useGameStore()
    const market = useMarketStore()

    // Decay heat 1 point per day
    if (game.tick === 0 && heat.value > 0) {
      heat.value = Math.max(0, heat.value - 1)
    }

    // Check trading ban expiry
    if (tradingBanned.value && game.day >= tradingBanUntil.value) {
      tradingBanned.value = false
      game.addNotification('✅ Trading ban lifted — you can trade again.', 'success')
    }

    // Investigation cooldown
    if (investigationCooldown.value > 0 && game.tick === 0) {
      investigationCooldown.value--
    }

    // Process active effects
    for (let i = activeEffects.value.length - 1; i >= 0; i--) {
      const fx = activeEffects.value[i]
      fx.remaining--
      if (fx.remaining <= 0) {
        activeEffects.value.splice(i, 1)
        continue
      }

      const stock = market.getStock(fx.companyId)
      if (!stock) continue

      if (fx.effect.driftBonus) {
        stock.currentPrice = round2(stock.currentPrice * (1 + fx.effect.driftBonus))
        if (fx.effect.fadeRate) fx.effect.driftBonus = Math.max(0, fx.effect.driftBonus - fx.effect.fadeRate)
      }
      if (fx.effect.driftPenalty) {
        stock.currentPrice = round2(Math.max(0.01, stock.currentPrice * (1 + fx.effect.driftPenalty)))
      }
      if (fx.effect.sectorBoost) {
        for (const [id, s] of Object.entries(market.stocks)) {
          if (s.sector === fx.effect.sector && id !== fx.companyId) {
            s.currentPrice = round2(s.currentPrice * (1 + fx.effect.sectorBoost * 0.5))
          }
        }
      }
    }
  }

  // Save/Load
  function getSaveState() {
    return {
      heat: heat.value,
      activeEffects: JSON.parse(JSON.stringify(activeEffects.value)),
      actionLog: actionLog.value.slice(0, 50),
      investigationCooldown: investigationCooldown.value,
      tradingBanned: tradingBanned.value,
      tradingBanUntil: tradingBanUntil.value
    }
  }

  function loadSaveState(state) {
    if (!state) return
    heat.value = state.heat || 0
    activeEffects.value = state.activeEffects || []
    actionLog.value = state.actionLog || []
    investigationCooldown.value = state.investigationCooldown || 0
    tradingBanned.value = state.tradingBanned || false
    tradingBanUntil.value = state.tradingBanUntil || 0
  }

  function resetInfluence() {
    heat.value = 0
    activeEffects.value = []
    actionLog.value = []
    investigationCooldown.value = 0
    tradingBanned.value = false
    tradingBanUntil.value = 0
  }

  return {
    heat, heatLevel, activeEffects, actionLog, tradingBanned, tradingBanUntil,
    getActions, executeAction, tick, getUpcomingEvents, checkSuspiciousTrade,
    getSaveState, loadSaveState, resetInfluence
  }
})
