<template>
  <div class="admin-panel">
    <h2>🔧 Admin Panel</h2>

    <!-- Cash -->
    <div class="admin-card">
      <h3>💰 Cash</h3>
      <div class="admin-row">
        <input type="number" v-model.number="cashAmount" class="admin-input" placeholder="Amount" />
        <button class="btn btn-primary btn-sm" @click="setCash">Set</button>
      </div>
      <div class="preset-row">
        <button class="btn btn-xs" @click="cashAmount = 1000; setCash()">$1K</button>
        <button class="btn btn-xs" @click="cashAmount = 10000; setCash()">$10K</button>
        <button class="btn btn-xs" @click="cashAmount = 100000; setCash()">$100K</button>
        <button class="btn btn-xs" @click="cashAmount = 1000000; setCash()">$1M</button>
        <button class="btn btn-xs" @click="cashAmount = 999999999; setCash()">$1B</button>
      </div>
    </div>

    <!-- Loans -->
    <div class="admin-card">
      <h3>🏦 Loans</h3>
      <div class="admin-row">
        <input type="number" v-model.number="loanAmount" class="admin-input" placeholder="Amount" />
        <button class="btn btn-sm" @click="addLoan">Add</button>
      </div>
      <div class="preset-row">
        <button class="btn btn-xs" @click="loanAmount = 5000; addLoan()">$5K</button>
        <button class="btn btn-xs" @click="loanAmount = 50000; addLoan()">$50K</button>
        <button class="btn btn-xs" @click="loanAmount = 500000; addLoan()">$500K</button>
      </div>
      <button class="btn btn-sm btn-danger-outline btn-block" @click="clearLoan" style="margin-top:6px">Clear All Loans</button>
    </div>

    <!-- Market Events -->
    <div class="admin-card">
      <h3>📊 Market Events</h3>
      <div class="preset-row">
        <button class="btn btn-sm" @click="triggerMarketEvent('bull')">📈 Rally</button>
        <button class="btn btn-sm" @click="triggerMarketEvent('bear')">📉 Dip</button>
        <button class="btn btn-sm btn-danger-outline" @click="triggerMarketEvent('crash')">💥 Crash</button>
        <button class="btn btn-xs btn-ghost" @click="clearMarketEvent">Clear</button>
      </div>
      <div v-if="game.marketEvent" class="evt-active">
        Active: {{ game.marketEvent.name }}
      </div>
    </div>

    <!-- Company Manipulation -->
    <div class="admin-card">
      <h3>🏢 Set Company Price</h3>
      <div class="admin-row">
        <select v-model="targetCompany" class="admin-select">
          <option value="">Select company...</option>
          <option v-for="s in market.stockList" :key="s.id" :value="s.id">{{ s.ticker }} — {{ s.name }}</option>
        </select>
      </div>
      <div class="admin-row">
        <input type="number" v-model.number="targetPrice" class="admin-input" placeholder="Price" step="0.01" />
        <button class="btn btn-primary btn-sm" @click="setCompanyPrice">Set Price</button>
      </div>
      <div class="preset-row">
        <button class="btn btn-xs" @click="targetPrice = 1; setCompanyPrice()">$1</button>
        <button class="btn btn-xs" @click="targetPrice = 0.01; setCompanyPrice()">$0.01</button>
        <button class="btn btn-xs" @click="multiplyPrice(2)">2×</button>
        <button class="btn btn-xs" @click="multiplyPrice(0.5)">½×</button>
        <button class="btn btn-xs" @click="multiplyPrice(10)">10×</button>
      </div>
    </div>

    <!-- Trigger Company Events -->
    <div class="admin-card">
      <h3>⚡ Trigger Event</h3>
      <div class="admin-row">
        <select v-model="eventCompany" class="admin-select">
          <option value="">Select company...</option>
          <option v-for="s in market.stockList" :key="s.id" :value="s.id">{{ s.ticker }} — {{ s.name }}</option>
        </select>
      </div>
      <div class="preset-row">
        <button class="btn btn-xs" @click="triggerEvent('earningsBeat')">📈 Earnings Beat</button>
        <button class="btn btn-xs" @click="triggerEvent('earningsMiss')">📉 Earnings Miss</button>
        <button class="btn btn-xs" @click="triggerEvent('productLaunch')">🚀 Product Launch</button>
        <button class="btn btn-xs" @click="triggerEvent('scandal')">📰 Scandal</button>
      </div>
      <div class="preset-row">
        <button class="btn btn-xs" @click="triggerEvent('acquisition')">🤝 Acquisition</button>
        <button class="btn btn-xs" @click="triggerEvent('regulation')">⚖️ Regulation</button>
        <button class="btn btn-xs" @click="triggerEvent('upgrade')">⬆️ Upgrade</button>
        <button class="btn btn-xs btn-danger-outline" @click="triggerEvent('downgrade')">⬇️ Downgrade</button>
      </div>
    </div>

    <!-- Time -->
    <div class="admin-card">
      <h3>⏩ Time</h3>
      <div class="preset-row">
        <button class="btn btn-xs" @click="game.tick++">+1 Tick</button>
        <button class="btn btn-xs" @click="skipTicks(12)">+1 Hour</button>
        <button class="btn btn-xs" @click="skipTicks(132)">+1 Day</button>
        <button class="btn btn-xs" @click="skipTicks(660)">+5 Days</button>
        <button class="btn btn-xs" @click="skipTicks(1320)">+10 Days</button>
      </div>
    </div>

    <!-- Reset -->
    <div class="admin-card">
      <h3>⚠️ Danger Zone</h3>
      <div class="preset-row">
        <button class="btn btn-sm btn-danger-outline" @click="resetHoldings">Clear Holdings</button>
        <button class="btn btn-sm btn-danger" @click="portfolio.options = []">Clear Options</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useGameStore } from '@/stores/gameStore.js'
