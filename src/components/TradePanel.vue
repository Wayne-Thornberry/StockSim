<template>
  <div class="trade-panel" v-if="stock || isIndex || portfolioMode">
    <div class="trade-header">
      <div>
        <h2>{{ portfolioMode ? '📊 Portfolio Overview' : isIndex ? indexName : stock.name }}</h2>
        <span v-if="!portfolioMode" class="sector-badge">{{ isCommodity ? '🏷 Commodity' : isIndex ? 'Index' : stock.sector }}</span>
        <span v-else class="sector-badge" :class="portfolio.totalProfitLoss >= 0 ? 'positive' : 'negative'">
          {{ portfolio.totalProfitLoss >= 0 ? '+' : '' }}{{ fmt.money(portfolio.totalProfitLoss) }} ({{ portfolio.totalPLPercent }}%)
        </span>
      </div>
      <div class="price-area">
        <span class="current-price">{{ fmt.money(portfolioMode ? portfolio.totalNetWorth : isIndex ? indexPrice : stock.currentPrice) }}</span>
        <div class="multi-changes" v-if="!portfolioMode">
          <span class="mc-item" title="1 hour"><span class="mc-label">1h</span><span :class="chg.h1 >= 0 ? 'positive' : 'negative'">{{ fmt.pct(chg.h1) }}</span></span>
          <span class="mc-item" title="1 day"><span class="mc-label">1d</span><span :class="chg.d1 >= 0 ? 'positive' : 'negative'">{{ fmt.pct(chg.d1) }}</span></span>
          <span class="mc-item" title="7 days"><span class="mc-label">7d</span><span :class="chg.d7 >= 0 ? 'positive' : 'negative'">{{ fmt.pct(chg.d7) }}</span></span>
          <span class="mc-item" title="28 days"><span class="mc-label">28d</span><span :class="chg.d28 >= 0 ? 'positive' : 'negative'">{{ fmt.pct(chg.d28) }}</span></span>
        </div>
      </div>
    </div>

    <div :class="chartRange === 'ALL' ? 'chart-scroll' : ''" :style="chartRange === 'ALL' ? { width: '100%', overflowX: 'auto' } : {}">
      <div :style="chartRange === 'ALL' ? { minWidth: Math.max(chartData.length * 3, 300) + 'px' } : {}">
        <StockChart :priceHistory="chartData" :label="portfolioMode ? 'Net Worth' : isIndex ? indexName : stock.name" :color="portfolioMode ? (portfolio.totalProfitLoss >= 0 ? '#4ade80' : '#f87171') : chg.d1 >= 0 ? '#4ade80' : '#f87171'"
          :height="180" :startDate="game.startDate" :chartMode="(chartRange === '1H' || chartRange === '1D') ? 'intraday' : 'daily'" :chartRange="chartRange" />
      </div>
    </div>

    <div class="chart-range">
      <button v-for="r in chartRanges" :key="r.key" class="btn btn-sm btn-ghost"
        :class="{ 'btn-active': chartRange === r.key }"
        @click="chartRange = r.key">{{ r.label }}</button>
    </div>

    <p v-if="!portfolioMode" class="stock-desc">{{ isIndex ? indexDesc : stock.description }}</p>
    <div v-if="portfolioMode" class="po-summary">
      <span>Net Worth: <strong :class="portfolio.totalProfitLoss >= 0 ? 'positive' : 'negative'">{{ fmt.money(portfolio.totalNetWorth) }}</strong></span>
      <span>P/L: <strong :class="portfolio.totalProfitLoss >= 0 ? 'positive' : 'negative'">{{ fmt.money(portfolio.totalProfitLoss) }} ({{ portfolio.totalPLPercent }}%)</strong></span>
    </div>

    <div v-if="isIndex" class="stock-chips"><span v-for="s in indexStocks" :key="s.id" class="stock-chip">{{ s.ticker }}</span></div>

    <!-- Tab Switcher + Content (stock only) — tabs left, content right -->
    <div v-if="!portfolioMode" class="tab-layout">
      <div class="panel-tabs">
        <button :class="{ active: panelTab === 'trade' }" @click="panelTab = 'trade'">📈 Trade</button>
        <button v-if="!isCommodity && !isIndex" :class="{ active: panelTab === 'fundamentals' }" @click="panelTab = 'fundamentals'">📊 Fundamentals</button>
        <button v-if="!isCommodity && !isIndex" :class="{ active: panelTab === 'options' }" @click="panelTab = 'options'">🎯 Options</button>
      </div>
      <div class="tab-content">
    <div v-if="panelTab === 'fundamentals' && !isIndex" class="fundamentals-panel">
      <div class="fund-grid">
        <div class="fund-item">
          <span class="fund-label">Revenue</span>
          <span class="fund-value">${{ stock.revenue?.toFixed(1) }}B</span>
        </div>
        <div class="fund-item">
          <span class="fund-label">Profit Margin</span>
          <span class="fund-value" :class="(stock.profitMargin || 0) >= 0 ? 'positive' : 'negative'">
            {{ ((stock.profitMargin || 0) * 100).toFixed(1) }}%
          </span>
        </div>
        <div class="fund-item">
          <span class="fund-label">P/E Ratio</span>
          <span class="fund-value">{{ market.getPE(props.stockId) ?? 'N/A' }}</span>
        </div>
        <div class="fund-item">
          <span class="fund-label">Debt/Equity</span>
          <span class="fund-value" :class="(stock.debtToEquity || 0) > 1.5 ? 'negative' : ''">{{ (stock.debtToEquity || 0).toFixed(1) }}</span>
        </div>
        <div class="fund-item">
          <span class="fund-label">Employees</span>
          <span class="fund-value">{{ (stock.employees || 0).toLocaleString() }}</span>
        </div>
        <div class="fund-item">
          <span class="fund-label">Established</span>
          <span class="fund-value">{{ stock.established || 'N/A' }}</span>
        </div>
        <div class="fund-item">
          <span class="fund-label">Sentiment</span>
          <span class="fund-value sent-label" :class="'sent-' + (stock.sentiment || 'neutral')">{{ (stock.sentiment || 'neutral').toUpperCase() }}</span>
        </div>
        <div class="fund-item">
          <span class="fund-label">Volume</span>
          <span class="fund-value">{{ formatLargeNum(stock._dailyVolume || 0) }}</span>
        </div>
      </div>
      <div class="company-stats">
        <div v-if="!isCommodity" class="cs-row"><span>Market Cap</span><span class="cs-value">{{ fmt.moneyCompact(marketCap) }}</span></div>
        <div v-if="!isCommodity" class="cs-row"><span>Outstanding</span><span class="cs-value">{{ formatLargeNum(stock.outstandingShares) }}</span></div>
        <div class="cs-row"><span>{{ isCommodity ? 'Supply' : 'Available Float' }}</span><span class="cs-value">{{ isCommodity ? 'Unlimited' : formatLargeNum(availableFloat) }}</span></div>
      </div>

      <!-- Company News -->
      <div class="company-news" v-if="stockNews.length > 0">
        <h4>Recent News</h4>
        <div v-for="a in stockNews.slice(0, 4)" :key="a.id" class="cn-item">
          <span>{{ a.eventIcon }}</span>
          <span>{{ a.headline }}</span>
        </div>
      </div>
    </div>

    <!-- Trade Tab -->
    <div v-if="panelTab === 'trade'">
    <!-- Stock Trade Form -->
    <template v-if="!isIndex && !portfolioMode">
    <div class="trade-form">
      <div class="trade-tabs">
        <button :class="{ active: tradeMode === 'buy' }" @click="tradeMode = 'buy'">Buy</button>
        <button :class="{ active: tradeMode === 'sell' }" @click="tradeMode = 'sell'" :disabled="!holding">Sell</button>
        <button :class="{ active: tradeMode === 'short' }" @click="tradeMode = 'short'" v-if="!isCommodity">Short</button>
        <button :class="{ active: tradeMode === 'cover' }" @click="tradeMode = 'cover'" :disabled="!shortPos" v-if="!isCommodity">Cover</button>
      </div>

      <!-- Margin Trading Toggle (stocks only) -->
      <div v-if="!isCommodity && !isIndex" class="tier-toggle">
        <button class="btn btn-xs" :class="{ 'btn-active': !useMargin }" @click="useMargin = false">💰 Cash</button>
        <button class="btn btn-xs" :class="{ 'btn-active': useMargin }" @click="useMargin = true">📈 Margin (2x)</button>
      </div>

      <!-- Commodity/Index Tier Toggle: Spot vs Futures -->
      <div v-if="isCommodity || isIndex" class="tier-toggle">
        <button class="btn btn-xs" :class="{ 'btn-active': commodityTier === 'spot' }" @click="commodityTier = 'spot'">💰 {{ isIndex ? 'ETF' : 'Spot' }}</button>
        <button class="btn btn-xs" :class="{ 'btn-active': commodityTier === 'futures' }" @click="commodityTier = 'futures'">📜 Futures</button>
      </div>

      <div class="form-row">
        <label>{{ isCommodity && commodityTier === 'futures' ? 'Contracts' : isCommodity ? 'Units' : 'Shares' }}</label>
        <input type="number" v-model.number="shares" min="1" :max="commodityTier === 'futures' ? 50 : 999999" />
        <span v-if="isCommodity && commodityTier === 'futures'" class="market-badge">1 contract = {{ futuresSpec?.contractSize || '?' }} {{ stock.unit }}</span>
      </div>

      <!-- Futures-specific info -->
      <div v-if="(isCommodity || isIndex) && commodityTier === 'futures'" class="futures-info">
        <div class="summary-row"><span>Notional Value:</span><span>{{ fmt.money(isIndex ? indexFuturesNotional : futuresNotional) }}</span></div>
        <div class="summary-row"><span>Margin Required:</span><span :class="game.cash >= (isIndex ? indexFuturesMargin : futuresMargin) ? '' : 'negative'">{{ fmt.money(isIndex ? indexFuturesMargin : futuresMargin) }}</span></div>
        <div class="summary-row"><span>Leverage:</span><span>{{ isIndex ? '20x' : futuresLeverage + 'x' }}</span></div>
        <div class="summary-row"><span>Expires:</span><span>Day {{ game.day + 30 }} (30 days)</span></div>
        <div v-if="isIndex" class="summary-row"><span>Multiplier:</span><span>$50 × index</span></div>
      </div>
      <div v-if="tradeMode === 'buy'" class="form-row">
        <label>% of Cash</label>
        <input type="number" v-model.number="cashPct" min="1" max="100" placeholder="e.g. 25" @input="onCashPct" />
      </div>

      <div class="share-presets">
        <button class="btn btn-xs" @click="setPreset(0.25)">25%</button>
        <button class="btn btn-xs" @click="setPreset(0.5)">50%</button>
        <button class="btn btn-xs" @click="setPreset(1)">100%</button>
        <button class="btn btn-xs" @click="shares = maxShares">Max</button>
      </div>

      <div class="form-row">
        <label>{{ isCommodity ? 'Price per ' + (stock.unit || 'unit') : 'Price per share' }}</label>
        <input type="number" :value="stock.currentPrice" step="0.01" readonly class="price-readonly" />
        <span class="market-badge">Market</span>
      </div>

      <div class="trade-summary">
        <div class="summary-row">
          <span>Total:</span>
          <span class="total-amount">{{ fmt.money(shares * orderPrice) }}</span>
        </div>
        <div v-if="impactPct !== 0" class="summary-row impact-row">
          <span>Market Impact:</span>
          <span :class="impactPct > 0 ? 'negative' : 'positive'">
            {{ tradeMode === 'buy' ? '📈 +' : '📉 ' }}{{ Math.abs(impactPct).toFixed(2) }}%
          </span>
        </div>
        <div v-if="impactPct !== 0" class="summary-row">
          <span>Est. Effective Price:</span>
          <span :class="tradeMode === 'buy' || tradeMode === 'cover' ? 'negative' : 'positive'">{{ fmt.money(effectivePrice) }}</span>
        </div>
        <div class="summary-row fee-row">
          <span>Spread & Fee:</span>
          <span class="negative">{{ fmt.money(tradeSpread + tradeFee) }}</span>
        </div>
        <div v-if="tradeMode === 'sell' && holding" class="summary-row">
          <span>Avg Cost:</span>
          <span>{{ fmt.money(holding.avgCost) }}</span>
        </div>
        <div v-if="tradeMode === 'sell' && holding" class="summary-row">
          <span>P/L:</span>
          <span :class="(orderPrice - holding.avgCost) >= 0 ? 'positive' : 'negative'">
            {{ fmt.money((orderPrice - holding.avgCost) * shares) }}
          </span>
        </div>
        <div v-if="tradeMode === 'cover' && shortPos" class="summary-row">
          <span>Short Entry:</span>
          <span>{{ fmt.money(shortPos.entryPrice) }}</span>
        </div>
        <div v-if="tradeMode === 'cover' && shortPos" class="summary-row">
          <span>Est. P/L:</span>
          <span :class="(shortPos.entryPrice - effectivePrice) >= 0 ? 'positive' : 'negative'">
            {{ fmt.money((shortPos.entryPrice - effectivePrice) * shares) }}
          </span>
        </div>
        <div v-if="tradeMode === 'short'" class="summary-row">
          <span>Credit Received:</span>
          <span class="positive">{{ fmt.money(shares * effectivePrice - tradeFee) }}</span>
        </div>
        <div v-if="tradeMode !== 'short'" class="summary-row">
          <span>{{ useMargin ? 'Margin Required (50%):' : 'Remaining Cash:' }}</span>
          <span :class="(game.cash - (useMargin ? shares * effectivePrice * 0.5 : shares * effectivePrice) - tradeFee) >= 0 ? '' : 'negative'">
            {{ fmt.money(useMargin ? shares * effectivePrice * 0.5 : game.cash - shares * effectivePrice - tradeFee) }}
          </span>
        </div>
        <div v-if="useMargin && tradeMode !== 'short'" class="summary-row">
          <span>Borrowed:</span>
          <span class="negative">{{ fmt.money(shares * effectivePrice * 0.5) }}</span>
        </div>
      </div>

      <button class="btn btn-primary btn-block"
        :class="{ 'btn-danger': tradeMode === 'sell' || tradeMode === 'cover', 'btn-short': tradeMode === 'short' }"
        :disabled="!canTrade"
        @click="executeTrade">
        {{ isCommodity && commodityTier === 'futures'
           ? (tradeMode === 'buy' ? '📈 Long' : '📉 Short') + ' ' + shares + ' Contracts'
           : (tradeMode === 'buy' ? 'Buy' : tradeMode === 'sell' ? 'Sell' : tradeMode === 'short' ? 'Short' : 'Cover') + ' ' + shares + ' ' + (isCommodity ? 'Units' : 'Shares') }}
      </button>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <!-- Quick Order Placement -->
      <div class="quick-orders">
        <div class="qo-label">Limit / Stop Orders</div>
        <div class="qo-row">
          <select v-model="orderType" class="qo-select">
            <option value="limit_buy">Limit Buy</option>
            <option value="limit_sell">Limit Sell</option>
            <option value="stop_loss">Stop Loss</option>
            <option value="stop_limit">Stop Limit</option>
          </select>
          <input type="number" v-model.number="orderLimitPrice" placeholder="Price" step="0.01" class="qo-input" />
          <input v-if="orderType === 'stop_limit'" type="number" v-model.number="orderStopPrice" placeholder="Stop" step="0.01" class="qo-input" />
          <button class="btn btn-xs" @click="placeOrder">Place</button>
        </div>
      </div>
    </div>
    </template>

    <!-- Index/ETF Trade Form -->
    <template v-if="isIndex && !portfolioMode">
    <div class="trade-form">
      <div class="trade-tabs">
        <button :class="{ active: idxTradeMode === 'buy' }" @click="idxTradeMode = 'buy'">Buy</button>
        <button :class="{ active: idxTradeMode === 'sell' }" @click="idxTradeMode = 'sell'" :disabled="!portfolio.indexHoldings[props.indexId]">Sell</button>
      </div>
      <div class="form-row">
        <label>ETF Shares</label>
        <input type="number" v-model.number="idxShares" min="1" />
      </div>
      <div v-if="idxTradeMode === 'buy'" class="form-row">
        <label>% of Cash</label>
        <input type="number" v-model.number="idxCashPct" min="1" max="100" placeholder="e.g. 25" @input="onIdxCashPct" />
      </div>
      <div class="share-presets">
        <button class="btn btn-xs" @click="setIdxPreset(0.25)">25%</button>
        <button class="btn btn-xs" @click="setIdxPreset(0.5)">50%</button>
        <button class="btn btn-xs" @click="setIdxPreset(1)">100%</button>
        <button class="btn btn-xs" @click="idxShares = idxMax">Max</button>
      </div>
      <div class="trade-summary">
        <div class="summary-row"><span>Total:</span><span class="total-amount">{{ fmt.money(idxShares * indexPrice) }}</span></div>
        <div class="summary-row"><span>Remaining Cash:</span><span :class="idxRemaining >= 0 ? '' : 'negative'">{{ fmt.money(idxRemaining) }}</span></div>
      </div>
      <button class="btn btn-primary btn-block" @click="executeIndexTrade">{{ idxTradeMode === 'buy' ? 'Buy' : 'Sell' }} {{ idxShares }} ETF Shares</button>
      <div v-if="indexHolding" class="idx-owned">You own {{ indexHolding.shares }} ETF shares · {{ fmt.money(indexHolding.shares * indexPrice) }}</div>
    </div>
    </template>

    </div>

    <!-- Options Tab -->
    <div v-if="panelTab === 'options'" class="options-panel">
      <div class="form-row-inline">
        <div class="form-group flex-1">
          <label>Type</label>
          <div class="type-toggle">
            <button :class="{ active: optType === 'call' }" @click="optType = 'call'">📈 CALL</button>
            <button :class="{ active: optType === 'put' }" @click="optType = 'put'">📉 PUT</button>
          </div>
        </div>
        <div class="form-group" style="min-width:110px">
          <label>Expiration</label>
          <select v-model.number="optExpDays" class="form-input-sm">
            <option :value="1">1 day</option><option :value="3">3 days</option><option :value="5">5 days</option>
            <option :value="7">7 days</option><option :value="14">14 days</option><option :value="30">30 days</option>
          </select>
        </div>
      </div>

      <!-- Strike Price Selector -->
      <div class="form-group">
        <label>Strike Price <span class="market-badge">Black-Scholes</span></label>
        <div class="strike-options">
          <button v-for="s in optionStrikes" :key="s.label"
            class="btn btn-sm strike-btn"
            :class="{ 'btn-active': optStrike === s.strike, 'itm': s.isITM, 'otm': s.isOTM }"
            @click="selectStrike(s)">
            <span class="strike-label">{{ s.label }}</span>
            <span class="strike-price">{{ fmt.money(s.strike) }}</span>
            <span class="strike-premium">+{{ fmt.money(s.premium) }}</span>
          </button>
        </div>
      </div>

      <div class="form-row-inline">
        <div class="form-group flex-1">
          <label>Custom Strike</label>
          <input type="number" v-model.number="optStrike" step="0.01" class="form-input-sm" />
        </div>
        <div class="form-group" style="width:60px">
          <label>Qty</label>
          <input type="number" v-model.number="optContracts" min="1" max="100" class="form-input-sm" />
        </div>
      </div>

      <div class="option-summary">
        <div class="sum-row"><span>Stock Price:</span> <span>{{ fmt.money(stock.currentPrice) }}</span></div>
        <div class="sum-row"><span>Volatility (σ):</span> <span>{{ (stock.volatility * 100).toFixed(1) }}%</span></div>
        <div class="sum-row"><span>Premium/Share:</span> <span>{{ fmt.money(optPremium) }}</span></div>
        <div class="sum-row"><span>Total Premium:</span> <span>{{ fmt.money(optPremium * optContracts * 100) }}</span></div>
        <div class="sum-row"><span>Max Loss:</span> <span class="negative">{{ fmt.money(optPremium * optContracts * 100) }}</span></div>
        <div class="sum-row"><span>Break Even:</span> <span>{{ fmt.money(optBreakEven) }}</span></div>
      </div>

      <button class="btn btn-primary btn-block" :disabled="!canBuyOpt" @click="buyOption">
        Buy {{ optContracts }} {{ optType.toUpperCase() }} Contract{{ optContracts > 1 ? 's' : '' }}
      </button>
      <p v-if="optError" class="error-msg">{{ optError }}</p>
    </div>
  </div>
