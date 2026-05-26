<template>
  <div class="stock-chart">
    <canvas ref="chartRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useCurrencyStore } from '@/stores/currencyStore.js'

Chart.register(...registerables)

const props = defineProps({
  priceHistory: { type: Array, default: () => [] },
  label: { type: String, default: 'Price' },
  color: { type: String, default: '#4ade80' },
  height: { type: Number, default: 200 },
  startDate: { type: Date, default: null },
  chartMode: { type: String, default: 'intraday' } // 'intraday' or 'daily'
})

const chartRef = ref(null)
let chartInstance = null

function buildDateLabels(data) {
  if (!props.startDate) return data.map((_, i) => '#' + (i + 1))

  const base = new Date(props.startDate)
  return data.map((d, i) => {
    if (props.chartMode === 'daily') {
      const date = new Date(base)
      const dayVal = d.day ?? d.time ?? i
      date.setDate(date.getDate() + dayVal)
      return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' })
    }
    // Intraday: d.time = day*1000 + tick — extract tick, convert to minutes
    const rawTime = typeof d.time === 'number' ? d.time : i
    const tick = rawTime % 1000
    const minuteOfDay = tick * 5 + 240 // start at 4:00 AM
    const h = Math.floor(minuteOfDay / 60)
    const m = minuteOfDay % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })
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
              // Daily mode: labels already include year from buildDateLabels
              if (props.chartMode === 'daily') return label || ''
              // Intraday: show date + time
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
            maxTicksLimit: 6,
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

watch(() => [props.priceHistory, props.chartMode], () => {
  if (chartInstance) {
    const data = props.priceHistory
    chartInstance.data.labels = buildDateLabels(data)
    chartInstance.data.datasets[0].data = data.map(d => Math.round(d.price * 100) / 100)
    chartInstance.options.scales.x.display = props.chartMode === 'daily'
    chartInstance.update('none')
  }
}, { deep: true })

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
