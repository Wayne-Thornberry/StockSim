/**
 * World Mind — Simulates macro-level forces: nations, economic cycles, geopolitics.
 *
 * The world generates the backdrop that companies and markets operate within.
 * It controls economic cycles, commodity supply, and major geopolitical events.
 */
import { rng } from './seededRng.js'
import { round2 } from './marketEngine.js'

// --- Economic Cycle Phases ---
export const CYCLES = {
  EXPANSION: 'expansion',
  PEAK: 'peak',
  CONTRACTION: 'contraction',
  TROUGH: 'trough',
}

const CYCLE_LABELS = {
  [CYCLES.EXPANSION]: '📈 Expansion',
  [CYCLES.PEAK]: '⚠️ Peak',
  [CYCLES.CONTRACTION]: '📉 Contraction',
  [CYCLES.TROUGH]: '🔻 Trough',
}

/**
 * Initialize world state.
 */
export function initWorldMind(startYear = 1970) {
  return {
    year: startYear,
    cycle: CYCLES.EXPANSION,
    cycleMonths: 0,
    cycleDuration: 60 + Math.floor(rng() * 36), // 5-8 years
    interestRate: 0.05,
    inflation: 0.03,
    gdpGrowth: 0.03,
    regulatoryTone: rng() < 0.5 ? 'moderate' : 'light',
    globalTradeOpenness: 0.7 + rng() * 0.2,
    techAdoptionRate: 0.3 + rng() * 0.2,
    greenTransition: 0.1 + rng() * 0.1,
    pendingEvents: [],    // upcoming geopolitical events
    lastEventYear: startYear - 3,
  }
}

/**
 * Advance the world by one month.
 * Returns { events, cycleChange } for logging.
 */
export function tickWorldMind(state) {
  const results = { events: [], cycleChange: null }

  // 1. Advance economic cycle
  state.cycleMonths++
  if (state.cycleMonths >= state.cycleDuration) {
    const prev = state.cycle
    switch (state.cycle) {
      case CYCLES.EXPANSION:
        state.cycle = CYCLES.PEAK
        state.cycleDuration = 8 + Math.floor(rng() * 8)  // ~8-16 months
        break
      case CYCLES.PEAK:
        state.cycle = CYCLES.CONTRACTION
        state.cycleDuration = 12 + Math.floor(rng() * 24) // 1-3 years
        break
      case CYCLES.CONTRACTION:
        state.cycle = CYCLES.TROUGH
        state.cycleDuration = 8 + Math.floor(rng() * 12)  // 8-20 months
        break
      case CYCLES.TROUGH:
        state.cycle = CYCLES.EXPANSION
        state.cycleDuration = 60 + Math.floor(rng() * 36) // 5-8 years
        break
    }
    state.cycleMonths = 0
    results.cycleChange = { from: prev, to: state.cycle }
    results.events.push({
      type: 'cycle_change',
      icon: state.cycle === CYCLES.EXPANSION ? '📈' : state.cycle === CYCLES.PEAK ? '⚠️' : '📉',
      message: `Economic cycle: ${CYCLE_LABELS[state.cycle]}`,
      severity: state.cycle === CYCLES.CONTRACTION ? 0.7 : 0.3,
    })
  }

  // 2. Update macro indicators based on cycle
  switch (state.cycle) {
    case CYCLES.EXPANSION:
      state.gdpGrowth = round2(0.03 + rng() * 0.02)
      state.interestRate = round2(Math.max(0.02, state.interestRate + (rng() - 0.4) * 0.005))
      state.inflation = round2(0.02 + rng() * 0.02)
      break
    case CYCLES.PEAK:
      state.gdpGrowth = round2(0.02 + rng() * 0.01)
      state.interestRate = round2(Math.min(0.15, state.interestRate + rng() * 0.01))
      state.inflation = round2(0.03 + rng() * 0.02)
      break
    case CYCLES.CONTRACTION:
      state.gdpGrowth = round2(-0.01 + rng() * 0.02)
      state.interestRate = round2(Math.max(0.01, state.interestRate - rng() * 0.01))
      state.inflation = round2(0.01 + rng() * 0.02)
      break
    case CYCLES.TROUGH:
      state.gdpGrowth = round2(-0.005 + rng() * 0.02)
      state.interestRate = round2(Math.max(0.005, state.interestRate - rng() * 0.005))
      state.inflation = round2(0.005 + rng() * 0.015)
      break
  }

  // 3. Gradual structural shifts
  state.techAdoptionRate = round2(Math.min(1.0, state.techAdoptionRate + (rng() - 0.3) * 0.01))
  state.greenTransition = round2(Math.min(1.0, state.greenTransition + (rng() - 0.2) * 0.01))

  // 4. Geopolitical event check (every 2-5 years)
  const yearsSinceEvent = (state.year - state.lastEventYear)
  if (yearsSinceEvent >= 2 && rng() < 0.03 * Math.min(yearsSinceEvent, 5)) {
    const event = generateGeopoliticalEvent(state)
    if (event) {
      results.events.push(event)
      state.lastEventYear = state.year
    }
  }

  return results
}