</div>
</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore.js'
import { useMarketStore } from '@/stores/marketStore.js'
import { usePortfolioStore } from '@/stores/portfolioStore.js'
import { useFormat } from '@/composables/useFormat.js'
import { round2 } from '@/utils/marketEngine.js'
import { getFuturesSpec, contractValue, marginPerContract, indexContractValue, indexMarginPerContract } from '@/utils/futuresEngine.js'
import { blackScholes, generateStrikes, priceStrikes } from '@/utils/blackScholes.js'
import StockChart from './StockChart.vue'

const props = defineProps({
  stockId: { type: String, default: '' },
  indexId: { type: String, default: '' },
  portfolioMode: { type: Boolean, default: false }
})

const emit = defineEmits(['traded'])

const game = useGameStore()
const market = useMarketStore()
const portfolio = usePortfolioStore()
const fmt = useFormat()

const tradeMode = ref('buy') // 'buy' | 'sell' | 'short' | 'cover'
const shares = ref(1)
const cashPct = ref(0)
function onCashPct() {
  if (cashPct.value <= 0 || !stock.value) return
  const pct = Math.min(100, Math.max(0, cashPct.value))
  if (tradeMode.value === 'buy') {
    shares.value = Math.floor(game.cash * (pct / 100) / orderPrice.value)
  }
}
const orderPrice = computed(() => stock.value?.currentPrice || 0)
const errorMsg = ref('')
const panelTab = ref('trade') // 'trade', 'fundamentals', or 'options'

