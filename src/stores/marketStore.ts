import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initializeMarket, tickPrice, checkMarketEvent, recordDailySnapshot, round2 } from '@/utils/marketEngine.js'
import { buildFullCalendar, generateNewsHint, generateEventResult, EVENT_DEFS } from '@/utils/eventEngine.js'
import { pickWorldEvent, applyWorldEvent, resetWorldEvents } from '@/utils/worldEvents.js'
import { REGIONS } from '@/data/companies.js'
import { generateCompanies, generateIndexes, generateCommodities } from '@/utils/companyGenerator.js'
import { seedRng } from '@/utils/seededRng.js'
import { simulateHistory } from '@/utils/simulationEngine.js'
import { useGameStore } from './gameStore.js'
import { useCurrencyStore } from './currencyStore.js'
import { usePortfolioStore } from './portfolioStore.js'
import { useInfluenceStore } from './influenceStore.js'
import type { StockState, CompanyDefinition, IndexDefinition, GameConfig, NewsArticle, EventLogEntry, ScheduledEvent, WorldEvent } from '@/types'

export const useMarketStore = defineStore('market', () => {
  const stocks = ref<Record<string, StockState>>({})
  const initialized = ref(false)
  // Track shares in circulation (bought by player, not insiders)
  const sharesInCirculation = ref<Record<string, number>>({})
  const highlightStockId = ref<string | null>(null)
  const eventCalendar = ref<Record<string, ScheduledEvent[]>>({})
  const activeCompanyEvents = ref<Record<string, any>>({})
  const newsFeed = ref<NewsArticle[]>([])
  const activeWorldEvent = ref<WorldEvent | null>(null)
  let nextWorldEventDay = 30 + Math.floor(Math.random() * 30)
  const eventLog = ref<EventLogEntry[]>([])

  function addEventLogEntry(entry: EventLogEntry) {
    eventLog.value.push({ ...entry, id: Date.now() + Math.random() })
    if (eventLog.value.length > 2000) {
      eventLog.value = eventLog.value.slice(-1500)
    }
  }

  // Pre-computed benchmark history: { day, price } for cap-weighted benchmark
  const benchmarkHistory = ref<{ day: number; price: number }[]>([])

  const activeIndexes = ref<IndexDefinition[]>([])
  const activeCompanies = ref([])

  async function init(seed: number | null = null, config: Partial<GameConfig> = {}, onProgress: Function | null = null) {
    if (!initialized.value) {
      if (seed !== null) seedRng(seed)
      const regionKey = config.region || 'americas'
      const companyCount = config.minCompanies || 50

      const generated = generateCompanies(companyCount, regionKey, config)
      const commodities = generateCommodities()
      activeCompanies.value = [...generated, ...commodities]
      activeIndexes.value = generateIndexes(config.indexCount || 8)

      if (seed !== null) {
        onProgress?.('Generating company roster...', 5)

        const simResult = await simulateHistory(
          [...generated, ...commodities],
          1970,
          new Date(),
          config,
          (msg, pct) => onProgress?.(msg, 5 + Math.round(pct * 0.9)),
          (entry) => addEventLogEntry(entry)
        )

        onProgress?.('Building market state...', 96)

        // Use allCompanies from simulation (includes IPO replacements)
        const allCos = simResult.allCompanies || [...generated, ...commodities]
        activeCompanies.value = allCos

        stocks.value = initializeMarket(allCos, simResult)
        for (const c of allCos) {
          sharesInCirculation.value[c.id] = 0
        }
        eventCalendar.value = buildFullCalendar(allCos)
        initialized.value = true

        // Seed benchmark history from pre-generated daily data
        seedBenchmarkHistory()

        onProgress?.('Market ready!', 100)
      } else {
        stocks.value = initializeMarket([...generated, ...commodities], null)
        for (const c of [...generated, ...commodities]) {
          sharesInCirculation.value[c.id] = 0
        }
        eventCalendar.value = buildFullCalendar([...generated, ...commodities])
        initialized.value = true
      }
    }
  }

  const stockList = computed(() => {
    const currency = useCurrencyStore()
    const regionKey = currency.activeRegionKey
    return Object.values(stocks.value).filter(s =>
      s.region && s.region.includes(regionKey) && !s.bankrupt
    )
  })

  /** All stocks unfiltered (for save/load) */
  const allStocks = computed(() => Object.values(stocks.value))

  const sectors = computed(() => {
    const s = new Set()
    for (const c of activeCompanies.value) {
      if (!stocks.value[c.id]?.bankrupt) s.add(c.sector)
    }
    return [...s]
  })

  function getStock(id) {
    return stocks.value[id] || null
  }

  /** Get ticker symbol for a company or index */
  function ticker(id) {
    const s = stocks.value[id]
    if (s) return s.ticker || id.toUpperCase()
    // Check indexes
    const idx = activeIndexes.value.find(i => i.id === id)
    return idx?.ticker || id.toUpperCase()
  }

  /** Float shares = outstanding - restricted (20% insider) - in circulation */
  function getAvailableFloat(companyId) {
    const stock = stocks.value[companyId]
    if (!stock) return 0
    // Commodities don't have shares — effectively unlimited supply
    if (stock.type === 'commodity') return 1e12
    const outstanding = stock.outstandingShares || 0
    const restricted = Math.floor(outstanding * 0.2)
    const inCirc = sharesInCirculation.value[companyId] || 0
    return Math.max(0, outstanding - restricted - inCirc)
  }

  function getMarketCap(companyId) {
    const stock = stocks.value[companyId]
    if (!stock) return 0
    return round2(stock.currentPrice * (stock.outstandingShares || 0))
  }

  /** Dynamic P/E ratio: price / EPS. EPS = (revenue × profitMargin) / outstandingShares */
  function getPE(companyId) {
    const stock = stocks.value[companyId]
    if (!stock) return null
    const eps = stock.outstandingShares > 0
      ? (stock.revenue * 1e9 * (stock.profitMargin || 0)) / stock.outstandingShares
      : 0
    return eps > 0 ? round2(stock.currentPrice / eps) : null
  }

  function getEPS(companyId) {
    const stock = stocks.value[companyId]
    if (!stock || !stock.outstandingShares) return 0
    return round2((stock.revenue * 1e9 * (stock.profitMargin || 0)) / stock.outstandingShares)
  }

  /** Multi-timeframe % changes: 1h (12 ticks), 1d, 7d, 28d */
  function getPriceChange(companyId) {
    const stock = stocks.value[companyId]
    if (!stock) return { h1: 0, d1: 0, d7: 0, d28: 0 }
    const cur = stock.currentPrice

    // 1 hour = 12 ticks back in priceHistory
    let h1 = 0
    const hist = stock.priceHistory
    if (hist.length > 12) {
      const old = hist[hist.length - 13].price
      if (old > 0) h1 = round2(((cur - old) / old) * 100)
    }

    // Daily/weekly/monthly from historicalDaily (daily closes)
    const daily = stock.historicalDaily || []
    let d1 = 0, d7 = 0, d28 = 0
    if (daily.length > 1 && daily[daily.length - 2].close !== null) {
      const prev = daily[daily.length - 2].close
      if (prev > 0) d1 = round2(((cur - prev) / prev) * 100)
    }
    if (daily.length > 7 && daily[daily.length - 7].close !== null) {
      const prev7 = daily[daily.length - 7].close
      if (prev7 > 0) d7 = round2(((cur - prev7) / prev7) * 100)
    }
    if (daily.length > 28 && daily[daily.length - 28].close !== null) {
      const prev28 = daily[daily.length - 28].close
      if (prev28 > 0) d28 = round2(((cur - prev28) / prev28) * 100)
    }

    return { h1, d1, d7, d28 }
  }

  /** Pay dividends to shareholders of this company */
  function processDividends(company, currentDay) {
    const portfolioStore = usePortfolioStore()
    const gameStore = useGameStore()
    // Dividend yield: 0.5%–3% of stock price based on profit margin
    const yieldPct = Math.min(0.03, Math.max(0.005, (company.profitMargin || 0.05) * 0.06))
    const divPerShare = round2(company.currentPrice * yieldPct)

    // Pay to long holders
    const longHolding = portfolioStore.holdings[company.id]
    if (longHolding && longHolding.shares > 0) {
      const payout = round2(divPerShare * longHolding.shares)
      gameStore.addCash(payout)
      gameStore.addNotification(
        `💰 Dividend from ${company.name}: ${divPerShare}/share × ${longHolding.shares} = $${payout} (${(yieldPct*100).toFixed(1)}% yield)`,
        'success'
      )
    }

    // Short sellers PAY the dividend
    const shortPos = portfolioStore.shorts[company.id]
    if (shortPos && shortPos.shares > 0) {
      const cost = round2(divPerShare * shortPos.shares)
      if (gameStore.cash >= cost) {
        gameStore.removeCash(cost)
        gameStore.addNotification(
          `💸 Dividend payment on short: ${company.name} ${divPerShare}/share × ${shortPos.shares} = -$${cost}`,
          'warning'
        )
      }
    }
  }

  /** Get the bid/ask spread for a stock (based on volatility) */
  function getSpread(companyId) {
    const stock = stocks.value[companyId]
    if (!stock) return 0.001 // 0.1% default
    // More volatile stocks have wider spreads: 0.05%–0.5%
    return round2(Math.min(0.005, Math.max(0.0005, stock.volatility * 0.1)))
  }

  /** Get the commission for a trade. Returns { fee, rate } */
  function getCommission(tradeValue) {
    const rate = 0.001 // 0.1% commission
    const fee = round2(Math.max(1, tradeValue * rate)) // $1 minimum
    return { fee, rate }
  }

  function addSharesInCirculation(companyId, shares) {
    if (!sharesInCirculation.value[companyId]) {
      sharesInCirculation.value[companyId] = 0
    }
    sharesInCirculation.value[companyId] += shares
  }

  function removeSharesInCirculation(companyId, shares) {
    if (!sharesInCirculation.value[companyId]) {
      sharesInCirculation.value[companyId] = 0
    }
    sharesInCirculation.value[companyId] = Math.max(0, sharesInCirculation.value[companyId] - shares)
  }

  /**
   * Calculate market impact: how much a trade of this size moves the price.
   * Uses a square-root model: small trades negligible, large trades significant.
   * Returns impact as a decimal (e.g., 0.015 = 1.5% price move).
   */
  function calculateMarketImpact(companyId, shares) {
    const stock = stocks.value[companyId]
    if (!stock) return 0
    const outstanding = stock.outstandingShares || 1
    const floatFraction = shares / outstanding
    // Square-root curve: 0.1% of outstanding = ~1.6% impact, 1% = ~5%, 5% = ~11%
    return round2(Math.pow(floatFraction, 0.7) * 0.5)
  }

  /**
   * Apply market impact directly to a stock's price.
   * Positive impact for buys (pushes price up), negative for sells.
   */
  function applyMarketImpact(companyId, impact) {
    const stock = stocks.value[companyId]
    if (!stock || impact === 0) return
    const newPrice = round2(Math.max(0.01, stock.currentPrice * (1 + impact)))
    const gameStore = useGameStore()
    stock.currentPrice = newPrice
    // Also push to priceHistory so the chart reflects it
    stock.priceHistory.push({
      time: gameStore.day * 1000 + gameStore.tick,
      price: newPrice
    })
    if (stock.priceHistory.length > 200) stock.priceHistory.shift()
  }

  let prevDay = 1

  /** Process scheduled events for the current day */
  function processDayEvents(currentDay) {
    const dayEvents = eventCalendar.value[currentDay]
    if (!dayEvents) return

    for (const evt of dayEvents) {
      const company = stocks.value[evt.companyId]
      if (!company) continue

      const def = EVENT_DEFS[evt.eventType]
      if (!def) continue

      // Apply price impact
      const impact = def.priceImpact * (0.5 + Math.random())
      const newPrice = round2(Math.max(0.01, company.currentPrice * (1 + impact)))
      const pctChange = round2((newPrice - company.currentPrice) / company.currentPrice * 100)
      company.currentPrice = newPrice

      // Check for suspicious trading timing
      const influenceStore = useInfluenceStore()
      influenceStore.checkSuspiciousTrade(evt.companyId, pctChange, currentDay)

      // Publish result article
      const result = generateEventResult(evt.eventType, company, impact)
      result.day = currentDay
      result.published = true
      newsFeed.value.unshift(result)

      const gameStore = useGameStore()
      gameStore.addNotification(
        `${def.icon} ${company.name}: ${def.label}! Stock ${impact >= 0 ? 'up' : 'down'} ${Math.abs(impact * 100).toFixed(1)}%`,
        impact >= 0 ? 'success' : 'warning'
      )

      // Update sentiment based on event
      if (impact > 0.03) company.sentiment = 'bullish'
      else if (impact < -0.03) company.sentiment = 'bearish'

      // Buyback: reduce outstanding shares by 2-5%
      if (evt.eventType === 'buyback') {
        const buybackPct = 0.02 + Math.random() * 0.03
        const reduced = Math.floor(company.outstandingShares * (1 - buybackPct))
        company.outstandingShares = Math.max(1000000, reduced)
        gameStore.addNotification(
          `💎 ${company.name} bought back ${(buybackPct * 100).toFixed(1)}% of shares — outstanding now ${((company.outstandingShares) / 1e9).toFixed(1)}B`,
          'success'
        )
      }

      // Pay dividends on earnings events for profitable companies
      if ((evt.eventType === 'earningsBeat' || evt.eventType === 'earningsMiss') && company.profitMargin > 0) {
        processDividends(company, currentDay)
      }
    }
  }

  /** Generate hint articles for upcoming events */
  function generateUpcomingHints(currentDay) {
    // Check next 15 days for upcoming events
    for (let d = currentDay + 1; d <= currentDay + 15; d++) {
      const dayEvents = eventCalendar.value[d]
      if (!dayEvents) continue
      for (const evt of dayEvents) {
        const company = stocks.value[evt.companyId]
        if (!company) continue
        const daysUntil = d - currentDay
        // Generate hints at 10, 5, and 1 days before
        if (daysUntil === 10 || daysUntil === 5 || daysUntil === 1) {
          const hint = generateNewsHint(evt.eventType, company, daysUntil)
          hint.day = currentDay
          hint.published = true
          newsFeed.value.unshift(hint)
        }
      }
    }
  }

  /** Charge expense ratios on index ETF holdings each trading day */
  function chargeExpenseRatios(currentDay: number) {
    const portfolioStore = usePortfolioStore()
    const gameStore = useGameStore()
    for (const [indexId, holding] of Object.entries(portfolioStore.indexHoldings)) {
      const idx = activeIndexes.value.find((i: IndexDefinition) => i.id === indexId)
      if (!idx || !holding.shares || holding.shares <= 0) continue
      const expenseRatio = idx.expenseRatio || 0.001
      const dailyRate = expenseRatio / 252
      const value = getIndexValue(indexId) * holding.shares
      const fee = round2(value * dailyRate)
      if (fee < 0.01) continue
      // Deduct from cash — if player can't pay, sell shares to cover
      if (gameStore.cash >= fee) {
        gameStore.removeCash(fee)
      } else {
        // Sell enough shares to cover the fee
        const sharesToSell = Math.ceil(fee / getIndexValue(indexId))
        if (sharesToSell < holding.shares) {
          portfolioStore.sellIndexSilent(indexId, sharesToSell)
          gameStore.addNotification(`📊 Auto-sold ${sharesToSell} ${idx.ticker} shares to cover expense ratio fee`, 'warning')
        }
      }
    }
  }

  function tickAll() {
    const gameStore = useGameStore()
    if (!gameStore.isRunning) return

    // Check pending orders each tick
    usePortfolioStore().checkOrders()
    // Process influence effects each tick
    useInfluenceStore().tick()

    const event = checkMarketEvent()
    if (event) {
      gameStore.setMarketEvent(event)
      gameStore.addNotification(event.name, event.type === 'crash' ? 'error' : 'warning')
    }

    // --- Day rollover ---
    if (gameStore.day > prevDay) {
      // 1. Snapshot yesterday's volume, then record daily bar + reset OHLC
      for (const id of Object.keys(stocks.value)) {
        const s = stocks.value[id]
        if (s._dailyVolume > 0) {
          if (!s.volumeHistory) s.volumeHistory = []
          s.volumeHistory.push({ day: gameStore.day - 1, volume: s._dailyVolume })
          if (s.volumeHistory.length > 60) s.volumeHistory.shift()
        }
        s._dailyVolume = 0
        recordDailySnapshot(stocks.value[id], gameStore.day)
        s.dayOpen = s.currentPrice
        s.dayHigh = s.currentPrice
        s.dayLow = s.currentPrice
        s._regHigh = s.currentPrice
        s._regLow = s.currentPrice
      }

      // 2. Record benchmark value for charting
      recordBenchmarkSnapshot()

      // 3. Process scheduled events & generate upcoming hints
      processDayEvents(gameStore.day)
      generateUpcomingHints(gameStore.day)

      // 4. World events
      if (activeWorldEvent.value) {
        activeWorldEvent.value.remaining--
        if (activeWorldEvent.value.remaining <= 0) {
          gameStore.addNotification(`🌍 ${activeWorldEvent.value.name} — effects have subsided.`, 'info')
          activeWorldEvent.value = null
        }
      }
      if (!activeWorldEvent.value && gameStore.day >= nextWorldEventDay) {
        const wevt = pickWorldEvent()
        activeWorldEvent.value = { ...wevt, remaining: wevt.duration }
        const affected = applyWorldEvent(wevt, stocks.value, gameStore.day, newsFeed.value)
        if (Math.abs(wevt.effects[0]?.impact || 0) > 0.03) {
          const infStore = useInfluenceStore()
          for (const r of affected) {
            infStore.checkSuspiciousTrade(r.companyId, r.impact * 100, gameStore.day)
          }
        }
        gameStore.addNotification(`🌍 World Event: ${wevt.name} — ${wevt.description?.substring(0, 80)}...`, 'warning')
        nextWorldEventDay = gameStore.day + 15 + Math.floor(Math.random() * 35)
      }

      // 5. Financial operations
      gameStore.accrueLoanInterest()
      gameStore.accrueMarginInterest()
      gameStore.checkBankruptcy()
      usePortfolioStore().checkFutures()
      chargeExpenseRatios(gameStore.day)

      // 6. Interest rate changes every ~30 days
      if (gameStore.day - (gameStore.lastRateChange || 0) > 30) {
        const change = (Math.random() - 0.5) * 0.01
        gameStore.interestRate = round2(Math.max(0.01, Math.min(0.15, gameStore.interestRate + change)))
        gameStore.lastRateChange = gameStore.day
        const dir = change >= 0 ? '⬆️' : '⬇️'
        gameStore.addNotification(`${dir} Fed rate changed to ${(gameStore.interestRate * 100).toFixed(1)}%`, 'info')
      }

      // 7. Quarterly ETF rebalancing notification
      if (gameStore.day % 63 === 0) {
        gameStore.addNotification('📊 Index ETFs rebalanced — constituent weights updated', 'info')
      }

      prevDay = gameStore.day
    }

    // Calculate sector momentum for correlation
    const sectorReturns = {}
    for (const id of Object.keys(stocks.value)) {
      const s = stocks.value[id]
      if (s.priceHistory.length < 2) continue
      const prev = s.priceHistory[s.priceHistory.length - 2].price
      const ret = (s.currentPrice - prev) / prev
      if (!sectorReturns[s.sector]) sectorReturns[s.sector] = { sum: 0, count: 0 }
      sectorReturns[s.sector].sum += ret
      sectorReturns[s.sector].count++
    }
    const sectorMomentum: Record<string, any> = {}
    for (const [sec, data] of Object.entries(sectorReturns)) {
      sectorMomentum[sec] = data.count > 0 ? data.sum / data.count : 0
    }

    // Circuit breaker: if crash event, skip some ticks
    const crashActive = gameStore.marketEvent?.type === 'crash'
    const skipTick = crashActive && Math.random() < 0.3 // 30% chance to skip during crash

    if (!skipTick) {
      for (const id of Object.keys(stocks.value)) {
        const stock = stocks.value[id]
        let eventMod = 0
        const active = activeCompanyEvents.value[id]
        if (active) {
          eventMod = active.priceImpact / 78
          active.duration--
          if (active.duration <= 0) delete activeCompanyEvents.value[id]
        }

        const mom = sectorMomentum[stock.sector] || 0
        // World event lingering drift
        let worldDrift = 0
        if (activeWorldEvent.value) {
          const fx = activeWorldEvent.value.effects?.find(e => e.sector === stock.sector)
          if (fx) worldDrift = fx.impact / activeWorldEvent.value.duration * 0.3
        }
        const newPrice = tickPrice(stock.currentPrice, stock, 5, gameStore.marketEvent, gameStore.marketPhase, mom + worldDrift)
        const adjustedPrice = round2(Math.max(0.01, newPrice * (1 + eventMod)))
        stock.currentPrice = adjustedPrice

        // Stock split: when price exceeds $1000, split 2:1 to keep prices reasonable
        if (stock.currentPrice > 1000 && (stock.type !== 'commodity')) {
          stock.currentPrice = round2(stock.currentPrice / 2)
          stock.outstandingShares = Math.floor(stock.outstandingShares * 2)
          stock.dayOpen = round2(stock.dayOpen / 2)
          stock.dayHigh = round2(stock.dayHigh / 2)
          stock.dayLow = round2(stock.dayLow / 2)
          // Adjust price history for chart continuity
          for (let phi = 0; phi < stock.priceHistory.length; phi++) {
            stock.priceHistory[phi].price = round2(stock.priceHistory[phi].price / 2)
          }
          // Adjust historical daily bars
          for (const bar of stock.historicalDaily || []) {
            bar.open = round2(bar.open / 2)
            bar.high = round2(bar.high / 2)
            bar.low = round2(bar.low / 2)
            bar.close = round2(bar.close / 2)
          }
        }

        // Track volume (simplified: each tick adds proportional volume)
        const volumeThisTick = Math.floor(Math.abs(adjustedPrice - stock.currentPrice) / stock.currentPrice * stock.outstandingShares * 0.001)
        stock._dailyVolume = (stock._dailyVolume || 0) + Math.max(1, volumeThisTick)

        // Track OHLC for both regular and full day
        if (adjustedPrice > stock.dayHigh) stock.dayHigh = adjustedPrice
        if (adjustedPrice < stock.dayLow) stock.dayLow = adjustedPrice
        // Regular-hours OHLC (only during pre-market and regular)
        if (gameStore.marketPhase === 'pre-market' || gameStore.marketPhase === 'regular') {
          if (!stock._regHigh || adjustedPrice > stock._regHigh) stock._regHigh = adjustedPrice
          if (!stock._regLow || adjustedPrice < stock._regLow) stock._regLow = adjustedPrice
        }
        if (!stock._regOpen && (gameStore.marketPhase === 'pre-market' || gameStore.marketPhase === 'regular')) {
          stock._regOpen = adjustedPrice
        }

        stock.priceHistory.push({
          time: gameStore.day * 1000 + gameStore.tick,
          price: adjustedPrice
        })
        if (stock.priceHistory.length > 200) {
          stock.priceHistory.shift()
        }
      }
    }

    if (event) {
      setTimeout(() => gameStore.setMarketEvent(null), 2000)
    }
  }

  /** Get the IDs of companies in a given index (handles dynamic indexes by sector) */
  function getIndexCompanyIds(indexId) {
    const idx = activeIndexes.value.find(i => i.id === indexId)
    if (!idx) return []
    if (idx.dynamic && idx.sectorFilter) {
      return stockList.value.filter(s => s.sector === idx.sectorFilter).map(s => s.id)
    }
    return idx.companyIds || []
  }

  function getIndexValue(indexId) {
    // Handle benchmark IDs
    const regionKeys = Object.keys(REGIONS)
    for (const rk of regionKeys) {
      if (REGIONS[rk].benchmarkId === indexId) return getBenchmarkValue()
    }
    const cids = getIndexCompanyIds(indexId)
    if (cids.length === 0) return 0
    let totalCap = 0, totalShares = 0
    for (const cid of cids) {
      const s = stocks.value[cid]
      if (s) {
        const shares = s.outstandingShares || 1
        totalCap += s.currentPrice * shares
        totalShares += shares
      }
    }
    return totalShares > 0 ? round2(totalCap / totalShares) : 0
  }

  /** Cap-weighted % change from tick-level priceHistory across a stock list */
  function capWeightedPctChange(stocksList: any[]) {
    let weightedChange = 0, totalCap = 0
    for (const s of stocksList) {
      if (s.priceHistory.length >= 2) {
        const h = s.priceHistory
        const prev = h[h.length - 2].price
        const curr = h[h.length - 1].price
        const cap = curr * (s.outstandingShares || 1)
        weightedChange += ((curr - prev) / prev) * cap
        totalCap += cap
      }
    }
    return totalCap > 0 ? round2(weightedChange / totalCap * 100) : 0
  }

  function getIndexChange(indexId) {
    for (const rk of Object.keys(REGIONS)) {
      if (REGIONS[rk].benchmarkId === indexId) return getBenchmarkChange()
    }
    const cids = getIndexCompanyIds(indexId)
    if (cids.length === 0) return 0
    const stocksList = cids.map((cid: string) => stocks.value[cid]).filter(Boolean)
    return capWeightedPctChange(stocksList)
  }

  /** Regional benchmark index value (e.g., S&P 500 equivalent) */
  /** Get stocks in the active region */
  function getRegionStocks() {
    const currencyStore = useCurrencyStore()
    const regionKey = currencyStore.activeRegionKey
    return stockList.value.filter(s => {
      const c = activeCompanies.value.find(c => c.id === s.id)
      return c && (c.region || []).includes(regionKey) && !s.bankrupt
    })
  }

  function recordBenchmarkSnapshot() {
    const gameStore = useGameStore()
    const val = getBenchmarkValue()
    if (val > 0 && gameStore.day > 0) {
      benchmarkHistory.value.push({ day: gameStore.day, price: val })
      // Keep last 20 years of daily data (~5000 bars)
      if (benchmarkHistory.value.length > 6000) {
        benchmarkHistory.value = benchmarkHistory.value.slice(-5000)
      }
    }
  }

  /** Seed benchmark history from pre-generated historicalDaily data.
   *  Aligns bars by day value across all stocks for time-consistent indexing. */
  function seedBenchmarkHistory() {
    const list = getRegionStocks()
    if (list.length === 0) return

    // Require at least 5% of stocks (min 5) to be present, otherwise
    // the early days with 1-2 stocks create a "cliff" artifact.
    const minStocks = Math.max(5, Math.floor(list.length * 0.05))

    // Collect all unique day values across all stocks
    const daySet = new Set<number>()
    for (const s of list) {
      for (const bar of s.historicalDaily || []) {
        daySet.add(bar.day)
      }
    }
    if (daySet.size === 0) return

    // Sort days chronologically
    const sortedDays = [...daySet].sort((a, b) => a - b)

    // Build index for each stock: day -> close price
    const stockMaps: Map<number, number>[] = []
    for (const s of list) {
      const map = new Map<number, number>()
      for (const bar of s.historicalDaily || []) {
        map.set(bar.day, bar.close)
      }
      stockMaps.push(map)
    }

    benchmarkHistory.value = []
    for (const day of sortedDays) {
      let weightedSum = 0, totalWeight = 0, contributorCount = 0
      for (let j = 0; j < list.length; j++) {
        const close = stockMaps[j].get(day)
        if (close !== undefined && close !== null) {
          const weight = list[j].outstandingShares || 1
          weightedSum += close * weight
          totalWeight += weight
          contributorCount++
        }
      }
      // Skip days with too few contributors (avoids cliff at start)
      if (totalWeight > 0 && contributorCount >= minStocks) {
        benchmarkHistory.value.push({ day, price: round2(weightedSum / totalWeight) })
      }
    }

    // If nothing passed the threshold, fall back to all days
    if (benchmarkHistory.value.length === 0) {
      for (const day of sortedDays) {
        let weightedSum = 0, totalWeight = 0
        for (let j = 0; j < list.length; j++) {
          const close = stockMaps[j].get(day)
          if (close !== undefined && close !== null) {
            weightedSum += close * (list[j].outstandingShares || 1)
            totalWeight += (list[j].outstandingShares || 1)
          }
        }
        if (totalWeight > 0) {
          benchmarkHistory.value.push({ day, price: round2(weightedSum / totalWeight) })
        }
      }
    }

    // Trim if too large
    if (benchmarkHistory.value.length > 20000) {
      // Keep every Nth entry for older data, all for recent
      const keep = benchmarkHistory.value.slice(-5040) // last ~20 years daily
      const older = benchmarkHistory.value.slice(0, -5040)
      // Downsample older to monthly (every 21st entry)
      const downsampled: { day: number; price: number }[] = []
      for (let i = 0; i < older.length; i += 21) {
        downsampled.push(older[i])
      }
      benchmarkHistory.value = [...downsampled, ...keep]
    }
  }

  function getBenchmarkValue() {
    const list = getRegionStocks()
    if (list.length === 0) return 0
    // Cap-weighted: larger companies have more influence
    let totalCap = 0, totalShares = 0
    for (const s of list) {
      const shares = s.outstandingShares || 1
      totalCap += s.currentPrice * shares
      totalShares += shares
    }
    return totalShares > 0 ? round2(totalCap / totalShares) : 0
  }

  function getBenchmarkChange() {
    const list = getRegionStocks()
    if (list.length === 0) return 0
    return capWeightedPctChange(list)
  }

  /** Multi-timeframe % changes for the regional benchmark */
  function getBenchmarkPriceChange() {
    const list = getRegionStocks()
    if (list.length === 0) return { h1: 0, d1: 0, d7: 0, d28: 0 }
    let h1 = 0, d1 = 0, d7 = 0, d28 = 0, count = 0
    for (const s of list) {
      const chg = getPriceChange(s.id)
      h1 += chg.h1; d1 += chg.d1; d7 += chg.d7; d28 += chg.d28
      count++
    }
    return count > 0 ? {
      h1: round2(h1 / count), d1: round2(d1 / count),
      d7: round2(d7 / count), d28: round2(d28 / count)
    } : { h1: 0, d1: 0, d7: 0, d28: 0 }
  }

  /** Get benchmark info as a pseudo-index for the UI */
  function getBenchmarkInfo() {
    const currencyStore = useCurrencyStore()
    const region = REGIONS[currencyStore.activeRegionKey]
    if (!region) return null
    return {
      id: region.benchmarkId,
      ticker: region.benchmarkId === 'americas500' ? 'SPX' : region.benchmarkId === 'eurostoxx50' ? 'SX5E' : region.benchmarkId === 'asiapac200' ? 'APAC' : 'NIFTY',
      name: region.benchmark,
      description: `${region.name} broad market`,
      icon: region.icon
    }
  }

  function getIndexStocks(indexId) {
    for (const rk of Object.keys(REGIONS)) {
      if (REGIONS[rk].benchmarkId === indexId) return getRegionStocks()
    }
    const cids = getIndexCompanyIds(indexId)
    return cids.map(cid => stocks.value[cid]).filter(Boolean)
  }

  /** Multi-timeframe % changes for an index (cap-weighted average of constituents) */
  function getIndexPriceChange(indexId) {
    for (const rk of Object.keys(REGIONS)) {
      if (REGIONS[rk].benchmarkId === indexId) return getBenchmarkPriceChange()
    }
    const stocks_ = getIndexStocks(indexId)
    if (stocks_.length === 0) return { h1: 0, d1: 0, d7: 0, d28: 0 }
    let totalCap = 0, h1 = 0, d1 = 0, d7 = 0, d28 = 0
    for (const s of stocks_) {
      const cap = s.currentPrice * (s.outstandingShares || 1)
      totalCap += cap
      const chg = getPriceChange(s.id)
      h1 += chg.h1 * cap
      d1 += chg.d1 * cap
      d7 += chg.d7 * cap
      d28 += chg.d28 * cap
    }
    return totalCap > 0 ? {
      h1: round2(h1 / totalCap),
      d1: round2(d1 / totalCap),
      d7: round2(d7 / totalCap),
      d28: round2(d28 / totalCap)
    } : { h1: 0, d1: 0, d7: 0, d28: 0 }
  }

  // Save/Load
  function getSaveState(): Record<string, any> {
    const state: Record<string, any> = {}
    for (const [id, stock] of Object.entries(stocks.value)) {
      state[id] = {
        currentPrice: stock.currentPrice,
        priceHistory: stock.priceHistory.slice(-200),
        historicalDaily: stock.historicalDaily.slice(-300),
        dayOpen: stock.dayOpen,
        dayHigh: stock.dayHigh,
        dayLow: stock.dayLow,
        _dailyVolume: stock._dailyVolume || 0,
        volumeHistory: stock.volumeHistory || [],
        bankrupt: stock.bankrupt || false
      }
    }
    // Also save benchmark history
    ;(state as any).__benchmarkHistory = benchmarkHistory.value.slice(-3000)
    return state
  }

  function loadSaveState(state: Record<string, any> | null) {
    if (!state) return
    // Restore benchmark history
    if ((state as any).__benchmarkHistory) {
      benchmarkHistory.value = (state as any).__benchmarkHistory
      delete (state as any).__benchmarkHistory
    }
    for (const [id, data] of Object.entries(state)) {
      if (stocks.value[id]) {
        const s = stocks.value[id]
        s.currentPrice = (data as any).currentPrice
        s.priceHistory = (data as any).priceHistory || []
        s.historicalDaily = (data as any).historicalDaily || []
        s.dayOpen = (data as any).dayOpen || (data as any).currentPrice
        s.dayHigh = (data as any).dayHigh || (data as any).currentPrice
        s.dayLow = (data as any).dayLow || (data as any).currentPrice
        s._dailyVolume = (data as any)._dailyVolume || 0
        s.volumeHistory = (data as any).volumeHistory || []
        s.bankrupt = (data as any).bankrupt || false
      }
    }
  }

  return {
    stocks, initialized, stockList, sectors, highlightStockId,
    newsFeed, eventCalendar, activeCompanyEvents, activeWorldEvent,
    eventLog, addEventLogEntry,
    benchmarkHistory,
    activeCompanies, activeIndexes,
    init, getStock, ticker, tickAll,
    getIndexValue, getIndexChange, getIndexPriceChange, getIndexStocks,
    getBenchmarkValue, getBenchmarkChange, getBenchmarkPriceChange, getBenchmarkInfo,
    allStocks,
    getAvailableFloat, getMarketCap, getPE, getEPS, getPriceChange,
    getSpread, getCommission,
    addSharesInCirculation, removeSharesInCirculation,
    calculateMarketImpact, applyMarketImpact,
    getSaveState, loadSaveState
  }
})
