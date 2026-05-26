import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './gameStore.js'
import { useMarketStore } from './marketStore.js'
import { useCurrencyStore } from './currencyStore.js'
import { round2 } from '@/utils/marketEngine.js'
import { openFuturesPosition, futuresPnL, marginPerContract, checkMarginCall, checkExpirations, settleFutures, daysUntilExpiry, openIndexFutures, indexFuturesPnL, indexContractValue, indexMarginPerContract } from '@/utils/futuresEngine.js'
import type { Holding, ShortPosition, OptionPosition, FuturesPosition, Transaction, Order } from '@/types'

export const usePortfolioStore = defineStore('portfolio', () => {
  const holdings = ref<Record<string, Holding>>({})
  const shorts = ref<Record<string, ShortPosition>>({})
  const options = ref<OptionPosition[]>([])
  const indexHoldings = ref<Record<string, Holding>>({})
  const transactions = ref<Transaction[]>([])
  const orders = ref<Order[]>([])
  const futures = ref<FuturesPosition[]>([])
  const nextOptionId = ref(1)
  const nextOrderId = ref(1)

  // Helper to get current currency symbol
  function getCurSymbol() {
    return useCurrencyStore().activeCurrency.symbol
  }

  // Computed
  const totalStockValue = computed(() => {
    const market = useMarketStore()
    let total = 0
    for (const [companyId, holding] of Object.entries(holdings.value)) {
      const stock = market.getStock(companyId)
      if (stock) {
        total += round2(stock.currentPrice * holding.shares)
      }
    }
    return round2(total)
  })

  const totalIndexValue = computed(() => {
    const market = useMarketStore()
    let total = 0
    for (const [indexId, holding] of Object.entries(indexHoldings.value)) {
      total += round2(market.getIndexValue(indexId) * holding.shares)
    }
    return round2(total)
  })

  const totalOptionsValue = computed(() => {
    const market = useMarketStore()
    const game = useGameStore()
    let total = 0
    for (const opt of options.value) {
      const stock = market.getStock(opt.companyId)
      if (!stock) continue
      // Intrinsic value
      const intrinsic = opt.type === 'call'
        ? Math.max(0, stock.currentPrice - opt.strikePrice)
        : Math.max(0, opt.strikePrice - stock.currentPrice)
      // Time value: decays linearly as expiration approaches
      const totalDays = opt.expirationDay - opt.buyDay
      const daysLeft = Math.max(0, opt.expirationDay - game.day)
      const timeFraction = totalDays > 0 ? daysLeft / totalDays : 0
      // Time value = original premium × fraction remaining × proximity factor
      const proximity = intrinsic > 0 ? 0.3 : 0.7 // OTM options have more time value
      const timeValue = opt.premium * timeFraction * proximity
      total += round2((intrinsic + timeValue) * opt.contracts * 100)
    }
    return round2(total)
  })

  // Short positions value (negative = liability)
  const totalShortsValue = computed(() => {
    const market = useMarketStore()
    let total = 0
    for (const [cid, s] of Object.entries(shorts.value)) {
      const stock = market.getStock(cid)
      if (!stock) continue
      // Short value = -(current shares × price) because we owe shares
      total -= round2(stock.currentPrice * s.shares)
    }
    return round2(total)
  })

  const totalFuturesPnL = computed(() => {
    const market = useMarketStore()
    let total = 0
    for (const pos of futures.value) {
      if (pos.settled) {
        total += pos.settlementPnL || 0
      } else if (pos.type === 'index_futures') {
        total += indexFuturesPnL(pos, market.getIndexValue(pos.indexId) || 0, pos.multiplier || 50)
      } else {
        const stock = market.getStock(pos.commodityId)
        if (stock) total += futuresPnL(pos, stock.currentPrice)
      }
    }
    return round2(total)
  })

  const totalFuturesMargin = computed(() => {
    let total = 0
    for (const pos of futures.value) {
      if (!pos.settled) total += pos.margin || 0
    }
    return round2(total)
  })

  const totalNetWorth = computed(() => {
    const game = useGameStore()
    return round2(game.cash + totalStockValue.value + totalIndexValue.value + totalOptionsValue.value + totalShortsValue.value + totalFuturesPnL.value)
  })

  const totalInvested = computed(() => {
    let total = 0
    for (const holding of Object.values(holdings.value)) {
      total += round2(holding.avgCost * holding.shares)
    }
    for (const holding of Object.values(indexHoldings.value)) {
      total += round2(holding.avgCost * holding.shares)
    }
    for (const s of Object.values(shorts.value)) {
      total += round2(s.entryPrice * s.shares) // cash received from short sale
    }
    for (const opt of options.value) {
      total += round2(opt.premium * opt.contracts * 100)
    }
    return round2(total)
  })

  const totalProfitLoss = computed(() => {
    const game = useGameStore()
    const diff = game.difficulty || 'easy'
    const startingCash = game.DIFFICULTY_STARTING_CASH?.[diff] || 100000
    // Net worth after loans: equity = totalNetWorth - loanBalance
    const equity = totalNetWorth.value - (game.loanBalance || 0)
    return round2(equity - startingCash)
  })

  const totalPLPercent = computed(() => {
    const game = useGameStore()
    const diff = game.difficulty || 'easy'
    const startingCash = game.DIFFICULTY_STARTING_CASH?.[diff] || 100000
    if (startingCash === 0) return '0.00'
    return round2(((totalProfitLoss.value / startingCash) * 100)).toFixed(2)
  })

  // Actions
  function buyStock(companyId, shares, price, useMargin = false) {
    const game = useGameStore()
    const market = useMarketStore()
    const spread = market.getSpread(companyId)
    const askPrice = round2(price * (1 + spread / 2))

    const impact = market.calculateMarketImpact(companyId, shares)
    const effectivePrice = round2(askPrice * (1 + impact))
    const effectiveCost = round2(shares * effectivePrice)

    const { fee } = market.getCommission(effectiveCost)
    const totalCost = round2(effectiveCost + fee)

    // Margin: player only needs 50% cash
    const cashRequired = useMargin ? round2(totalCost * 0.5) : totalCost
    const borrowed = useMargin ? round2(totalCost * 0.5) : 0

    const available = market.getAvailableFloat(companyId)
    if (shares > available) return false
    if (game.cash < cashRequired) return false

    game.removeCash(cashRequired)
    if (useMargin) game.addMarginDebt(borrowed)
    market.applyMarketImpact(companyId, impact)

    if (!holdings.value[companyId]) {
      holdings.value[companyId] = { shares: 0, avgCost: 0, onMargin: false }
    }
    const h = holdings.value[companyId]
    const totalBasis = round2(h.avgCost * h.shares + effectiveCost)
    h.shares += shares
    h.avgCost = round2(totalBasis / h.shares)
    if (useMargin) h.onMargin = true

    market.addSharesInCirculation(companyId, shares)

    transactions.value.unshift({
      id: Date.now(),
      type: useMargin ? 'buy_margin' : 'buy',
      companyId, shares, price: effectivePrice, total: totalCost, fee,
      day: game.day, time: new Date().toLocaleString()
    })
    if (transactions.value.length > 200) transactions.value.pop()

    const impactPct = (impact * 100).toFixed(2)
    const marginStr = useMargin ? ` (50% margin, borrowed ${getCurSymbol()}${borrowed})` : ''
    game.addNotification(
      `Bought ${shares} shares of ${market.ticker(companyId)} at ${getCurSymbol()}${effectivePrice}${marginStr}`,
      impact >= 0.005 ? 'warning' : 'success'
    )
    return true
  }

  function sellStock(companyId, shares, price) {
    const game = useGameStore()
    const market = useMarketStore()
    const h = holdings.value[companyId]
    if (!h || h.shares < shares) return false

    const spread = market.getSpread(companyId)
    const bidPrice = round2(price * (1 - spread / 2)) // Sell at bid (slightly lower)

    const impact = -market.calculateMarketImpact(companyId, shares)
    const effectivePrice = round2(bidPrice * (1 + impact))
    const revenue = round2(shares * effectivePrice)

    const { fee } = market.getCommission(revenue)
    const netRevenue = round2(revenue - fee)

    game.addCash(netRevenue)
    market.applyMarketImpact(companyId, impact)

    h.shares -= shares
    if (h.shares === 0) {
      delete holdings.value[companyId]
    }

    market.removeSharesInCirculation(companyId, shares)

    transactions.value.unshift({
      id: Date.now(),
      type: 'sell',
      companyId,
      shares,
      price: effectivePrice,
      total: netRevenue,
      fee,
      day: game.day,
      time: new Date().toLocaleString()
    })

    const impactPct = Math.abs(impact * 100).toFixed(2)
    const feeStr = fee > 1 ? ` (fee ${getCurSymbol()}${fee})` : ''
    if (Math.abs(impact) >= 0.005) {
      game.addNotification(`Sold ${shares} shares of ${market.ticker(companyId)} — impact -${impactPct}% (got ${getCurSymbol()}${effectivePrice}${feeStr})`, 'warning')
    } else {
      game.addNotification(`Sold ${shares} shares of ${market.ticker(companyId)} at ${getCurSymbol()}${effectivePrice}${feeStr}`, 'info')
    }
    return true
  }

  /** Short sell: borrow shares, sell them, must buy back later */
  function shortSell(companyId, shares, price) {
    const game = useGameStore()
    const market = useMarketStore()
    if (shares <= 0) return false

    const spread = market.getSpread(companyId)
    const bidPrice = round2(price * (1 - spread / 2))

    const available = market.getAvailableFloat(companyId)
    if (shares > available) return false

    const impact = -market.calculateMarketImpact(companyId, shares)
    const effectivePrice = round2(bidPrice * (1 + impact))
    const revenue = round2(shares * effectivePrice)

    const { fee } = market.getCommission(revenue)
    const netRevenue = round2(revenue - fee)

    game.addCash(netRevenue)
    market.applyMarketImpact(companyId, impact)
    market.addSharesInCirculation(companyId, shares) // shares are borrowed

    if (!shorts.value[companyId]) {
      shorts.value[companyId] = { shares: 0, entryPrice: 0 }
    }
    const s = shorts.value[companyId]
    const totalEntry = round2(s.entryPrice * s.shares + revenue)
    s.shares += shares
    s.entryPrice = round2(totalEntry / s.shares)

    transactions.value.unshift({
      id: Date.now(), type: 'short_sell', companyId, shares,
      price: effectivePrice, total: revenue,
      day: game.day,
      time: new Date().toLocaleString()
    })

    const impactPct = Math.abs(impact * 100).toFixed(2)
    game.addNotification(`Shorted ${shares} shares of ${market.ticker(companyId)} at ${getCurSymbol()}${effectivePrice} (impact ${impactPct}%)`, 'warning')
    return true
  }

  /** Cover (buy back) a short position */
  function shortCover(companyId, shares, price) {
    const game = useGameStore()
    const market = useMarketStore()
    const s = shorts.value[companyId]
    if (!s || s.shares < shares) return false

    const spread = market.getSpread(companyId)
    const askPrice = round2(price * (1 + spread / 2)) // Cover at ask

    const actualShares = Math.min(shares, s.shares)
    const impact = market.calculateMarketImpact(companyId, actualShares)
    const effectivePrice = round2(askPrice * (1 + impact))
    const cost = round2(actualShares * effectivePrice)

    const { fee } = market.getCommission(cost)
    const totalCost = round2(cost + fee)

    if (game.cash < totalCost) return false

    game.removeCash(totalCost)
    market.applyMarketImpact(companyId, impact)
    market.removeSharesInCirculation(companyId, actualShares)

    const pl = round2((s.entryPrice - effectivePrice) * actualShares)

    s.shares -= actualShares
    if (s.shares === 0) delete shorts.value[companyId]

    transactions.value.unshift({
      id: Date.now(), type: 'short_cover', companyId, shares: actualShares,
      price: effectivePrice, total: totalCost, pl, fee,
      day: game.day,
      time: new Date().toLocaleString()
    })

    const plStr = pl >= 0 ? `profit ${getCurSymbol()}${pl}` : `loss ${getCurSymbol()}${Math.abs(pl)}`
    game.addNotification(`Covered ${actualShares} shares of ${market.ticker(companyId)} at ${getCurSymbol()}${effectivePrice} (${plStr})`, pl >= 0 ? 'success' : 'warning')
    return true
  }

  function buyIndex(indexId, shares) {
    const market = useMarketStore()
    const game = useGameStore()
    const price = market.getIndexValue(indexId)
    const cost = round2(shares * price)
    if (game.cash < cost) return false

    game.removeCash(cost)
    if (!indexHoldings.value[indexId]) {
      indexHoldings.value[indexId] = { shares: 0, avgCost: 0 }
    }
    const h = indexHoldings.value[indexId]
    const totalCost = round2(h.avgCost * h.shares + cost)
    h.shares += shares
    h.avgCost = round2(totalCost / h.shares)

    transactions.value.unshift({
      id: Date.now(),
      type: 'buy_index',
      indexId,
      shares,
      price,
      total: cost,
      time: new Date().toLocaleString()
    })
    game.addNotification(`Bought ${shares} shares of index ${indexId} at $${price}`, 'success')
    return true
  }

  function sellIndex(indexId, shares) {
    const market = useMarketStore()
    const game = useGameStore()
    const h = indexHoldings.value[indexId]
    if (!h || h.shares < shares) return false

    const price = market.getIndexValue(indexId)
    const revenue = round2(shares * price)
    game.addCash(revenue)
    h.shares -= shares
    if (h.shares === 0) delete indexHoldings.value[indexId]

    transactions.value.unshift({
      id: Date.now(),
      type: 'sell_index',
      indexId,
      shares,
      price,
      total: revenue,
      time: new Date().toLocaleString()
    })
    game.addNotification(`Sold ${shares} shares of index ${indexId} at $${price}`, 'info')
    return true
  }

  /** Silent sell for expense ratio coverage — no notification */
  function sellIndexSilent(indexId, shares) {
    const market = useMarketStore()
    const game = useGameStore()
    const h = indexHoldings.value[indexId]
    if (!h || h.shares < shares) return false
    const price = market.getIndexValue(indexId)
    game.addCash(round2(shares * price))
    h.shares -= shares
    if (h.shares === 0) delete indexHoldings.value[indexId]
    return true
  }

  function buyOption(companyId, type, strikePrice, premium, expirationOffset, contracts) {
    const game = useGameStore()
    const cost = round2(premium * contracts * 100)
    if (game.cash < cost) return false

    game.removeCash(cost)
    const option = {
      id: nextOptionId.value++,
      companyId,
      type,
      strikePrice: round2(strikePrice),
      premium: round2(premium),
      expirationDay: game.day + expirationOffset,
      contracts,
      buyDay: game.day
    }
    options.value.push(option)

    transactions.value.unshift({
      id: Date.now(),
      type: 'buy_option',
      companyId,
      optionType: type,
      strikePrice: round2(strikePrice),
      premium: round2(premium),
      contracts,
      total: cost,
      time: new Date().toLocaleString()
    })
    game.addNotification(
      `Bought ${contracts} ${type.toUpperCase()} ${market.ticker(companyId)} $${round2(strikePrice)} (premium: $${round2(premium)})`,
      'success'
    )
    return true
  }

  function exerciseOption(optionId) {
    const market = useMarketStore()
    const game = useGameStore()
    const idx = options.value.findIndex(o => o.id === optionId)
    if (idx === -1) return false

    const opt = options.value[idx]
    const stock = market.getStock(opt.companyId)
    if (!stock) return false

    const intrinsic = opt.type === 'call'
      ? Math.max(0, round2(stock.currentPrice - opt.strikePrice))
      : Math.max(0, round2(opt.strikePrice - stock.currentPrice))

    const profit = round2(intrinsic * opt.contracts * 100)
    game.addCash(profit)
    game.addNotification(
      `Exercised ${opt.type.toUpperCase()} ${opt.companyId.toUpperCase()} for $${profit.toFixed(2)}`,
      'success'
    )
    options.value.splice(idx, 1)
    return true
  }

  function expireOptions() {
    const game = useGameStore()
    options.value = options.value.filter(opt => {
      if (game.day >= opt.expirationDay) {
        const market = useMarketStore()
        const stock = market.getStock(opt.companyId)
        if (stock) {
          const intrinsic = opt.type === 'call'
            ? Math.max(0, round2(stock.currentPrice - opt.strikePrice))
            : Math.max(0, round2(opt.strikePrice - stock.currentPrice))
          if (intrinsic > 0) {
            const val = round2(intrinsic * opt.contracts * 100)
            game.addCash(val)
            game.addNotification(`Option auto-exercised: ${opt.type} ${opt.companyId} for $${val.toFixed(2)}`)
          } else {
            game.addNotification(`Option expired worthless: ${opt.type} ${opt.companyId}`, 'warning')
          }
        }
        return false
      }
      return true
    })
  }

  /** Place a limit or stop order */
  function placeOrder(companyId, type, shares, limitPrice, stopPrice = null) {
    if (shares <= 0 || limitPrice <= 0) return false
    const game = useGameStore()
    orders.value.push({
      id: nextOrderId.value++,
      companyId, type, shares, limitPrice, stopPrice,
      status: 'pending', dayPlaced: game.day
    })
    const labels = { limit_buy: 'Limit Buy', limit_sell: 'Limit Sell', stop_loss: 'Stop Loss', stop_limit: 'Stop Limit' }
    game.addNotification(`📝 ${labels[type]} order placed: ${shares} ${companyId.toUpperCase()} @ $${limitPrice.toFixed(2)}`, 'info')
    return true
  }

  function cancelOrder(orderId) {
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx === -1) return false
    orders.value.splice(idx, 1)
    return true
  }

  /** Check and execute pending orders — called each tick by marketStore */
  function checkOrders() {
    const game = useGameStore()
    const market = useMarketStore()

    for (let i = orders.value.length - 1; i >= 0; i--) {
      const o = orders.value[i]
      if (o.status !== 'pending') continue
      const stock = market.getStock(o.companyId)
      if (!stock) continue
      const price = stock.currentPrice

      let shouldExecute = false
      let execPrice = price

      if (o.type === 'limit_buy' && price <= o.limitPrice) {
        shouldExecute = true; execPrice = o.limitPrice
      } else if (o.type === 'limit_sell' && price >= o.limitPrice) {
        shouldExecute = true; execPrice = o.limitPrice
      } else if (o.type === 'stop_loss' && price <= o.limitPrice) {
        shouldExecute = true; execPrice = price // market sell
      } else if (o.type === 'stop_limit' && price <= o.stopPrice) {
        // Activate: becomes a limit sell at limitPrice
        if (price <= o.limitPrice && price <= o.stopPrice) {
          shouldExecute = true; execPrice = o.limitPrice
        }
      }

      if (!shouldExecute) continue

      // Execute the order
      if (o.type === 'limit_buy') {
        const cost = round2(o.shares * execPrice)
        if (game.cash < cost) continue
        game.removeCash(cost)
        market.applyMarketImpact(o.companyId, market.calculateMarketImpact(o.companyId, o.shares))
        market.addSharesInCirculation(o.companyId, o.shares)
        if (!holdings.value[o.companyId]) holdings.value[o.companyId] = { shares: 0, avgCost: 0 }
        const h = holdings.value[o.companyId]
        h.avgCost = round2((h.avgCost * h.shares + cost) / (h.shares + o.shares))
        h.shares += o.shares
        game.addNotification(`✅ Limit buy filled: ${o.shares} ${market.ticker(o.companyId)} @ $${execPrice.toFixed(2)}`, 'success')
      } else {
        // Sell orders
        const h = holdings.value[o.companyId]
        if (!h || h.shares < o.shares) continue
        const revenue = round2(o.shares * execPrice)
        game.addCash(revenue)
        market.applyMarketImpact(o.companyId, -market.calculateMarketImpact(o.companyId, o.shares))
        market.removeSharesInCirculation(o.companyId, o.shares)
        h.shares -= o.shares
        if (h.shares === 0) delete holdings.value[o.companyId]
        const labels = { limit_sell: 'Limit sell', stop_loss: 'Stop loss', stop_limit: 'Stop limit' }
        game.addNotification(`✅ ${labels[o.type] || 'Order'} filled: ${o.shares} ${market.ticker(o.companyId)} @ $${execPrice.toFixed(2)}`, 'success')
      }

      transactions.value.unshift({
        id: Date.now(), type: o.type, companyId: o.companyId,
        shares: o.shares, price: execPrice, total: round2(o.shares * execPrice),
        day: game.day,
        time: new Date().toLocaleString()
      })

      orders.value.splice(i, 1)
    }
  }

  // --- Futures Trading ---

  function openFutures(commodityId, direction, contracts) {
    const game = useGameStore()
    const market = useMarketStore()
    const stock = market.getStock(commodityId)
    if (!stock || stock.type !== 'commodity') return false

    const position = openFuturesPosition(commodityId, direction, contracts, stock.currentPrice, game.day)
    if (!position) return false

    // Check margin requirement
    if (game.cash < position.margin) return false

    // Reserve margin from cash
    game.removeCash(position.margin)
    futures.value.push(position)

    transactions.value.unshift({
      type: `futures_${direction}`,
      companyId: commodityId,
      contracts,
      price: stock.currentPrice,
      total: position.notional,
      margin: position.margin,
      day: game.day,
      time: new Date().toISOString()
    })
    if (transactions.value.length > 200) transactions.value.pop()

    game.addNotification(
      `${direction === 'long' ? '📈' : '📉'} Futures: ${direction.toUpperCase()} ${contracts} ${stock.ticker} @ ${stock.currentPrice} | Margin: $${position.margin.toLocaleString()} | Expires: Day ${position.expiryDay}`,
      'info'
    )
    return true
  }

  function openIndexFuturesTrade(indexId, direction, contracts) {
    const game = useGameStore()
    const market = useMarketStore()
    const idxValue = market.getIndexValue(indexId)
    if (!idxValue || idxValue <= 0) return false

    const position = openIndexFutures(indexId, direction, contracts, idxValue, game.day)
    if (!position) return false
    if (game.cash < position.margin) return false

    game.removeCash(position.margin)
    futures.value.push(position)

    const idx = market.activeIndexes.find(i => i.id === indexId)
    transactions.value.unshift({
      type: `index_futures_${direction}`,
      indexId,
      contracts,
      price: idxValue,
      total: position.notional,
      margin: position.margin,
      day: game.day,
      time: new Date().toISOString()
    })
    if (transactions.value.length > 200) transactions.value.pop()

    game.addNotification(
      `${direction === 'long' ? '📈' : '📉'} Index Futures: ${direction.toUpperCase()} ${contracts} ${idx?.ticker || indexId} @ ${idxValue} | Margin: $${position.margin.toLocaleString()} | Expires: Day ${position.expiryDay}`,
      'info'
    )
    return true
  }

  function closeFutures(positionId) {
    const game = useGameStore()
    const market = useMarketStore()
    const idx = futures.value.findIndex(p => p.id === positionId)
    if (idx < 0) return false

    const pos = futures.value[idx]
    if (pos.settled) return false

    let pnl, price
    if (pos.type === 'index_futures') {
      price = market.getIndexValue(pos.indexId) || 0
      pnl = indexFuturesPnL(pos, price, pos.multiplier || 50)
    } else {
      const stock = market.getStock(pos.commodityId)
      if (!stock) return false
      price = stock.currentPrice
      pnl = futuresPnL(pos, price)
    }

    game.addCash(round2(pos.margin + pnl))
    pos.settled = true
    pos.settlementPrice = price
    pos.settlementPnL = pnl

    transactions.value.unshift({
      type: 'futures_close',
      companyId: pos.commodityId,
      contracts: pos.contracts,
      price: stock.currentPrice,
      pnl,
      day: game.day,
      time: new Date().toISOString()
    })
    if (transactions.value.length > 200) transactions.value.pop()

    const emoji = pnl >= 0 ? '✅' : '❌'
    game.addNotification(
      `${emoji} Futures closed: ${pos.direction.toUpperCase()} ${pos.contracts} ${stock.ticker} | P&L: $${pnl.toLocaleString()}`,
      pnl >= 0 ? 'success' : 'warning'
    )
    return true
  }

  /** Check futures positions for expiration and margin calls. Called daily. */
  function checkFutures() {
    const game = useGameStore()
    const market = useMarketStore()

    // Check for expiring positions
    const expiring = checkExpirations(futures.value, game.day)
    for (const pos of expiring) {
      let pnl
      if (pos.type === 'index_futures') {
        const idxVal = market.getIndexValue(pos.indexId) || 0
        pnl = indexFuturesPnL(pos, idxVal, pos.multiplier || 50)
        pos.settlementPrice = idxVal
      } else {
        const stock = market.getStock(pos.commodityId)
        if (!stock) continue
        pnl = futuresPnL(pos, stock.currentPrice)
        pos.settlementPrice = stock.currentPrice
      }
      game.addCash(round2(pos.margin + pnl))
      pos.settled = true
      pos.settlementPnL = pnl
      const emoji = pnl >= 0 ? '📅✅' : '📅❌'
      game.addNotification(
        `${emoji} Futures expired: ${pos.direction.toUpperCase()} ${pos.contracts} ${stock.ticker} | P&L: $${pnl.toLocaleString()}`,
        pnl >= 0 ? 'success' : 'warning'
      )
    }

    // Check margin calls on open positions
    for (const pos of futures.value) {
      if (pos.settled) continue
      if (pos.type === 'index_futures') {
        // Index futures: use simpler margin check
        const idxVal = market.getIndexValue(pos.indexId) || 0
        const pnl = indexFuturesPnL(pos, idxVal, pos.multiplier || 50)
        const maintMargin = round2(pos.margin * 0.7)
        const equity = round2(pos.margin + pnl)
        if (equity < maintMargin) {
          game.addCash(round2(pos.margin + pnl))
          pos.settled = true
          pos.settlementPrice = idxVal
          pos.settlementPnL = pnl
          game.addNotification(`⚠️ Index futures margin call liquidated`, 'error')
        }
      } else {
        const stock = market.getStock(pos.commodityId)
        if (!stock) continue
        const mc = checkMarginCall(pos, stock.currentPrice, game.cash)
        if (mc.called && game.cash < mc.deficit) {
          const pnl = futuresPnL(pos, stock.currentPrice)
          game.addCash(round2(pos.margin + pnl))
          pos.settled = true
          pos.settlementPrice = stock.currentPrice
          pos.settlementPnL = pnl
          game.addNotification(`⚠️ Margin call liquidated: ${pos.direction.toUpperCase()} ${pos.contracts} ${stock.ticker} | P&L: $${pnl.toLocaleString()}`, 'error')
        }
      }
    }
  }

  // Save/Load
  function getSaveState() {
    return {
      holdings: JSON.parse(JSON.stringify(holdings.value)),
      shorts: JSON.parse(JSON.stringify(shorts.value)),
      indexHoldings: JSON.parse(JSON.stringify(indexHoldings.value)),
      options: JSON.parse(JSON.stringify(options.value)),
      orders: JSON.parse(JSON.stringify(orders.value)),
      transactions: transactions.value.slice(0, 200),
      futures: JSON.parse(JSON.stringify(futures.value)),
      nextOptionId: nextOptionId.value,
      nextOrderId: nextOrderId.value
    }
  }

  function loadSaveState(state) {
    if (!state) return
    holdings.value = state.holdings || {}
    shorts.value = state.shorts || {}
    indexHoldings.value = state.indexHoldings || {}
    options.value = state.options || []
    orders.value = state.orders || []
    transactions.value = state.transactions || []
    futures.value = state.futures || []
    nextOptionId.value = state.nextOptionId || 1
    nextOrderId.value = state.nextOrderId || 1
  }

  function resetPortfolio() {
    holdings.value = {}
    shorts.value = {}
    indexHoldings.value = {}
    options.value = []
    orders.value = []
    transactions.value = []
    futures.value = []
    nextOptionId.value = 1
    nextOrderId.value = 1
  }

  return {
    holdings, shorts, options, indexHoldings, transactions, orders, futures,
    totalStockValue, totalIndexValue, totalOptionsValue, totalShortsValue,
    totalFuturesPnL, totalFuturesMargin,
    totalNetWorth, totalInvested, totalProfitLoss, totalPLPercent,
    buyStock, sellStock, shortSell, shortCover, buyIndex, sellIndex, sellIndexSilent,
    buyOption, exerciseOption, expireOptions,
    placeOrder, cancelOrder, checkOrders,
    openFutures, closeFutures, checkFutures, openIndexFuturesTrade,
    getSaveState, loadSaveState, resetPortfolio
  }
})
