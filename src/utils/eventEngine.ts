/**
 * Event & News Engine - Generates scheduled company events and news articles.
 *
 * Events include quarterly earnings, product launches, scandals, etc.
 * News articles appear before events as "hints" for the player.
 */

import { rng, randPick, randInt } from './seededRng.js'
import { EVENT_DEFS, HINT_TEMPLATES } from '@/data/events.js'
import { REASONS, PRODUCTS } from '@/data/sectors.js'

export { EVENT_DEFS }

// --- News hint generation ---

// (HINT_TEMPLATES, REASONS, PRODUCTS imported from data files)

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fillTemplate(template, company) {
  const reason = pickRandom(REASONS[company.sector] || REASONS['Technology'])
  const product = pickRandom(PRODUCTS[company.sector] || PRODUCTS['Technology'])
  return template
    .replace('{company}', company.name)
    .replace('{reason}', reason)
    .replace('{product}', product)
}

/**
 * Generate a news hint article for a company event.
 */
export function generateNewsHint(eventType, company, daysUntil) {
  const templates = HINT_TEMPLATES[eventType] || HINT_TEMPLATES['earningsBeat']
  const headline = fillTemplate(pickRandom(templates), company)

  const timePhrase = daysUntil <= 1 ? 'today' :
    daysUntil <= 3 ? 'in the coming days' :
    daysUntil <= 7 ? 'next week' :
    'in the coming weeks'

  return {
    id: Date.now() + Math.random(),
    companyId: company.id,
    companyName: company.name,
    sector: company.sector,
    headline,
    eventType,
    eventLabel: EVENT_DEFS[eventType]?.label || 'Event',
    eventIcon: EVENT_DEFS[eventType]?.icon || '📋',
    category: EVENT_DEFS[eventType]?.category || 'corporate',
    daysUntil,
    timePhrase,
    day: 0, // set when published
    published: false
  }
}

/**
 * Generate the actual event result article after the event fires.
 */
export function generateEventResult(eventType, company, actualImpact) {
  const resultWord = actualImpact >= 0 ? 'surges' : 'drops'
  const changeWord = actualImpact >= 0 ? 'up' : 'down'
  const pct = Math.abs(actualImpact * 100).toFixed(1)

  const headlines = actualImpact >= 0 ? [
    `{company} stock ${resultWord} ${pct}% after ${EVENT_DEFS[eventType].label.toLowerCase()}.`,
    `{company} shares rally on positive news.`,
    `Investors cheer as {company} delivers strong results.`,
  ] : [
    `{company} stock ${resultWord} ${pct}% on disappointing news.`,
    `{company} shares slide ${changeWord} ${pct}%.`,
    `Sell-off hits {company} after negative development.`,
  ]

  return {
    id: Date.now() + Math.random(),
    companyId: company.id,
    companyName: company.name,
    sector: company.sector,
    headline: fillTemplate(pickRandom(headlines), company),
    eventType,
    eventLabel: EVENT_DEFS[eventType]?.label || 'Event',
    eventIcon: EVENT_DEFS[eventType]?.icon || '📋',
    category: EVENT_DEFS[eventType]?.category || 'corporate',
    impact: actualImpact,
    day: 0,
    published: false,
    isResult: true
  }
}

// --- Calendar system ---

/** Schedule earnings dates for all companies */
export function buildEarningsCalendar(companiesList = null) {
  const list = companiesList || []
  const calendar = {}
  for (const c of list) {
    // Earnings every ~63 trading days (quarterly), staggered
    const offset = Math.floor(Math.random() * 63)
    for (let d = offset + 20; d < 400; d += 63) {
      if (!calendar[d]) calendar[d] = []
      const isBeat = Math.random() > 0.35
      calendar[d].push({
        companyId: c.id,
        eventType: isBeat ? 'earningsBeat' : 'earningsMiss',
        scheduledDay: d
      })
    }
  }
  return calendar
}

/** Schedule random corporate events (product launches, scandals, etc.) */
export function buildRandomEvents(companiesList = null) {
  const list = companiesList || []
  const events = {}
  const corporateTypes = ['productLaunch', 'productFailure', 'scandal', 'layoffs', 'acquisition', 'breakthrough', 'supplyChain', 'buyback']
  const externalTypes = ['regulation', 'upgrade', 'downgrade']
  const majorTypes = ['mergerAnnounced', 'antitrustBreakup', 'goingPrivate'] // rarer, bigger impact

  for (const c of list) {
    const numEvents = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < numEvents; i++) {
      const day = 15 + Math.floor(Math.random() * 350)
      const roll = Math.random()
      let pool
      if (roll < 0.1) pool = majorTypes       // 10% major event
      else if (roll < 0.45) pool = corporateTypes // 35% corporate
      else pool = externalTypes                // 55% external/analyst
      const eventType = pickRandom(pool)
      if (!events[day]) events[day] = []
      events[day].push({
        companyId: c.id,
        eventType,
        scheduledDay: day
      })
    }
  }
  return events
}

/**
 * Merge all calendars into one map: day -> [{ companyId, eventType }]
 */
export function buildFullCalendar(companiesList = null) {
  const earnings = buildEarningsCalendar(companiesList)
  const random = buildRandomEvents(companiesList)
  const merged = {}

  for (const [day, evts] of Object.entries(earnings)) {
    merged[day] = [...(merged[day] || []), ...evts]
  }
  for (const [day, evts] of Object.entries(random)) {
    // Avoid collisions: if already an earnings event at this day, shift
    const dayNum = parseInt(day)
    // Simple dedup: if both exist, keep earnings (first)
    if (!merged[dayNum]) merged[dayNum] = []
    for (const evt of evts) {
      const already = merged[dayNum].find(e => e.companyId === evt.companyId)
      if (!already) merged[dayNum].push(evt)
    }
  }
  return merged
}
