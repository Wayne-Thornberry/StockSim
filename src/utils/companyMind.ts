/**
 * Company Mind — Each company is an autonomous agent.
 *
 * Companies have personality traits, goals, and make quarterly decisions.
 * Some decisions work out, others fail. The line must go up, but sometimes it doesn't.
 */
import { rng } from './seededRng.js'
import { round2 } from './marketEngine.js'

// --- Personality traits ---
export function generatePersonality() {
  return {
    riskTolerance: round2(0.1 + rng() * 0.9),     // 0=conservative, 1=aggressive
    innovationBias: round2(0.1 + rng() * 0.9),     // 0=stick to core, 1=R&D moonshots
    ethicalStandard: round2(0.1 + rng() * 0.9),     // 0=cuts corners, 1=squeaky clean
    acquisitionHunger: round2(0.1 + rng() * 0.9),   // 0=organic only, 1=serial acquirer
    transparency: round2(0.1 + rng() * 0.9),        // 0=opaque, 1=over-communicates
    laborRelations: round2(0.1 + rng() * 0.9),      // 0=union-busting, 1=employee-owned
  }
}

// --- Company state (runtime) ---
export function initCompanyState(company) {
  return {
    cash: round2(company.revenue * 1e9 * 0.15),     // 15% of revenue as cash
    debt: round2(company.revenue * 1e9 * company.debtToEquity * 0.3),
    rAndDBudget: round2(company.revenue * 1e9 * 0.08),
    morale: 50 + Math.floor(rng() * 30),            // employee morale 0-100
    reputation: 40 + Math.floor(rng() * 40),        // public reputation 0-100
    productPipeline: Math.floor(rng() * 3),          // products in development
    lastAction: null,
    lastActionResult: null,
    quartersSinceAction: 0,
  }
}

// --- Possible actions with scoring ---
const ACTIONS = {
  launchProduct: {
    name: 'Product Launch',
    icon: '🚀',
    cost: 0.05,       // % of cash
    riskLevel: 0.4,
    successOutcome: { revenueBoost: 0.08, priceBoost: 0.10, moraleBoost: 10, reputationBoost: 5 },
    failureOutcome: { revenueDrop: 0.03, priceDrop: -0.12, moraleDrop: -5, reputationDrop: -10 },
    scoreWeights: { innovationBias: 0.5, cash: 0.2, productPipeline: 0.3 },
  },
  costCutting: {
    name: 'Cost Cutting',
    icon: '🔻',
    cost: 0,
    riskLevel: 0.3,
    successOutcome: { costSaving: 0.10, priceBoost: 0.03, moraleDrop: -10, reputationDrop: -3 },
    failureOutcome: { costSaving: 0.02, priceDrop: -0.05, moraleDrop: -20, reputationDrop: -8 },
    scoreWeights: { riskTolerance: -0.3, cash: -0.5, morale: -0.2 },
  },
  acquireRival: {
    name: 'Acquisition',
    icon: '🤝',
    cost: 0.30,
    riskLevel: 0.6,
    successOutcome: { revenueBoost: 0.15, priceBoost: 0.08, moraleDrop: -5 },
    failureOutcome: { revenueDrop: 0.05, priceDrop: -0.18, moraleDrop: -15, reputationDrop: -10 },
    scoreWeights: { acquisitionHunger: 0.6, cash: 0.3, riskTolerance: 0.1 },
  },
  stockBuyback: {
    name: 'Stock Buyback',
    icon: '💎',
    cost: 0.10,
    riskLevel: 0.2,
    successOutcome: { priceBoost: 0.06, reputationBoost: 3 },
    failureOutcome: { priceDrop: -0.03, cashDrop: 0.05 },
    scoreWeights: { cash: 0.5, riskTolerance: 0.1, transparency: 0.1 },
  },
  rAndDInvestment: {
    name: 'R&D Push',
    icon: '🔬',
    cost: 0.12,
    riskLevel: 0.5,
    successOutcome: { productPipeline: 2, priceBoost: 0.05, reputationBoost: 8, moraleBoost: 5 },
    failureOutcome: { priceDrop: -0.08, cashDrop: 0.05 },
    scoreWeights: { innovationBias: 0.7, cash: 0.2, productPipeline: -0.1 },
  },
  restructure: {
    name: 'Restructuring',
    icon: '🏗️',
    cost: 0.08,
    riskLevel: 0.5,
    successOutcome: { costSaving: 0.15, priceBoost: 0.08, moraleDrop: -8, reputationDrop: -3 },
    failureOutcome: { priceDrop: -0.15, moraleDrop: -25, reputationDrop: -15 },
    scoreWeights: { riskTolerance: 0.3, cash: -0.5, morale: -0.3 },
  },
  expandMarket: {
    name: 'Market Expansion',
    icon: '🌍',
    cost: 0.15,
    riskLevel: 0.45,
    successOutcome: { revenueBoost: 0.12, priceBoost: 0.07, moraleBoost: 5, reputationBoost: 5 },
    failureOutcome: { revenueDrop: 0.04, priceDrop: -0.10, moraleDrop: -5 },
    scoreWeights: { riskTolerance: 0.4, cash: 0.3, innovationBias: 0.2 },
  },
  dividendPayout: {
    name: 'Dividend',
    icon: '💰',
    cost: 0.04,
    riskLevel: 0.1,
    successOutcome: { priceBoost: 0.03, reputationBoost: 5 },
    failureOutcome: { priceBoost: 0.01 },
    scoreWeights: { cash: 0.4, transparency: 0.3, riskTolerance: -0.1 },
  },
}

