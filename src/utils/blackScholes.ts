/**
 * Black-Scholes Option Pricing Model.
 *
 * Computes theoretical fair value for European call/put options.
 * Uses the cumulative normal distribution approximation.
 */
import { round2 } from './marketEngine.js'

/**
 * Standard normal CDF approximation (Abramowitz & Stegun).
 * Accurate to ~1e-7.
 */
function normalCDF(x) {
  const a1 =  0.254829592
  const a2 = -0.284496736
  const a3 =  1.421413741
  const a4 = -1.453152027
  const a5 =  1.061405429
  const p  =  0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2.0)
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1.0 + sign * y)
}

/**
 * Compute Black-Scholes option price.
 *
 * @param {string} type - 'call' or 'put'
 * @param {number} S - Current stock price
 * @param {number} K - Strike price
 * @param {number} T - Time to expiry in years (e.g., 30/365)
 * @param {number} r - Risk-free interest rate (e.g., 0.05)
 * @param {number} sigma - Annual volatility (e.g., 0.30)
 * @returns {number} Fair premium per share (contract = premium × 100)
 */
export function blackScholes(type, S, K, T, r, sigma) {
  if (T <= 0 || S <= 0 || K <= 0) return 0

  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)

  if (type === 'call') {
    return round2(Math.max(0.01, S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2)))
  } else {
    return round2(Math.max(0.01, K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1)))
  }
}

/**
 * Generate strike price options around current price.
 * Returns array of { label, strike, isITM, isATM, isOTM }.
 *
 * @param {number} currentPrice - Current stock price
 * @param {string} type - 'call' or 'put'
 * @returns {Array}
 */
export function generateStrikes(currentPrice, type) {
  const atm = round2(currentPrice)
  const spread = round2(currentPrice * 0.08) // 8% spread

  if (type === 'call') {
    return [
      { label: 'ITM', strike: round2(atm - spread), isITM: true },
      { label: 'ATM', strike: atm, isATM: true },
      { label: 'OTM', strike: round2(atm + spread), isOTM: true },
    ]
  } else {
    return [
      { label: 'ITM', strike: round2(atm + spread), isITM: true },
      { label: 'ATM', strike: atm, isATM: true },
      { label: 'OTM', strike: round2(atm - spread), isOTM: true },
    ]
  }
}

/**
 * Compute premium for all strikes at once.
 * Returns array with premium added.
 */
export function priceStrikes(strikes, currentPrice, type, daysToExpiry, interestRate, volatility) {
  const T = daysToExpiry / 365
  return strikes.map(s => ({
    ...s,
    premium: blackScholes(type, currentPrice, s.strike, T, interestRate, volatility),
  }))
}
