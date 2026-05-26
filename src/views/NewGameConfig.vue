<template>
  <div class="config-overlay">
    <div class="config-modal">
      <h2>⚙️ New Game Setup</h2>
      <p class="config-subtitle">Configure your market simulation</p>

      <div class="preset-row">
        <button class="btn btn-sm preset-btn" @click="applyPreset('classic')" title="Balanced, realistic market">📊 Classic</button>
        <button class="btn btn-sm preset-btn" @click="applyPreset('volatile')" title="High failure, frequent crashes">🌋 Volatile</button>
        <button class="btn btn-sm preset-btn" @click="applyPreset('boom')" title="Bullish market, low failures">🚀 Boom</button>
        <button class="btn btn-sm preset-btn" @click="applyPreset('doom')" title="Bear market, high failure, crashes">💀 Doom</button>
      </div>

      <div class="config-grid">
        <!-- Difficulty -->
        <div class="config-group">
          <label class="config-label">Difficulty</label>
          <div class="config-options-row">
            <button v-for="d in difficulties" :key="d.key"
              class="btn btn-sm" :class="{ 'btn-active': cfg.difficulty === d.key }"
              @click="cfg.difficulty = d.key" :title="d.desc">
              {{ d.icon }} {{ d.name }}
            </button>
          </div>
        </div>

        <!-- Region -->
        <div class="config-group">
          <label class="config-label">Region</label>
          <div class="config-options-row">
            <button v-for="(r, key) in REGIONS" :key="key"
              class="btn btn-sm" :class="{ 'btn-active': cfg.region === key }"
              @click="cfg.region = key">
              {{ r.icon }} {{ r.name }}
            </button>
          </div>
        </div>

        <!-- Company Count: Min / Max -->
        <div class="config-group">
          <label class="config-label">Min Companies: <strong>{{ cfg.minCompanies }}</strong></label>
          <input type="range" min="20" max="200" step="5" v-model.number="cfg.minCompanies"
            class="config-slider" @input="clampMax" />
          <div class="range-labels"><span>20</span><span>200</span></div>
        </div>
        <div class="config-group">
          <label class="config-label">Max Companies: <strong>{{ cfg.maxCompanies }}</strong> <span class="config-hint">(cap 500)</span></label>
          <input type="range" min="50" max="500" step="10" v-model.number="cfg.maxCompanies"
            class="config-slider" @input="clampMax" />
          <div class="range-labels"><span>50</span><span>500</span></div>
        </div>

        <!-- Index Count -->
        <div class="config-group">
          <label class="config-label">Indexes: <strong>{{ cfg.indexCount }}</strong></label>
          <input type="range" min="4" max="14" step="1" v-model.number="cfg.indexCount" class="config-slider" />
          <div class="range-labels"><span>4</span><span>14</span></div>
        </div>

        <!-- Market Bias -->
        <div class="config-group">
          <label class="config-label">Market Bias</label>
          <div class="config-options-row">
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.marketBias === 'bearish' }" @click="cfg.marketBias = 'bearish'">🐻 Bearish</button>
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.marketBias === 'neutral' }" @click="cfg.marketBias = 'neutral'">⚖️ Neutral</button>
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.marketBias === 'bullish' }" @click="cfg.marketBias = 'bullish'">🐂 Bullish</button>
          </div>
        </div>

        <!-- Crash Frequency -->
        <div class="config-group">
          <label class="config-label">Market Crashes</label>
          <div class="config-options-row">
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.crashFrequency === 'rare' }" @click="cfg.crashFrequency = 'rare'">🟢 Rare</button>
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.crashFrequency === 'occasional' }" @click="cfg.crashFrequency = 'occasional'">🟡 Occasional</button>
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.crashFrequency === 'common' }" @click="cfg.crashFrequency = 'common'">🔴 Common</button>
          </div>
        </div>

        <!-- Company Failure Rate -->
        <div class="config-group">
          <label class="config-label">Company Failures</label>
          <div class="config-options-row">
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.failureRate === 'low' }" @click="cfg.failureRate = 'low'">🟢 Low</button>
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.failureRate === 'medium' }" @click="cfg.failureRate = 'medium'">🟡 Medium</button>
            <button class="btn btn-sm" :class="{ 'btn-active': cfg.failureRate === 'high' }" @click="cfg.failureRate = 'high'">🔴 High</button>
          </div>
        </div>

        <!-- Seed -->
        <div class="config-group">
          <label class="config-label">Seed <span class="config-hint">(same seed = same world)</span></label>
          <input v-model="cfg.seed" type="text" class="seed-field"
            placeholder="Leave blank for random" @keyup.enter="start" />
        </div>
      </div>

      <div class="config-actions">
        <button class="btn btn-secondary btn-lg" @click="$emit('back')">← Back</button>
        <button class="btn btn-primary btn-lg" @click="start">🚀 Start Simulation</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { REGIONS } from '@/data/companies.js'

