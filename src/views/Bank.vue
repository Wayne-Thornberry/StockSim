<template>
  <div class="bank-view">
    <h2>🏦 Bank & Loans</h2>
    <p class="subtitle">Borrow money to invest, but watch the interest — it compounds daily.</p>

    <div class="bank-layout">
      <!-- Loan Status -->
      <div class="bank-card">
        <h3>📋 Loan Status</h3>
        <div class="loan-stats">
          <div class="loan-stat">
            <span class="ls-label">Current Loan</span>
            <span class="ls-value" :class="game.loanBalance > 0 ? 'negative' : ''">
              {{ fmt.money(game.loanBalance) }}
            </span>
          </div>
          <div class="loan-stat">
            <span class="ls-label">Daily Interest</span>
            <span class="ls-value negative">{{ (game.loanInterestRate * 100).toFixed(1) }}%</span>
          </div>
          <div class="loan-stat">
            <span class="ls-label">Interest Today</span>
            <span class="ls-value negative">{{ fmt.money(game.loanBalance * game.loanInterestRate) }}</span>
          </div>
          <div class="loan-stat">
            <span class="ls-label">Total Borrowed</span>
            <span class="ls-value">{{ fmt.money(game.totalBorrowed) }}</span>
          </div>
          <div class="loan-stat">
            <span class="ls-label">Total Repaid</span>
            <span class="ls-value positive">{{ fmt.money(game.totalRepaid) }}</span>
          </div>
          <div class="loan-stat">
            <span class="ls-label">Cash</span>
            <span class="ls-value">{{ fmt.money(game.cash) }}</span>
          </div>
          <div class="loan-stat">
            <span class="ls-label">Net Position</span>
            <span class="ls-value" :class="netPosition >= 0 ? 'positive' : 'negative'">
              {{ fmt.money(netPosition) }}
            </span>
          </div>
        </div>

        <!-- Bankruptcy warning -->
        <div v-if="game.difficulty !== 'creative' && netPosition < 0" class="bankruptcy-warning">
          <span>⚠️</span>
          <span>
            Net negative for {{ game.consecutiveNegativeDays }} / {{ bankruptcyLimit }} day{{ bankruptcyLimit > 1 ? 's' : '' }}.
            {{ bankruptcyLimit - game.consecutiveNegativeDays <= 2 ? 'Repay your loan or earn money fast!' : '' }}
          </span>
        </div>
      </div>

      <!-- Borrow -->
      <div class="bank-card">
        <h3>💸 Borrow Money</h3>
        <p class="card-desc">Take a loan at {{ (game.loanInterestRate * 100).toFixed(1) }}% daily interest.</p>
        <div class="borrow-form">
          <div class="form-row">
            <label>Amount</label>
            <input type="number" v-model.number="borrowAmount" min="1" step="1000" class="form-input" />
          </div>
          <div class="preset-buttons">
            <button v-for="p in borrowPresets" :key="p" class="btn btn-sm btn-ghost" @click="borrowAmount = p">
              {{ fmt.money(p) }}
            </button>
          </div>
          <button class="btn btn-primary btn-block" :disabled="borrowAmount <= 0" @click="doBorrow">
            Borrow {{ fmt.money(borrowAmount) }}
          </button>
          <p v-if="borrowAmount > 0" class="interest-preview">
            Daily interest: {{ fmt.money(borrowAmount * game.loanInterestRate) }}
          </p>
        </div>
      </div>

      <!-- Repay -->
      <div class="bank-card" v-if="game.loanBalance > 0">
        <h3>💰 Repay Loan</h3>
        <p class="card-desc">Outstanding: {{ fmt.money(game.loanBalance) }}</p>
        <div class="borrow-form">
          <div class="form-row">
            <label>Amount</label>
            <input type="number" v-model.number="repayAmount" min="1" :max="Math.min(game.cash, game.loanBalance)" class="form-input" />
          </div>
          <div class="preset-buttons">
            <button class="btn btn-sm btn-ghost" @click="repayAmount = Math.min(game.cash, game.loanBalance)">
              Repay All ({{ fmt.money(Math.min(game.cash, game.loanBalance)) }})
            </button>
            <button class="btn btn-sm btn-ghost" @click="repayAmount = Math.min(game.cash, Math.ceil(game.loanBalance / 2))">
              Repay Half
            </button>
          </div>
          <button class="btn btn-primary btn-block" :disabled="repayAmount <= 0 || repayAmount > game.cash" @click="doRepay">
            Repay {{ fmt.money(Math.min(repayAmount, game.loanBalance)) }}
          </button>
        </div>
      </div>

      <!-- Loan History -->
      <div class="bank-card" v-if="loanTransactions.length">
        <h3>📜 Loan History</h3>
        <div class="loan-history">
          <div v-for="(tx, i) in loanTransactions" :key="i" class="lh-row">
            <span class="lh-type" :class="tx.type === 'borrow' ? 'negative' : 'positive'">
              {{ tx.type === 'borrow' ? 'Borrowed' : 'Repaid' }}
            </span>
            <span class="lh-amount">{{ fmt.money(tx.amount) }}</span>
            <span class="lh-time">{{ tx.time }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore.js'
import { useFormat } from '@/composables/useFormat.js'

const game = useGameStore()
const fmt = useFormat()

const borrowAmount = ref(1000)
const repayAmount = ref(0)

const borrowPresets = [1000, 5000, 10000, 50000, 100000]

const netPosition = computed(() => game.cash - game.loanBalance)

const bankruptcyLimit = computed(() => {
  const limits = { easy: 28, medium: 7, hard: 3, creative: Infinity }
  return limits[game.difficulty] || 28
})

// Simulated loan transaction log (in-memory, not persisted)
const loanTransactions = ref([])

function doBorrow() {
  if (borrowAmount.value <= 0) return
  const ok = game.takeLoan(borrowAmount.value)
  if (ok) {
    loanTransactions.value.unshift({
      type: 'borrow',
      amount: borrowAmount.value,
      time: new Date().toLocaleString()
    })
    borrowAmount.value = 1000
  }
}

function doRepay() {
  const amt = Math.min(repayAmount.value, game.cash, game.loanBalance)
  if (amt <= 0) return
  const ok = game.repayLoan(amt)
  if (ok) {
    loanTransactions.value.unshift({
      type: 'repay',
      amount: amt,
      time: new Date().toLocaleString()
    })
    repayAmount.value = 0
  }
}
</script>

<style scoped>
.bank-view { padding: 8px 10px; display: flex; flex-direction: column; gap: 8px; }
.bank-layout { display: flex; flex-direction: column; gap: 8px; }
.bank-card {
  background: var(--surface); border: 1px solid var(--border); padding: 10px;
}
.bank-card h3 { margin: 0 0 8px 0; font-size: 12px; }
.card-desc { color: var(--text-muted); font-size: 10px; margin-bottom: 8px; }
.loan-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.loan-stat { background: var(--bg); padding: 6px 8px; border: 1px solid var(--border); }
.ls-label { display: block; font-size: 8px; color: var(--text-muted); text-transform: uppercase; }
.ls-value { font-size: 12px; font-weight: 700; }
.bankruptcy-warning {
  display: flex; align-items: center; gap: 6px; margin-top: 8px;
  padding: 8px 10px; background: var(--negative-bg); border: 1px solid #f5575330;
  font-size: 10px; color: var(--negative);
}
.borrow-form { margin-top: 6px; }
.form-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.form-row label { width: 50px; font-size: 10px; color: var(--text-muted); }
.form-input {
  flex: 1; background: var(--bg); border: 1px solid var(--border);
  border-radius: 2px; padding: 5px 8px; color: var(--text); font-size: 11px; font-family: inherit;
}
.preset-buttons { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
.btn-block { width: 100%; }
.interest-preview { font-size: 10px; color: var(--text-muted); margin-top: 6px; text-align: center; }
.loan-history { max-height: 150px; overflow-y: auto; }
.lh-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid var(--border); font-size: 10px; }
.lh-row:last-child { border-bottom: none; }
.positive { color: var(--positive); }
.negative { color: var(--negative); }
</style>
