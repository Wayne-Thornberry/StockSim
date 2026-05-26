/**
 * Company Generator — creates random companies from a seed.
 * Called once at game init to generate the company roster.
 */
import { rng, randPick, randFloat, randInt } from './seededRng.js'
import { generatePersonality } from './companyMind.js'
import { PREFIXES, SUFFIXES } from '@/data/names.js'
import { SECTORS, SECTOR_WEIGHTS, SECTOR_PARAMS, SECTOR_DESCRIPTIONS } from '@/data/sectors.js'
import { COMMODITY_METALS, COMMODITY_GEMS, COMMODITY_ENERGY, COMMODITY_DEFAULTS } from '@/data/commodities.js'
import { BASE_INDEXES } from '@/data/indexes.js'

const REGIONS = {
  americas: ['americas'],
  europe: ['europe'],
  asia: ['asia'],
  india: ['india'],
  global: ['americas', 'europe', 'asia', 'india']
}

function generateName() {
  const roll = rng()
  if (roll < 0.25) {
    // Two-word name
    return randPick(PREFIXES) + ' ' + randPick(SUFFIXES)
  }
  if (roll < 0.55) {
    // Single combined word
    return randPick(PREFIXES) + randPick(SUFFIXES)
  }
  if (roll < 0.75) {
    // Three-letter initialism + full name
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let init = ''
    for (let i = 0; i < 3; i++) init += chars[Math.floor(rng() * 26)]
    return init + ' ' + randPick(PREFIXES)
  }
  // Compound prefix
  return randPick(PREFIXES) + randPick(PREFIXES.slice(0, 20))
}

function generateTicker(name) {
  const words = name.split(' ')
  if (words.length >= 2) {
    return (words[0][0] + words[1].slice(0, 2)).toUpperCase()
  }
  return name.replace(/[aeiou]/gi, '').substring(0, 4).toUpperCase()
}

function generateDescription(sector, name) {
  return randPick(SECTOR_DESCRIPTIONS[sector] || SECTOR_DESCRIPTIONS['Technology'])
}

/**
 * Generate a list of companies with full procedural attributes.
 * @param {number} count - Number of companies to generate
 * @param {string} regionKey - Primary region
 * @param {Object} config - Game config { marketBias, failureRate, crashFrequency }
 * @returns {Array} Array of company objects
 */
export function generateCompanies(count = 50, regionKey = 'americas', config = {}) {
  const result = []
  const usedNames = new Set()
  const usedTickers = new Set()

  // Market bias shifts trend ranges
  const biasShift = config.marketBias === 'bullish' ? 0.04 : config.marketBias === 'bearish' ? -0.04 : 0

  for (let i = 0; i < count; i++) {
    const r = rng()
    let cumulative = 0
    let sector = 'Technology'
    for (const [s, w] of Object.entries(SECTOR_WEIGHTS)) {
      cumulative += w
      if (r <= cumulative) { sector = s; break }
    }

    // Generate unique name/ticker
    let name, ticker
    do {
      name = generateName()
      ticker = generateTicker(name)
    } while (usedNames.has(name) || usedTickers.has(ticker))
    usedNames.add(name)
    usedTickers.add(ticker)

    // Assign region — weighted to primary, some global
    const isGlobal = rng() < 0.12
    const regions = isGlobal ? REGIONS.global : [regionKey]
    if (!isGlobal && rng() < 0.3) {
      const others = Object.keys(REGIONS).filter(k => k !== regionKey && k !== 'global')
      regions.push(randPick(others))
    }

    const sp = SECTOR_PARAMS[sector]
    const basePrice = parseFloat(randFloat(sp.basePrice[0], sp.basePrice[1]).toFixed(2))
    const volatility = parseFloat(randFloat(sp.volatility[0], sp.volatility[1]).toFixed(3))

    // Trend: shift by bias, wider negative range for more failures
    const trendMin = sp.trend[0] + biasShift - (config.failureRate === 'high' ? 0.05 : config.failureRate === 'medium' ? 0.02 : 0)
    const trendMax = sp.trend[1] + biasShift
    const trend = parseFloat(randFloat(Math.min(trendMin, trendMax), trendMax).toFixed(3))

    const outstandingShares = randInt(50_000_000, 2_000_000_000)
    const revenue = parseFloat(randFloat(0.5, 200).toFixed(1))
    const profitMargin = parseFloat(randFloat(
      config.failureRate === 'high' ? -0.5 : -0.3,
      0.4
    ).toFixed(2))
    const debtToEquity = parseFloat(randFloat(0.1, config.failureRate === 'high' ? 5.0 : 3.5).toFixed(1))
    const employees = randInt(2000, 400_000)
    const est = randInt(1970, 2020)
    const sentiments = ['bullish', 'neutral', 'bearish']
    const ipoY = Math.min(est + randInt(1, 5), 2024)

    // Financial health score: 0-100, used by simulation for bankruptcy checks
    const healthBase = profitMargin > 0.15 ? 75 : profitMargin > 0 ? 55 : profitMargin > -0.1 ? 35 : 15
    const healthScore = Math.max(5, Math.min(95, healthBase + randInt(-10, 10)))

    result.push({
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      ticker,
      name,
      sector,
      basePrice,
      volatility,
      trend,
      outstandingShares,
      description: generateDescription(sector, name),
      region: regions,
      revenue,
      profitMargin,
      peRatio: profitMargin > 0 ? randInt(8, 60) : null,
      debtToEquity,
      employees,
      established: est,
      ipoYear: ipoY,
      sentiment: randPick(sentiments),
      healthScore,
      personality: generatePersonality()
    })
  }

  return result
}

/**
 * Generate commodity markets (metals, gems, energy)
 */
