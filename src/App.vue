<template>
  <div class="app-container">
    <!-- Welcome / Start Screen -->
    <div v-if="!game.gameStarted && !showConfig" class="welcome-screen">
      <div class="welcome-card">
        <div class="welcome-icon">📈</div>
        <h1>StockSim</h1>
        <p class="tagline">Virtual Stock Market Simulation</p>
        <div class="features">
          <div class="feature"><span>📊</span> Trade virtual stocks</div>
          <div class="feature"><span>⏩</span> Speed up time</div>
          <div class="feature"><span>📦</span> Buy/sell indexes</div>
          <div class="feature"><span>🎯</span> Trade options</div>
          <div class="feature"><span>💾</span> Save locally or export</div>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-primary btn-lg" @click="showConfig = true">New Game</button>
          <button v-if="hasAnySave" class="btn btn-success btn-lg" @click="loadLatestGame">▶ Continue</button>
          <button class="btn btn-secondary btn-lg" @click="showSettings = true">Load Game</button>
        </div>
        <p v-if="hasAnySave" class="save-hint">Saved game found. Click Continue to resume or Load to pick a slot.</p>
      </div>
    </div>

    <!-- New Game Config Screen -->
    <NewGameConfig v-if="showConfig && !game.gameStarted" @start="onConfigStart" @back="showConfig = false" />

    <!-- Game Over Screen -->
    <div v-if="game.gameOver" class="game-over-overlay">
      <div class="game-over-modal">
        <div class="game-over-icon">💀</div>
        <h2>Game Over</h2>
        <p>{{ game.gameOverReason }}</p>
        <p class="go-stats">
          Survived {{ game.day }} days · Net Worth: {{ fmt.money(portfolio.totalNetWorth) }}
        </p>
        <button class="btn btn-primary btn-lg" @click="game.resetGame()">Try Again</button>
      </div>
    </div>

    <!-- Main Game UI -->
    <div v-else-if="game.gameStarted" class="game-layout">
      <Dashboard />

      <!-- Bottom Bar (fixed) -->
      <div class="bottom-bar">
        <div class="toolbar-nav">
          <button class="tb-btn" @click="showBank = !showBank" :class="{ active: showBank }">🏦</button>
          <button class="tb-btn" @click="showSettings = !showSettings" title="Settings (Esc)">⚙️</button>
          <button class="tb-btn" @click="showHelp = !showHelp" :class="{ active: showHelp }" title="Help">❓</button>
          <button class="tb-btn" @click="showInfluence = !showInfluence" :class="{ active: showInfluence }" title="Market Influence">🕶️</button>
          <span class="tb-sep"></span>
          <button v-if="game.difficulty === 'creative'" class="tb-btn" @click="showAdmin = !showAdmin" :class="{ active: showAdmin }" title="Admin Panel">🔧</button>
        </div>
        <div class="top-stats">
          <div class="stat">
            <span class="stat-label">Cash</span>
            <span class="stat-value cash">{{ fmt.money(game.cash) }}</span>
          </div>
          <div v-if="game.loanBalance > 0" class="stat">
            <span class="stat-label">Loan</span>
            <span class="stat-value negative">{{ fmt.money(game.loanBalance) }}</span>
          </div>
          <div v-if="game.marginDebt > 0" class="stat">
            <span class="stat-label">Margin Debt</span>
            <span class="stat-value negative">{{ fmt.money(game.marginDebt) }}</span>
          </div>
          <div v-if="portfolio.futures.length > 0" class="stat" title="Futures P&L + Margin">
            <span class="stat-label">📜 Futures</span>
            <span class="stat-value" :class="portfolio.totalFuturesPnL >= 0 ? 'positive' : 'negative'">{{ fmt.money(portfolio.totalFuturesPnL) }}</span>
          </div>
          <div class="stat" title="Net Worth = Cash + Stocks + Indexes + Options + Shorts + Futures">
            <span class="stat-label">Net Worth</span>
            <span class="stat-value" :class="portfolio.totalProfitLoss >= 0 ? 'positive' : 'negative'">{{ fmt.money(portfolio.totalNetWorth) }}</span>
          </div>
          <div class="stat" title="Influence Heat — rises with suspicious activity">
            <span class="stat-label">🔥 Heat</span>
            <span class="stat-value" :class="influence.heat >= 50 ? 'negative' : influence.heat >= 20 ? '' : 'positive'">{{ influence.heat }}/100</span>
          </div>
          <div class="stat">
            <span class="stat-label">Date</span>
            <span class="stat-value">{{ game.currentDateStr }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Time</span>
            <span class="stat-value">{{ game.currentTime }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Day #</span>
            <span class="stat-value">{{ game.currentDay }}</span>
          </div>
          <div class="stat">
            <span class="stat-value phase-label" :class="{ 'phase-bull': game.marketEvent?.type === 'bull', 'phase-bear': game.marketEvent?.type === 'bear' || game.marketEvent?.type === 'crash' }">{{ game.phaseLabel }}</span>
          </div>
        </div>
        <div class="speed-controls">
          <button class="btn btn-sm" :class="{ 'btn-active': !game.isRunning }" @click="game.toggleRunning()" title="Pause/Resume (Space)">⏸</button>
          <button class="btn btn-sm" :class="{ 'btn-active': game.isRunning && game.speed === 1 }" @click="game.setSpeed(1)" title="1x Speed (1)">▶ 1×</button>
          <button class="btn btn-sm" :class="{ 'btn-active': game.isRunning && game.speed === 5 }" @click="game.setSpeed(5)" title="2x Speed (2)">▶▶ 2×</button>
          <button class="btn btn-sm" :class="{ 'btn-active': game.isRunning && game.speed === 10 }" @click="game.setSpeed(10)" title="3x Speed (3)">▶▶▶ 3×</button>
          <button class="btn btn-sm" @click="skipToEOD" title="End of Day (0)">⏭ EOD</button>
          <span class="skip-sep">|</span>
          <button class="btn btn-sm" @click="skipWeek">⏭ Week</button>
          <button class="btn btn-sm" @click="skipMonth">⏭ Month</button>
          <label class="skip-reports-toggle" title="Auto-skip day reports">
            <input type="checkbox" v-model="game.skipDayReports" />
            <span>Skip Reports</span>
          </label>
        </div>
      </div>

      <!-- Skip Loading Overlay -->
      <div v-if="isSkipping" class="skip-overlay">
        <div class="skip-modal">
          <div class="skip-spinner"></div>
          <h3>Simulating Time Skip</h3>
          <p>{{ skipLabel }}</p>
          <div class="skip-progress-bar">
            <div class="skip-progress-fill" :style="{ width: skipPct + '%' }"></div>
          </div>
          <p class="skip-detail">{{ skipDetail }}</p>
          <button class="btn btn-danger btn-sm skip-cancel" @click="cancelSkip">⏹ Stop Simulation</button>
          <!-- Live Highlights Feed -->
          <div v-if="skipHighlights.length" class="skip-highlights">
            <div v-for="(h, i) in skipHighlights" :key="i" class="skip-hl-item" :class="h.type">
              <span class="hl-icon">{{ h.icon }}</span>
              <span class="hl-text">{{ h.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- New Game Loading Overlay -->
      <div v-if="isLoading" class="skip-overlay">
        <div class="skip-modal loading-modal">
          <div class="skip-spinner"></div>
          <h3>Generating New Game</h3>
          <p class="loading-msg">{{ loadingMsg }}</p>
          <div class="skip-progress-bar">
            <div class="skip-progress-fill" :style="{ width: loadingPct + '%' }"></div>
          </div>
          <p class="skip-detail">{{ loadingPct }}%</p>
          <div class="loading-detail">{{ loadingDetail }}</div>
        </div>
      </div>

      <!-- Day Report Overlay -->
      <DayReport v-if="game.showDayReport" />

      <!-- Settings Popup -->
      <div v-if="showSettings" class="settings-overlay" @click.self="showSettings = false">
        <div class="settings-modal">
          <h2>⚙️ Settings</h2>
          <div class="settings-grid">
            <div class="settings-card">
              <h3>🌍 Region</h3>
              <select v-model="settingsRegion" class="currency-select" @change="switchRegion">
                <option v-for="(r, key) in REGIONS" :key="key" :value="key">{{ r.icon }} {{ r.name }}</option>
              </select>
              <p style="font-size:10px;color:var(--text-muted);margin-top:6px">Currency: {{ currency.activeCurrency.flag }} {{ currency.activeCurrency.code }}</p>
            </div>
            <div class="settings-card">
              <h3>🎵 Music</h3>
              <div style="display:flex;align-items:center;gap:8px">
                <button class="btn btn-sm" @click="ambient.setEnabled(!ambient.state.enabled)">{{ ambient.state.enabled ? '⏸ Mute' : '▶ Unmute' }}</button>
                <input type="range" min="0" max="100" :value="Math.round(ambient.state.volume * 100)" @input="ambient.setVolume($event.target.value / 100)" style="flex:1;accent-color:var(--accent)" />
                <span style="font-size:10px;color:var(--text-muted);min-width:30px">{{ Math.round(ambient.state.volume * 100) }}%</span>
              </div>
            </div>
            <div class="settings-card" style="grid-column:1/-1">
              <h3>💾 Save Slots</h3>
              <div class="save-slots">
                <div v-for="s in saveSlots" :key="s.slot" class="save-slot" :class="{ empty: !s.exists }">
                  <div class="slot-header">
                    <span class="slot-num">Slot {{ s.slot + 1 }}</span>
                    <span class="slot-name">{{ s.exists ? s.name : 'Empty' }}</span>
                  </div>
                  <div class="slot-info" v-if="s.exists">
                    Day {{ s.day }} · {{ fmt.money(s.cash) }} · {{ timeAgo(s.timestamp) }}
                  </div>
                  <div class="slot-actions">
                    <button class="btn btn-xs btn-primary" @click="loadSlot(s.slot)" v-if="s.exists">Load</button>
                    <button class="btn btn-xs" @click="saveSlot(s.slot)">Save</button>
                    <button class="btn btn-xs btn-danger-outline" @click="deleteSlot(s.slot)" v-if="s.exists">Del</button>
                  </div>
                </div>
              </div>
              <div style="display:flex;gap:4px;margin-top:8px">
                <button class="btn btn-xs" @click="exportSaves">📤 Export All</button>
                <button class="btn btn-xs" @click="importSaves">📥 Import</button>
                <button class="btn btn-xs btn-danger-outline" @click="clearAllSaves">🗑 Clear All</button>
              </div>
            </div>
            <div class="settings-card">
              <h3>⚠️ Reset</h3>
              <button class="btn btn-sm btn-danger" @click="game.resetGame(); showSettings = false">Reset Game</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bank Popup -->
      <div v-if="showBank" class="settings-overlay" @click.self="showBank = false">
        <div class="settings-modal" style="max-width:550px">
          <Bank />
        </div>
      </div>

      <!-- Admin Popup -->
      <div v-if="showAdmin && game.difficulty === 'creative'" class="settings-overlay" @click.self="showAdmin = false">
        <div class="settings-modal" style="max-width:500px">
          <AdminPanel />
        </div>
      </div>

      <!-- Help Popup -->
      <div v-if="showHelp" class="settings-overlay" @click.self="showHelp = false">
        <div class="settings-modal" style="max-width:600px">
          <HelpPanel />
        </div>
      </div>

      <!-- Influence Popup -->
      <div v-if="showInfluence" class="settings-overlay" @click.self="showInfluence = false">
        <div class="settings-modal" style="max-width:520px">
          <InfluencePanel />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, ref, computed, nextTick } from 'vue'
import { useGameStore } from '@/stores/gameStore.js'
import { useMarketStore } from '@/stores/marketStore.js'
import { usePortfolioStore } from '@/stores/portfolioStore.js'
import { useCurrencyStore } from '@/stores/currencyStore.js'
import { useInfluenceStore } from '@/stores/influenceStore.js'
import { useAmbientMusic } from '@/composables/useAmbientMusic.js'
import { useFormat } from '@/composables/useFormat.js'
import { REGIONS } from '@/data/companies.js'
import { getSlotMeta, deleteSlot, deleteAllSaves, exportAllSaves, importAllSaves } from '@/utils/storage.js'
import { hashSeed } from '@/utils/simulationEngine.js'
import Dashboard from '@/views/Dashboard.vue'
import Bank from '@/views/Bank.vue'
import AdminPanel from '@/views/AdminPanel.vue'
import HelpPanel from '@/views/HelpPanel.vue'
import InfluencePanel from '@/views/InfluencePanel.vue'
import DayReport from '@/views/DayReport.vue'
import NewGameConfig from '@/views/NewGameConfig.vue'

const game = useGameStore()
const market = useMarketStore()
const portfolio = usePortfolioStore()
const currency = useCurrencyStore()
const influence = useInfluenceStore()
const ambient = useAmbientMusic()
const fmt = useFormat()
const showSettings = ref(false)
const showBank = ref(false)
const showAdmin = ref(false)
const showHelp = ref(false)
const showInfluence = ref(false)

const netPosition = computed(() => game.cash - game.loanBalance)

const showConfig = ref(false)
const isLoading = ref(false)
const loadingMsg = ref('')
const loadingPct = ref(0)
const loadingDetail = ref('')

const settingsRegion = ref(currency.activeRegionKey)
function switchRegion() {
  currency.setRegion(settingsRegion.value)
  game.addNotification(`Switched to ${currency.activeRegion.name} market`, 'info')
}

const isSkipping = ref(false)
const skipLabel = ref('')
const skipDetail = ref('')
const skipPct = ref(0)
const skipHighlights = ref([])
const reportedEvents = new Set()
let cancelSkipFlag = false

/** Collect interesting highlights from the last chunk of simulation */
function collectHighlights(lastNewsCount) {
  const highlights = []

  // Portfolio price moves (>1.5%)
  for (const [cid, holding] of Object.entries(portfolio.holdings)) {
    const stock = market.getStock(cid)
    if (!stock || stock.priceHistory.length < 12) continue
    const oldPrice = stock.priceHistory[stock.priceHistory.length - 12].price
    const change = ((stock.currentPrice - oldPrice) / oldPrice) * 100
    if (Math.abs(change) >= 1.5) {
      highlights.push({
        icon: change >= 0 ? '📈' : '📉',
        text: `Your ${market.ticker(cid)}: ${change >= 0 ? '+' : ''}${change.toFixed(1)}% → ${fmt.money(stock.currentPrice)}`,
        type: change >= 0 ? 'positive' : 'negative'
      })
    }
  }

  // Market-wide events (only report each once)
  if (game.marketEvent) {
    const evtKey = game.marketEvent.type + game.marketEvent.name
    if (!reportedEvents.has(evtKey)) {
      reportedEvents.add(evtKey)
      highlights.push({
        icon: game.marketEvent.type === 'crash' ? '💥' : game.marketEvent.type === 'bull' ? '📈' : '📉',
        text: game.marketEvent.name,
        type: game.marketEvent.type === 'crash' ? 'negative' : 'positive'
      })
    }
  }

  // Recent company event results (only new ones since last check)
  const newNews = market.newsFeed.slice(0, Math.max(0, market.newsFeed.length - lastNewsCount))
  for (const article of newNews) {
    if (!article.isResult) continue
    const key = `news-${article.id}`
    if (reportedEvents.has(key)) continue
    reportedEvents.add(key)
    const impactStr = article.impact ? ` ${article.impact >= 0 ? '+' : ''}${(article.impact * 100).toFixed(1)}%` : ''
    highlights.push({
      icon: article.eventIcon || '📋',
      text: `${article.companyName}: ${article.eventLabel}${impactStr}`,
      type: (article.impact || 0) >= 0 ? 'positive' : 'negative'
    })
  }

  // Big stock movers not in portfolio (>5%)
  for (const stock of market.stockList) {
    if (portfolio.holdings[stock.id]) continue
    if (stock.priceHistory.length < 12) continue
    const oldPrice = stock.priceHistory[stock.priceHistory.length - 12].price
    const change = ((stock.currentPrice - oldPrice) / oldPrice) * 100
    if (Math.abs(change) >= 5) {
      highlights.push({
        icon: change >= 0 ? '🚀' : '🔻',
        text: `${stock.ticker} ${change >= 0 ? 'surges' : 'drops'} ${Math.abs(change).toFixed(1)}%`,
        type: change >= 0 ? 'positive' : 'negative'
      })
    }
  }

  return highlights
}

/** Run ticks in async chunks so the UI can update with a loading indicator */
async function runTicksAsync(totalTicks, label) {
  // Use fast-forward daily GBM instead of tick-by-tick — ~1000× faster
  const TICKS_PER_DAY = game.TICKS_PER_DAY
  const remainingToday = TICKS_PER_DAY - game.tick
  const totalTicksAfterToday = totalTicks - remainingToday
  const fullDays = Math.max(0, Math.floor(totalTicksAfterToday / TICKS_PER_DAY))
  const leftoverTicks = totalTicksAfterToday - fullDays * TICKS_PER_DAY

  // Show overlay immediately — must yield through Vue + browser render
  isSkipping.value = true
  skipLabel.value = label
  skipPct.value = 0
  skipHighlights.value = []
  reportedEvents.clear()
  cancelSkipFlag = false
  game.skipDayReports = true
  let lastNewsCount = market.newsFeed.length
  await nextTick()
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  const wasRunning = game.isRunning
  game.isRunning = true

  const startDay = game.day
  const totalDays = fullDays + (remainingToday > 0 && remainingToday < TICKS_PER_DAY ? 1 : 0) + (leftoverTicks > 0 ? 1 : 0)

  // 1. Finish current day with tick-by-tick (needed for intraday state)
  if (remainingToday > 0 && remainingToday < TICKS_PER_DAY) {
    for (let i = 0; i < remainingToday; i++) gameLoop()
    skipPct.value = Math.round((1 / totalDays) * 100)
    skipDetail.value = `Day ${game.day} — ${game.currentDateStr}`
    const highlights = collectHighlights(lastNewsCount)
    lastNewsCount = market.newsFeed.length
    if (highlights.length) skipHighlights.value = [...highlights, ...skipHighlights.value].slice(0, 30)
    await new Promise(r => setTimeout(r, 0))
    if (cancelSkipFlag) { finishSkip(wasRunning); return }
  }

  // 2. Fast-forward full days (synchronous, near-instant with daily GBM)
  if (fullDays > 0) {
    market.fastForwardDays(fullDays)
    skipPct.value = Math.round(((1 + fullDays) / totalDays) * 100)
    skipDetail.value = `Day ${game.day} — ${game.currentDateStr}`
    const highlights = collectHighlights(lastNewsCount)
    lastNewsCount = market.newsFeed.length
    if (highlights.length) skipHighlights.value = [...highlights, ...skipHighlights.value].slice(0, 30)
    await new Promise(r => setTimeout(r, 0))
  }

  // 3. Leftover ticks on the last partial day
  if (leftoverTicks > 0) {
    for (let i = 0; i < leftoverTicks; i++) gameLoop()
    skipPct.value = 100
    skipDetail.value = `Day ${game.day} — ${game.currentDateStr}`
    const highlights = collectHighlights(lastNewsCount)
    if (highlights.length) skipHighlights.value = [...highlights, ...skipHighlights.value].slice(0, 30)
  }

  finishSkip(wasRunning)
}

function finishSkip(wasRunning) {
  game.isRunning = wasRunning
  game.skipDayReports = false
  isSkipping.value = false
  game.recordDayStart()
  game.showDayReport = true
  game.dayReportType = 'start'
}

async function skipDay() {
  const remaining = game.TICKS_PER_DAY - game.tick
  await runTicksAsync(remaining + 1, 'Skipping 1 Day')
  game.addNotification(`Skipped to next day — now Day ${game.day}`, 'info')
}

async function skipToEOD() {
  if (game.tick >= game.TICKS_PER_DAY - 1) return
  const remaining = game.TICKS_PER_DAY - game.tick
  await runTicksAsync(remaining, 'End of Day')
}

async function skipWeek() {
  const total = 5 * game.TICKS_PER_DAY - game.tick
  await runTicksAsync(total, 'Skipping 1 Week')
  game.addNotification(`Skipped 1 week — now Day ${game.day}`, 'info')
}

async function skipMonth() {
  const total = 21 * game.TICKS_PER_DAY - game.tick
  await runTicksAsync(total, 'Skipping ~1 Month')
  game.addNotification(`Skipped ~1 month — now Day ${game.day}`, 'info')
}

// Save slots
const saveSlots = ref(getSlotMeta())
const hasAnySave = computed(() => saveSlots.value.some(s => s.exists))

function refreshSlots() { saveSlots.value = getSlotMeta() }

function loadLatestGame() {
  const slots = saveSlots.value.filter(s => s.exists)
  if (slots.length === 0) return
  // Load the most recent save
  const latest = slots.reduce((a, b) => a.timestamp > b.timestamp ? a : b)
  loadSlot(latest.slot)
}

async function loadSlot(i) {
  await market.init(null)
  const ok = game.quickLoad(i)
  if (!ok) game.addNotification('Failed to load from slot ' + (i + 1), 'error')
  if (ambient.state.enabled) ambient.start()
  refreshSlots()
}

async function saveSlot(i) {
  if (!market.initialized) await market.init(null)
  const ok = game.quickSave(i)
  if (ok) {
    game.addNotification(`Game saved to slot ${i + 1}`, 'success')
    refreshSlots()
  } else {
    game.addNotification('Failed to save!', 'error')
  }
}

function deleteSlotFn(i) {
  deleteSlot(i)
  refreshSlots()
  game.addNotification(`Slot ${i + 1} deleted`, 'info')
}

function exportSaves() { exportAllSaves() }
async function importSaves() {
  try {
    const count = await importAllSaves()
    refreshSlots()
    game.addNotification(`Imported ${count} saves`, 'success')
  } catch (e) {
    game.addNotification('Import failed: ' + e, 'error')
  }
}
function clearAllSaves() {
  if (confirm('Delete ALL save slots?')) {
    deleteAllSaves()
    refreshSlots()
    game.addNotification('All saves cleared', 'info')
  }
}

function timeAgo(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

let tickInterval = null

async function onConfigStart(config) {
  showConfig.value = false
  isLoading.value = true
  loadingMsg.value = 'Initializing...'
  loadingPct.value = 0

  const seedStr = (config.seed || '').trim()
  const seed = seedStr ? hashSeed(seedStr) : Date.now()

  try {
    await market.init(seed, config, (msg, pct) => {
      loadingMsg.value = msg
      loadingPct.value = Math.round(pct)
      if (msg.includes('Simulating') || msg.includes('crash') || msg.includes('bankrupt') || msg.includes('IPO')) {
        loadingDetail.value = msg
      }
    })
  } catch (e) {
    console.error('Market init failed:', e)
    game.addNotification('Failed to generate market: ' + e.message, 'error')
    isLoading.value = false
    return
  }

  game.startGame(config.difficulty)
  currency.setRegion(config.region)
  isLoading.value = false
  if (ambient.state.enabled) ambient.start()
}

// Game loop
function gameLoop() {
  if (!game.isRunning || !game.gameStarted) return
  game.advanceTick()
  market.tickAll()
  portfolio.expireOptions()

  // Auto-save every 50 ticks
  if (game.tick % 50 === 0) {
    const marketState = market.getSaveState()
    const portfolioState = portfolio.getSaveState()
    const saveData = {
      cash: game.cash,
      day: game.day,
      tick: game.tick,
      gameStarted: game.gameStarted,
      market: marketState,
      portfolio: portfolioState
    }
  }
}

watch(() => game.speed, (newSpeed) => {
  if (tickInterval) clearInterval(tickInterval)
  if (game.isRunning) {
    tickInterval = setInterval(gameLoop, 1000 / Math.max(0.5, newSpeed))
  }
})

watch(() => game.isRunning, (running) => {
  if (tickInterval) clearInterval(tickInterval)
  if (running) {
    tickInterval = setInterval(gameLoop, 1000 / Math.max(0.5, game.speed))
  }
})

function onKeyDown(e) {
  // Don't capture when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return
  if (e.key === 'Escape') { showSettings.value = !showSettings.value; return }
  if (!game.gameStarted) return
  if (e.key === ' ') { e.preventDefault(); game.toggleRunning(); return }
  if (e.key === '1') { game.setSpeed(1); return }
  if (e.key === '2') { game.setSpeed(5); return }
  if (e.key === '3') { game.setSpeed(10); return }
  if (e.key === '0') { skipToEOD(); return }
}

function cancelSkip() {
  cancelSkipFlag = true
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
  window.removeEventListener('keydown', onKeyDown)
})
</script>