const emit = defineEmits(['start', 'back'])

const difficulties = [
  { key: 'easy', name: 'Easy', icon: '🟢', desc: '$100,000 · Bankruptcy: 28 days' },
  { key: 'medium', name: 'Medium', icon: '🟡', desc: '$1,000 · Bankruptcy: 7 days' },
  { key: 'hard', name: 'Hard', icon: '🟠', desc: '$500 + $5K loan · Bankruptcy: 3 days' },
  { key: 'creative', name: 'Creative', icon: '🔴', desc: 'Unlimited · No bankruptcy' },
]

const cfg = reactive({
  difficulty: 'easy',
  region: 'americas',
  minCompanies: 50,
  maxCompanies: 200,
  indexCount: 8,
  marketBias: 'neutral',
  crashFrequency: 'occasional',
  failureRate: 'medium',
  seed: ''
})

function clampMax() {
  if (cfg.maxCompanies < cfg.minCompanies) cfg.maxCompanies = cfg.minCompanies
}

const PRESETS = {
  classic:  { marketBias: 'neutral', crashFrequency: 'occasional', failureRate: 'medium', minCompanies: 50, maxCompanies: 200 },
  volatile: { marketBias: 'neutral', crashFrequency: 'common',    failureRate: 'high',    minCompanies: 60, maxCompanies: 300 },
  boom:     { marketBias: 'bullish', crashFrequency: 'rare',      failureRate: 'low',     minCompanies: 40, maxCompanies: 250 },
  doom:     { marketBias: 'bearish', crashFrequency: 'common',    failureRate: 'high',    minCompanies: 30, maxCompanies: 150 },
}

function applyPreset(key) {
  const p = PRESETS[key]
  if (!p) return
  Object.assign(cfg, p)
}

function start() {
  emit('start', { ...cfg })
}
</script>

<style scoped>
.config-overlay {
  position: fixed; inset: 0; z-index: 150;
  background: rgba(8,12,18,0.95);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.config-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 28px 32px;
  max-width: 620px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
.config-modal h2 { font-size: 20px; margin-bottom: 2px; }
.config-subtitle { font-size: 12px; color: var(--text-muted); margin-bottom: 20px; }
.preset-row { display: flex; gap: 6px; margin-bottom: 16px; }
.preset-btn { flex: 1; font-size: 11px; padding: 6px 4px; }
.config-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 16px 24px; margin-bottom: 20px;
}
.config-group { display: flex; flex-direction: column; gap: 4px; }
.config-label { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.config-label strong { color: var(--text); }
.config-hint { font-weight: 400; color: var(--text-muted); font-size: 10px; }
.config-options-row { display: flex; gap: 4px; flex-wrap: wrap; }
.config-slider {
  width: 100%; accent-color: var(--accent);
  margin: 2px 0;
}
.range-labels {
  display: flex; justify-content: space-between;
  font-size: 9px; color: var(--text-muted);
}
.seed-field {
  width: 100%; padding: 6px 10px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 4px; color: var(--text); font-size: 13px;
  font-family: inherit; outline: none;
  transition: border-color 0.15s;
}
.seed-field:focus { border-color: var(--accent); }
.seed-field::placeholder { color: var(--text-muted); }
.config-actions {
  display: flex; gap: 10px; justify-content: space-between;
  padding-top: 12px; border-top: 1px solid var(--border);
}
</style>
