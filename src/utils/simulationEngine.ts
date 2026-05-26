/**
 * Simulation Engine — Forward-simulates stock market history from 1970.
 *
 * Replaces the old backward-fill approach. Generates realistic price histories
 * by walking forward month-by-month, activating companies at their IPO year.
 *
 * All companies' historicalDaily arrays are calendar-aligned so they can be
 * averaged for index charts. Pre-IPO entries use close: null as a sentinel.
 */
import { rng, randomNormal } from './seededRng.js'
import { round2 } from './marketEngine.js'
import { generateSingleCompany } from './companyGenerator.js'
import { initMaterials, tickMaterials, getMaterialPressure, COMMODITY_MATERIAL_MAP } from './materialsEngine.js'
import { initMarketMind, tickMarketMind, getMarketPressure, getVolumeMultiplier, getSentimentLabel } from './marketMind.js'
import { initWorldMind, tickWorldMind, getSectorDrift } from './worldMind.js'
import { initCompanyState, decideCompanyAction, applyDecision, getActionSummary } from './companyMind.js'

const TRADING_DAYS_PER_YEAR = 252
const TRADING_DAYS_PER_MONTH = 21

export function hashSeed(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

function stepDaily(price, trend, volatility) {
  const dt = 1 / TRADING_DAYS_PER_YEAR
  const drift = trend * dt
  const shock = volatility * Math.sqrt(dt) * randomNormal()
  return round2(Math.max(0.01, price * Math.exp(drift + shock)))
}

/** Generate a noise event multiplier for a single company on a single day.
 *  Returns { multiplier, eventType, description } or null if no event fires. */
function tryNoiseEvent(company, noiseChance, daysInPeriod, log) {
  if (company.type === 'commodity') return null
  if (rng() >= noiseChance / daysInPeriod) return null
  const roll = rng()
  if (roll < 0.30) {
    const mult = 1.05 + rng() * 0.20
    log('earningsBeat', '📈', `${company.name} reports strong results`, company.id, company.name, company.sector)
    return { multiplier: mult }
  } else if (roll < 0.55) {
    const mult = 0.80 + rng() * 0.20
    log('earningsMiss', '📉', `${company.name} misses expectations`, company.id, company.name, company.sector)
    return { multiplier: mult }
  } else if (roll < 0.72) {
    const mult = 0.50 + rng() * 0.35
    log('scandal', '⚠️', `${company.name} hit by scandal`, company.id, company.name, company.sector)
    return { multiplier: mult }
  } else if (roll < 0.85) {
    const mult = 0.70 + rng() * 0.25
    log('productFailure', '💥', `${company.name} product launch fails`, company.id, company.name, company.sector)
    return { multiplier: mult }
  } else {
    const mult = 1.15 + rng() * 0.35
    log('breakthrough', '🔬', `${company.name} announces breakthrough`, company.id, company.name, company.sector)
    return { multiplier: mult }
  }
}

/**
 * Main simulation: walks from startYear to endDate.
 *
 * - Activates companies at IPO year
 * - Simulates bankruptcies; replaces failed companies with new IPOs
 * - Injects noise: individual price shocks, sector events, world events
 * - Maintains min/max company count (cap 500)
 */
export async function simulateHistory(companies, startYear, endDate, config = {}, onProgress, onEvent) {
  const endYear = endDate.getFullYear()
  const endMonth = endDate.getMonth()
  const failureRate = config.failureRate || 'medium'
  const crashFreq = config.crashFrequency || 'occasional'
  const regionKey = config.region || 'americas'
  const minCompanies = config.minCompanies || 50
  const maxCompanies = Math.min(config.maxCompanies || 200, 500)

  // Event log helper
  const log = (type, icon, headline, companyId, companyName, sector) => {
    onEvent?.({ type, icon, headline, companyId, companyName, sector })
  }

  // Calculate total months
  let monthsToSim = 0
  for (let y = startYear; y <= endYear; y++) {
    monthsToSim += (y === endYear ? endMonth : 11) + 1
  }

  // Working company list (grows with IPOs)
  let allCompanies = [...companies]
  const sorted = [...allCompanies].sort((a, b) => (a.ipoYear || 1970) - (b.ipoYear || 1970))

  // State maps
  const priceState = {}
  const healthState = {}
  const bankruptIds = new Set()
  const todayYear = endDate.getFullYear()

  for (const c of allCompanies) {
    const ipoY = c.ipoYear || startYear
    priceState[c.id] = round2(Math.max(0.01, c.basePrice * Math.exp(-c.trend * Math.max(1, todayYear - ipoY))))
    healthState[c.id] = c.healthScore || 50
  }

  const activeIds = new Set()
  let ipoIdx = 0

  // Initialize materials economy for commodity pricing
  const materialsState = initMaterials()

  // Initialize AI systems
  const marketMind = initMarketMind()
  const worldMind = initWorldMind(startYear)

  // Initialize company runtime states
  const companyStates = {}
  for (const c of allCompanies) {
    if (c.type !== 'commodity') {
      companyStates[c.id] = initCompanyState(c)
    }
  }

  // Commodities are always active from the start — they don't IPO
  for (const c of allCompanies) {
    if (c.type === 'commodity') activeIds.add(c.id)
  }

  // Aligned bars
  const alignedBars = {}
  const dailyAligned = {}
  for (const c of allCompanies) {
    alignedBars[c.id] = []
    dailyAligned[c.id] = []
  }

  const crashChance = crashFreq === 'common' ? 0.08 : crashFreq === 'occasional' ? 0.03 : 0.01
  const bankruptcyThreshold = failureRate === 'high' ? 20 : failureRate === 'medium' ? 12 : 6
  const bankruptcyCounter = {}
  // Noise multiplier: higher failure rate = more volatile individual shocks
  const noiseChance = failureRate === 'high' ? 0.04 : failureRate === 'medium' ? 0.025 : 0.01

  let tradingDay = 0, monthCount = 0, bankruptcyCount = 0
  onProgress?.('Starting historical simulation...', 0)

  for (let y = startYear; y <= endYear; y++) {
    const lastMonth = y === endYear ? endMonth : 11

    for (let m = 0; m <= lastMonth; m++) {
      monthCount++
      const pct = Math.round((monthCount / monthsToSim) * 86)

      // Tick materials economy each month
      const materialEvents = tickMaterials(materialsState)
      for (const me of materialEvents) {
        if (me.severity > 0.5) {
          log(me.type, me.type === 'material_shortage' ? '📈' : '📉', me.message, null, null, null)
        }
      }

      // Tick world mind — economic cycles, geopolitics
      worldMind.year = y
      const worldResults = tickWorldMind(worldMind)
      for (const we of worldResults.events) {
        log(we.type, we.icon || '🌍', we.message, null, null, null)
      }
      if (worldResults.cycleChange) {
        log('cycle_change', worldResults.cycleChange.to === 'expansion' ? '📈' : '📉',
          `Economic cycle: ${worldResults.cycleChange.to}`, null, null, null)
      }

      // Activate companies whose IPO year is now (commodities already active)
      while (ipoIdx < sorted.length && (sorted[ipoIdx].ipoYear || 1970) <= y) {
        const c = sorted[ipoIdx]
        if (c.type === 'commodity') { ipoIdx++; continue }
        if (!bankruptIds.has(c.id)) {
          activeIds.add(c.id)
          log('ipo', '🔔', `${c.name} (${c.ticker}) IPO — ${c.sector}`, c.id, c.name, c.sector)
        }
        ipoIdx++
      }

      // IPO replacement: if active count < min, generate new companies this year
      const currentActive = [...activeIds].filter(id => !bankruptIds.has(id)).length
      if (currentActive < minCompanies && allCompanies.length < maxCompanies) {
        const needed = Math.min(minCompanies - currentActive, 3) // Add up to 3 per year
        for (let n = 0; n < needed && allCompanies.length < maxCompanies; n++) {
          const newCo = generateSingleCompany(y, regionKey, config)
          allCompanies.push(newCo)
          sorted.push(newCo)
          priceState[newCo.id] = newCo.basePrice * 0.6 // IPO at 60% of target
          healthState[newCo.id] = newCo.healthScore || 55
          alignedBars[newCo.id] = []
          dailyAligned[newCo.id] = []
          activeIds.add(newCo.id)
          log('ipo', '🔔', `${newCo.name} (${newCo.ticker}) IPO — ${newCo.sector}`, newCo.id, newCo.name, newCo.sector)
        }
        sorted.sort((a, b) => (a.ipoYear || 1970) - (b.ipoYear || 1970))
        // Reset ipoIdx to pick up newly sorted entries
        ipoIdx = sorted.findIndex(c => (c.ipoYear || 1970) > y)
        if (ipoIdx < 0) ipoIdx = sorted.length
      }

      if (monthCount % 24 === 0 || monthCount === 1) {
        const active = [...activeIds].filter(id => !bankruptIds.has(id)).length
        onProgress?.(`Simulating ${y}... (${active} active, ${bankruptcyCount} bankrupt, ${allCompanies.length} total)`, pct)
      }

      // --- Market events (annual, Jan, mutually exclusive) ---
      if (m === 0) {
        const marketRoll = rng()
        const boomThreshold = crashChance
        const dipThreshold = boomThreshold + crashChance * 1.5
        const crashThreshold = dipThreshold + crashChance * 0.6

        if (marketRoll < boomThreshold) {
          // Market boom
          onProgress?.(`📈 Market boom in ${y}!`, pct)
          log('market_boom', '📈', `Market boom — widespread rally across all sectors`, null, null, null)
          for (const c of allCompanies) {
            if (activeIds.has(c.id) && !bankruptIds.has(c.id) && c.type !== 'commodity') {
              const boost = 0.10 + rng() * 0.15
              priceState[c.id] = round2(priceState[c.id] * (1 + boost))
              healthState[c.id] = Math.min(100, healthState[c.id] + 5 + Math.floor(rng() * 10))
            } else if (activeIds.has(c.id) && c.type === 'commodity') {
              if (c.id === 'gold') {
                priceState[c.id] = round2(priceState[c.id] * (0.95 + rng() * 0.10))
              } else {
                priceState[c.id] = round2(priceState[c.id] * (1.05 + rng() * 0.10))
              }
            }
          }
        } else if (marketRoll < dipThreshold) {
          // Market dip/correction
          onProgress?.(`📉 Market dip in ${y}!`, pct)
          log('market_dip', '📉', `Market correction — mild selloff across sectors`, null, null, null)
          for (const c of allCompanies) {
            if (activeIds.has(c.id) && !bankruptIds.has(c.id) && c.type !== 'commodity') {
              const drop = 0.05 + rng() * 0.10
              priceState[c.id] = round2(Math.max(0.01, priceState[c.id] * (1 - drop)))
              healthState[c.id] = Math.max(0, healthState[c.id] - 3 - Math.floor(rng() * 5))
            }
          }
        } else if (marketRoll < crashThreshold) {
          // Market crash
          onProgress?.(`💥 Market crash in ${y}!`, pct)
          log('market_crash', '💥', `Market crash — panic selling across all sectors`, null, null, null)
          for (const c of allCompanies) {
            if (activeIds.has(c.id) && !bankruptIds.has(c.id)) {
              if (c.type === 'commodity') {
                if (c.id === 'gold' || c.id === 'silver') {
                  priceState[c.id] = round2(priceState[c.id] * (1.05 + rng() * 0.10))
                } else {
                  priceState[c.id] = round2(Math.max(0.01, priceState[c.id] * (1 - (0.05 + rng() * 0.10))))
                }
              } else {
                const drop = 0.15 + rng() * 0.25
                priceState[c.id] = round2(Math.max(0.01, priceState[c.id] * (1 - drop)))
                healthState[c.id] = Math.max(0, healthState[c.id] - 15 - Math.floor(rng() * 15))
              }
            }
          }
        }
      }

      // --- Sector rotation event (every ~5 years) ---
      if (m === 0 && y % 5 === 0 && rng() < 0.6) {
        const sectors = ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Industrial']
        const hot = sectors[Math.floor(rng() * sectors.length)]
        const cold = sectors.filter(s => s !== hot)[Math.floor(rng() * (sectors.length - 1))]
        log('sector_rotation', '🔄', `${hot} sector surges, ${cold} falls out of favor`, null, null, hot)
        for (const c of allCompanies) {
          if (!activeIds.has(c.id) || bankruptIds.has(c.id) || c.type === 'commodity') continue
          if (c.sector === hot) {
            const boost = 0.05 + rng() * 0.10
            priceState[c.id] = round2(priceState[c.id] * (1 + boost))
          } else if (c.sector === cold) {
            const drop = 0.03 + rng() * 0.07
            priceState[c.id] = round2(Math.max(0.01, priceState[c.id] * (1 - drop)))
          }
        }
        onProgress?.(`🔄 Sector rotation: ${hot} ↑ ${cold} ↓ in ${y}`, pct)
      }

      // Tick market mind each month (sentiment update)
      const avgChange = computeAverageChange(allCompanies, activeIds, bankruptIds, priceState)
      const marketResult = tickMarketMind(marketMind, avgChange, false)
      if (marketResult.changed) {
        log('market_sentiment', marketResult.to === 'panicked' ? '🔴' : marketResult.to === 'euphoric' ? '🔥' : '📊',
          `Market sentiment shifts: ${getSentimentLabel(marketMind)}`, null, null, null)
      }

      // Company quarterly decisions (every ~3 months)
      if (m % 3 === 0) {
        for (const c of allCompanies) {
          if (!activeIds.has(c.id) || bankruptIds.has(c.id) || c.type === 'commodity') continue
          const cs = companyStates[c.id]
          if (!cs) continue
          cs.quartersSinceAction = (cs.quartersSinceAction || 0) + 1
          if (cs.quartersSinceAction >= 2 + Math.floor(rng() * 2)) {
            const personality = c.personality || {}
            const decision = decideCompanyAction(c, cs, personality)
            if (decision) {
              const result = applyDecision(c, cs, decision, worldMind)
              if (result.priceImpact !== 0) {
                priceState[c.id] = round2(Math.max(0.01, priceState[c.id] * (1 + result.priceImpact)))
              }
              const summary = getActionSummary(c, cs)
              if (summary) {
                log('company_action', summary.icon, summary.text, c.id, c.name, c.sector)
              }
              for (const evt of result.events) {
                log(evt.type, evt.icon, evt.message, c.id, c.name, c.sector)
              }
            }
          }
        }
      }

      const daysThisMonth = TRADING_DAYS_PER_MONTH
      const isRecentYear = y >= endYear - 1

      // --- Daily simulation ---
      if (isRecentYear) {
        for (let d = 0; d < daysThisMonth; d++) {
          tradingDay++
          const dayOffset = tradingDay - Math.round(TRADING_DAYS_PER_YEAR * (endYear - startYear + 1))

          for (const c of allCompanies) {
            if (activeIds.has(c.id) && !bankruptIds.has(c.id)) {
              const prev = priceState[c.id]

              // Inject noise: individual company shocks (skip commodities)
              const noise = tryNoiseEvent(c, noiseChance, daysThisMonth, log)
              const noiseMultiplier = noise ? noise.multiplier : 1.0

              // Commodity pricing: apply materials economy pressure
              let materialDrift = 0
              if (isCommodity) {
                const matKey = COMMODITY_MATERIAL_MAP[c.id] || null
                if (matKey) {
                  materialDrift = getMaterialPressure(materialsState, matKey) * 0.002
                }
              }

              // Market AI pressure + World sector drift
              const mktPressure = getMarketPressure(marketMind, c.trend)
              const sectorDrift = getSectorDrift(worldMind, c.sector)

              const adjustedTrend = c.trend + materialDrift + mktPressure.driftModifier + sectorDrift
              const baseNext = stepDaily(prev, adjustedTrend, c.volatility * mktPressure.volatilityModifier)
              const next = round2(Math.max(0.01, baseNext * noiseMultiplier))
              priceState[c.id] = next
              dailyAligned[c.id].push({
                day: dayOffset, open: prev,
                high: round2(Math.max(prev, next) * (1 + Math.abs(randomNormal() * 0.015))),
                low: round2(Math.min(prev, next) * (1 - Math.abs(randomNormal() * 0.015))),
                close: next
              })
            } else if (bankruptIds.has(c.id)) {
              dailyAligned[c.id].push({ day: dayOffset, open: 0.01, high: 0.01, low: 0.01, close: 0.01 })
            } else {
              dailyAligned[c.id].push({ day: dayOffset, open: null, high: null, low: null, close: null })
            }
          }
        }
      } else {
        // --- Monthly aggregation ---
        const monthOpen = {}, monthHigh = {}, monthLow = {}, monthClose = {}
        for (const c of allCompanies) {
          if (activeIds.has(c.id) && !bankruptIds.has(c.id)) {
            const p = priceState[c.id]
            monthOpen[c.id] = p; monthHigh[c.id] = p; monthLow[c.id] = p
          }
        }

        for (let d = 0; d < daysThisMonth; d++) {
          tradingDay++
          for (const c of allCompanies) {
            if (!activeIds.has(c.id) || bankruptIds.has(c.id)) continue
            const prev = priceState[c.id]

            const noise = tryNoiseEvent(c, noiseChance, daysThisMonth, log)
            const noiseMultiplier = noise ? noise.multiplier : 1.0

            // Commodity pricing: apply materials economy pressure
            let materialDrift = 0
            if (c.type === 'commodity') {
              const matKey = COMMODITY_MATERIAL_MAP[c.id] || null
              if (matKey) materialDrift = getMaterialPressure(materialsState, matKey) * 0.002
            }

            // Market AI pressure + World sector drift
            const mktPressure = getMarketPressure(marketMind, c.trend)
            const sectorDrift = getSectorDrift(worldMind, c.sector)

            const adjustedTrend = c.trend + materialDrift + mktPressure.driftModifier + sectorDrift
            const baseNext = stepDaily(prev, adjustedTrend, c.volatility * mktPressure.volatilityModifier)
            const next = round2(Math.max(0.01, baseNext * noiseMultiplier))
            priceState[c.id] = next
            if (next > monthHigh[c.id]) monthHigh[c.id] = next
            if (next < monthLow[c.id]) monthLow[c.id] = next
            monthClose[c.id] = next
          }
        }

        const dayOffset = tradingDay - Math.round(TRADING_DAYS_PER_YEAR * (endYear - startYear + 1))
        for (const c of allCompanies) {
          if (activeIds.has(c.id) && !bankruptIds.has(c.id)) {
            alignedBars[c.id].push({
              day: dayOffset,
              open: round2(monthOpen[c.id]),
              high: round2(monthHigh[c.id]),
              low: round2(monthLow[c.id]),
              close: round2(monthClose[c.id])
            })

            // Health tracking (companies only, not commodities)
            if (c.type !== 'commodity') {
              const mc = (monthClose[c.id] - monthOpen[c.id]) / monthOpen[c.id]
              if (mc < -0.20) healthState[c.id] = Math.max(0, healthState[c.id] - 12)
              else if (mc < -0.08) healthState[c.id] = Math.max(0, healthState[c.id] - 5)
              else if (mc > 0.15) healthState[c.id] = Math.min(100, healthState[c.id] + 3)

              // Bankruptcy
              if (healthState[c.id] <= bankruptcyThreshold) {
                bankruptcyCounter[c.id] = (bankruptcyCounter[c.id] || 0) + 1
                if (bankruptcyCounter[c.id] >= 6) {
                  bankruptIds.add(c.id)
                  bankruptcyCount++
                  priceState[c.id] = 0.01
                  log('bankruptcy', '💀', `${c.name} files for bankruptcy — delisted`, c.id, c.name, c.sector)
                }
              } else {
                bankruptcyCounter[c.id] = 0
              }
            }
          } else if (bankruptIds.has(c.id)) {
            alignedBars[c.id].push({ day: dayOffset, open: 0.01, high: 0.01, low: 0.01, close: 0.01 })
          } else {
            alignedBars[c.id].push({ day: dayOffset, open: null, high: null, low: null, close: null })
          }
        }
      }
    }

    if (y % 2 === 0) await new Promise(r => setTimeout(r, 0))
  }

  // Build final dataset
  onProgress?.('Building final dataset...', 92)
  await new Promise(r => setTimeout(r, 0))

  const historicalData = {}
  for (const c of allCompanies) {
    const combined = [...alignedBars[c.id], ...dailyAligned[c.id]]
    let lastDay = 0
    for (let i = combined.length - 1; i >= 0; i--) {
      if (combined[i].close !== null) { lastDay = combined[i].day; break }
    }
    const bars = combined.map(b => ({ ...b, day: b.day - lastDay }))
    let finalPrice = c.basePrice
    for (let i = bars.length - 1; i >= 0; i--) {
      if (bars[i].close !== null) { finalPrice = bars[i].close; break }
    }
    historicalData[c.id] = { bars, finalPrice, bankrupt: bankruptIds.has(c.id) }
  }

  onProgress?.('Ready!', 100)
  return { historicalData, allCompanies, totalMonths: monthCount, bankruptcyCount }
}

/**
 * Compute average daily price change across active companies.
 */
function computeAverageChange(allCompanies, activeIds, bankruptIds, priceState) {
  let sum = 0, count = 0
  for (const c of allCompanies) {
    if (!activeIds.has(c.id) || bankruptIds.has(c.id)) continue
    // Use trend as a proxy for recent change
    sum += c.trend || 0
    count++
  }
  return count > 0 ? sum / count : 0
}
