/**
 * Market Engine - Simulates stock price movements.
 *
 * Uses geometric Brownian motion with drift for realistic price movement.
 * Each tick advances time by a configurable amount.
 */

import { rng, randomNormal } from './seededRng.js'

/** Round to 2 decimal places to avoid floating-point artifacts */
export function round2(n) {
  return Math.round(n * 100) / 100
}

// --- Historical data generation ---

/**
 * Generate 1 year (252 trading days) of daily historical OHLC data.
 * Walks forward from a seed price so the series is consistent and
 * the last day's close IS the current price.
 */
export function generateHistoricalDaily(company, startDate = null) {
  const daily = []
  const dt = 1 / 252

  // IPO year to game start: generate monthly for older years, daily for recent 5
  const ipoYear = company.ipoYear || company.established || 2015
  const endYear = startDate ? startDate.getFullYear() : new Date().getFullYear()
  const totalYears = Math.max(1, endYear - ipoYear)
  const recentYears = Math.min(5, totalYears)

  // Walk forward from IPO price
  let price = company.basePrice * Math.exp(-company.trend * totalYears)
  price = round2(Math.max(0.01, price))

  // Monthly data for older years (12 bars per year), then daily for recent 5
  const monthlyBars = totalYears > recentYears ? (totalYears - recentYears) * 12 : 0
  const dailyBars = recentYears * 252
  const totalBars = monthlyBars + dailyBars

  // Generate from IPO to today
  let calOffset = -(monthlyBars * 30 + dailyBars)

  for (let i = 0; i < monthlyBars; i++) {
    const monthlyDt = 1 / 12
    const drift = company.trend * monthlyDt
    const vol = company.volatility * Math.sqrt(monthlyDt)
    const close = price * Math.exp(drift + vol * randomNormal())
    daily.push({
      day: calOffset,
      open: price,
      high: round2(Math.max(price, close) * (1 + Math.abs(randomNormal() * 0.02))),
      low: round2(Math.min(price, close) * (1 - Math.abs(randomNormal() * 0.02))),
      close: round2(Math.max(0.01, close))
    })
    price = close
    calOffset += 30
  }

  for (let i = 0; i < dailyBars; i++) {
    const open = price
    const drift = company.trend * dt
    const vol = company.volatility * Math.sqrt(dt)
    const intraHigh = open * (1 + Math.abs(randomNormal() * company.volatility * 0.15))
    const intraLow = open * (1 - Math.abs(randomNormal() * company.volatility * 0.12))
    const close = open * Math.exp(drift + vol * randomNormal())
    daily.push({
      day: calOffset,
      open: round2(Math.max(0.01, open)),
      high: round2(Math.max(0.01, Math.max(open, intraHigh, close))),
      low: round2(Math.max(0.01, Math.min(open, intraLow, close))),
      close: round2(Math.max(0.01, close))
    })
    price = close
    calOffset++
  }

  const currentPrice = round2(Math.max(0.01, price))
  return { daily, currentPrice }
}

/**
 * Create the initial intraday price history.
 * Starts from the given price and generates `numPoints` ticks forward.
 */
export function generatePriceHistory(company, numPoints = 60, startPrice = null) {
  const history = []
  let price = startPrice ?? company.basePrice
  const dt = 1 / (252 * 78)

  for (let i = numPoints - 1; i >= 0; i--) {
    const drift = company.trend * dt
    const diffusion = company.volatility * Math.sqrt(dt) * randomNormal()
    price = price * Math.exp(drift + diffusion)
    history.push({
      time: -(i + 1),
      price: round2(Math.max(0.01, price))
    })
  }

  // Current tick
  const drift = company.trend * dt
  const diffusion = company.volatility * Math.sqrt(dt) * randomNormal()
  price = price * Math.exp(drift + diffusion)
  history.push({
    time: 0,
    price: round2(Math.max(0.01, price))
  })

  return history
}

/**
 * Create initial state for all companies using pre-simulated historical data.
 * @param {Array} companiesList - Company definitions
 * @param {Object} simulationResult - From simulateHistory() — { historicalData: { [id]: { bars, finalPrice } } }
 */