// Order placement
const orderType = ref('limit_buy')
const orderLimitPrice = ref(0)
const orderStopPrice = ref(0)

// Options state
const optType = ref('call')
const optStrike = ref(0)
const optPremium = ref(0)
const optExpDays = ref(7)
const optContracts = ref(1)
const optError = ref('')

const optionStrikes = computed(() => {
  if (!stock.value) return []
  const strikes = generateStrikes(stock.value.currentPrice, optType.value)
  const rate = game.interestRate || 0.05
  return priceStrikes(strikes, stock.value.currentPrice, optType.value, optExpDays.value, rate, stock.value.volatility || 0.3)
})

function selectStrike(s) {
  optStrike.value = s.strike
  optPremium.value = s.premium
}

// Recalculate premium when strike or expiry changes
watch([optStrike, optExpDays, optType], () => {
  if (!stock.value || optStrike.value <= 0) return
  const rate = game.interestRate || 0.05
  const T = optExpDays.value / 365
  optPremium.value = blackScholes(optType.value, stock.value.currentPrice, optStrike.value, T, rate, stock.value.volatility || 0.3)
})

const optBreakEven = computed(() => {
  if (optType.value === 'call') return optStrike.value + optPremium.value
  return optStrike.value - optPremium.value
})

const canBuyOpt = computed(() => {
  if (!stock.value || optStrike.value <= 0 || optPremium.value <= 0) return false
  return game.cash >= optPremium.value * optContracts.value * 100
})

