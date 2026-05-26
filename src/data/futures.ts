// Futures contract specifications for commodities and indexes
export const FUTURES_SPECS = {
  gold:       { contractSize: 100,   unit: 'oz',     marginRate: 0.12, tickSize: 0.10, tickValue: 10 },
  silver:     { contractSize: 5000,  unit: 'oz',     marginRate: 0.15, tickSize: 0.005, tickValue: 25 },
  platinum:   { contractSize: 50,    unit: 'oz',     marginRate: 0.15, tickSize: 0.10, tickValue: 5 },
  copper:     { contractSize: 25000, unit: 'lb',     marginRate: 0.12, tickSize: 0.0005, tickValue: 12.50 },
  palladium:  { contractSize: 100,   unit: 'oz',     marginRate: 0.18, tickSize: 0.10, tickValue: 10 },
  diamond:    { contractSize: 10,    unit: 'carat',  marginRate: 0.20, tickSize: 1.00, tickValue: 10 },
  ruby:       { contractSize: 5,     unit: 'carat',  marginRate: 0.25, tickSize: 5.00, tickValue: 25 },
  sapphire:   { contractSize: 5,     unit: 'carat',  marginRate: 0.25, tickSize: 5.00, tickValue: 25 },
  crude_wti:  { contractSize: 1000,  unit: 'barrel', marginRate: 0.10, tickSize: 0.01, tickValue: 10 },
  crude_brent:{ contractSize: 1000,  unit: 'barrel', marginRate: 0.10, tickSize: 0.01, tickValue: 10 },
  natural_gas:{ contractSize: 10000, unit: 'MMBtu',  marginRate: 0.12, tickSize: 0.001, tickValue: 10 },
}

export const INDEX_FUTURES_DEFAULTS = { multiplier: 50, marginRate: 0.05, tickSize: 0.25, tickValue: 12.50 }

export const CONTRACT_MONTHS = 30
