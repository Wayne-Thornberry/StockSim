/**
 * Futures Engine — Commodity futures contract mechanics.
 *
 * Futures are leveraged contracts that expire monthly.
 * Players post margin, gain/lose based on price movement,
 * and must roll or close before expiration.
 */
import { round2 } from './marketEngine.js'

// Contract specifications per commodity
export const FUTURES_SPECS = {
  gold:       { contractSize: 100,   unit: 'oz',     marginRate: 0.12, tickSize: 0.10, tickValue: 10 },
  silver:     { contractSize: 5000,  unit: 'oz',     marginRate: 0.15, tickSize: 0.005, tickValue: 25 },
  platinum:   { contractSize: 50,    unit: 'oz',     marginRate: 0.15, tickSize: 0.10, tickValue: 5 },
  copper:     { contractSize: 25000, unit: 'lb',     marginRate: 0.12, tickSize: 0.0005, tickValue: 12.50 },
  palladium:  { contractSize: 100,   unit: 'oz',     marginRate: 0.18, tickSize: 0.10, tickValue: 10 },
  diamond:    { contractSize: 10,    unit: 'carat',  marginRate: 0.20, tickSize: 1.00, tickValue: 10 },
  ruby:       { contractSize: 5,     unit: 'carat',  marginRate: 0.25, tickSize: 5.00, tickValue: 25 },
  sapphire:   { contractSize: 5,     unit: 'carat',  marginRate: 0.25, tickSize: 5.00, tickValue: 25 },
  crude_wti:  { contractSize: 1000,  unit: 'barrel', marginRate: 0.10, tickSize: 0.01, tickValue: 10 },
  crude_brent:{ contractSize: 1000,  unit: 'barrel', marginRate: 0.10, tickSize: 0.01, tickValue: 10 },
  natural_gas:{ contractSize: 10000, unit: 'MMBtu',  marginRate: 0.12, tickSize: 0.001, tickValue: 10 },
}

const CONTRACT_MONTHS = 30 // Game days per futures contract month

// --- Index Futures ---
export const INDEX_FUTURES_SPECS = {
  // E-mini style: contract multiplier × index value
  default: { multiplier: 50, marginRate: 0.05, tickSize: 0.25, tickValue: 12.50 },
}

/**
 * Calculate index futures contract value.
 */
export function indexContractValue(indexValue, multiplier = 50) {
  return round2(indexValue * multiplier)
}

/**
 * Calculate index futures margin per contract.
 */
export function indexMarginPerContract(indexValue, multiplier = 50, marginRate = 0.05) {
  return round2(indexContractValue(indexValue, multiplier) * marginRate)
}

/**
 * Calculate P&L for an index futures position.
 */
export function indexFuturesPnL(position, currentIndexValue, multiplier = 50) {
  const priceDiff = position.direction === 'long'
    ? currentIndexValue - position.entryIndexValue
    : position.entryIndexValue - currentIndexValue
  return round2(priceDiff * multiplier * position.contracts)
}

/**
 * Create an index futures position.
 */
export function openIndexFutures(indexId, direction, contracts, currentIndexValue, gameDay, multiplier = 50, marginRate = 0.05) {
  const notional = round2(currentIndexValue * multiplier * contracts)
  const margin = round2(notional * marginRate)

  return {
    id: `idx_${indexId}_${Date.now()}`,
    type: 'index_futures',
    indexId,
    direction,
    contracts,
    entryIndexValue: currentIndexValue,
    entryDay: gameDay,
    expiryDay: gameDay + CONTRACT_MONTHS,
    margin,
    notional,
    multiplier,
    settled: false,
  }
}

/**
 * Calculate the notional value of one futures contract.
 */
export function contractValue(commodityId, currentPrice) {
  const spec = FUTURES_SPECS[commodityId]
  if (!spec) return 0
  return round2(spec.contractSize * currentPrice)
}

/**
 * Calculate margin required per contract.
 */
export function marginPerContract(commodityId, currentPrice) {
  const spec = FUTURES_SPECS[commodityId]
  if (!spec) return 0
  return round2(contractValue(commodityId, currentPrice) * spec.marginRate)
}

/**
 * Calculate P&L for a futures position.
 */
export function futuresPnL(position, currentPrice) {
  const spec = FUTURES_SPECS[position.commodityId]
  if (!spec) return 0
  const priceDiff = position.direction === 'long'
    ? currentPrice - position.entryPrice
    : position.entryPrice - currentPrice
  return round2(priceDiff * spec.contractSize * position.contracts)
}

/**
 * Create a new futures position.
 */
export function openFuturesPosition(commodityId, direction, contracts, entryPrice, gameDay) {
  const spec = FUTURES_SPECS[commodityId]
  if (!spec) return null

  const notional = round2(spec.contractSize * entryPrice * contracts)
  const margin = round2(notional * spec.marginRate)

  return {
    id: `${commodityId}_${Date.now()}`,
    commodityId,
    direction,        // 'long' or 'short'
    contracts,
    entryPrice,
    entryDay: gameDay,
    expiryDay: gameDay + CONTRACT_MONTHS,
    margin,
    notional,
    settled: false,
  }
}

/**
 * Check if a futures position should be margin called.
 * Returns { called: bool, deficit: number }.
 */
export function checkMarginCall(position, currentPrice, accountEquity) {
  const spec = FUTURES_SPECS[position.commodityId]
  if (!spec) return { called: false, deficit: 0 }

  const pnl = futuresPnL(position, currentPrice)
  const maintenanceMargin = round2(position.margin * 0.7) // 70% of initial margin

  // Equity in this position = initial margin + P&L
  const positionEquity = round2(position.margin + pnl)

  if (positionEquity < maintenanceMargin) {
    return {
      called: true,
      deficit: round2(maintenanceMargin - positionEquity),
    }
  }
  return { called: false, deficit: 0 }
}

/**
 * Check for expiring positions. Returns positions that expire today.
 */
export function checkExpirations(positions, gameDay) {
  return positions.filter(p => !p.settled && p.expiryDay <= gameDay)
}

/**
 * Settle an expiring futures position at the current price.
 * Returns { pnl, settledPosition }.
 */
export function settleFutures(position, currentPrice) {
  const pnl = futuresPnL(position, currentPrice)
  return {
    ...position,
    settled: true,
    settlementPrice: currentPrice,
    settlementPnL: pnl,
  }
}

/**
 * Get the contract spec for display.
 */
export function getFuturesSpec(commodityId) {
  return FUTURES_SPECS[commodityId] || null
}

/**
 * Get days until expiration.
 */
export function daysUntilExpiry(position, gameDay) {
  return Math.max(0, position.expiryDay - gameDay)
}