function buyOption() {
  optError.value = ''
  const ok = portfolio.buyOption(props.stockId, optType.value, optStrike.value, optPremium.value, optExpDays.value, optContracts.value)
  if (!ok) optError.value = 'Not enough cash!'
}

// Chart range: '1D', '1W', '1M', '3M', '1Y'
const chartRange = ref('1D')
const commodityTier = ref('spot') // 'spot' | 'futures'
const useMargin = ref(false)         // stock margin trading
const chartRanges = [
  { key: '1H', label: '1H' },
  { key: '1D', label: '1D' },
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
  { key: 'YTD', label: 'YTD' },
  { key: 'ALL', label: 'ALL' },
]

const stock = computed(() => market.getStock(props.stockId))
const holding = computed(() => portfolio.holdings[props.stockId] || null)
const shortPos = computed(() => portfolio.shorts[props.stockId] || null)
const marketCap = computed(() => market.getMarketCap(props.stockId))
const availableFloat = computed(() => market.getAvailableFloat(props.stockId))

const stockNews = computed(() => {
  return market.newsFeed.filter(a => a.companyId === props.stockId)
})

const maxShares = computed(() => {
  if (tradeMode.value === 'buy' || tradeMode.value === 'short') return Math.floor(game.cash / (effectivePrice.value || 1))
  if (tradeMode.value === 'sell') return holding.value?.shares || 0
  if (tradeMode.value === 'cover') return shortPos.value?.shares || 0
  return 0
})

