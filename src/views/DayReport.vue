<template>
  <div class="dayreport-overlay">
    <div class="dayreport-modal" :class="game.dayReportType">
      <!-- End of Day Report -->
      <template v-if="game.dayReportType === 'end'">
        <h2>🌅 Day {{ result?.startDay }} Complete</h2>
        <div class="dr-result-big" :class="(result?.change || 0) >= 0 ? 'positive' : 'negative'">
          {{ fmt.money(Math.abs(result?.change || 0)) }}
          <span class="dr-result-pct">({{ (result?.changePct || 0) >= 0 ? '+' : '' }}{{ result?.changePct?.toFixed(2) }}%)</span>
        </div>
        <div class="dr-grid">
          <div class="dr-card">
            <div class="dr-label">Started With</div>
            <div class="dr-value">{{ fmt.money(result?.startNetWorth || 0) }}</div>
          </div>
          <div class="dr-card">
            <div class="dr-label">Ended With</div>
            <div class="dr-value">{{ fmt.money(result?.endNetWorth || 0) }}</div>
          </div>
          <div class="dr-card">
            <div class="dr-label">Cash</div>
            <div class="dr-value">{{ fmt.money(game.cash) }}</div>
          </div>
          <div class="dr-card">
            <div class="dr-label">Holdings Value</div>
            <div class="dr-value">{{ fmt.money(holdingsValue) }}</div>
          </div>
        </div>
        <div class="dr-highlights" v-if="dayHighlights.length">
          <h4>📋 Today's Highlights</h4>
          <div v-for="(h, i) in dayHighlights.slice(0, 6)" :key="i" class="dr-hl" :class="h.type">
            <span>{{ h.icon }}</span><span>{{ h.text }}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-lg btn-block" @click="game.dismissDayReport()">Next Day →</button>
      </template>

      <!-- Start of Day Report -->
      <template v-else>
        <h2>📅 Day {{ game.day }}</h2>
        <p class="dr-date">{{ game.currentDateStr }}</p>

        <div class="dr-grid">
          <div class="dr-card">
            <div class="dr-label">Cash</div>
            <div class="dr-value">{{ fmt.money(game.cash) }}</div>
          </div>
          <div class="dr-card">
            <div class="dr-label">Net Worth</div>
            <div class="dr-value">{{ fmt.money(portfolio.totalNetWorth) }}</div>
          </div>
          <div class="dr-card">
            <div class="dr-label">Market Phase</div>
            <div class="dr-value">{{ game.phaseLabel }}</div>
          </div>
          <div class="dr-card">
            <div class="dr-label">Fed Rate</div>
            <div class="dr-value">{{ (game.interestRate * 100).toFixed(1) }}%</div>
          </div>
        </div>

        <!-- Active Market Event -->
        <div v-if="activeMarketEvent" class="dr-event-banner" :class="activeMarketEvent.type === 'crash' ? 'crash' : activeMarketEvent.type === 'bull' ? 'bull' : 'bear'">
          <span>{{ activeMarketEvent.icon }}</span>
          <span><strong>{{ activeMarketEvent.name }}</strong> — {{ activeMarketEvent.desc }}</span>
        </div>

        <!-- Today's Scheduled Events -->
        <div v-if="todaysEvents.length" class="dr-upcoming">
          <h4>📆 Events Expected Today</h4>
          <div v-for="(evt, i) in todaysEvents.slice(0, 5)" :key="i" class="dr-event-row">
            <span>{{ evt.icon }}</span>
            <span>{{ evt.company }}: <strong>{{ evt.label }}</strong></span>
            <span class="dr-event-impact" :class="evt.impact >= 0 ? 'positive' : 'negative'">{{ evt.impact >= 0 ? '+' : '' }}{{ evt.impact }}% est.</span>
          </div>
        </div>

        <!-- World Event -->
        <div v-if="activeWorldEvent" class="dr-event-banner world">
          <span>🌍</span>
          <span><strong>{{ activeWorldEvent.name }}</strong> — {{ activeWorldEvent.description?.substring(0, 100) }}</span>
        </div>

        <button class="btn btn-primary btn-lg btn-block" @click="game.beginDay()">▶ Begin Trading</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore.js'
import { useMarketStore } from '@/stores/marketStore.js'
import { usePortfolioStore } from '@/stores/portfolioStore.js'
import { useFormat } from '@/composables/useFormat.js'

const game = useGameStore()
const market = useMarketStore()
const portfolio = usePortfolioStore()
const fmt = useFormat()

