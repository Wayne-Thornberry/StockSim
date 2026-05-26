/**
 * Materials Engine — Tracks global resource supply/demand for commodities.
 *
 * Background variable that influences how commodity prices move.
 * World events, discoveries, and industrial demand shift the balance.
 */
import { rng } from './seededRng.js'
import { round2 } from './marketEngine.js'
import { MATERIALS } from '@/data/materials.js'

/**
 * Initialize materials state.
 */
export function initMaterials() {
  const state = {}
  for (const [key, mat] of Object.entries(MATERIALS)) {
    // Supply and demand start with some randomness around base
    state[key] = {
      supply: round2(mat.baseSupply * (0.85 + rng() * 0.3)),
      demand: round2(mat.baseDemand * (0.85 + rng() * 0.3)),
      volatility: 0.01 + rng() * 0.03
    }
  }
  return state
}

/**
 * Advance materials economy by one month.
 * Returns array of significant events that occurred.
 */
export function tickMaterials(state, worldEvent = null) {
  const events = []

  for (const [key, mat] of Object.entries(state)) {
    // Natural drift: supply and demand shift randomly
    const supplyShift = (rng() - 0.5) * mat.volatility * 2
    const demandShift = (rng() - 0.48) * mat.volatility * 2 // Slight demand growth bias

    mat.supply = round2(Math.max(50, Math.min(200, mat.supply + supplyShift)))
    mat.demand = round2(Math.max(50, Math.min(200, mat.demand + demandShift)))

    // World event overrides
    if (worldEvent) {
      if (worldEvent.id === 'war_tensions' || worldEvent.id === 'sanctions') {
        if (key === 'crude_oil') mat.supply = round2(Math.max(50, mat.supply - 3))
        if (key === 'natural_gas') mat.supply = round2(Math.max(50, mat.supply - 2))
      }
      if (worldEvent.id === 'green_energy_boom') {
        if (key === 'lithium') mat.demand = round2(Math.min(200, mat.demand + 5))
        if (key === 'copper') mat.demand = round2(Math.min(200, mat.demand + 4))
        if (key === 'crude_oil') mat.demand = round2(Math.max(50, mat.demand - 3))
      }
      if (worldEvent.id === 'tech_boom') {
        if (key === 'semiconductor') mat.demand = round2(Math.min(200, mat.demand + 5))
        if (key === 'rare_earth') mat.demand = round2(Math.min(200, mat.demand + 3))
      }
      if (worldEvent.id === 'pandemic') {
        if (key === 'crude_oil') mat.demand = round2(Math.max(50, mat.demand - 8))
        if (key === 'lumber') mat.demand = round2(Math.min(200, mat.demand + 6))
      }
      if (worldEvent.id === 'housing_boom') {
        if (key === 'lumber') mat.demand = round2(Math.min(200, mat.demand + 5))
        if (key === 'steel') mat.demand = round2(Math.min(200, mat.demand + 4))
        if (key === 'copper') mat.demand = round2(Math.min(200, mat.demand + 3))
      }
    }

    // Check for significant imbalances
    const ratio = mat.demand / Math.max(1, mat.supply)
    if (ratio > 1.3 && rng() < 0.1) {
      events.push({
        type: 'material_shortage',
        material: key,
        materialName: MATERIALS[key].name,
        severity: Math.min(1, (ratio - 1.3) / 0.5),
        message: `${MATERIALS[key].name} shortage developing — demand ${Math.round(ratio * 100)}% of supply`,
        day: 0
      })
    }
    if (ratio < 0.75 && rng() < 0.1) {
      events.push({
        type: 'material_glut',
        material: key,
        materialName: MATERIALS[key].name,
        severity: Math.min(1, (0.75 - ratio) / 0.3),
        message: `${MATERIALS[key].name} oversupply — prices under pressure`,
        day: 0
      })
    }
  }

  return events
}

/**
 * Get the supply/demand ratio for a material (affects price drift).
 * > 1.0 = shortage = upward price pressure
 * < 1.0 = glut = downward price pressure
 */
export function getMaterialPressure(state, materialKey) {
  if (!state[materialKey]) return 0
  const mat = state[materialKey]
  const ratio = mat.demand / Math.max(1, mat.supply)
  // Convert ratio to price pressure: centered at 0
  return round2((ratio - 1.0) * 0.5)
}

/**
 * Map commodity IDs to material keys.
 */
export const COMMODITY_MATERIAL_MAP = {
  gold: 'gold',
  silver: 'silver',
  platinum: 'platinum',
  copper: 'copper',
  palladium: 'palladium',
  diamond: 'diamond',
  ruby: 'diamond',    // gem market
  sapphire: 'diamond',// gem market
  crude_wti: 'crude_oil',
  crude_brent: 'crude_oil',
  natural_gas: 'natural_gas',
}