/**
 * Score and select the best action for a company this quarter.
 * Returns { actionKey, action, success (bool), outcomes }
 */
export function decideCompanyAction(company, state, personality) {
  const scores = []

  for (const [key, action] of Object.entries(ACTIONS)) {
    let score = 0

    // Cash check — can they afford it?
    const costAmount = state.cash * action.cost
    if (costAmount > state.cash * 0.5) {
      score -= 100 // Too expensive
    } else if (costAmount > state.cash * 0.2) {
      score -= 20
    }

    // Score based on personality weights
    const w = action.scoreWeights
    score += (w.innovationBias || 0) * personality.innovationBias * 50
    score += (w.riskTolerance || 0) * personality.riskTolerance * 50
    score += (w.acquisitionHunger || 0) * personality.acquisitionHunger * 50
    score += (w.transparency || 0) * personality.transparency * 50

    // Score based on state
    score += (w.cash || 0) * Math.min(1, state.cash / (company.revenue * 1e9)) * 50
    score += (w.productPipeline || 0) * state.productPipeline * 10
    score += (w.morale || 0) * (state.morale / 100) * 50

    // Random factor
    score += (rng() - 0.5) * 30

    scores.push({ key, action, score })
  }

  // Pick highest scoring (with some randomness — top 3 weighted random)
  scores.sort((a, b) => b.score - a.score)
  const top = scores.slice(0, 3)
  const totalScore = top.reduce((s, a) => s + Math.max(0, a.score), 0) || 1
  let roll = rng() * totalScore
  let chosen = top[0]
  for (const t of top) {
    roll -= Math.max(0, t.score)
    if (roll <= 0) { chosen = t; break }
  }

  // Determine success/failure
  const competence = (50 + personality.innovationBias * 20 + personality.ethicalStandard * 15) / 100
  const successChance = Math.min(0.9, Math.max(0.2, competence - chosen.action.riskLevel * 0.5 + (rng() - 0.5) * 0.3))
  const success = rng() < successChance

  return {
    actionKey: chosen.key,
    action: chosen.action,
    success,
    outcomes: success ? chosen.action.successOutcome : chosen.action.failureOutcome,
  }
}

/**
 * Apply the outcomes of a company decision.
 */
export function applyDecision(company, state, decision, worldState = null) {
  const outcomes = decision.outcomes
  const result = { events: [], priceImpact: 0 }

  // Financial impacts
  if (outcomes.revenueBoost) {
    company.revenue = round2(company.revenue * (1 + outcomes.revenueBoost))
  }
  if (outcomes.revenueDrop) {
    company.revenue = round2(company.revenue * (1 + outcomes.revenueDrop))
  }
  if (outcomes.costSaving) {
    company.profitMargin = round2(Math.min(0.5, company.profitMargin + outcomes.costSaving * 0.5))
  }
  if (outcomes.cashDrop) {
    state.cash = round2(state.cash * (1 - outcomes.cashDrop))
  }
  if (outcomes.productPipeline) {
    state.productPipeline += outcomes.productPipeline
  }

  // Price impact
  if (outcomes.priceBoost) result.priceImpact = outcomes.priceBoost
  if (outcomes.priceDrop) result.priceImpact = outcomes.priceDrop

  // Morale and reputation
  if (outcomes.moraleBoost) state.morale = Math.min(100, state.morale + outcomes.moraleBoost)
  if (outcomes.moraleDrop) state.morale = Math.max(0, state.morale + outcomes.moraleDrop)
  if (outcomes.reputationBoost) state.reputation = Math.min(100, state.reputation + outcomes.reputationBoost)
  if (outcomes.reputationDrop) state.reputation = Math.max(0, state.reputation + outcomes.reputationDrop)

  // Record action
  state.lastAction = decision.actionKey
  state.lastActionResult = decision.success ? 'success' : 'failure'
  state.quartersSinceAction = 0

  // Check for bankruptcy risk
  if (state.cash <= 0 && company.profitMargin < -0.1) {
    result.events.push({
      type: 'bankruptcy_risk',
      icon: '⚠️',
      message: `${company.name} burning cash — bankruptcy risk rising`,
      severity: 0.6,
    })
  }

  return result
}

/**
 * Get a human-readable summary of the company's last action.
 */
export function getActionSummary(company, state) {
  if (!state.lastAction) return null
  const action = ACTIONS[state.lastAction]
  if (!action) return null
  return {
    icon: action.icon,
    text: `${company.name}: ${action.name} — ${state.lastActionResult === 'success' ? '✅ Success' : '❌ Failed'}`,
    success: state.lastActionResult === 'success',
  }
}
