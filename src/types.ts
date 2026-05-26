// ============================================================
// StockSim — Core Type Definitions
// ============================================================

// --- Primitives ---
export type Sector = 'Technology' | 'Finance' | 'Healthcare' | 'Energy' | 'Consumer' | 'Industrial' | 'Commodities'
export type Sentiment = 'bullish' | 'neutral' | 'bearish'
export type Region = 'americas' | 'europe' | 'asia' | 'india'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'creative'
export type MarketBias = 'bullish' | 'neutral' | 'bearish'
export type CrashFrequency = 'rare' | 'occasional' | 'common'
export type FailureRate = 'low' | 'medium' | 'high'
export type TradeMode = 'buy' | 'sell' | 'short' | 'cover'
export type OptionType = 'call' | 'put'
export type FuturesDirection = 'long' | 'short'
export type CommodityCategory = 'metal' | 'gem' | 'energy'
export type CommodityTier = 'spot' | 'futures'
export type MarketPhase = 'closed' | 'pre-market' | 'regular' | 'after-hours'
export type MarketSentiment = 'calm' | 'greedy' | 'euphoric' | 'fearful' | 'panicked'
export type EconomicCycle = 'expansion' | 'peak' | 'contraction' | 'trough'
export type EventCategory = 'earnings' | 'corporate' | 'regulatory' | 'analyst' | 'external'

export type EventType =
  | 'earningsBeat' | 'earningsMiss'
  | 'productLaunch' | 'productFailure' | 'scandal' | 'layoffs'
  | 'acquisition' | 'mergerAnnounced' | 'mergerBlocked' | 'breakthrough'
  | 'supplyChain' | 'buyback' | 'goingPrivate'
  | 'regulation' | 'antitrustBreakup'
  | 'upgrade' | 'downgrade'
  | 'bankruptcy'

// --- Game Config ---
export interface GameConfig {
  difficulty: Difficulty
  region: Region
  minCompanies: number
  maxCompanies: number
  indexCount: number
  marketBias: MarketBias
  crashFrequency: CrashFrequency
  failureRate: FailureRate
  seed: string
}

// --- Company ---
export interface CompanyPersonality {
  riskTolerance: number
  innovationBias: number
  ethicalStandard: number
  acquisitionHunger: number
  transparency: number
  laborRelations: number
}

export interface CompanyDefinition {
  id: string
  ticker: string
  name: string
  sector: Sector
  basePrice: number
  volatility: number
  trend: number
  outstandingShares: number
  description: string
  region: string[]
  revenue: number
  profitMargin: number
  peRatio: number | null
  debtToEquity: number
  employees: number
  established: number | null
  ipoYear: number | null
  sentiment: Sentiment
  healthScore: number
  personality: CompanyPersonality
  type?: 'commodity'
  unit?: string
  category?: CommodityCategory
}

// --- Historical Bar ---
export interface HistoricalBar {
  day: number
  open: number | null
  high: number | null
  low: number | null
  close: number | null
}

// --- Stock Runtime State ---
export interface StockState extends CompanyDefinition {
  priceHistory: PriceTick[]
  historicalDaily: HistoricalBar[]
  currentPrice: number
  dayOpen: number
  dayHigh: number
  dayLow: number
  _dailyVolume: number
  volumeHistory: VolumeBar[]
  bankrupt?: boolean
  _regHigh?: number
  _regLow?: number
  _regOpen?: number
}

export interface PriceTick {
  time: number
  price: number
}

export interface VolumeBar {
  day: number
  volume: number
}

// --- Index ---
export interface IndexDefinition {
  id: string
  ticker: string
  name: string
  description: string
  companyIds: string[]
  expenseRatio: number
  dynamic: boolean
  sectorFilter?: string | null
}

// --- Chart ---
export interface ChartDataPoint {
  time: number
  price: number
}