import { useMarketStore } from '@/stores/marketStore.js'
import { usePortfolioStore } from '@/stores/portfolioStore.js'
import { useInfluenceStore } from '@/stores/influenceStore.js'

const game = useGameStore()
const market = useMarketStore()
const portfolio = usePortfolioStore()
const influenceStore = useInfluenceStore()

const cashAmount = ref(100000)
const loanAmount = ref(5000)
const targetCompany = ref('')
const targetPrice = ref(100)
const eventCompany = ref('')

function setCash() {
  game.cash = Math.max(0, cashAmount.value)
  game.addNotification(`Admin: Cash set to $${game.cash.toLocaleString()}`, 'info')
}

function addLoan() {
  game.takeLoan(Math.abs(loanAmount.value))
}

function clearLoan() {
  if (game.loanBalance > 0) {
    game.cash += game.loanBalance
    game.totalRepaid += game.loanBalance
    game.loanBalance = 0
    game.addNotification('Admin: All loans cleared (cash adjusted)', 'info')
  }
}

function triggerMarketEvent(type) {
  const names = { bull: 'Market Rally 📈', bear: 'Market Dip 📉', crash: 'Market Crash 💥' }
  const stocks = market.stockList.map(s => s.id).slice(0, 8)
  const indexes = ['tech_titans', 'financial_leaders', 'green_future', 'healthcare_innovators']
  game.setMarketEvent({
    type,
    name: names[type] || 'Market Event',
    affectedStocks: stocks,
    affectedIndexes: indexes
  })
}

function clearMarketEvent() {
  game.setMarketEvent(null)
}

function setCompanyPrice() {
  if (!targetCompany.value) return
  const stock = market.getStock(targetCompany.value)
  if (!stock) return
  const oldPrice = stock.currentPrice
  stock.currentPrice = Math.max(0.01, targetPrice.value)
  // Update the last price history point
  if (stock.priceHistory.length > 0) {
    stock.priceHistory[stock.priceHistory.length - 1] = { time: stock.priceHistory[stock.priceHistory.length - 1].time, price: stock.currentPrice }
  }
  game.addNotification(`Admin: ${market.ticker(targetCompany.value)} price ${oldPrice.toFixed(2)} → ${stock.currentPrice.toFixed(2)}`, 'warning')
}

