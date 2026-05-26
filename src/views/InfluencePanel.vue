<template>
  <div class="influence-panel">
    <h2>🕶️ Market Influence</h2>

    <!-- Heat Gauge -->
    <div class="heat-gauge">
      <div class="heat-header">
        <span>Heat Level</span>
        <span :style="{ color: influence.heatLevel.color }">{{ influence.heatLevel.label }} ({{ influence.heat }}/100)</span>
      </div>
      <div class="heat-bar">
        <div class="heat-fill" :style="{ width: influence.heat + '%', background: influence.heatLevel.color }"></div>
      </div>
      <p class="heat-desc" v-if="influence.heat >= 60">⚠️ High risk of SEC investigation!</p>
      <p class="heat-desc" v-if="influence.tradingBanned">🚫 Trading banned until Day {{ influence.tradingBanUntil }}</p>
    </div>

    <!-- Active Effects -->
    <div v-if="influence.activeEffects.length" class="active-fx">
      <h3>Active Effects</h3>
      <div v-for="fx in influence.activeEffects" :key="fx.id" class="fx-item">
        <span>{{ fx.type.replace(/_/g, ' ') }}</span>
        <span>{{ fx.companyId?.toUpperCase() }}</span>
        <span class="fx-ticks">{{ fx.remaining }} ticks</span>
      </div>
    </div>

    <!-- Action Cards -->
    <div class="action-list">
      <div v-for="act in actions" :key="act.key" class="action-card">
        <div class="act-header">
          <span class="act-icon">{{ act.icon }}</span>
          <span class="act-name">{{ act.name }}</span>
        </div>
        <p class="act-desc">{{ act.desc }}</p>
        <div class="act-meta">
          <span>💰 ${{ act.costRange[0].toLocaleString() }}–${{ act.costRange[1].toLocaleString() }}</span>
          <span>🔥 {{ act.heatRange[0] }}–{{ act.heatRange[1] }} heat</span>
        </div>
        <div class="act-controls">
          <select v-model="actSelections[act.key].companyId" class="act-select" v-if="act.requiresCompany">
            <option value="">Pick company...</option>
            <option v-for="s in market.stockList" :key="s.id" :value="s.id">{{ s.ticker }} — {{ fmt.money(s.currentPrice) }}</option>
          </select>
          <input type="range" v-model.number="actSelections[act.key].amount" :min="act.costRange[0]" :max="act.costRange[1]" :step="act.costRange[1] / 20" class="act-slider" />
          <span class="act-amount">${{ actSelections[act.key].amount.toLocaleString() }}</span>
          <button class="btn btn-xs" :class="act.heatRange[1] > 40 ? 'btn-danger' : 'btn-primary'"
            @click="execute(act.key)" :disabled="influence.tradingBanned || (act.requiresCompany && !actSelections[act.key].companyId)">
            Execute
          </button>
        </div>
        <p v-if="actSelections[act.key].result" class="act-result">{{ actSelections[act.key].result }}</p>
      </div>
    </div>

    <!-- Action Log -->
    <div v-if="influence.actionLog.length" class="action-log">
      <h3>📜 Influence History</h3>
      <div v-for="(entry, i) in influence.actionLog.slice(0, 10)" :key="i" class="log-item">
        <span>{{ entry.icon }}</span>
        <span class="log-time">{{ entry.timeStr }}</span>
        <span class="log-text">{{ entry.result?.substring(0, 80) }}</span>
        <span class="log-heat">+{{ entry.heat }}🔥</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useInfluenceStore } from '@/stores/influenceStore.js'
import { useMarketStore } from '@/stores/marketStore.js'
import { useFormat } from '@/composables/useFormat.js'

const influence = useInfluenceStore()
const market = useMarketStore()
const fmt = useFormat()

const actions = computed(() => influence.getActions())

// Selection state per action
const actSelections = reactive({})

// Initialize selections
for (const act of influence.getActions()) {
  actSelections[act.key] = { companyId: '', amount: act.costRange[0], result: '' }
}

function execute(actionKey) {
  const sel = actSelections[actionKey]
  const result = influence.executeAction(actionKey, sel.companyId, sel.amount)
  sel.result = result.msg
  setTimeout(() => { sel.result = '' }, 5000)
}
</script>

<style scoped>
.influence-panel { padding: 12px; max-height: 75vh; overflow-y: auto; }
.influence-panel h2 { font-size: 15px; margin-bottom: 10px; }

.heat-gauge {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; padding: 10px; margin-bottom: 8px;
}
.heat-header { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; }
.heat-bar { height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; }
.heat-fill { height: 100%; transition: width 0.5s, background 0.5s; border-radius: 4px; }
.heat-desc { font-size: 10px; color: var(--warning); margin: 4px 0 0 0; }

.active-fx {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; padding: 8px 10px; margin-bottom: 8px;
}
.active-fx h3 { font-size: 11px; margin: 0 0 4px 0; }
.fx-item { display: flex; gap: 8px; font-size: 10px; padding: 2px 0; color: var(--text-secondary); }
.fx-ticks { color: var(--text-muted); margin-left: auto; }

.action-list { display: flex; flex-direction: column; gap: 6px; }
.action-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; padding: 8px 10px;
}
.act-header { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.act-icon { font-size: 16px; }
.act-name { font-weight: 700; font-size: 11px; }
.act-desc { font-size: 10px; color: var(--text-secondary); margin: 0 0 4px 0; line-height: 1.4; }
.act-meta { display: flex; gap: 12px; font-size: 9px; color: var(--text-muted); margin-bottom: 6px; }
.act-controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.act-select { background: var(--bg); border: 1px solid var(--border); border-radius: 3px; padding: 3px 5px; color: var(--text); font-size: 10px; font-family: inherit; width: 140px; }
.act-select option { background: var(--surface); }
.act-slider { width: 80px; accent-color: var(--accent); }
.act-amount { font-size: 10px; font-weight: 600; min-width: 60px; text-align: right; }
.act-result { font-size: 10px; color: var(--warning); margin: 4px 0 0 0; padding: 4px 6px; background: #e8b32d10; border-radius: 3px; }

.action-log {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; padding: 8px 10px; margin-top: 8px;
}
.action-log h3 { font-size: 11px; margin: 0 0 4px 0; }
.log-item { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 10px; border-bottom: 1px solid var(--border); }
.log-item:last-child { border-bottom: none; }
.log-time { color: var(--text-muted); font-size: 9px; min-width: 40px; }
.log-text { flex: 1; color: var(--text-secondary); }
.log-heat { color: var(--negative); font-size: 9px; }
</style>
