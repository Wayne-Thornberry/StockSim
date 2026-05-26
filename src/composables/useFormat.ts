import { useCurrencyStore } from '@/stores/currencyStore.js'

export function useFormat() {
  const currency = useCurrencyStore()

  /** Format a monetary value with currency symbol and 2 decimal places */
  function money(val) {
    return currency.format(val ?? 0)
  }

  /** Format compact (K, M, B) */
  function moneyCompact(val) {
    return currency.formatCompact(val ?? 0)
  }

  /** Format a percentage change */
  function pct(val) {
    const v = val ?? 0
    return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'
  }

  /** Format a plain number with 2 decimals */
  function num(val) {
    return (val ?? 0).toFixed(2)
  }

  return { money, moneyCompact, pct, num, currency }
}