function setPreset(pct) {
  const max = maxShares.value
  if (max <= 0) return
  shares.value = pct === 1 ? max : Math.max(1, Math.floor(max * pct))
}

const impactPct = computed(() => {
  if (!stock.value || shares.value <= 0) return 0
  const impact = market.calculateMarketImpact(props.stockId, shares.value)
  // Short sells push price down; covers push price up
  if (tradeMode.value === 'sell' || tradeMode.value === 'short') return round2(-impact * 100)
  return round2(impact * 100)
})

const effectivePrice = computed(() => {
  if (!stock.value) return 0
  const spread = market.getSpread(props.stockId)
  const base = tradeMode.value === 'buy' || tradeMode.value === 'cover'
    ? orderPrice.value * (1 + spread / 2)
    : orderPrice.value * (1 - spread / 2)
  let impact = market.calculateMarketImpact(props.stockId, shares.value)
  if (tradeMode.value === 'sell' || tradeMode.value === 'short') impact = -impact
  return round2(base * (1 + impact))
})

const tradeSpread = computed(() => {
  if (!stock.value || shares.value <= 0) return 0
  const spread = market.getSpread(props.stockId)
  const base = orderPrice.value * (spread / 2)
  return round2(base * shares.value)
})

const tradeFee = computed(() => {
  if (!stock.value || shares.value <= 0) return 0
  const value = round2(shares.value * effectivePrice.value)
  const { fee } = market.getCommission(value)
  return fee
})

// --- Unified chart data — single pipeline for stocks, indexes, and portfolio ---

function buildSyntheticDaily(stocksArr) {
  if (!stocksArr.length) return []
  const maxLen = Math.max(...stocksArr.map(s => (s.historicalDaily || []).length), 0)
  if (maxLen === 0) return []
  const result = []
  for (let i = 0; i < maxLen; i++) {
    let weightedSum = 0, totalWeight = 0, dayNum = 0
    for (const s of stocksArr) {
      const hd = s.historicalDaily || []
      if (i < hd.length && hd[i].close !== null) {
        // Cap-weight: larger companies (more outstanding shares) have more influence
        const weight = s.outstandingShares || 1
        weightedSum += hd[i].close * weight
        totalWeight += weight
        dayNum = hd[i].day
      }
    }
    if (totalWeight > 0) result.push({ time: dayNum, price: parseFloat((weightedSum / totalWeight).toFixed(2)) })
  }
  return result
}

/** Aggregate daily entries into monthly (average close per calendar month) */
function aggregateMonthly(daily) {
  if (!daily.length) return daily
  const base = game.startDate || new Date()
  const months = {}
  for (const d of daily) {
    if (d.price === null || (d.close !== undefined && d.close === null)) continue
    const price = d.price ?? d.close ?? 0
    const date = new Date(base)
    date.setDate(date.getDate() + ((d.time ?? d.day ?? 0) - 1))
    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (!months[key]) months[key] = { time: d.time ?? d.day, sum: 0, count: 0 }
    months[key].sum += price
    months[key].count++
    months[key].time = d.time ?? d.day // latest time in month
  }
  return Object.values(months).map(m => ({ time: m.time, price: parseFloat((m.sum / m.count).toFixed(2)) }))
}

