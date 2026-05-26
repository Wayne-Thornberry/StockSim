import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { saveToSlot, loadFromSlot, getSlotMeta, exportAllSaves, importAllSaves, deleteAllSaves } from '@/utils/storage.js'
import { round2 } from '@/utils/marketEngine.js'
import { useMarketStore } from './marketStore.js'
import { usePortfolioStore } from './portfolioStore.js'

export const useGameStore = defineStore('game', () => {
  const cash = ref(100000)
  const day = ref(1)
  const tick = ref(0)
  const speed = ref(1)
  const isRunning = ref(false)
  const gameStarted = ref(false)
  const notifications = ref([])
  const marketEvent = ref(null)
  const startDate = ref(new Date())
  const difficulty = ref('easy')
  const consecutiveNegativeDays = ref(0)
  const gameOver = ref(false)
  const gameOverReason = ref('')

  // --- Day Report System ---
  const showDayReport = ref(false)
  const dayReportType = ref('start') // 'start' | 'end'
  const dayStartSnapshot = ref(null)  // { cash, netWorth, day }
  const skipDayReports = ref(false)   // true during week/month skips
  const portfolioHistory = ref([])    // [{ day, netWorth, cash, pl }]

  /** Record a snapshot at the start of a trading day */
  function recordDayStart() {
    const pf = usePortfolioStore()
    dayStartSnapshot.value = {
      day: day.value,
      cash: cash.value,
      netWorth: pf.totalNetWorth,
      holdings: { ...pf.holdings },
      indexHoldings: { ...pf.indexHoldings }
    }
  }

  /** Get the day-end result compared to start-of-day snapshot */
  function getDayResult() {
    const pf = usePortfolioStore()
    if (!dayStartSnapshot.value) return null
    const start = dayStartSnapshot.value
    const endNW = pf.totalNetWorth
    const change = round2(endNW - start.netWorth)
    const changePct = start.netWorth > 0 ? round2((change / start.netWorth) * 100) : 0
    // Record in history for portfolio chart
    portfolioHistory.value.push({ day: day.value, netWorth: endNW, cash: cash.value, pl: change })
    if (portfolioHistory.value.length > 365) portfolioHistory.value.shift()
    return {
      startDay: start.day,
      endDay: day.value,
      startCash: start.cash,
      endCash: cash.value,
      startNetWorth: start.netWorth,
      endNetWorth: endNW,
      change,
      changePct
    }
  }

  // --- Loan system ---
  const loanBalance = ref(0)      // current outstanding loan
  const loanInterestRate = computed(() => round2(interestRate.value * 0.4)) // 40% of Fed rate
  const totalBorrowed = ref(0)    // lifetime total borrowed
  const totalRepaid = ref(0)      // lifetime total repaid

  // --- Margin debt (stock margin trading) ---
  const marginDebt = ref(0)       // amount borrowed for stock margin trades
  const marginInterestRate = computed(() => round2(interestRate.value * 1.5)) // 150% of Fed rate

  function addMarginDebt(amount) {
    marginDebt.value = round2(marginDebt.value + amount)
  }

  function removeMarginDebt(amount) {
    marginDebt.value = round2(Math.max(0, marginDebt.value - amount))
  }

  function accrueMarginInterest() {
    if (marginDebt.value <= 0) return
    const interest = round2(marginDebt.value * marginInterestRate.value / 365)
    if (interest < 0.01) return
    marginDebt.value = round2(marginDebt.value + interest)
  }

  const DIFFICULTY_STARTING_CASH = {
    easy: 100000,
    medium: 1000,
    hard: 500,
    creative: 100000
  }

  // Bankruptcy thresholds in days (creative = never)
  const BANKRUPTCY_DAYS = {
    easy: 28,
    medium: 7,
    hard: 3,
    creative: Infinity
  }

  // Ticks per day: 4:00-20:00 = 16 hours × 12 ticks/hour = 192 ticks
  // Phase 0: Pre-Market (4:00–9:00)  =  60 ticks (5 hrs × 12)
  // Phase 1: Regular    (9:00–16:00) =  84 ticks (7 hrs × 12)
  // Phase 2: After-Hrs  (16:00–20:00)=  48 ticks (4 hrs × 12)
  const TICKS_PER_DAY = 192
  const PRE_TICKS = 60
  const REGULAR_TICKS = 144  // 60 + 84
  const AFTER_TICKS = 48

  // Interest rate environment
  const interestRate = ref(0.05) // 5% Fed rate
  const lastRateChange = ref(0)

  const currentDay = computed(() => day.value)

  const currentDate = computed(() => {
    const d = new Date(startDate.value)
    d.setDate(d.getDate() + day.value - 1)
    return d
  })

  const currentDateStr = computed(() => {
    return currentDate.value.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  })

  const currentTime = computed(() => {
    const minuteOfDay = tick.value * 5 + 240 // start at 4:00 AM (240 minutes)
    const hours = Math.floor(minuteOfDay / 60)
    const mins = minuteOfDay % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  })

  /** Market phase: 'closed' | 'pre-market' | 'regular' | 'after-hours' */
  const marketPhase = computed(() => {
    if (!gameStarted.value) return 'closed'
    if (tick.value < PRE_TICKS) return 'pre-market'
    if (tick.value < REGULAR_TICKS) return 'regular'
    if (tick.value < TICKS_PER_DAY) return 'after-hours'
    return 'closed'
  })

  const isMarketOpen = computed(() => marketPhase.value !== 'closed')

  const phaseLabel = computed(() => {
    if (marketPhase.value === 'pre-market') return '🌅 Pre-Market'
    if (marketPhase.value === 'regular') return '🟢 Regular'
    if (marketPhase.value === 'after-hours') return '🌙 After-Hours'
    return '⚫ Closed'
  })

  function addNotification(message, type = 'info') {
    const id = Date.now() + Math.random()
    notifications.value.unshift({ id, message, type, time: new Date().toLocaleTimeString() })
    if (notifications.value.length > 50) notifications.value.pop()
  }

  function startGame(diff = 'easy') {
    difficulty.value = diff
    cash.value = DIFFICULTY_STARTING_CASH[diff] || 100000
    loanBalance.value = 0
    totalBorrowed.value = 0
    totalRepaid.value = 0
    consecutiveNegativeDays.value = 0
    gameOver.value = false
    gameOverReason.value = ''
    startDate.value = new Date()
    gameStarted.value = true
    isRunning.value = false  // Don't auto-run — show start report first
    recordDayStart()
    portfolioHistory.value = [{ day: 1, netWorth: cash.value, cash: cash.value, pl: 0 }]
    showDayReport.value = true
    dayReportType.value = 'start'

    // Hard mode: starts with a forced $5,000 loan
    if (diff === 'hard') {
      loanBalance.value = 5000
      totalBorrowed.value = 5000
      cash.value += 5000
      addNotification(`Welcome to StockSim! HARD mode — $500 capital + $5,000 loan. Bankruptcy in 3 days if negative.`, 'warning')
    } else {
      const limit = BANKRUPTCY_DAYS[diff]
      const limitStr = limit === Infinity ? 'never' : `${limit} days`
      addNotification(`Welcome to StockSim! Starting capital: $${cash.value.toLocaleString()} — ${diff.toUpperCase()} mode (bankruptcy: ${limitStr})`, 'success')
    }
  }

  // --- Loan functions ---
  function takeLoan(amount) {
    if (amount <= 0) return false
    cash.value += amount
    loanBalance.value += amount
    totalBorrowed.value += amount
    addNotification(`Took a loan of $${amount.toLocaleString()}. Outstanding: $${loanBalance.value.toLocaleString()}`, 'warning')
    return true
  }

  function repayLoan(amount) {
    if (amount <= 0) return false
    if (cash.value < amount) return false
    const actual = Math.min(amount, loanBalance.value)
    cash.value -= actual
    loanBalance.value -= actual
    totalRepaid.value += actual
    if (loanBalance.value === 0) {
      addNotification(`Loan fully repaid! Total repaid: $${totalRepaid.value.toLocaleString()}`, 'success')
    } else {
      addNotification(`Repaid $${actual.toLocaleString()}. Remaining loan: $${loanBalance.value.toLocaleString()}`, 'info')
    }
    return true
  }

  function accrueLoanInterest() {
    if (loanBalance.value <= 0) return
    const interest = Math.round(loanBalance.value * loanInterestRate.value * 100) / 100
    if (interest < 0.01) return
    loanBalance.value = Math.round((loanBalance.value + interest) * 100) / 100
  }

  /** Check bankruptcy: called once per simulated day */
  function checkBankruptcy() {
    const limit = BANKRUPTCY_DAYS[difficulty.value]
    if (limit === Infinity) return // creative = never

    // Net position = cash - loan balance
    const netPosition = cash.value - loanBalance.value

    if (netPosition < 0) {
      consecutiveNegativeDays.value++
      const remaining = limit - consecutiveNegativeDays.value
      if (remaining <= 0) {
        gameOver.value = true
        gameOverReason.value = `Bankruptcy! Your net worth was negative for ${limit} consecutive days.`
        isRunning.value = false
        addNotification(gameOverReason.value, 'error')
      } else if (remaining <= 2) {
        addNotification(`⚠️ ${remaining} day${remaining > 1 ? 's' : ''} until bankruptcy! Net: $${netPosition.toLocaleString()}`, 'warning')
      }
    } else {
      consecutiveNegativeDays.value = 0
    }
  }

  function toggleRunning() {
    isRunning.value = !isRunning.value
  }

  /** Record day-end snapshot for portfolio chart (always called, regardless of skip mode) */
  function recordDayEnd() {
    const pf = usePortfolioStore()
    portfolioHistory.value.push({
      day: day.value,
      netWorth: pf.totalNetWorth,
      cash: cash.value,
      pl: round2(pf.totalNetWorth - (dayStartSnapshot.value?.netWorth || 100000))
    })
    if (portfolioHistory.value.length > 365) portfolioHistory.value.shift()
  }

  /** Dismiss day report and proceed to next phase */
  function dismissDayReport() {
    showDayReport.value = false
    if (dayReportType.value === 'end') {
      // Show start-of-day report next
      showDayReport.value = true
      dayReportType.value = 'start'
    }
    // 'start' reports: just hide and let them play
  }

  /** Start the trading day (from start-of-day report) */
  function beginDay() {
    showDayReport.value = false
    isRunning.value = true
  }

  function setSpeed(s) {
    speed.value = s
  }

  function advanceTick() {
    if (!isRunning.value || !gameStarted.value) return
    tick.value++
    if (tick.value >= TICKS_PER_DAY) {
      // Record day-end snapshot for portfolio chart
      recordDayEnd()
      // Day ended — pause and show report unless skipping
      if (!skipDayReports.value) {
        isRunning.value = false
        showDayReport.value = true
        dayReportType.value = 'end'
      }
      day.value++
      tick.value = 0
    }
    // Start of day detection
    if (tick.value === 0 && day.value > 1) {
      recordDayStart()
    }
  }

  /** Skip to end of current day, process day-end, start next day at open */
  function skipToNextDay() {
    // Fast-forward remaining ticks
    const remaining = TICKS_PER_DAY - tick.value
    for (let i = 0; i < remaining; i++) {
      tick.value++
    }
    day.value++
    tick.value = 0
    return remaining
  }

  /** Simulate N trading days worth of ticks (used by skip week/month) */
  function skipDays(numDays) {
    return numDays * TICKS_PER_DAY
  }

  function addCash(amount) {
    cash.value += amount
  }

  function removeCash(amount) {
    cash.value -= amount
  }

  function setMarketEvent(event) {
    marketEvent.value = event
  }

  // --- Save/Load (multi-slot) ---
  function getSaveState() {
    return {
      cash: cash.value, day: day.value, tick: tick.value,
      gameStarted: gameStarted.value, startDate: startDate.value.toISOString(),
      difficulty: difficulty.value, consecutiveNegativeDays: consecutiveNegativeDays.value,
      gameOver: gameOver.value, gameOverReason: gameOverReason.value,
      loanBalance: loanBalance.value, totalBorrowed: totalBorrowed.value,
      totalRepaid: totalRepaid.value, notifications: notifications.value.slice(0, 30)
    }
  }

  function loadSaveState(state) {
    if (!state) return
    cash.value = state.cash ?? cash.value
    day.value = state.day ?? day.value
    tick.value = state.tick ?? tick.value
    gameStarted.value = state.gameStarted ?? gameStarted.value
    startDate.value = state.startDate ? new Date(state.startDate) : startDate.value
    difficulty.value = state.difficulty ?? difficulty.value
    consecutiveNegativeDays.value = state.consecutiveNegativeDays ?? 0
    gameOver.value = state.gameOver ?? false
    gameOverReason.value = state.gameOverReason ?? ''
    loanBalance.value = state.loanBalance ?? 0
    totalBorrowed.value = state.totalBorrowed ?? 0
    totalRepaid.value = state.totalRepaid ?? 0
    notifications.value = state.notifications || []
  }

  /** Save current game to a specific slot (0-9) */
  function quickSave(slotIndex) {
    const marketStore = useMarketStore()
    const portfolioStore = usePortfolioStore()
    return saveToSlot(slotIndex, getSaveState(), marketStore.getSaveState(), portfolioStore.getSaveState())
  }

  /** Load game from a specific slot */
  function quickLoad(slotIndex) {
    const marketStore = useMarketStore()
    const portfolioStore = usePortfolioStore()
    const data = loadFromSlot(slotIndex)
    if (!data) return false
    loadSaveState(data.gameState)
    marketStore.loadSaveState(data.marketState)
    portfolioStore.loadSaveState(data.portfolioState)
    gameStarted.value = true
    isRunning.value = true
    addNotification(`Game loaded from slot ${slotIndex + 1} (Day ${data.gameState.day})`, 'success')
    return true
  }

  function resetGame() {
    const marketStore = useMarketStore()
    const portfolioStore = usePortfolioStore()
    cash.value = 100000; day.value = 1; tick.value = 0
    isRunning.value = false; gameStarted.value = false
    notifications.value = []; marketEvent.value = null
    loanBalance.value = 0; totalBorrowed.value = 0; totalRepaid.value = 0
    consecutiveNegativeDays.value = 0
    startDate.value = new Date()
    portfolioStore.resetPortfolio()
  }

  return {
    cash, day, tick, speed, isRunning, gameStarted,
    notifications, marketEvent, startDate,
    difficulty, consecutiveNegativeDays, gameOver, gameOverReason,
    loanBalance, loanInterestRate, totalBorrowed, totalRepaid,
    marginDebt, marginInterestRate, addMarginDebt, removeMarginDebt, accrueMarginInterest,
    interestRate, lastRateChange,
    currentDay, currentDate, currentDateStr, currentTime,
    isMarketOpen, marketPhase, phaseLabel,
    showDayReport, dayReportType, dayStartSnapshot, skipDayReports, portfolioHistory,
    getDayResult, recordDayStart, dismissDayReport, beginDay,
    addNotification, startGame, toggleRunning, setSpeed,
    advanceTick, skipToNextDay, skipDays, checkBankruptcy,
    takeLoan, repayLoan, accrueLoanInterest,
    addCash, removeCash, setMarketEvent,
    getSaveState, loadSaveState, quickSave, quickLoad, resetGame,
    getSlotMeta, exportAllSaves, importAllSaves, deleteAllSaves,
    TICKS_PER_DAY, REGULAR_TICKS,
    DIFFICULTY_STARTING_CASH, BANKRUPTCY_DAYS
  }
})
