/**
 * Market Mind — Simulates collective investor behavior.
 *
 * The Market is not one entity — it's millions of participants acting as a crowd.
 * This module models sentiment states, participant groups, and collective behaviors
 * that influence price drift, volume, and volatility across the entire market.
 */
import { rng } from './seededRng.js'
import { round2 } from './marketEngine.js'

// --- Sentiment States ---
export const SENTIMENTS = {
  CALM: 'calm',
  GREEDY: 'greedy',
  EUPHORIC: 'euphoric',
  FEARFUL: 'fearful',
  PANICKED: 'panicked'
}

// --- Participant Groups ---
const PARTICIPANTS = {
  institutional:  { weight: 0.45, style: 'trend_aware',   timeHorizon: 'months',  reactivity: 0.4 },
  indexFunds:     { weight: 0.20, style: 'passive',       timeHorizon: 'forever',  reactivity: 0.0 },
  hedgeFunds:     { weight: 0.15, style: 'event_driven',  timeHorizon: 'days',     reactivity: 0.9 },
  marketMakers:   { weight: 0.10, style: 'neutral',       timeHorizon: 'seconds',  reactivity: 0.5 },
  retail:         { weight: 0.08, style: 'emotional',     timeHorizon: 'hours',    reactivity: 1.0 },
  corporateBuyback:{ weight: 0.02, style: 'mechanical',   timeHorizon: 'months',   reactivity: 0.1 },
}

// --- Sentiment transition thresholds ---
const TRANSITIONS = {
  [SENTIMENTS.CALM]: {
    toGreedy: { momentum: 0.03, days: 10 },   // 3%+ rally over 10 days
    toFearful: { shock: true },                 // Negative shock event
  },
  [SENTIMENTS.GREEDY]: {
    toEuphoric: { momentum: 0.08, days: 60 },  // 8%+ rally over 3 months
    toCalm: { decay: true, days: 20 },         // Fades without reinforcement
  },
  [SENTIMENTS.EUPHORIC]: {
    toPanicked: { catalyst: true },            // Any negative catalyst
    toGreedy: { decay: true, days: 30 },       // Slow deflation
  },
  [SENTIMENTS.FEARFUL]: {
    toPanicked: { momentum: -0.05, days: 5 },  // 5%+ drop in a week
    toCalm: { decay: true, days: 15 },         // Fades without reinforcement
  },
  [SENTIMENTS.PANICKED]: {
    toFearful: { decay: true, days: 10 },      // Capitulation ends
    toCalm: { decay: true, days: 25 },         // Recovery
  },
}

/**
 * Initialize market mind state.
 */
export function initMarketMind() {
  return {
    sentiment: SENTIMENTS.CALM,
    sentimentDays: 0,
    momentum: 0,           // trailing 10-day price change
    longMomentum: 0,       // trailing 60-day price change
    recentShocks: [],      // [{ day, severity }]
    volatilityMultiplier: 1.0,
    volumeMultiplier: 1.0,
  }
}

/**
 * Compute the market's aggregate effect on a stock's price drift.
 * Returns { driftModifier, volatilityModifier }
 */
export function getMarketPressure(state, stockPerformance = 0) {
  const s = state.sentiment
  let driftMod = 0
  let volMod = 1.0

  switch (s) {
    case SENTIMENTS.CALM:
      driftMod = stockPerformance * 0.1
      volMod = 1.0
      break
    case SENTIMENTS.GREEDY:
      driftMod = 0.02 + stockPerformance * 0.3
      volMod = 1.2
      break
    case SENTIMENTS.EUPHORIC:
      driftMod = 0.05 + stockPerformance * 0.5
      volMod = 1.5
      break
    case SENTIMENTS.FEARFUL:
      driftMod = -0.02 + stockPerformance * 0.05
      volMod = 1.4
      break
    case SENTIMENTS.PANICKED:
      driftMod = -0.05
      volMod = 2.0
      break
  }

  return {
    driftModifier: round2(driftMod),
    volatilityModifier: round2(volMod * state.volatilityMultiplier),
  }
}