const result = computed(() => game.getDayResult())

const holdingsValue = computed(() => {
  let v = 0
  for (const [id, h] of Object.entries(portfolio.holdings)) {
    const stock = market.getStock(id)
    v += (stock?.currentPrice || 0) * h.shares
  }
  for (const [id, h] of Object.entries(portfolio.indexHoldings)) {
    v += market.getIndexValue(id) * h.shares
  }
  return v
})

const dayHighlights = computed(() => {
  const h = []
  const dayNews = market.newsFeed.filter(n => n.day === game.day && n.isResult)
  for (const n of dayNews.slice(0, 6)) {
    h.push({
      icon: n.eventIcon || '📋',
      text: `${n.companyName}: ${n.eventLabel}`,
      type: (n.impact || 0) >= 0 ? 'positive' : 'negative'
    })
  }
  return h
})

const activeMarketEvent = computed(() => {
  if (!game.marketEvent) return null
  const e = game.marketEvent
  return {
    type: e.type,
    name: e.name,
    icon: e.type === 'crash' ? '💥' : e.type === 'bull' ? '📈' : '📉',
    desc: e.type === 'bull' ? 'Bull market — prices trending up' : e.type === 'crash' ? 'Market crash — major selloff' : 'Bear market — prices trending down'
  }
})

const todaysEvents = computed(() => {
  const events = market.eventCalendar[game.day] || []
  return events.map(evt => {
    const stock = market.getStock(evt.companyId)
    const def = { earningsBeat: { icon: '📈', label: 'Earnings Beat', impact: 8 }, earningsMiss: { icon: '📉', label: 'Earnings Miss', impact: -7 }, productLaunch: { icon: '🚀', label: 'Product Launch', impact: 5 }, scandal: { icon: '📰', label: 'Scandal', impact: -10 }, acquisition: { icon: '🤝', label: 'Acquisition', impact: 12 }, regulation: { icon: '⚖️', label: 'Regulation', impact: -4 }, upgrade: { icon: '⬆️', label: 'Upgrade', impact: 3 }, downgrade: { icon: '⬇️', label: 'Downgrade', impact: -5 } }
    const d = def[evt.eventType] || { icon: '📋', label: evt.eventType, impact: 0 }
    return { icon: d.icon, label: d.label, impact: d.impact, company: stock?.ticker || evt.companyId }
  })
})

const activeWorldEvent = computed(() => market.activeWorldEvent)
</script>

<style scoped>
.dayreport-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.dayreport-modal {
  background: var(--surface); border-radius: 16px; padding: 32px;
  max-width: 520px; width: 90%; max-height: 85vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.dayreport-modal h2 { margin: 0 0 4px; font-size: 22px; }
.dr-date { color: var(--text-muted); font-size: 13px; margin: 0 0 16px; }
.dr-result-big { font-size: 36px; font-weight: 800; text-align: center; margin: 16px 0; }
.dr-result-big .dr-result-pct { font-size: 16px; font-weight: 600; margin-left: 6px; }
.dr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
.dr-card { background: var(--bg); border-radius: 8px; padding: 12px; text-align: center; }
.dr-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.dr-value { font-size: 16px; font-weight: 700; margin-top: 2px; }
.dr-highlights { margin-top: 12px; }
.dr-highlights h4 { font-size: 12px; margin: 0 0 6px; color: var(--text-muted); }
.dr-hl { display: flex; gap: 6px; align-items: center; font-size: 11px; padding: 3px 0; }
.dr-hl.positive { color: var(--positive); }
.dr-hl.negative { color: var(--negative); }
.dr-upcoming { margin: 12px 0; }
.dr-upcoming h4 { font-size: 12px; margin: 0 0 6px; color: var(--text-muted); }
.dr-event-row { display: flex; gap: 6px; align-items: center; font-size: 11px; padding: 3px 0; }
.dr-event-impact { margin-left: auto; font-weight: 600; font-size: 10px; }
.dr-event-banner { 
  display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 8px;
  font-size: 12px; margin: 12px 0;
}
.dr-event-banner.bull { background: var(--positive-bg); color: var(--positive); }
.dr-event-banner.bear { background: var(--negative-bg); color: var(--negative); }
.dr-event-banner.crash { background: #3b1111; color: #f87171; }
.dr-event-banner.world { background: var(--accent-bg); color: var(--accent); }
.btn-lg { padding: 12px 24px; font-size: 16px; margin-top: 16px; }
</style>