function multiplyPrice(factor) {
  if (!targetCompany.value) return
  const stock = market.getStock(targetCompany.value)
  if (!stock) return
  targetPrice.value = parseFloat((stock.currentPrice * factor).toFixed(2))
  setCompanyPrice()
}

function triggerEvent(eventType) {
  if (!eventCompany.value) return
  const stock = market.getStock(eventCompany.value)
  if (!stock) return

  const labels = {
    earningsBeat: 'Earnings Beat', earningsMiss: 'Earnings Miss',
    productLaunch: 'Product Launch', scandal: 'Scandal',
    acquisition: 'Acquisition', regulation: 'Regulation',
    upgrade: 'Analyst Upgrade', downgrade: 'Analyst Downgrade'
  }

  const impacts = {
    earningsBeat: 0.08, earningsMiss: -0.07,
    productLaunch: 0.05, scandal: -0.10,
    acquisition: 0.12, regulation: -0.04,
    upgrade: 0.03, downgrade: -0.05
  }

  const icons = {
    earningsBeat: '📈', earningsMiss: '📉', productLaunch: '🚀',
    scandal: '📰', acquisition: '🤝', regulation: '⚖️',
    upgrade: '⬆️', downgrade: '⬇️'
  }

  const impact = impacts[eventType] || 0
  const headline = `${stock.name} — ${labels[eventType] || eventType}`

  // Apply price impact
  stock.currentPrice = Math.max(0.01, stock.currentPrice * (1 + impact))
  if (stock.priceHistory.length > 0) {
    stock.priceHistory[stock.priceHistory.length - 1] = { time: stock.priceHistory[stock.priceHistory.length - 1].time, price: stock.currentPrice }
  }

  // Check for suspicious trading timing
  const pctChange = impact * 100
  influenceStore.checkSuspiciousTrade(eventCompany.value, pctChange, game.day)

  // Add to news feed
  market.newsFeed.unshift({
    id: 'admin-' + Date.now(),
    eventIcon: icons[eventType] || '📋',
    companyId: eventCompany.value,
    companyName: stock.name,
    sector: stock.sector,
    headline,
    isResult: true,
    impact,
    day: game.day,
    category: eventType.includes('earnings') ? 'earnings' : 'corporate',
    eventLabel: labels[eventType] || eventType
  })

  game.addNotification(`Admin: Triggered ${labels[eventType]} on ${market.ticker(eventCompany.value)}`, 'warning')
}

function skipTicks(n) {
  for (let i = 0; i < n; i++) {
    game.tick++
    market.tickAll()
    if (game.tick >= 132) { game.tick = 0; game.day++ }
  }
}

function resetHoldings() {
  Object.keys(portfolio.holdings).forEach(k => delete portfolio.holdings[k])
  Object.keys(portfolio.indexHoldings).forEach(k => delete portfolio.indexHoldings[k])
  portfolio.options.splice(0, portfolio.options.length)
  game.addNotification('Admin: All holdings & options cleared', 'warning')
}
</script>

<style scoped>
.admin-panel { padding: 12px; max-height: 75vh; overflow-y: auto; }
.admin-panel h2 { font-size: 15px; margin-bottom: 10px; }
.admin-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; padding: 10px; margin-bottom: 8px;
}
.admin-card h3 { font-size: 12px; margin: 0 0 6px 0; color: var(--text-secondary); }
.admin-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.admin-input {
  flex: 1; background: var(--bg); border: 1px solid var(--border);
  border-radius: 3px; padding: 5px 8px; color: var(--text); font-size: 12px; font-family: inherit;
}
.admin-select {
  flex: 1; background: var(--bg); border: 1px solid var(--border);
  border-radius: 3px; padding: 5px 8px; color: var(--text); font-size: 12px; font-family: inherit;
}
.admin-select option { background: var(--surface); }
.preset-row { display: flex; gap: 4px; flex-wrap: wrap; }
.btn-block { width: 100%; }
.evt-active { margin-top: 6px; font-size: 11px; color: var(--warning); background: #e8b32d10; padding: 4px 8px; border-radius: 3px; }
</style>