/**
 * Advance market sentiment by one trading day.
 * Call once per day during simulation.
 */
export function tickMarketMind(state, overallMarketChange = 0, hadShock = false) {
  state.sentimentDays++
  const sent = state.sentiment

  // Update momentum
  state.momentum = round2(state.momentum * 0.9 + overallMarketChange * 0.1)
  state.longMomentum = round2(state.longMomentum * 0.98 + overallMarketChange * 0.02)

  if (hadShock) {
    state.recentShocks.push({ day: state.sentimentDays, severity: Math.abs(overallMarketChange) })
    if (state.recentShocks.length > 5) state.recentShocks.shift()
  }

  // Check transitions
  const trans = TRANSITIONS[sent]
  let newSentiment = sent

  switch (sent) {
    case SENTIMENTS.CALM:
      if (state.momentum > trans.toGreedy.momentum && state.sentimentDays > trans.toGreedy.days) {
        newSentiment = SENTIMENTS.GREEDY
      } else if (hadShock && overallMarketChange < -0.03) {
        newSentiment = SENTIMENTS.FEARFUL
      }
      break
    case SENTIMENTS.GREEDY:
      if (state.longMomentum > trans.toEuphoric.momentum && state.sentimentDays > trans.toEuphoric.days) {
        newSentiment = SENTIMENTS.EUPHORIC
      } else if (trans.toCalm.decay && state.sentimentDays > trans.toCalm.days && Math.abs(state.momentum) < 0.005) {
        newSentiment = SENTIMENTS.CALM
      }
      break
    case SENTIMENTS.EUPHORIC:
      if (hadShock && overallMarketChange < -0.02) {
        newSentiment = SENTIMENTS.PANICKED
      } else if (trans.toGreedy.decay && state.sentimentDays > trans.toGreedy.days) {
        newSentiment = SENTIMENTS.GREEDY
      }
      break
    case SENTIMENTS.FEARFUL:
      if (state.momentum < trans.toPanicked.momentum && state.sentimentDays > trans.toPanicked.days) {
        newSentiment = SENTIMENTS.PANICKED
      } else if (trans.toCalm.decay && state.sentimentDays > trans.toCalm.days && state.momentum > -0.01) {
        newSentiment = SENTIMENTS.CALM
      }
      break
    case SENTIMENTS.PANICKED:
      if (trans.toFearful.decay && state.sentimentDays > trans.toFearful.days && state.momentum > -0.02) {
        newSentiment = SENTIMENTS.FEARFUL
      } else if (trans.toCalm.decay && state.sentimentDays > trans.toCalm.days) {
        newSentiment = SENTIMENTS.CALM
      }
      break
  }

  if (newSentiment !== sent) {
    state.sentiment = newSentiment
    state.sentimentDays = 0
    state.momentum = 0
    return { changed: true, from: sent, to: newSentiment }
  }

  return { changed: false }
}

/**
 * Get participant-weighted volume multiplier.
 */
export function getVolumeMultiplier(state) {
  const volBySentiment = {
    [SENTIMENTS.CALM]: 1.0,
    [SENTIMENTS.GREEDY]: 1.3,
    [SENTIMENTS.EUPHORIC]: 1.8,
    [SENTIMENTS.FEARFUL]: 1.5,
    [SENTIMENTS.PANICKED]: 2.5,
  }
  return volBySentiment[state.sentiment] || 1.0
}

/**
 * Get the current sentiment label for display/logging.
 */
export function getSentimentLabel(state) {
  const labels = {
    [SENTIMENTS.CALM]: '⚪ Calm',
    [SENTIMENTS.GREEDY]: '🟢 Greedy',
    [SENTIMENTS.EUPHORIC]: '🔥 Euphoric',
    [SENTIMENTS.FEARFUL]: '🟡 Fearful',
    [SENTIMENTS.PANICKED]: '🔴 Panicked',
  }
  return labels[state.sentiment] || 'Unknown'
}