function sliceDaily(daily, range) {
  if (!daily.length) return daily
  if (range === 'ALL') return aggregateMonthly(daily)
  // For 1D/1H with a single point, duplicate to draw a flat line
  if ((range === '1D' || range === '1H') && daily.length === 1) {
    return [{ time: daily[0].time - 1, price: daily[0].price - daily[0].price * 0.001 }, daily[0]]
  }
  let days
  if (range === '1D') days = 1
  else if (range === '1W') days = 5
  else if (range === '1M') days = 21
  else if (range === '3M') days = 63
  else if (range === '1Y') days = 252
  else if (range === 'YTD') {
    const curDate = game.currentDate
    const jan1 = new Date(curDate.getFullYear(), 0, 1)
    const b = game.startDate || new Date()
    // Game day 1 = startDate. Pre-gen historical daily uses day 0 = startDate.
    // Compute the game-day number for Jan 1. Days before startDate are negative.
    const jan1GameDay = Math.round((jan1 - b) / 86400000) + 1
    const idx = daily.findIndex(d => (d.time ?? 0) >= jan1GameDay)
    if (idx >= 0) {
      // For 3+ months of daily data, aggregate to monthly for readability
      const sliced = daily.slice(idx)
      const spanDays = (daily[daily.length - 1]?.time ?? 0) - (daily[idx]?.time ?? 0)
      return spanDays > 63 ? aggregateMonthly(sliced) : sliced
    }
    return daily.slice(-Math.min(daily.length, 100))
  }
  return daily.slice(-days)
}

const chartData = computed(() => {
  const intraday = chartRange.value === '1H' || chartRange.value === '1D'
  const intraCount = chartRange.value === '1H' ? 12 : 192

  // Intraday for stocks
  if (stock.value && intraday) {
    return stock.value.priceHistory.slice(-intraCount)
  }

  // Intraday for indexes — average constituent price histories
  if (props.indexId && intraday) {
    const stocks = indexStocks.value
    if (!stocks.length) return []
    const maxLen = Math.max(...stocks.map(s => (s.priceHistory || []).length), 0)
    if (maxLen === 0) return []
    const result = []
    const start = Math.max(0, maxLen - intraCount)
    for (let i = start; i < maxLen; i++) {
      let sum = 0, count = 0, tickTime = 0
      for (const s of stocks) {
        const ph = s.priceHistory || []
        if (i < ph.length) { sum += ph[i].price; count++; tickTime = ph[i].time }
      }
      if (count > 0) result.push({ time: tickTime, price: parseFloat((sum / count).toFixed(2)) })
    }
    return result
  }

  // Intraday for portfolio — compute value from holdings at each tick
  if (props.portfolioMode && intraday) {
    const holdings = portfolio.holdings
    const heldIds = Object.keys(holdings)
    // Use first held stock's priceHistory for tick timeline
    const refStock = heldIds.length ? market.getStock(heldIds[0]) : null
    const refPh = refStock?.priceHistory || []
    if (refPh.length === 0) {
      return [{ time: game.day * 1000, price: game.cash }, { time: game.day * 1000 + game.tick, price: game.cash }]
    }
    const count = Math.min(intraCount, refPh.length)
    const offset = refPh.length - count
    const result = []
    for (let i = offset; i < refPh.length; i++) {
      let value = game.cash
      for (const [id, h] of Object.entries(holdings)) {
        const stock = market.getStock(id)
        const ph = stock?.priceHistory || []
        const pos = offset + (i - offset)
        value += h.shares * (pos < ph.length ? ph[pos].price : stock.currentPrice)
      }
      for (const [id, s] of Object.entries(portfolio.shorts || {})) {
        const stock = market.getStock(id)
        const ph = stock?.priceHistory || []
        const pos = offset + (i - offset)
        value -= s.shares * (pos < ph.length ? ph[pos].price : stock.currentPrice)
      }
      for (const [id, h] of Object.entries(portfolio.indexHoldings || {})) {
        value += h.shares * market.getIndexValue(id)
      }
      result.push({ time: refPh[i].time, price: parseFloat(value.toFixed(2)) })
    }
    return result
  }

  let daily = []

  if (props.indexId) {
    // Use pre-computed benchmark history for perfect consistency
    const bh = market.benchmarkHistory || []
    if (bh.length > 0) {
      daily = bh.map(b => ({ time: b.day, price: b.price }))
    } else {
      daily = buildSyntheticDaily(indexStocks.value)
    }
    if (daily.length > 0) {
      const lastPt = daily[daily.length - 1]
      // If last chart point is stale (not today's value), update smoothly
      if (lastPt.time < game.day) {
        daily.push({ time: game.day, price: indexPrice.value })
      } else if (Math.abs(lastPt.price - indexPrice.value) > indexPrice.value * 0.005) {
        // Same day but price diverged — update in place (no spike)
        lastPt.price = indexPrice.value
      }
    } else {
      daily = [{ time: 0, price: indexPrice.value }]
    }
  } else if (props.portfolioMode) {
    daily = (game.portfolioHistory || []).map(h => ({ time: h.day, price: h.netWorth }))
    if (daily.length > 0) {
      const last = daily[daily.length - 1]
      if (last.time < game.day) daily.push({ time: game.day, price: portfolio.totalNetWorth })
      else last.price = portfolio.totalNetWorth
    } else {
      daily = [{ time: game.day, price: portfolio.totalNetWorth }]
    }
  } else if (stock.value) {
    daily = (stock.value.historicalDaily || [])
      .filter(d => d.close !== null)
      .map(d => ({ time: d.day, price: d.close }))
  }

  return sliceDaily(daily, chartRange.value)
})

const chg = computed(() => {
  if (props.indexId) return market.getIndexPriceChange(props.indexId)
  return market.getPriceChange(props.stockId)
})

