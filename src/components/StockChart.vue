<template>
  <div class="stock-chart">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useCurrencyStore } from '@/stores/currencyStore.js'
import { useGameStore } from '@/stores/gameStore.js'

Chart.register(...registerables)

const props = defineProps({
  priceHistory: { type: Array, default: () => [] },
  label: { type: String, default: 'Price' },
  color: { type: String, default: '#4ade80' },
  height: { type: Number, default: 200 },
  startDate: { type: Date, default: null },
  chartMode: { type: String, default: 'intraday' }, // 'intraday' or 'daily'
  chartRange: { type: String, default: '1D' }
})

const chartRef = ref(null)
let chartInstance = null
const game = useGameStore()

/** Format a date offset from startDate for x-axis labels depending on range */
function formatDateLabel(dayVal, index, totalPoints) {
  if (!props.startDate) return '#' + (index + 1)
  const date = new Date(props.startDate)
  date.setDate(date.getDate() + dayVal)

  const r = props.chartRange
  if (r === '1H') {
    // Show time only
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  if (r === '1D') {
    // Show time, sparse labels
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  if (r === '1W') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
  if (r === '1M' || r === '3M') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (r === '1Y' || r === 'YTD') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  // ALL — show year
  return date.getFullYear().toString()
}

function buildDateLabels(data) {
  if (!props.startDate) return data.map((_, i) => '#' + (i + 1))

  const base = new Date(props.startDate)
  return data.map((d, i) => {
    if (props.chartMode === 'daily') {
      const dayVal = d.day ?? d.time ?? i
      // For ALL range, show only years; for shorter ranges show dates
      if (props.chartRange === 'ALL') {
        const date = new Date(base)
        date.setDate(date.getDate() + dayVal)
        return date.getFullYear().toString()
      }
      const date = new Date(base)
      date.setDate(date.getDate() + dayVal)
      return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' })
    }
    // Intraday: d.time = day*1000 + tick — extract tick, convert to minutes
    const rawTime = typeof d.time === 'number' ? d.time : i
    const tick = rawTime % 1000
    const minuteOfDay = tick * 5 + 240
    const h = Math.floor(minuteOfDay / 60)
    const m = minuteOfDay % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })
}

/** Determine maxTicksLimit based on chart range */
function getMaxTicksLimit() {
  const r = props.chartRange
  if (r === '1H' || r === '1D') return 6
  if (r === '1W') return 7
  if (r === '1M' || r === '3M') return 8
  if (r === '1Y' || r === 'YTD') return 12
  return 10 // ALL
}

function createChart() {
  if (!chartRef.value) return
  const ctx = chartRef.value.getContext('2d')
  const currency = useCurrencyStore()

  if (chartInstance) chartInstance.destroy()

  const data = props.priceHistory
  const labels = buildDateLabels(data)
  const prices = data.map(d => Math.round(d.price * 100) / 100)

  const gradient = ctx.createLinearGradient(0, 0, 0, props.height)
  gradient.addColorStop(0, props.color + '40')
  gradient.addColorStop(1, props.color + '05')

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: props.label,
        data: prices,
        borderColor: props.color,
        backgroundColor: gradient,
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: props.color,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: game.speed <= 1,
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#f1f5f9',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (ctx) => {
              if (!ctx.length) return ''
              const label = ctx[0].label
              if (props.chartMode === 'daily') return label || ''
              if (props.startDate) {
                const d = props.startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                return label ? `${d} ${label}` : d
              }
              return label || ''
            },
            label: (ctx) => {
              const val = ctx.parsed.y
              return currency.format(val)
            }
          }
        }
      },
      scales: {
        x: {
          display: props.chartMode === 'daily',
          ticks: {
            color: '#64748b',
            font: { size: 9 },
            maxTicksLimit: getMaxTicksLimit(),
            autoSkip: true
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            callback: v => currency.chartTickFormat(v)
          },
          grid: { color: '#1e293b' }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  })
}

watch(() => [props.priceHistory, props.chartMode, props.chartRange], () => {
  if (chartInstance) {
    const data = props.priceHistory
    chartInstance.data.labels = buildDateLabels(data)
    chartInstance.data.datasets[0].data = data.map(d => Math.round(d.price * 100) / 100)
    chartInstance.options.scales.x.display = props.chartMode === 'daily'
    chartInstance.options.scales.x.ticks.maxTicksLimit = getMaxTicksLimit()
    chartInstance.update('none')
  }
}, { deep: true })

// Disable tooltips when speed > 1 to avoid lag
watch(() => game.speed, (s) => {
  if (chartInstance) {
    chartInstance.options.plugins.tooltip.enabled = s <= 1
    chartInstance.update('none')
  }
})

onMounted(() => createChart())
onUnmounted(() => { if (chartInstance) chartInstance.destroy() })
</script>

<style scoped>
.stock-chart {
  width: 100%;
  height: v-bind(height + 'px');
  position: relative;
}
canvas { width: 100% !important; }
</style>
