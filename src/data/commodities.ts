// Commodity definitions — metals, gems, energy
export const COMMODITY_METALS = [
  { id: 'gold', ticker: 'XAU', name: 'Gold', basePrice: 2350, volatility: 0.015, trend: 0.05, unit: 'oz', description: 'Precious metal — safe haven asset' },
  { id: 'silver', ticker: 'XAG', name: 'Silver', basePrice: 32, volatility: 0.025, trend: 0.03, unit: 'oz', description: 'Industrial & precious metal' },
  { id: 'platinum', ticker: 'XPT', name: 'Platinum', basePrice: 1050, volatility: 0.022, trend: 0.02, unit: 'oz', description: 'Rare precious metal — automotive catalyst' },
  { id: 'copper', ticker: 'XCU', name: 'Copper', basePrice: 4.80, volatility: 0.028, trend: 0.04, unit: 'lb', description: 'Industrial metal — construction & electronics' },
  { id: 'palladium', ticker: 'XPD', name: 'Palladium', basePrice: 980, volatility: 0.03, trend: 0.03, unit: 'oz', description: 'Catalytic converters & electronics' },
]

export const COMMODITY_GEMS = [
  { id: 'diamond', ticker: 'DMD', name: 'Diamond', basePrice: 8500, volatility: 0.018, trend: 0.02, unit: 'carat', description: 'Investment-grade diamonds' },
  { id: 'ruby', ticker: 'RBY', name: 'Ruby', basePrice: 12000, volatility: 0.02, trend: 0.03, unit: 'carat', description: 'Fine gemstones — Burmese rubies' },
  { id: 'sapphire', ticker: 'SPH', name: 'Sapphire', basePrice: 6200, volatility: 0.019, trend: 0.02, unit: 'carat', description: 'Ceylon blue sapphires' },
]

export const COMMODITY_ENERGY = [
  { id: 'crude_wti', ticker: 'WTI', name: 'WTI Crude Oil', basePrice: 78, volatility: 0.035, trend: 0.01, unit: 'barrel', description: 'West Texas Intermediate — US benchmark crude' },
  { id: 'crude_brent', ticker: 'BRT', name: 'Brent Crude Oil', basePrice: 82, volatility: 0.033, trend: 0.01, unit: 'barrel', description: 'Brent — global benchmark crude oil' },
  { id: 'natural_gas', ticker: 'NGS', name: 'Natural Gas', basePrice: 3.50, volatility: 0.045, trend: 0.02, unit: 'MMBtu', description: 'Henry Hub natural gas' },
]

export const COMMODITY_DEFAULTS = {
  type: 'commodity',
  sector: 'Commodities',
  outstandingShares: 0,
  revenue: 0, profitMargin: 0, peRatio: null, debtToEquity: 0,
  employees: 0, established: null, ipoYear: null,
  sentiment: 'neutral',
  region: ['americas', 'europe', 'asia', 'india']
}