// --- Index-specific ---
const isCommodity = computed(() => stock.value?.type === 'commodity')
const futuresSpec = computed(() => isCommodity.value ? getFuturesSpec(props.stockId) : null)
const futuresNotional = computed(() => {
  if (!futuresSpec.value || !stock.value) return 0
  return contractValue(props.stockId, stock.value.currentPrice) * shares.value
})
const futuresMargin = computed(() => {
  if (!futuresSpec.value || !stock.value) return 0
  return marginPerContract(props.stockId, stock.value.currentPrice) * shares.value
})
const futuresLeverage = computed(() => {
  if (!futuresNotional.value || !futuresMargin.value) return 0
  return round2(futuresNotional.value / futuresMargin.value)
})

const indexFuturesNotional = computed(() => {
  return indexContractValue(indexPrice.value || 0) * shares.value
})
const indexFuturesMargin = computed(() => {
  return indexMarginPerContract(indexPrice.value || 0) * shares.value
})
const isIndex = computed(() => !!props.indexId)
const idxTradeMode = ref('buy')
const idxShares = ref(1)
const idxCashPct = ref(0)
function onIdxCashPct() {
  if (idxCashPct.value <= 0 || !indexPrice.value) return
  const pct = Math.min(100, Math.max(0, idxCashPct.value))
  idxShares.value = Math.floor(game.cash * (pct / 100) / indexPrice.value)
}
function setIdxPreset(pct) {
  if (idxTradeMode.value === 'buy') idxShares.value = Math.floor(game.cash * pct / indexPrice.value)
  else idxShares.value = Math.floor(idxMax * pct)
}
const indexPrice = computed(() => market.getIndexValue(props.indexId))
const indexName = computed(() => {
  const b = market.getBenchmarkInfo()
  if (b && b.id === props.indexId) return b.name
  const idx = market.activeIndexes.find(i => i.id === props.indexId)
  return idx?.name || props.indexId
})
const indexDesc = computed(() => {
  const b = market.getBenchmarkInfo()
  if (b && b.id === props.indexId) return b.description
  const idx = market.activeIndexes.find(i => i.id === props.indexId)
  return idx?.description || ''
})
const indexStocks = computed(() => market.getIndexStocks(props.indexId))
const indexHolding = computed(() => portfolio.indexHoldings[props.indexId])
const idxMax = computed(() => {
  const p = indexPrice.value
  return p > 0 ? Math.floor(game.cash / p) : 0
})
const idxRemaining = computed(() => game.cash - idxShares.value * indexPrice.value)

function executeIndexTrade() {
  if (idxTradeMode.value === 'buy') {
    portfolio.buyIndex(props.indexId, idxShares.value || 1)
  } else {
    const h = portfolio.indexHoldings[props.indexId]
    if (h) portfolio.sellIndex(props.indexId, h.shares)
  }
  emit('traded')
}

const canTrade = computed(() => {
  if (!stock.value || shares.value < 1) return false

  // Futures: check margin requirement
  if ((isCommodity.value || isIndex.value) && commodityTier.value === 'futures') {
    if (tradeMode.value === 'sell') return false
    const margin = isIndex.value ? indexFuturesMargin.value : futuresMargin.value
    return game.cash >= margin
  }

  if (tradeMode.value === 'buy' || tradeMode.value === 'cover') {
    const needed = useMargin.value ? round2(shares.value * effectivePrice.value * 0.5) : round2(shares.value * effectivePrice.value)
    if (game.cash < needed) return false
  }
  if (tradeMode.value === 'buy' || tradeMode.value === 'short') {
    if (shares.value > availableFloat.value) return false
  }
  if (tradeMode.value === 'sell') return holding.value && holding.value.shares >= shares.value
  if (tradeMode.value === 'cover') return shortPos.value && shortPos.value.shares >= shares.value
  return true
})