export function generateCommodities() {
  return [...COMMODITY_METALS, ...COMMODITY_GEMS, ...COMMODITY_ENERGY].map(c => ({
    ...c,
    ...COMMODITY_DEFAULTS,
    category: COMMODITY_METALS.includes(c) ? 'metal' : COMMODITY_GEMS.includes(c) ? 'gem' : 'energy',
    unit: c.unit || 'unit',
  }))
}

/**
 * Generate a single company for IPO replacement during simulation.
 * @param {number} ipoYear - Year the company goes public
 * @param {string} regionKey - Primary region
 * @param {Object} config - Game config
 * @returns {Object} Company object
 */
export function generateSingleCompany(ipoYear, regionKey = 'americas', config = {}) {
  const name = generateName()
  const ticker = generateTicker(name)
  const sectorWeights = SECTOR_WEIGHTS
  const r = rng()
  let cumulative = 0, sector = 'Technology'
  for (const [s, w] of Object.entries(sectorWeights)) {
    cumulative += w
    if (r <= cumulative) { sector = s; break }
  }

  const biasShift = config.marketBias === 'bullish' ? 0.04 : config.marketBias === 'bearish' ? -0.04 : 0
  const sp = SECTOR_PARAMS[sector]
  const basePrice = parseFloat(randFloat(sp.basePrice[0], sp.basePrice[1]).toFixed(2))
  const volatility = parseFloat(randFloat(sp.volatility[0], sp.volatility[1]).toFixed(3))
  const trendMin = sp.trend[0] + biasShift - (config.failureRate === 'high' ? 0.05 : config.failureRate === 'medium' ? 0.02 : 0)
  const trendMax = sp.trend[1] + biasShift
  const trend = parseFloat(randFloat(Math.min(trendMin, trendMax), trendMax).toFixed(3))
  const profitMargin = parseFloat(randFloat(config.failureRate === 'high' ? -0.5 : -0.3, 0.4).toFixed(2))
  const healthBase = profitMargin > 0.15 ? 75 : profitMargin > 0 ? 55 : profitMargin > -0.1 ? 35 : 15

  return {
    id: 'ipo_' + ipoYear + '_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
    ticker,
    name,
    sector,
    basePrice,
    volatility,
    trend,
    outstandingShares: randInt(50_000_000, 2_000_000_000),
    description: generateDescription(sector, name),
    region: rng() < 0.12 ? REGIONS.global : [regionKey],
    revenue: parseFloat(randFloat(0.5, 200).toFixed(1)),
    profitMargin,
    peRatio: profitMargin > 0 ? randInt(8, 60) : null,
    debtToEquity: parseFloat(randFloat(0.1, config.failureRate === 'high' ? 5.0 : 3.5).toFixed(1)),
    employees: randInt(2000, 400_000),
    established: ipoYear - randInt(1, 15),
    ipoYear,
    sentiment: randPick(['bullish', 'neutral', 'bearish']),
    healthScore: Math.max(5, Math.min(95, healthBase + randInt(-10, 10))),
    personality: generatePersonality()
  }
}

/**
 * Generate sector-based and thematic indexes.
 * @param {number} count - Number of indexes to generate (4-14)
 */
export function generateIndexes(count = 8) {
  const baseIndexes = [
    { id: 'techindex', ticker: 'TECHX', name: 'Tech Titans', description: 'Top technology companies', sectorFilter: 'Technology' },
    { id: 'financeindex', ticker: 'FINX', name: 'Financial Leaders', description: 'Major financial institutions', sectorFilter: 'Finance' },
    { id: 'greenindex', ticker: 'GRNX', name: 'Green Future', description: 'Renewable energy & sustainability', sectorFilter: 'Energy' },
    { id: 'healthcareindex', ticker: 'HLTH', name: 'Healthcare Innovators', description: 'Pharma & biotech leaders', sectorFilter: 'Healthcare' },
    { id: 'consumerindex', ticker: 'CONX', name: 'Consumer Giants', description: 'Top consumer brands', sectorFilter: 'Consumer' },
    { id: 'industrialindex', ticker: 'INDX', name: 'Industrial Power', description: 'Manufacturing & industry leaders', sectorFilter: 'Industrial' },
    { id: 'growthindex', ticker: 'GROX', name: 'Growth 50', description: 'High-growth companies across sectors', sectorFilter: null },
    { id: 'valueindex', ticker: 'VALX', name: 'Value Select', description: 'Undervalued companies with strong fundamentals', sectorFilter: null },
    { id: 'smallcap', ticker: 'SMEX', name: 'Small Cap 100', description: 'Emerging smaller companies', sectorFilter: null },
    { id: 'dividend', ticker: 'DIVX', name: 'Dividend Aristocrats', description: 'Consistent dividend payers', sectorFilter: null },
    { id: 'innovation', ticker: 'INOX', name: 'Innovation 30', description: 'Disruptive technology & science', sectorFilter: 'Technology' },
    { id: 'infrastructure', ticker: 'INFX', name: 'Infrastructure Builders', description: 'Construction & heavy industry', sectorFilter: 'Industrial' },
    { id: 'digitalpay', ticker: 'PAYX', name: 'Digital Economy', description: 'Fintech & digital payments', sectorFilter: 'Finance' },
    { id: 'biotech', ticker: 'BIOX', name: 'Biotech Frontier', description: 'Cutting-edge biotech & gene therapy', sectorFilter: 'Healthcare' },
  ]

  const picked = baseIndexes.slice(0, Math.min(count, baseIndexes.length))
  return picked.map((idx, i) => ({
    ...idx,
    id: idx.id + '_' + i,
    companyIds: [],
    expenseRatio: parseFloat((0.0005 + rng() * 0.0015).toFixed(4)),
    dynamic: true
  }))
}
