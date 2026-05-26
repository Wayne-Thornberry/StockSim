<template>
  <div class="dashboard">
    <div class="dash-columns">
      <!-- ========== LEFT COLUMN: Unified Market List ========== -->
      <div class="dash-left">
        <div class="ms-header">
          <input v-model="searchQuery" type="text" placeholder="Search name/code..." class="search-input" />
          <select v-model="selectedSector" class="sector-select"><option value="">All Sectors</option><option v-for="s in market.sectors" :key="s" :value="s">{{ s }}</option></select>
          <select v-model="sortField" class="sector-select">
            <option value="name">Name</option><option value="ticker">Code</option>
            <option value="price">Price</option>
            <option value="h1">1h %</option><option value="d1">1d %</option>
            <option value="d7">7d %</option><option value="d28">28d %</option>
          </select>
          <button class="btn btn-xs btn-ghost" @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'" :title="sortDir === 'desc' ? 'Highest first' : 'Lowest first'">
            {{ sortDir === 'desc' ? '▼' : '▲' }}
          </button>
          <button class="btn btn-xs btn-ghost" :class="{ 'btn-active': groupMode }" @click="groupMode = !groupMode" title="Group by type">
            📁
          </button>
        </div>
        <div class="selector-list flex-list unified-list">

          <template v-if="groupMode">
            <!-- 📦 Indexes -->
            <div class="section-label">📦 Indexes</div>
            <div v-if="benchmark" class="sel-row" :class="{ selected: selectedId === benchmark.id && selectedType === 'index' }" @click="selectIndex(benchmark.id)">
              <span class="sel-sym">{{ benchmark.ticker }}</span><span class="sel-name">{{ benchmark.name }}</span>
              <span class="sel-price">{{ fmt.money(market.getBenchmarkValue()) }}</span>
              <span class="sel-chgs">
                <span class="chg-bit" :class="benchChg.h1 >= 0 ? 'positive' : 'negative'"><i>1h</i>{{ fmt.pct(benchChg.h1) }}</span>
                <span class="chg-bit chg-main" :class="benchChg.d1 >= 0 ? 'positive' : 'negative'"><i>1d</i>{{ fmt.pct(benchChg.d1) }}</span>
                <span class="chg-bit" :class="benchChg.d7 >= 0 ? 'positive' : 'negative'"><i>7d</i>{{ fmt.pct(benchChg.d7) }}</span>
                <span class="chg-bit" :class="benchChg.d28 >= 0 ? 'positive' : 'negative'"><i>28d</i>{{ fmt.pct(benchChg.d28) }}</span>
              </span>
            </div>
            <div v-for="idx in indexList" :key="idx.id"
              class="sel-row" :class="{ selected: selectedId === idx.id && selectedType === 'index', rally: isIndexRallying(idx.id), dip: isIndexDipping(idx.id) }" @click="selectIndex(idx.id)">
              <span class="sel-sym">{{ idx.ticker }}</span><span class="sel-name">{{ idx.description }}</span>
              <span class="sel-price">{{ fmt.money(market.getIndexValue(idx.id)) }}</span>
              <span class="sel-chgs">
                <span class="chg-bit" :class="idxChgFor(idx).h1 >= 0 ? 'positive' : 'negative'"><i>1h</i>{{ fmt.pct(idxChgFor(idx).h1) }}</span>
                <span class="chg-bit chg-main" :class="idxChgFor(idx).d1 >= 0 ? 'positive' : 'negative'"><i>1d</i>{{ fmt.pct(idxChgFor(idx).d1) }}</span>
                <span class="chg-bit" :class="idxChgFor(idx).d7 >= 0 ? 'positive' : 'negative'"><i>7d</i>{{ fmt.pct(idxChgFor(idx).d7) }}</span>
                <span class="chg-bit" :class="idxChgFor(idx).d28 >= 0 ? 'positive' : 'negative'"><i>28d</i>{{ fmt.pct(idxChgFor(idx).d28) }}</span>
              </span>
            </div>
            <!-- 🏢 Companies -->
            <div class="section-label">🏢 Companies</div>
            <div v-for="s in filteredStocks" :key="s.id"
              class="sel-row" :class="{ selected: selectedId === s.id && selectedType === 'stock', rally: isRallying(s.id), dip: isDipping(s.id) }" @click="selectCompany(s.id)">
              <span class="sel-sym">{{ s.ticker }}</span><span class="sel-name">{{ s.name }} <i class="sector-tag">{{ s.sector }}</i></span>
              <span class="sel-price">{{ fmt.money(s.currentPrice) }}</span>
              <span class="sel-chgs"><span class="chg-bit" :class="chgFor(s).h1 >= 0 ? 'positive' : 'negative'"><i>1h</i>{{ fmt.pct(chgFor(s).h1) }}</span><span class="chg-bit chg-main" :class="chgFor(s).d1 >= 0 ? 'positive' : 'negative'"><i>1d</i>{{ fmt.pct(chgFor(s).d1) }}</span><span class="chg-bit" :class="chgFor(s).d7 >= 0 ? 'positive' : 'negative'"><i>7d</i>{{ fmt.pct(chgFor(s).d7) }}</span><span class="chg-bit" :class="chgFor(s).d28 >= 0 ? 'positive' : 'negative'"><i>28d</i>{{ fmt.pct(chgFor(s).d28) }}</span></span>
            </div>
            <!-- 🏷 Commodities -->
            <div class="section-label">🏷 Commodities</div>
            <div v-for="s in commodityStocks" :key="s.id"
              class="sel-row" :class="{ selected: selectedId === s.id && selectedType === 'stock' }" @click="selectCompany(s.id)">
              <span class="sel-sym">{{ s.ticker }}</span><span class="sel-name">{{ s.name }} <i class="sector-tag">{{ s.category }}</i></span>
              <span class="sel-price">{{ fmt.money(s.currentPrice) }}</span>
              <span class="sel-chgs"><span class="chg-bit" :class="chgFor(s).h1 >= 0 ? 'positive' : 'negative'"><i>1h</i>{{ fmt.pct(chgFor(s).h1) }}</span><span class="chg-bit chg-main" :class="chgFor(s).d1 >= 0 ? 'positive' : 'negative'"><i>1d</i>{{ fmt.pct(chgFor(s).d1) }}</span><span class="chg-bit" :class="chgFor(s).d7 >= 0 ? 'positive' : 'negative'"><i>7d</i>{{ fmt.pct(chgFor(s).d7) }}</span><span class="chg-bit" :class="chgFor(s).d28 >= 0 ? 'positive' : 'negative'"><i>28d</i>{{ fmt.pct(chgFor(s).d28) }}</span></span>
            </div>
          </template>

          <!-- Ungrouped: flat sorted list -->
          <template v-else>
            <div v-for="item in allItems" :key="item._key"
              class="sel-row" :class="{ selected: selectedId === item.id && selectedType === item._type }"
              @click="item._type === 'index' ? selectIndex(item.id) : selectCompany(item.id)">
              <span class="sel-sym">{{ item.ticker }}</span>
              <span class="sel-name">{{ item._label }} <i class="sector-tag">{{ item._tag }}</i></span>
              <span class="sel-price">{{ fmt.money(item._price) }}</span>
              <span class="sel-chgs">
                <span class="chg-bit" :class="item._chg?.h1 >= 0 ? 'positive' : 'negative'"><i>1h</i>{{ fmt.pct(item._chg?.h1) }}</span>
                <span class="chg-bit chg-main" :class="item._chg?.d1 >= 0 ? 'positive' : 'negative'"><i>1d</i>{{ fmt.pct(item._chg?.d1) }}</span>
                <span class="chg-bit" :class="item._chg?.d7 >= 0 ? 'positive' : 'negative'"><i>7d</i>{{ fmt.pct(item._chg?.d7) }}</span>
                <span class="chg-bit" :class="item._chg?.d28 >= 0 ? 'positive' : 'negative'"><i>28d</i>{{ fmt.pct(item._chg?.d28) }}</span>
              </span>
            </div>
          </template>
        </div>
      </div>

      <!-- ========== RIGHT COLUMN: Trade, Holdings, Benchmark, Activity ========== -->
      <div class="dash-right">
        <!-- Trade Panel or Portfolio Overview -->
        <div v-if="selectedId" class="trade-area">
          <div class="trade-close-row">
            <button class="btn btn-xs btn-ghost" @click="selectedId = null">✕ Close</button>
          </div>
          <TradePanel v-if="selectedType === 'stock'" :stockId="selectedId" @traded="onTraded" />
          <TradePanel v-else :indexId="selectedId" @traded="onTraded" />
        </div>

        <!-- Portfolio Overview Chart (when nothing selected) -->
        <div v-else class="portfolio-overview">
          <TradePanel :portfolioMode="true" />
        </div>

        <!-- Compact Holdings -->
        <div class="panel holdings-panel compact">
          <div class="panel-header">
            <span class="panel-title">Holdings</span>
            <span class="panel-badge">{{ Object.keys(portfolio.holdings).length + Object.keys(portfolio.shorts).length }} pos</span>
          </div>
          <div class="panel-body">
            <div v-if="Object.keys(portfolio.holdings).length === 0 && Object.keys(portfolio.indexHoldings).length === 0 && Object.keys(portfolio.shorts).length === 0" class="empty-state">No positions</div>
            <table v-else class="data-table compact">
              <thead><tr><th>Sym</th><th class="right">Qty</th><th class="right">Val</th><th class="right">P/L</th></tr></thead>
              <tbody>
                <tr v-for="(h, id) in portfolio.holdings" :key="id" @click="selectCompany(id)" class="clickable">
                  <td><span class="symbol">{{ market.ticker(id) }}</span></td>
                  <td class="right mono">{{ h.shares }}</td>
                  <td class="right mono">{{ fmt.money(h.shares * (market.getStock(id)?.currentPrice || 0)) }}</td>
                  <td class="right" :class="getStockPL(id, h) >= 0 ? 'positive' : 'negative'">{{ fmt.money(getStockPL(id, h)) }}</td>
                </tr>
                <tr v-for="(h, id) in portfolio.indexHoldings" :key="'i-'+id" @click="selectIndex(id)" class="clickable">
                  <td><span class="symbol">{{ id }}</span></td>
                  <td class="right mono">{{ h.shares }}</td>
                  <td class="right mono">{{ fmt.money(h.shares * market.getIndexValue(id)) }}</td>
                  <td class="right" :class="getIndexPL(id, h) >= 0 ? 'positive' : 'negative'">{{ fmt.money(getIndexPL(id, h)) }}</td>
                </tr>
                <tr v-for="(s, id) in portfolio.shorts" :key="'sh-'+id" @click="selectCompany(id)" class="clickable short-row">
                  <td><span class="symbol short-sym">{{ market.ticker(id) }} ⚡</span></td>
                  <td class="right mono">{{ s.shares }}</td>
                  <td class="right mono negative">{{ fmt.money(-s.shares * (market.getStock(id)?.currentPrice || 0)) }}</td>
                  <td class="right" :class="getShortPL(id, s) >= 0 ? 'positive' : 'negative'">{{ fmt.money(getShortPL(id, s)) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="portfolio.orders.length" class="orders-sublist">
              <div class="sub-header">📝 Orders</div>
              <div v-for="o in portfolio.orders" :key="o.id" class="order-row">
                <span class="order-type" :class="'ot-' + o.type">{{ orderLabel(o.type) }}</span>
                <span>{{ market.ticker(o.companyId) }}</span>
                <span>{{ o.shares }} sh @ {{ fmt.money(o.limitPrice) }}</span>
                <button class="btn btn-xs btn-ghost" @click="portfolio.cancelOrder(o.id)">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sector Performance Bar -->
        <div class="sector-bar">
          <div class="sector-bar-header">
            <span class="panel-title">🔥 Sectors</span>
          </div>
          <div class="sector-items">
            <div v-for="s in sectorPerformance" :key="s.sector" class="sector-item">
              <span class="sector-name">{{ s.sector }}</span>
              <div class="sector-track">
                <div class="sector-fill" :class="s.change >= 0 ? 'positive' : 'negative'"
                  :style="{ width: Math.abs(s.change * 300) + '%', maxWidth: '100%' }"></div>
              </div>
              <span class="sector-pct" :class="s.change >= 0 ? 'positive' : 'negative'">{{ s.change >= 0 ? '+' : '' }}{{ s.change.toFixed(1) }}%</span>
            </div>
          </div>
        </div>

        <div class="activity-feed">
          <div class="panel-header" @click="showFullLog = true" title="Click for full event log">
            <span class="panel-title">📋 Activity</span>
            <span class="panel-badge">{{ activityItems.length }}</span>
          </div>
          <div class="feed-list">
            <div v-for="(item, i) in activityItems.slice(0, 20)" :key="i" class="feed-item" :class="item.cssClass" @click="openDetail(item)">
              <span class="fi-icon">{{ item.icon }}</span>
              <span class="fi-text">{{ item.summary }}</span>
              <span class="fi-time">{{ item.timeStr }}</span>
            </div>
            <div v-if="activityItems.length > 20" class="feed-item feed-more" @click="showFullLog = true">
              <span class="fi-icon">📋</span>
              <span class="fi-text">... {{ activityItems.length - 20 }} more events — click to view all</span>
            </div>
            <div v-if="activityItems.length === 0" class="empty-state">No activity yet</div>
          </div>
        </div>

        <!-- ========== FULL EVENT LOG MODAL ========== -->
        <div v-if="showFullLog" class="popout-overlay" @click.self="showFullLog = false">
          <div class="popout-dialog full-log-dialog">
            <div class="popout-header">
              <span>📋 Full Event Log ({{ activityItems.length }} entries)</span>
              <button class="btn btn-sm btn-ghost" @click="showFullLog = false">✕</button>
            </div>
            <div class="popout-body full-log-body">
              <div v-for="(item, i) in activityItems" :key="i" class="feed-item" :class="item.cssClass" @click="openDetail(item)">
                <span class="fi-icon">{{ item.icon }}</span>
                <span class="fi-text">{{ item.summary }}</span>
                <span class="fi-time">{{ item.timeStr }}</span>
              </div>
              <div v-if="activityItems.length === 0" class="empty-state">No events logged yet</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== DETAIL POPOUT ========== -->
    <div v-if="detailItem" class="popout-overlay" @click.self="detailItem = null">
      <div class="popout-dialog">
        <div class="popout-header"><span>{{ detailItem.icon }} {{ detailItem.title || 'Details' }}</span><button class="btn btn-sm btn-ghost" @click="detailItem = null">✕</button></div>
        <div class="popout-body">
          <p class="popout-time">{{ detailItem.timeStr }}</p>
          <p class="popout-text">{{ detailItem.fullText || detailItem.summary }}</p>
          <div v-if="detailItem.companyId" style="margin-top:10px"><button class="btn btn-primary btn-sm" @click="detailItem = null; selectCompany(detailItem.companyId)">📊 View {{ market.ticker(detailItem.companyId) }}</button></div>
          <div v-if="detailItem.indexId" style="margin-top:10px"><button class="btn btn-primary btn-sm" @click="detailItem = null; selectIndex(detailItem.indexId)">📦 View Index</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore.js'
import { useMarketStore } from '@/stores/marketStore.js'
import { usePortfolioStore } from '@/stores/portfolioStore.js'
import { useCurrencyStore } from '@/stores/currencyStore.js'
import { useFormat } from '@/composables/useFormat.js'
import TradePanel from '@/components/TradePanel.vue'

const game = useGameStore()
const market = useMarketStore()
const portfolio = usePortfolioStore()
const currency = useCurrencyStore()
const fmt = useFormat()

const selectedId = ref(null)
const selectedType = ref('stock')
const searchQuery = ref('')
const selectedSector = ref('')
const sortField = ref('name')
const sortDir = ref('asc')
const groupMode = ref(true)
const idxShares = ref(1)
const detailItem = ref(null)
const showFullLog = ref(false)
const indexList = computed(() => market.activeIndexes)
const benchmark = computed(() => market.getBenchmarkInfo())
const benchChg = computed(() => market.getBenchmarkPriceChange())

const filteredStocks = computed(() => {
  let stocks = [...market.stockList].filter(s => s.type !== 'commodity')
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    stocks = stocks.filter(s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
  }
  if (selectedSector.value) stocks = stocks.filter(s => s.sector === selectedSector.value)
  sortList(stocks)
  return stocks
})

function sortList(list) {
  const field = sortField.value
  const dir = sortDir.value === 'desc' ? -1 : 1
  list.sort((a, b) => {
    if (field === 'name') return dir * (a.name || '').localeCompare(b.name || '')
    if (field === 'ticker') return dir * (a.ticker || '').localeCompare(b.ticker || '')
    if (field === 'price') return dir * ((b.currentPrice || b._price || 0) - (a.currentPrice || a._price || 0))
    const ca = market.getPriceChange(a.id)
    const cb = market.getPriceChange(b.id)
    return dir * ((cb[field] || 0) - (ca[field] || 0))
  })
}

const commodityStocks = computed(() => market.stockList.filter(s => s.type === 'commodity'))

const allItems = computed(() => {
  const items = []
  const bench = market.getBenchmarkInfo()
  if (bench) items.push({ ...bench, _key:'b-'+bench.id, _type:'index', _label:bench.name, _tag:'Benchmark', _price:market.getBenchmarkValue(), _chg:benchChg.value })
  for (const idx of indexList.value) {
    items.push({ ...idx, _key:'i-'+idx.id, _type:'index', _label:idx.description, _tag:'Index', _price:market.getIndexValue(idx.id), _chg:market.getIndexPriceChange(idx.id) })
  }
  for (const s of market.stockList.filter(s => s.type !== 'commodity')) {
    if (searchQuery.value) { const q = searchQuery.value.toLowerCase(); if (!s.name.toLowerCase().includes(q) && !s.ticker.toLowerCase().includes(q)) continue }
    if (selectedSector.value && s.sector !== selectedSector.value) continue
    items.push({ ...s, _key:'c-'+s.id, _type:'stock', _label:s.name, _tag:s.sector, _price:s.currentPrice, _chg:market.getPriceChange(s.id) })
  }
  for (const s of commodityStocks.value) {
    if (searchQuery.value) { const q = searchQuery.value.toLowerCase(); if (!s.name.toLowerCase().includes(q) && !s.ticker.toLowerCase().includes(q)) continue }
    items.push({ ...s, _key:'m-'+s.id, _type:'stock', _label:s.name, _tag:s.category, _price:s.currentPrice, _chg:market.getPriceChange(s.id) })
  }
  sortList(items)
  return items
})

function chgFor(s) { return market.getPriceChange(s.id) }
function idxChgFor(idx) { return market.getIndexPriceChange(idx.id) }
function getStockPL(id, h) { const s = market.getStock(id); return s ? (s.currentPrice - h.avgCost) * h.shares : 0 }
function getIndexPL(id, h) { return (market.getIndexValue(id) - h.avgCost) * h.shares }
function getShortPL(id, s) { const st = market.getStock(id); return st ? (s.entryPrice - st.currentPrice) * s.shares : 0 }

const orderLabels = { limit_buy: 'Limit Buy', limit_sell: 'Limit Sell', stop_loss: 'Stop Loss', stop_limit: 'Stop Limit' }
function orderLabel(type) { return orderLabels[type] || type }

function selectCompany(id) { selectedId.value = id; selectedType.value = 'stock' }
function selectIndex(id) { selectedId.value = id; selectedType.value = 'index' }
function onTraded() {}

// Rally/dip
function isRallying(id) { const e = game.marketEvent; return e?.type === 'bull' && e.affectedStocks?.includes(id) }
function isDipping(id) { const e = game.marketEvent; return (e?.type === 'bear' || e?.type === 'crash') && e.affectedStocks?.includes(id) }
function isIndexRallying(id) { const e = game.marketEvent; return e?.type === 'bull' && e.affectedIndexes?.includes(id) }
function isIndexDipping(id) { const e = game.marketEvent; return (e?.type === 'bear' || e?.type === 'crash') && e.affectedIndexes?.includes(id) }

// Sector performance (28-day change, cap-weighted)
const sectorPerformance = computed(() => {
  const sectors = {}
  for (const stock of market.stockList) {
    if (!stock.sector || stock.sector === 'Commodities') continue
    const chg = market.getPriceChange(stock.id)
    if (!sectors[stock.sector]) sectors[stock.sector] = { sum: 0, count: 0 }
    sectors[stock.sector].sum += chg.d28
    sectors[stock.sector].count++
  }
  return Object.entries(sectors)
    .map(([sector, data]) => ({ sector, change: data.count > 0 ? data.sum / data.count : 0 }))
    .sort((a, b) => b.change - a.change)
})

// Unified activity feed
const activityItems = computed(() => {
  const items = []

  // Market event
  if (game.marketEvent) {
    items.push({
      icon: game.marketEvent.type === 'bull' ? '📈' : game.marketEvent.type === 'crash' ? '💥' : '📉',
      time: game.day, timeStr: `Day ${game.day}`,
      summary: game.marketEvent.name,
      fullText: game.marketEvent.name + (game.marketEvent.affectedStocks?.length ? `\n\nAffected: ${game.marketEvent.affectedStocks.map(s => market.ticker(s)).join(', ')}` : ''),
      cssClass: game.marketEvent.type === 'bull' ? 'bull' : game.marketEvent.type === 'crash' ? 'crash' : 'bear',
      title: 'Market Event'
    })
  }

  // News results (including world events)
  for (const a of market.newsFeed) {
    if (a.isResult) {
      const fullText = a.worldEventId
        ? `${a.headline}\n\nSector Impacts:\n${a.sectorSummary?.replace(/\| /g, '\n') || ''}\n\nDuration: ${a.duration || '?'} days`
        : `${a.headline}\n\nCompany: ${a.companyName}\nSector: ${a.sector}\nImpact: ${a.impact ? ((a.impact * 100).toFixed(1) + '%') : 'N/A'}`
      items.push({
        icon: a.eventIcon, time: a.day, timeStr: `Day ${a.day}`,
        summary: a.headline + (a.impact ? ` (${(a.impact >= 0 ? '+' : '') + (a.impact * 100).toFixed(1)}%)` : ''),
        fullText,
        cssClass: a.worldEventId ? 'neutral' : ((a.impact || 0) >= 0 ? 'bull' : 'bear'),
        companyId: a.companyId, title: a.eventLabel
      })
    }
  }

  // Historical event log (from simulation)
  for (const entry of (market.eventLog || [])) {
    const dayLabel = entry.day ? `Day ${entry.day}` : 'History'
    items.push({
      icon: entry.icon || '📋',
      time: entry.day || 0,
      timeStr: dayLabel,
      summary: entry.headline || entry.message || '',
      fullText: `${entry.headline || entry.message}\n${entry.companyName ? 'Company: ' + entry.companyName : ''}\n${entry.sector ? 'Sector: ' + entry.sector : ''}`,
      cssClass: entry.type === 'bankruptcy' || entry.type === 'market_crash' ? 'crash' :
                entry.type === 'ipo' || entry.type === 'breakthrough' || entry.type === 'market_boom' ? 'bull' :
                entry.type === 'scandal' || entry.type === 'productFailure' || entry.type === 'market_dip' ? 'bear' : 'neutral',
      companyId: entry.companyId,
      title: entry.type?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) || 'Event'
    })
  }

  // Transactions
  for (const tx of portfolio.transactions) {
    const isBuy = tx.type.includes('buy')
    items.push({
      icon: isBuy ? '🟢' : '🔴',
      time: game.day, timeStr: `Day ${game.day}`,
      summary: `${isBuy ? 'Bought' : 'Sold'} ${tx.shares || tx.contracts || ''} ${market.ticker(tx.companyId) || tx.indexId || ''} @ ${fmt.money(tx.price || tx.premium || tx.strikePrice || 0)}`,
      fullText: `${tx.type?.toUpperCase()}\n${market.ticker(tx.companyId) || tx.indexId || ''}\nQuantity: ${tx.shares || tx.contracts}\nPrice: ${fmt.money(tx.price || tx.premium || tx.strikePrice || 0)}\nTotal: ${fmt.money(tx.total)}`,
      cssClass: isBuy ? 'bull' : 'bear',
      companyId: tx.companyId, indexId: tx.indexId, title: 'Transaction'
    })
  }

  // Notifications
  for (const n of game.notifications) {
    items.push({
      icon: n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️',
      time: game.day, timeStr: n.time || `Day ${game.day}`,
      summary: n.message, fullText: n.message,
      cssClass: n.type === 'success' ? 'bull' : n.type === 'error' ? 'crash' : n.type === 'warning' ? 'bear' : 'neutral',
      title: 'Notification'
    })
  }

  // Sort newest first
  items.sort((a, b) => b.time - a.time)

  // Deduplicate
  const seen = new Set()
  return items.filter(e => { const k = e.summary.substring(0, 50); if (seen.has(k)) return false; seen.add(k); return true })
})

function openDetail(item) {
  if (item.companyId) { selectCompany(item.companyId); return }
  if (item.indexId) { selectIndex(item.indexId); return }
  detailItem.value = item
}
</script>

<style scoped>
.dashboard { height: 100%; overflow: hidden; }
.dash-columns { display: flex; height: 100%; gap: 0; }

/* ====== LEFT COLUMN ====== */
.dash-left {
  width: 42%; min-width: 380px; flex-shrink: 0;
  display: flex; flex-direction: column; overflow: hidden;
  border-right: 1px solid var(--border); padding: 8px 10px;
  background: var(--bg);
}
.unified-list { flex: 1; overflow-y: auto; min-height: 0; }

/* Section labels */
.section-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 0 3px; flex-shrink: 0; }

