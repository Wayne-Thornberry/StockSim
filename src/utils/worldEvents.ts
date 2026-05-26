/**
 * World Events System — Macro-level events that affect sectors or the entire market.
 * Helps players make informed trading decisions by communicating "what the world is doing."
 */

// --- World Event Definitions ---
// Each event has: name, description, icon, category, sectors affected, price impact, duration
export const WORLD_EVENTS = [
  // === GEOPOLITICAL ===
  {
    id: 'war_tensions',
    name: 'Geopolitical Tensions Escalate',
    description: 'Military conflict fears grip global markets. Defense contractors surge while consumer and travel stocks slide on uncertainty.',
    icon: '⚔️',
    category: 'geopolitical',
    effects: [
      { sector: 'Industrial', impact: 0.06, reason: 'Defense contracts expected to rise' },
      { sector: 'Energy', impact: 0.04, reason: 'Oil supply concerns' },
      { sector: 'Consumer', impact: -0.04, reason: 'Consumer confidence shaken' },
      { sector: 'Finance', impact: -0.02, reason: 'Market uncertainty' }
    ],
    duration: 15,
    recurring: true
  },
  {
    id: 'trade_war',
    name: 'Trade War Intensifies',
    description: 'New tariffs announced between major economies. Export-heavy industrials and tech manufacturers face headwinds, while domestic-focused companies benefit.',
    icon: '🏭',
    category: 'geopolitical',
    effects: [
      { sector: 'Technology', impact: -0.05, reason: 'Supply chain disruptions' },
      { sector: 'Industrial', impact: -0.04, reason: 'Export tariffs' },
      { sector: 'Consumer', impact: 0.02, reason: 'Shift to domestic goods' },
      { sector: 'Finance', impact: -0.03, reason: 'Currency volatility' }
    ],
    duration: 20,
    recurring: true
  },
  {
    id: 'peace_deal',
    name: 'Major Peace Agreement Signed',
    description: 'A historic peace deal reduces global tensions. Markets rally on optimism — defense stocks dip but trade-dependent sectors soar.',
    icon: '🕊️',
    category: 'geopolitical',
    effects: [
      { sector: 'Industrial', impact: -0.03, reason: 'Defense spending may decrease' },
      { sector: 'Consumer', impact: 0.05, reason: 'Consumer optimism surges' },
      { sector: 'Finance', impact: 0.04, reason: 'Global trade prospects improve' },
      { sector: 'Technology', impact: 0.03, reason: 'Cross-border tech collaboration' }
    ],
    duration: 10,
    recurring: false
  },
  {
    id: 'sanctions',
    name: 'International Sanctions Imposed',
    description: 'Heavy sanctions target a major economy. Energy prices spike on supply fears while financial institutions with exposure face losses.',
    icon: '🚫',
    category: 'geopolitical',
    effects: [
      { sector: 'Energy', impact: 0.08, reason: 'Supply restrictions' },
      { sector: 'Finance', impact: -0.05, reason: 'Exposure to sanctioned entities' },
      { sector: 'Industrial', impact: -0.03, reason: 'Trade route disruptions' },
      { sector: 'Consumer', impact: -0.02, reason: 'Higher import costs' }
    ],
    duration: 18,
    recurring: true
  },

  // === TECHNOLOGICAL ===
  {
    id: 'ai_breakthrough',
    name: 'Major AI Breakthrough Announced',
    description: 'A landmark advancement in artificial intelligence reshapes the tech landscape. AI-focused companies explode while traditional firms scramble to adapt.',
    icon: '🤖',
    category: 'technological',
    effects: [
      { sector: 'Technology', impact: 0.10, reason: 'AI boom drives tech valuations' },
      { sector: 'Industrial', impact: 0.04, reason: 'Automation potential' },
      { sector: 'Healthcare', impact: 0.05, reason: 'AI drug discovery advances' },
      { sector: 'Finance', impact: 0.03, reason: 'Fintech innovation' }
    ],
    duration: 25,
    recurring: false
  },
  {
    id: 'cyber_attack',
    name: 'Massive Cyber Attack Hits Infrastructure',
    description: 'A coordinated cyber attack targets critical infrastructure. Cybersecurity stocks surge while companies with weak digital defenses suffer.',
    icon: '💻',
    category: 'technological',
    effects: [
      { sector: 'Technology', impact: 0.04, reason: 'Cybersecurity demand spikes' },
      { sector: 'Finance', impact: -0.04, reason: 'Financial data compromised' },
      { sector: 'Energy', impact: -0.03, reason: 'Grid vulnerability exposed' },
      { sector: 'Healthcare', impact: -0.03, reason: 'Patient data at risk' }
    ],
    duration: 8,
    recurring: true
  },
  {
    id: 'tech_revolution',
    name: 'New Computing Paradigm Emerges',
    description: 'A revolutionary computing architecture promises 100x performance gains. The entire tech sector re-rates as investors bet on the next platform shift.',
    icon: '⚡',
    category: 'technological',
    effects: [
      { sector: 'Technology', impact: 0.12, reason: 'Paradigm shift potential' },
      { sector: 'Consumer', impact: 0.05, reason: 'New device ecosystem' },
      { sector: 'Healthcare', impact: 0.06, reason: 'Computational medicine' },
      { sector: 'Finance', impact: 0.04, reason: 'High-frequency trading boost' }
    ],
    duration: 30,
    recurring: false
  },
  {
    id: 'chip_shortage',
    name: 'Global Semiconductor Shortage Worsens',
    description: 'Chip supply constraints reach critical levels. Tech manufacturers face production cuts while semiconductor companies see surging demand for their limited output.',
    icon: '🔌',
    category: 'technological',
    effects: [
      { sector: 'Technology', impact: 0.02, reason: 'Chip makers benefit from scarcity' },
      { sector: 'Consumer', impact: -0.05, reason: 'Electronics production halted' },
      { sector: 'Industrial', impact: -0.03, reason: 'Manufacturing slowdown' }
    ],
    duration: 20,
    recurring: true
  },

  // === ECONOMIC ===
  {
    id: 'rate_hike',
    name: 'Central Banks Aggressively Hike Rates',
    description: 'In a surprise move, major central banks raise interest rates to combat inflation. Financial stocks benefit from higher margins while growth stocks sell off.',
    icon: '🏦',
    category: 'economic',
    effects: [
      { sector: 'Finance', impact: 0.05, reason: 'Higher net interest margins' },
      { sector: 'Technology', impact: -0.06, reason: 'Growth stocks re-rate lower' },
      { sector: 'Consumer', impact: -0.04, reason: 'Borrowing costs rise' },
      { sector: 'Industrial', impact: -0.03, reason: 'Capital investment slows' }
    ],
    duration: 15,
    recurring: true
  },
  {
    id: 'recession_fears',
    name: 'Recession Fears Grip Markets',
    description: 'Economic indicators flash warning signs. Defensive sectors hold up while cyclicals get hammered. Investors flee to safety.',
    icon: '📉',
    category: 'economic',
    effects: [
      { sector: 'Healthcare', impact: 0.03, reason: 'Defensive rotation' },
      { sector: 'Consumer', impact: -0.06, reason: 'Spending slowdown expected' },
      { sector: 'Industrial', impact: -0.05, reason: 'Cyclical downturn' },
      { sector: 'Technology', impact: -0.04, reason: 'Enterprise spending cuts' },
      { sector: 'Finance', impact: -0.03, reason: 'Loan loss provisions rise' }
    ],
    duration: 20,
    recurring: true
  },
  {
    id: 'stimulus',
    name: 'Massive Stimulus Package Announced',
    description: 'Governments unveil unprecedented fiscal stimulus. Consumer spending expectations soar — retail, travel, and discretionary stocks surge.',
    icon: '💰',
    category: 'economic',
    effects: [
      { sector: 'Consumer', impact: 0.07, reason: 'Direct consumer spending boost' },
      { sector: 'Industrial', impact: 0.05, reason: 'Infrastructure projects' },
      { sector: 'Technology', impact: 0.04, reason: 'Enterprise investment' },
      { sector: 'Finance', impact: 0.03, reason: 'Lending activity increases' }
    ],
    duration: 18,
    recurring: false
  },
  {
    id: 'inflation_spike',
    name: 'Inflation Data Shocks Markets',
    description: 'Consumer prices surge well above expectations. Commodity and energy stocks benefit while consumer discretionary takes a hit from eroded purchasing power.',
    icon: '📊',
    category: 'economic',
    effects: [
      { sector: 'Energy', impact: 0.06, reason: 'Commodity price surge' },
      { sector: 'Consumer', impact: -0.05, reason: 'Purchasing power eroded' },
      { sector: 'Finance', impact: -0.02, reason: 'Rate uncertainty' },
      { sector: 'Technology', impact: -0.03, reason: 'Input costs rising' }
    ],
    duration: 12,
    recurring: true
  },

  // === NATURAL / CLIMATE ===
  {
    id: 'natural_disaster',
    name: 'Catastrophic Natural Disaster',
    description: 'A devastating disaster strikes a major economic region. Insurance stocks tumble while construction and energy companies see rebuilding demand.',
    icon: '🌪️',
    category: 'natural',
    effects: [
      { sector: 'Finance', impact: -0.06, reason: 'Insurance losses mount' },
      { sector: 'Industrial', impact: 0.04, reason: 'Rebuilding demand' },
      { sector: 'Energy', impact: 0.03, reason: 'Supply disruption' },
      { sector: 'Consumer', impact: -0.03, reason: 'Regional economic disruption' }
    ],
    duration: 10,
    recurring: true
  },
  {
    id: 'climate_breakthrough',
    name: 'Clean Energy Breakthrough Celebrated',
    description: 'A major advance in renewable energy technology promises cheaper, more efficient power. Green energy stocks rocket while fossil fuel companies face existential questions.',
    icon: '🌱',
    category: 'natural',
    effects: [
      { sector: 'Energy', impact: 0.08, reason: 'Clean tech revolution' },
      { sector: 'Industrial', impact: 0.04, reason: 'Green manufacturing' },
      { sector: 'Technology', impact: 0.03, reason: 'Clean tech integration' },
      { sector: 'Consumer', impact: 0.02, reason: 'Lower energy costs ahead' }
    ],
    duration: 22,
    recurring: false
  },
  {
    id: 'pandemic_scare',
    name: 'New Virus Variant Sparks Concern',
    description: 'Health authorities issue alerts about a new pathogen. Healthcare and pharma stocks rally on treatment demand while travel and consumer stocks slide.',
    icon: '🦠',
    category: 'natural',
    effects: [
      { sector: 'Healthcare', impact: 0.07, reason: 'Treatment & vaccine demand' },
      { sector: 'Consumer', impact: -0.06, reason: 'Travel & leisure hit' },
      { sector: 'Technology', impact: 0.02, reason: 'Remote work boost' },
      { sector: 'Energy', impact: -0.03, reason: 'Demand outlook weakens' }
    ],
    duration: 15,
    recurring: true
  },
  {
    id: 'green_regulation',
    name: 'Landmark Climate Legislation Passed',
    description: 'Sweeping environmental regulations become law. Clean energy and EV companies celebrate while traditional manufacturers face costly compliance.',
    icon: '📜',
    category: 'natural',
    effects: [
      { sector: 'Energy', impact: 0.05, reason: 'Renewable mandates boost demand' },
      { sector: 'Consumer', impact: 0.03, reason: 'EV incentives' },
      { sector: 'Industrial', impact: -0.03, reason: 'Compliance costs' },
      { sector: 'Technology', impact: 0.02, reason: 'Green tech innovation' }
    ],
    duration: 25,
    recurring: false
  },

  // === SOCIAL ===
  {
    id: 'labor_strike',
    name: 'Nationwide Labor Strikes Paralyze Industries',
    description: 'Massive coordinated strikes disrupt manufacturing and logistics. Companies with strong labor relations fare better while union-heavy industries suffer.',
    icon: '✊',
    category: 'social',
    effects: [
      { sector: 'Industrial', impact: -0.05, reason: 'Production halted' },
      { sector: 'Consumer', impact: -0.04, reason: 'Supply chain disruption' },
      { sector: 'Technology', impact: -0.02, reason: 'Hardware delays' }
    ],
    duration: 8,
    recurring: true
  },
  {
    id: 'consumer_boom',
    name: 'Consumer Confidence Hits All-Time High',
    description: 'Shoppers are spending like never before. Retail, travel, and luxury goods see record demand as the "feel-good" economy takes hold.',
    icon: '🛍️',
    category: 'social',
    effects: [
      { sector: 'Consumer', impact: 0.08, reason: 'Record spending' },
      { sector: 'Technology', impact: 0.04, reason: 'Device upgrade cycle' },
      { sector: 'Finance', impact: 0.03, reason: 'Credit card & lending boom' },
      { sector: 'Industrial', impact: 0.02, reason: 'Production ramps up' }
    ],
    duration: 18,
    recurring: false
  },
  {
    id: 'demographic_shift',
    name: 'Demographic Tipping Point Reached',
    description: 'An aging population fundamentally shifts demand patterns. Healthcare and senior-focused services boom while industries targeting younger consumers adapt.',
    icon: '👴',
    category: 'social',
    effects: [
      { sector: 'Healthcare', impact: 0.08, reason: 'Aging population drives demand' },
      { sector: 'Finance', impact: 0.04, reason: 'Retirement & wealth management' },
      { sector: 'Consumer', impact: -0.03, reason: 'Shifting consumption patterns' },
      { sector: 'Technology', impact: 0.02, reason: 'Health tech adoption' }
    ],
    duration: 30,
    recurring: false
  },
  {
    id: 'social_movement',
    name: 'Global Sustainability Movement Gains Momentum',
    description: 'Consumers and investors demand corporate accountability on climate and social issues. ESG-focused companies thrive while laggards face divestment pressure.',
    icon: '🌍',
    category: 'social',
    effects: [
      { sector: 'Energy', impact: 0.04, reason: 'Clean energy investment surge' },
      { sector: 'Consumer', impact: 0.02, reason: 'Sustainable brand premium' },
      { sector: 'Industrial', impact: -0.04, reason: 'Heavy industry under pressure' },
      { sector: 'Technology', impact: 0.03, reason: 'ESG tech solutions' }
    ],
    duration: 25,
    recurring: false
  }
]

