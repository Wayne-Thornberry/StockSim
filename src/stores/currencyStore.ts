import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { REGIONS } from '@/data/companies.js'

export const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸', country: 'United States', region: 'americas' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', flag: '🇪🇺', country: 'European Union', region: 'europe' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧', country: 'United Kingdom', region: 'europe' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', flag: '🇯🇵', country: 'Japan', decimals: 0, region: 'asia' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦', country: 'Canada', region: 'americas' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺', country: 'Australia', region: 'asia' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH', flag: '🇨🇭', country: 'Switzerland', region: 'europe' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', flag: '🇨🇳', country: 'China', region: 'asia' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳', country: 'India', region: 'india' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR', flag: '🇧🇷', country: 'Brazil', region: 'americas' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', locale: 'ko-KR', flag: '🇰🇷', country: 'South Korea', decimals: 0, region: 'asia' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', locale: 'es-MX', flag: '🇲🇽', country: 'Mexico', region: 'americas' },
]

export const useCurrencyStore = defineStore('currency', () => {
  const activeCurrency = ref(currencies[0])
  const activeRegionKey = ref('americas')

  const activeRegion = computed(() => REGIONS[activeRegionKey.value] || REGIONS['americas'])

  function setCurrency(code) {
    const found = currencies.find(c => c.code === code)
    if (found) {
      activeCurrency.value = found
      activeRegionKey.value = found.region
    }
  }

  function setRegion(regionKey) {
    if (REGIONS[regionKey]) {
      activeRegionKey.value = regionKey
      // Auto-switch to the first currency for this region
      const regionCurrencies = currencies.filter(c => c.region === regionKey)
      if (regionCurrencies.length > 0) {
        activeCurrency.value = regionCurrencies[0]
      }
    }
  }

  function format(value, showDecimals = true) {
    const dec = showDecimals ? (activeCurrency.value.decimals ?? 2) : 0
    const abs = Math.abs(value)
    const formatted = abs.toLocaleString(activeCurrency.value.locale, {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    })
    const sign = value < 0 ? '-' : ''
    return sign + activeCurrency.value.symbol + formatted
  }

  function formatCompact(value) {
    const abs = Math.abs(value)
    let num, suffix
    if (abs >= 1e12) { num = abs / 1e12; suffix = 'T' }
    else if (abs >= 1e9) { num = abs / 1e9; suffix = 'B' }
    else if (abs >= 1e6) { num = abs / 1e6; suffix = 'M' }
    else if (abs >= 1e3) { num = abs / 1e3; suffix = 'K' }
    else return format(value)
    const dec = activeCurrency.value.decimals ?? 2
    return (value < 0 ? '-' : '') + activeCurrency.value.symbol + num.toFixed(dec) + suffix
  }

  function chartTickFormat(value) {
    return activeCurrency.value.symbol + value.toFixed(activeCurrency.value.decimals ?? 2)
  }

  return { activeCurrency, activeRegionKey, activeRegion, currencies, setCurrency, setRegion, format, formatCompact, chartTickFormat }
})