/**
 * Generate a random geopolitical event.
 */
function generateGeopoliticalEvent(state) {
  const roll = rng()
  const cycle = state.cycle

  // Event pool with cycle-appropriate weights
  const events = []

  // More trade wars during contraction/trough
  if (roll < 0.25) {
    const target = rng() < 0.5 ? 'crudeOil' : 'semiconductor'
    const impact = state.cycle === CYCLES.CONTRACTION ? 'high' : 'moderate'
    events.push({
      type: 'trade_war',
      icon: '🏭',
      message: `Trade tensions escalate — tariffs imposed on key imports`,
      affectedMaterial: target,
      supplyImpact: -10 - Math.floor(rng() * 15),
      severity: impact === 'high' ? 0.8 : 0.5,
    })
  }

  if (roll < 0.45) {
    events.push({
      type: 'geopolitical_conflict',
      icon: '⚔️',
      message: `Geopolitical conflict erupts — markets rattled by uncertainty`,
      affectedMaterial: 'crudeOil',
      supplyImpact: -15 - Math.floor(rng() * 20),
      severity: 0.9,
      sectorImpacts: [
        { sector: 'Industrial', impact: 0.06 },
        { sector: 'Energy', impact: 0.08 },
        { sector: 'Consumer', impact: -0.04 },
      ]
    })
  }

  if (roll < 0.60) {
    events.push({
      type: 'sanctions',
      icon: '🚫',
      message: `International sanctions imposed — energy and finance sectors affected`,
      affectedMaterial: 'crudeOil',
      supplyImpact: -8 - Math.floor(rng() * 12),
      severity: 0.7,
    })
  }

  if (roll < 0.75) {
    events.push({
      type: 'tech_breakthrough',
      icon: '🤖',
      message: `Major technological breakthrough — tech sector rallies`,
      severity: 0.6,
      sectorImpacts: [
        { sector: 'Technology', impact: 0.08 },
        { sector: 'Healthcare', impact: 0.04 },
      ],
      materialImpacts: [
        { material: 'semiconductor', demandShift: 10 },
        { material: 'rare_earth', demandShift: 8 },
      ]
    })
  }

  if (roll < 0.88) {
    events.push({
      type: 'energy_crisis',
      icon: '⛽',
      message: `Energy crisis — oil prices surge on supply fears`,
      affectedMaterial: 'crudeOil',
      supplyImpact: -20 - Math.floor(rng() * 15),
      severity: 0.85,
      sectorImpacts: [
        { sector: 'Energy', impact: 0.12 },
        { sector: 'Consumer', impact: -0.05 },
        { sector: 'Industrial', impact: -0.04 },
      ]
    })
  }

  // Always available: regulatory shift
  events.push({
    type: 'regulatory_shift',
    icon: '⚖️',
    message: state.regulatoryTone === 'light'
      ? `Regulatory environment tightens — increased scrutiny on big business`
      : `Deregulation wave — business-friendly policies sweep in`,
    severity: 0.4,
  })

  return events[Math.floor(rng() * events.length)]
}

/**
 * Get the economic backdrop's effect on a sector's pricing.
 * Returns sector drift modifier.
 */
export function getSectorDrift(state, sector) {
  const cycle = state.cycle
  const base = 0

  // Cyclical sectors do better in expansion, worse in contraction
  const cyclicalSectors = ['Technology', 'Consumer', 'Industrial']
  const defensiveSectors = ['Healthcare', 'Finance']

  if (cyclicalSectors.includes(sector)) {
    if (cycle === CYCLES.EXPANSION) return round2(base + 0.01)
    if (cycle === CYCLES.CONTRACTION) return round2(base - 0.01)
    if (cycle === CYCLES.TROUGH) return round2(base - 0.015)
  }
  if (defensiveSectors.includes(sector)) {
    if (cycle === CYCLES.CONTRACTION) return round2(base + 0.005)
    if (cycle === CYCLES.TROUGH) return round2(base + 0.01)
  }

  // Tech adoption helps technology sector long-term
  if (sector === 'Technology') return round2(base + state.techAdoptionRate * 0.02)
  // Green transition helps energy sector
  if (sector === 'Energy') return round2(base + state.greenTransition * 0.02)

  return 0
}

/**
 * Get the world's interest rate (affects loans, debt-heavy companies).
 */
export function getInterestRate(state) {
  return state.interestRate
}
