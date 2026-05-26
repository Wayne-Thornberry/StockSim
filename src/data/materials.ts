// Materials economy definitions — tracked resources and commodity mapping
export const MATERIALS = {
  crude_oil:     { name: 'Crude Oil',       unit: 'barrel',   baseSupply: 100, baseDemand: 100 },
  natural_gas:   { name: 'Natural Gas',     unit: 'MMBtu',   baseSupply: 100, baseDemand: 95 },
  gold:          { name: 'Gold',            unit: 'oz',      baseSupply: 100, baseDemand: 105 },
  silver:        { name: 'Silver',          unit: 'oz',      baseSupply: 100, baseDemand: 100 },
  copper:        { name: 'Copper',          unit: 'lb',      baseSupply: 100, baseDemand: 110 },
  platinum:      { name: 'Platinum',        unit: 'oz',      baseSupply: 100, baseDemand: 98 },
  palladium:     { name: 'Palladium',       unit: 'oz',      baseSupply: 100, baseDemand: 102 },
  diamond:       { name: 'Diamond',         unit: 'carat',   baseSupply: 100, baseDemand: 95 },
  lithium:       { name: 'Lithium',         unit: 'ton',     baseSupply: 100, baseDemand: 130 },
  rare_earth:    { name: 'Rare Earths',     unit: 'ton',     baseSupply: 100, baseDemand: 115 },
  uranium:       { name: 'Uranium',         unit: 'lb',      baseSupply: 100, baseDemand: 90 },
  lumber:        { name: 'Lumber',          unit: 'board ft',baseSupply: 100, baseDemand: 100 },
  steel:         { name: 'Steel',           unit: 'ton',     baseSupply: 100, baseDemand: 105 },
  semiconductor: { name: 'Semiconductors',   unit: 'wafer',   baseSupply: 100, baseDemand: 125 },
}

export const COMMODITY_MATERIAL_MAP = {
  gold: 'gold', silver: 'silver', platinum: 'platinum', copper: 'copper',
  palladium: 'palladium', diamond: 'diamond', ruby: 'diamond', sapphire: 'diamond',
  crude_wti: 'crude_oil', crude_brent: 'crude_oil', natural_gas: 'natural_gas',
}