function formatLargeNum(n) {
  if (!n || n === 0) return '0'
  if (n >= 1e9) return round2(n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return round2(n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return round2(n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function executeTrade() {
  errorMsg.value = ''

  // Futures trade
  if ((isCommodity.value || isIndex.value) && commodityTier.value === 'futures') {
    const margin = isIndex.value ? indexFuturesMargin.value : futuresMargin.value
    if (game.cash < margin) {
      errorMsg.value = `Need $${margin.toLocaleString()} margin!`
      return
    }
    const direction = tradeMode.value === 'buy' ? 'long' : 'short'
    let ok
    if (isIndex.value) {
      ok = portfolio.openIndexFuturesTrade(props.indexId, direction, shares.value)
    } else {
      ok = portfolio.openFutures(props.stockId, direction, shares.value)
    }
    if (!ok) errorMsg.value = 'Insufficient margin!'
    else emit('traded')
    return
  }

  const price = stock.value.currentPrice
  if (tradeMode.value === 'buy') {
    if (shares.value > availableFloat.value) {
      errorMsg.value = `Only ${availableFloat.value.toLocaleString()} shares available!`
      return
    }
    const ok = portfolio.buyStock(props.stockId, shares.value, price, useMargin.value)
    if (!ok) errorMsg.value = 'Not enough cash or shares!'
    else emit('traded')
  } else if (tradeMode.value === 'sell') {
    const ok = portfolio.sellStock(props.stockId, shares.value, price)
    if (!ok) errorMsg.value = 'Not enough shares!'
    else emit('traded')
  } else if (tradeMode.value === 'short') {
    if (shares.value > availableFloat.value) {
      errorMsg.value = `Only ${availableFloat.value.toLocaleString()} shares available to short!`
      return
    }
    const ok = portfolio.shortSell(props.stockId, shares.value, price)
    if (!ok) errorMsg.value = 'Not enough shares available to short!'
    else emit('traded')
  } else if (tradeMode.value === 'cover') {
    const ok = portfolio.shortCover(props.stockId, shares.value, price)
    if (!ok) errorMsg.value = 'Not enough shares or cash to cover!'
    else emit('traded')
  }
}

function placeOrder() {
  if (orderLimitPrice.value <= 0) return
  const ok = portfolio.placeOrder(
    props.stockId, orderType.value, shares.value || 1,
    orderLimitPrice.value,
    orderType.value === 'stop_limit' ? orderStopPrice.value : null
  )
  if (!ok) errorMsg.value = 'Invalid order parameters'
}
</script>

<style scoped>
.trade-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 14px;
}
.trade-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.trade-header h2 { font-size: 15px; margin: 0; }
.sector-badge {
  display: inline-block;
  font-size: 10px;
  padding: 2px 7px;
  background: var(--accent-bg);
  color: var(--accent);
  border-radius: 3px;
  margin-top: 3px;
}
.price-area { text-align: right; }
.current-price { font-size: 20px; font-weight: 700; display: block; }
.price-change { font-size: 12px; }
.multi-changes {
  display: flex; gap: 8px; justify-content: flex-end; margin-top: 2px;
}
.mc-item {
  display: flex; flex-direction: column; align-items: center; font-size: 11px;
}
.mc-label {
  font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px;
}
.stock-desc { color: var(--text-secondary); font-size: 12px; margin-bottom: 10px; }
.tab-layout { display: block; }
.panel-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
.panel-tabs button {
  flex: 1; padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px;
  background: transparent; color: var(--text-secondary); cursor: pointer;
  font-weight: 600; font-size: 11px; font-family: inherit; transition: all 0.15s;
  text-align: center;
}
.panel-tabs button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.panel-tabs button:disabled { opacity: 0.4; cursor: not-allowed; }
.tab-content { min-height: 0; }
.fundamentals-panel { margin-bottom: 10px; }
.fund-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; }
.fund-item {
  background: var(--bg); border-radius: 4px; padding: 7px 10px;
  display: flex; justify-content: space-between; align-items: center;
}
.fund-label { font-size: 11px; color: var(--text-muted); }
.fund-value { font-size: 12px; font-weight: 600; }
.sent-label { font-size: 11px !important; }
.sent-bullish { color: var(--positive); }
.sent-neutral { color: var(--warning); }
.sent-bearish { color: var(--negative); }
.company-news { margin-bottom: 10px; }
.company-news h4 { font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 6px 0; }
.cn-item { display: flex; gap: 6px; font-size: 0.75rem; padding: 3px 0; border-bottom: 1px solid var(--border); align-items: flex-start; }
.cn-item:last-child { border-bottom: none; }
.chart-range { display: flex; gap: 4px; margin-bottom: 8px; }
.chart-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.chart-scroll::-webkit-scrollbar { height: 6px; }
.chart-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
.chart-range .btn-sm { padding: 3px 8px; font-size: 0.7rem; }
.company-stats {
  background: var(--bg);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cs-row { display: flex; justify-content: space-between; font-size: 0.78rem; }
.cs-value { font-weight: 600; color: var(--text); }
.trade-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.trade-tabs button {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.trade-tabs button.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
}
.trade-tabs button:disabled { opacity: 0.4; cursor: not-allowed; }
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.form-row label { width: 110px; font-size: 0.85rem; color: var(--text-secondary); }
.form-row input {
  flex: 1;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text);
  font-size: 0.9rem;
}
.btn-ghost {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.price-readonly {
  cursor: default;
  opacity: 0.8;
}
.market-badge {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--accent);
  color: #000;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.trade-summary {
  background: var(--bg);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 2px 0;
}
.total-amount { font-weight: 700; }
.impact-row {
  background: #fbbf2410;
  border-radius: 4px;
  padding: 2px 6px;
  margin: 2px -6px;
  font-size: 0.8rem;
}
.fee-row { color: var(--text-muted); font-size: 0.75rem; }
.btn-block { width: 100%; }
.btn-danger { background: #dc2626; }
.error-msg { color: #f87171; font-size: 0.85rem; margin-top: 8px; text-align: center; }

/* Options tab */
.options-panel { margin-top: 8px; }
.form-row-inline { display: flex; gap: 6px; }
.flex-1 { flex: 1; }
.form-group { margin-bottom: 6px; }
.form-group label { display: block; font-size: 10px; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase; }
.form-input-sm {
  width: 100%; background: var(--bg); border: 1px solid var(--border);
  border-radius: 3px; padding: 5px 8px; color: var(--text); font-size: 11px; font-family: inherit; box-sizing: border-box;
}
.type-toggle { display: flex; gap: 3px; }
.type-toggle button {
  flex: 1; padding: 5px; border: 1px solid var(--border); border-radius: 3px;
  background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 11px; font-family: inherit; font-weight: 600;
}
.type-toggle button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.option-summary { background: var(--bg); padding: 8px 10px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 3px; }
.sum-row { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }

/* Quick orders */
.quick-orders { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
.qo-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
.qo-row { display: flex; gap: 4px; }
.qo-select { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 3px 5px; color: var(--text); font-size: 10px; font-family: inherit; width: 90px; }
.qo-input { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 3px 6px; color: var(--text); font-size: 10px; font-family: inherit; width: 65px; }

/* Strike price buttons */
.strike-options { display: flex; gap: 6px; }
.strike-btn { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 8px 4px !important; height: auto !important; }
.strike-btn .strike-label { font-size: 10px; font-weight: 600; }
.strike-btn .strike-price { font-size: 14px; font-weight: 700; }
.strike-btn .strike-premium { font-size: 10px; color: var(--text-muted); }
.strike-btn.itm { border-color: var(--positive) !important; }
.strike-btn.otm { border-color: var(--negative) !important; }
</style>