export function initializeMarket(companiesList = null, simulationResult = null) {
  const list = companiesList || []
  const stocks = {}
  for (const company of list) {
    const hist = simulationResult?.historicalData?.[company.id]
    let currentPrice = hist?.finalPrice ?? company.basePrice
    const startForIntraday = currentPrice * Math.exp(-company.trend * (60 / (252 * 78)))
    const intraday = generatePriceHistory(company, 60, round2(startForIntraday))
    if (intraday.length > 0) {
      intraday[intraday.length - 1].price = currentPrice
    }
    const bars = hist?.bars ?? []

    // Apply stock splits for pre-existing high prices (from simulation)
    // so the game starts with reasonable per-share prices
    let splitFactor = 1
    while (currentPrice > 1000 && (company as any).type !== 'commodity') {
      currentPrice = round2(currentPrice / 2)
      splitFactor *= 2
    }
    if (splitFactor > 1) {
      company.outstandingShares = Math.floor(company.outstandingShares * splitFactor)
      for (let i = 0; i < intraday.length; i++) {
        intraday[i].price = round2(intraday[i].price / splitFactor)
      }
      for (const bar of bars) {
        if (bar.open !== null) bar.open = round2(bar.open / splitFactor)
        if (bar.high !== null) bar.high = round2(bar.high / splitFactor)
        if (bar.low !== null) bar.low = round2(bar.low / splitFactor)
        if (bar.close !== null) bar.close = round2(bar.close / splitFactor)
      }
    }

    stocks[company.id] = {
      ...company,
      priceHistory: intraday,
      historicalDaily: bars,
      currentPrice: currentPrice,
      dayOpen: currentPrice,
      dayHigh: currentPrice,
      dayLow: currentPrice,
      _dailyVolume: 0,
      volumeHistory: [],
      bankrupt: hist?.bankrupt ?? false
    }
  }
  return stocks
}

/**
 * Advance a single company's price by one tick.
 * phase: 'pre-market' | 'regular' | 'after-hours'
 * sectorMomentum: average return of the sector (for correlation)
 */
export function tickPrice(currentPrice, company, tickDurationMinutes = 5, marketEvent = null, phase = 'regular', sectorMomentum = 0) {
  const dt = tickDurationMinutes / (252 * 390)
  let drift = company.trend * dt
  let vol = company.volatility

  // Sector correlation: 15% of movement follows the sector
  if (sectorMomentum !== 0) {
    drift += sectorMomentum * 0.15
  }

  // Interest rate effect: higher rates = lower drift for high-debt companies
  if (company.debtToEquity > 1.5) {
    drift -= 0.0001 * company.debtToEquity * dt * 50
  }

  if (marketEvent) {
    if (marketEvent.type === 'bull') drift += 0.003 * dt * 50
    else if (marketEvent.type === 'bear') drift -= 0.003 * dt * 50
    else if (marketEvent.type === 'crash') {
      drift -= 0.02 * dt * 50
      vol *= 2
    }
  }

  // Pre-market: 70% reduced vol, 50% reduced drift
  if (phase === 'pre-market') {
    drift *= 0.5
    vol *= 0.3
  }
  // After-hours: 50% reduced volatility and muted drift
  else if (phase === 'after-hours') {
    drift *= 0.4
    vol *= 0.5
  }

  const shock = vol * Math.sqrt(dt) * randomNormal()
  const newPrice = currentPrice * Math.exp(drift + shock)
  return round2(Math.max(0.01, newPrice))
}

const EVENT_TYPES = ['bull', 'bear', 'crash', null, null, null, null, null]
const EVENT_NAMES = {
  bull: 'Market Rally! 📈',
  bear: 'Market Dip 📉',
  crash: 'Market Crash! 💥'
}

let currentEvent = null
let eventTimer = 0

export function getCurrentEvent() {
  return currentEvent
}

/**
 * Check if a random market event should occur.
 * Call once per tick.
 */
export function checkMarketEvent() {
  if (currentEvent) {
    eventTimer--
    if (eventTimer <= 0) {
      currentEvent = null
    }
    return currentEvent
  }

  // Small chance of event each tick (seeded RNG for reproducibility)
  if (rng() < 0.02) {
    const idx = Math.floor(rng() * EVENT_TYPES.length)
    const eventType = EVENT_TYPES[idx]
    if (eventType) {
      currentEvent = { type: eventType, name: EVENT_NAMES[eventType] }
      eventTimer = eventType === 'crash' ? 3 : 5
      return currentEvent
    }
  }
  return null
}

/**
 * Record an end-of-day snapshot to historicalDaily.
 */
export function recordDailySnapshot(stock, currentDay) {
  stock.historicalDaily.push({
    day: currentDay,
    open: stock.dayOpen,
    high: stock.dayHigh,
    low: stock.dayLow,
    close: stock.currentPrice
  })
  // Reset day OHLC
  stock.dayOpen = stock.currentPrice
  stock.dayHigh = stock.currentPrice
  stock.dayLow = stock.currentPrice
}