/* Unified selector rows (indexes & companies) */
.selector-list { overflow: hidden; }
.selector-list.flex-list { flex: 1; overflow-y: auto; min-height: 0; }
.sel-row {
  display: grid; grid-template-columns: 72px 1fr 64px 188px; gap: 3px; align-items: center;
  padding: 5px 10px; cursor: pointer; transition: background 0.1s; border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.sel-row:last-child { border-bottom: none; }
.sel-row:hover { background: var(--surface-alt); }
.sel-row.selected { background: var(--accent-bg); border-left: 3px solid var(--accent); }
.sel-row.rally { background: var(--positive-bg); border-left: 3px solid var(--positive); }
.sel-row.dip { background: var(--negative-bg); border-left: 3px solid var(--negative); }
.sel-sym { font-weight: 700; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sel-name { font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sector-tag { font-style: normal; font-size: 8px; color: var(--text-muted); background: var(--bg); padding: 1px 4px; border-radius: 2px; margin-left: 4px; }
.sel-price { text-align: right; font-weight: 600; font-size: 11px; font-variant-numeric: tabular-nums; }
.sel-chgs { display: flex; gap: 2px; justify-content: flex-end; align-items: baseline; }
.chg-bit { font-size: 9px; font-weight: 600; white-space: nowrap; }
.chg-bit i { font-style: normal; font-weight: 400; font-size: 7px; color: var(--text-muted); margin-right: 1px; }
.chg-main { font-size: 11px; }

/* Indexes section */
.idx-section { flex-shrink: 0; }

/* Companies section — fills remaining space */
.co-section { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.ms-header { display: flex; gap: 4px; margin-bottom: 4px; flex-shrink: 0; }
.search-input { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; color: var(--text); font-size: 11px; width: 100px; font-family: inherit; }
.sector-select { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 4px 6px; color: var(--text); font-size: 11px; font-family: inherit; }
.flex-list { border: 1px solid var(--border); }

/* Trade area — below lists, expands when item selected */
.trade-area { flex: 6 1 0; min-height: 0; overflow-y: auto; }
.trade-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
.trade-header h2 { font-size: 14px; margin: 0; }
.current-price { font-size: 18px; font-weight: 700; }
.price-change { font-size: 11px; margin-left: 4px; }
.sector-badge { font-size: 9px; padding: 1px 5px; background: var(--accent-bg); color: var(--accent); border-radius: 3px; margin-left: 4px; }
.chart-range { display: flex; gap: 2px; margin: 4px 0; }
.chart-range button { font-size: 9px; padding: 1px 5px; }
/* Trade form styles (shared with TradePanel) */
.trade-tabs { display: flex; gap: 4px; margin-bottom: 10px; }
.trade-tabs button { padding: 5px 14px; border: 1px solid var(--border); background: var(--bg); color: var(--text); border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-family: inherit; }
.trade-tabs button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.trade-tabs button:disabled { opacity: 0.4; cursor: not-allowed; }
.form-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.form-row label { width: 110px; font-size: 0.85rem; color: var(--text-secondary); }
.form-row input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--text); font-size: 0.9rem; }
.share-presets { display: flex; gap: 4px; margin-bottom: 10px; }
.trade-summary { background: var(--bg); border-radius: 8px; padding: 10px; margin-bottom: 10px; }
.summary-row { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 2px 0; }
.total-amount { font-weight: 700; }
.btn-block { width: 100%; }
.stock-desc { font-size: 11px; color: var(--text-muted); margin: 4px 0; }
.multi-changes { display: flex; gap: 8px; justify-content: flex-end; margin-top: 2px; }
.mc-item { display: flex; flex-direction: column; align-items: center; font-size: 11px; }
.mc-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
.stock-chips { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 2px; }
.stock-chip { font-size: 9px; padding: 1px 5px; background: var(--bg); border: 1px solid var(--border); border-radius: 2px; color: var(--text-secondary); }
.idx-owned { margin-top: 4px; font-size: 10px; color: var(--text-muted); }
.trade-close-row { display: flex; justify-content: flex-end; margin-bottom: 4px; }
.portfolio-overview { flex: 6 1 0; min-height: 0; overflow-y: auto; }
.po-summary { display: flex; gap: 16px; font-size: 12px; margin-top: 4px; }
.holdings-panel.compact { flex: 3 1 0; min-height: 0; overflow-y: auto; }
.holdings-panel.compact .data-table { font-size: 10px; }
.holdings-panel.compact th { padding: 2px 6px; }
.holdings-panel.compact td { padding: 2px 6px; }
.data-table.compact th, .data-table.compact td { padding: 2px 6px; font-size: 10px; }

/* ====== RIGHT COLUMN ====== */
.dash-right {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  overflow: hidden; padding: 8px 10px; gap: 8px; background: var(--bg);
}

.holdings-panel { min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
.holdings-panel .panel-body { flex: 1; overflow-y: auto; }

.benchmark-panel { flex-shrink: 0; }
.bench-val { font-size: 12px; font-weight: 700; }
.bench-main { font-size: 18px; font-weight: 700; }
.idx-row-name { font-weight: 600; }
.idx-row-chg { float: right; }

/* Activity feed */
.activity-feed { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.activity-feed .panel-header { padding: 3px 10px; background: var(--surface-alt); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; flex-shrink: 0; cursor: pointer; }
.activity-feed .panel-header:hover { background: var(--border); }
.feed-item {
  display: flex; align-items: center; gap: 6px; padding: 3px 10px;
  font-size: 11px; border-bottom: 1px solid var(--border); cursor: pointer;
}
.feed-item:hover { background: var(--surface-alt); }
.feed-item:last-child { border-bottom: none; }
.feed-item.bull { border-left: 3px solid var(--positive); }
.feed-item.bear { border-left: 3px solid var(--negative); }
.feed-item.crash { border-left: 3px solid #dc2626; background: #dc262608; }
.feed-item.neutral { border-left: 3px solid var(--border); }
.fi-icon { flex-shrink: 0; font-size: 12px; }
.fi-text { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fi-time { font-size: 9px; color: var(--text-muted); flex-shrink: 0; }
.fi-time { flex-shrink: 0; font-size: 9px; color: var(--text-muted); }

.panel-badge { font-size: 10px; color: var(--text-muted); }

/* Popout */
.popout-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 300; display: flex; align-items: center; justify-content: center; }
.popout-dialog { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; max-width: 480px; width: 90%; max-height: 65vh; display: flex; flex-direction: column; }
.popout-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); font-size: 14px; font-weight: 600; }
.popout-body { padding: 14px; overflow-y: auto; font-size: 13px; line-height: 1.6; }
.popout-time { color: var(--text-muted); font-size: 11px; margin-bottom: 8px; }
.popout-text { white-space: pre-line; }

/* Full log modal */
.full-log-dialog { max-width: 680px; max-height: 80vh; }
.full-log-body { padding: 8px; }
.full-log-body .feed-item { padding: 6px 10px; font-size: 12px; }
.feed-more { cursor: pointer; color: var(--accent); font-style: italic; justify-content: center; }
.feed-more:hover { background: var(--accent-bg); }

.panel-header.rally-active { background: var(--positive-bg); }
.panel-header.dip-active { background: var(--negative-bg); }
.positive { color: var(--positive); }
.negative { color: var(--negative); }
.empty-state { text-align: center; color: var(--text-muted); padding: 16px; font-size: 12px; }

/* Orders */
.orders-sublist { border-top: 1px solid var(--border); padding: 4px 0; }
.sub-header { font-size: 9px; text-transform: uppercase; color: var(--text-muted); padding: 2px 10px; }
.order-row { display: flex; align-items: center; gap: 6px; padding: 3px 10px; font-size: 10px; border-bottom: 1px solid var(--border); }
.order-row:last-child { border-bottom: none; }
.order-type { font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 2px; }
.ot-limit_buy { background: var(--positive-bg); color: var(--positive); }
.ot-limit_sell { background: var(--negative-bg); color: var(--negative); }
.ot-stop_loss { background: #dc262615; color: #dc2626; }
.ot-stop_limit { background: #e8b32d15; color: var(--warning); }

/* Sector performance bar */
.sector-bar { margin-bottom: 4px; }
.sector-bar-header { padding: 3px 10px; background: var(--surface-alt); border-bottom: 1px solid var(--border); }
.sector-items { background: var(--bg); }
.sector-item { display: flex; align-items: center; gap: 6px; padding: 2px 10px; font-size: 10px; }
.sector-name { width: 75px; color: var(--text-muted); font-weight: 600; flex-shrink: 0; }
.sector-track { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.sector-fill { height: 100%; border-radius: 3px; min-width: 2px; transition: width 0.3s; }
.sector-fill.positive { background: var(--positive); }
.sector-fill.negative { background: var(--negative); }
.sector-pct { width: 45px; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>