// --- Helpers ---

/** Pick a random world event, avoiding recently used ones */
let recentEvents = []
export function pickWorldEvent() {
  // Filter out events used in last 5 picks
  const available = WORLD_EVENTS.filter(e => !recentEvents.includes(e.id))
  const pool = available.length > 0 ? available : WORLD_EVENTS
  const event = pool[Math.floor(Math.random() * pool.length)]
  recentEvents.push(event.id)
  if (recentEvents.length > 5) recentEvents.shift()
  return { ...event } // Return a copy
}

/** Apply a world event's effects to stocks */
export function applyWorldEvent(event, stocks, day, newsFeed) {
  const results = []

  for (const effect of event.effects) {
    for (const [id, stock] of Object.entries(stocks)) {
      if (stock.sector === effect.sector) {
        const impact = effect.impact * (0.7 + Math.random() * 0.6) // 70-130% of base impact
        const newPrice = Math.max(0.01, stock.currentPrice * (1 + impact))
        stock.currentPrice = Math.round(newPrice * 100) / 100
        results.push({ companyId: id, impact })
      }
    }
  }

  // Add to news feed
  const sectorSummary = event.effects.map(e => {
    const dir = e.impact >= 0 ? '▲' : '▼'
    return `${dir} ${e.sector}: ${e.reason}`
  }).join(' | ')

  newsFeed.unshift({
    id: 'world-' + Date.now(),
    eventIcon: event.icon,
    companyId: null,
    companyName: 'Global Markets',
    sector: 'All',
    headline: `${event.name} — ${event.description}`,
    eventLabel: event.category.toUpperCase(),
    eventType: 'world_event',
    category: event.category,
    impact: null,
    day,
    published: true,
    isResult: true,
    sectorSummary,
    worldEventId: event.id,
    duration: event.duration
  })

  return results
}

/** Clear the recent events cache (for new game) */
export function resetWorldEvents() {
  recentEvents = []
}