// --- Simulation ---
export interface SimulationResult {
  historicalData: Record<string, { bars: HistoricalBar[]; finalPrice: number; bankrupt?: boolean }>
  allCompanies: CompanyDefinition[]
  totalMonths: number
  bankruptcyCount: number
}

// --- Portfolio ---
export interface Holding {
  shares: number
  avgCost: number
  onMargin?: boolean
}

export interface ShortPosition {
  shares: number
  entryPrice: number
}

export interface OptionPosition {
  id: number
  companyId: string
  type: OptionType
  strikePrice: number
  premium: number
  expirationDay: number
  contracts: number
  buyDay: number
}

export interface FuturesPosition {
  id: string
  type?: 'index_futures'
  commodityId?: string
  indexId?: string
  direction: FuturesDirection
  contracts: number
  entryPrice?: number
  entryIndexValue?: number
  entryDay: number
  expiryDay: number
  margin: number
  notional: number
  multiplier?: number
  settled: boolean
  settlementPrice?: number
  settlementPnL?: number
}

export interface Transaction {
  [key: string]: any
  type: string
  price: number
  total: number
  time: string
  day?: number
  companyId?: string
  indexId?: string
  shares?: number
  contracts?: number
  fee?: number
  margin?: number
  pnl?: number
}

export interface Order {
  id: number
  type: string
  companyId: string
  shares: number
  limitPrice: number
  stopPrice?: number | null
}

// --- Events ---
export interface EventDefinition {
  label: string
  icon: string
  priceImpact: number
  duration: number
  category: EventCategory
}

export interface ScheduledEvent {
  companyId: string
  eventType: EventType
  scheduledDay: number
}

export interface NewsArticle {
  id: number
  companyId?: string
  companyName?: string
  sector?: Sector
  headline: string
  eventType?: EventType
  eventLabel?: string
  eventIcon?: string
  category?: EventCategory
  impact?: number
  daysUntil?: number
  timePhrase?: string
  day: number
  published: boolean
  isResult?: boolean
  worldEventId?: string
  sectorSummary?: string
  duration?: number
}

export interface EventLogEntry {
  id?: number
  type: string
  icon: string
  headline: string
  companyId?: string | null
  companyName?: string | null
  sector?: string | null
  day?: number
  message?: string
}

// --- World ---
export interface WorldEventEffect {
  sector?: string
  impact: number
  reason?: string
}

export interface WorldEvent {
  id: string
  name: string
  description: string
  icon: string
  category: string
  effects: WorldEventEffect[]
  duration: number
  recurring: boolean
  remaining?: number
}

// --- Materials ---
export interface MaterialState {
  supply: number
  demand: number
  volatility: number
}

// --- Market Mind ---
export interface MarketMindState {
  sentiment: MarketSentiment
  sentimentDays: number
  momentum: number
  longMomentum: number
  recentShocks: { day: number; severity: number }[]
  volatilityMultiplier: number
  volumeMultiplier: number
}

// --- World Mind ---
export interface WorldMindState {
  year: number
  cycle: EconomicCycle
  cycleMonths: number
  cycleDuration: number
  interestRate: number
  inflation: number
  gdpGrowth: number
  regulatoryTone: string
  globalTradeOpenness: number
  techAdoptionRate: number
  greenTransition: number
  pendingEvents: any[]
  lastEventYear: number
}

// --- Company Mind ---
export interface CompanyState {
  cash: number
  debt: number
  rAndDBudget: number
  morale: number
  reputation: number
  productPipeline: number
  lastAction: string | null
  lastActionResult: string | null
  quartersSinceAction: number
}

// --- Activity Feed ---
export interface ActivityItem {
  icon: string
  time: number
  timeStr: string
  summary: string
  fullText: string
  cssClass: string
  companyId?: string
  indexId?: string
  title: string
}

// --- Progress callback ---
export type ProgressCallback = (msg: string, pct: number) => void
export type EventLogCallback = (entry: EventLogEntry) => void
