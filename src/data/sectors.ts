// Sector definitions, weights, and parameters for company generation
export const SECTORS = ['Technology', 'Finance', 'Healthcare', 'Energy', 'Consumer', 'Industrial']

export const SECTOR_WEIGHTS = {
  Technology: 0.25, Finance: 0.18, Healthcare: 0.15, Energy: 0.12, Consumer: 0.18, Industrial: 0.12
}

export const SECTOR_PARAMS = {
  Technology: { basePrice: [20, 400],  volatility: [0.025, 0.055], trend: [-0.06, 0.08] },
  Finance:    { basePrice: [20, 300],  volatility: [0.015, 0.035], trend: [-0.05, 0.06] },
  Healthcare: { basePrice: [15, 300],  volatility: [0.018, 0.045], trend: [-0.06, 0.07] },
  Energy:     { basePrice: [10, 200],  volatility: [0.020, 0.050], trend: [-0.06, 0.07] },
  Consumer:   { basePrice: [15, 300],  volatility: [0.015, 0.035], trend: [-0.05, 0.06] },
  Industrial: { basePrice: [20, 250],  volatility: [0.015, 0.030], trend: [-0.04, 0.05] }
}

export const SECTOR_DESCRIPTIONS = {
  Technology: ['AI & cloud leader', 'Chip manufacturer', 'Robotics pioneer', 'Software platform', 'Quantum computing', '5G networking', 'Cybersecurity firm', 'Edge computing provider', 'DevOps platform', 'Autonomous systems'],
  Finance: ['Investment banking', 'Regional banking', 'Asset management', 'Crypto exchange', 'Insurance group', 'Venture capital', 'Private equity firm', 'Hedge fund', 'Wealth management', 'Payment processor'],
  Healthcare: ['Drug research', 'Gene therapy', 'Hospital operator', 'Medical devices', 'Biotech innovator', 'Health insurance', 'Telemedicine platform', 'Clinical diagnostics', 'Vaccine development', 'Surgical robotics'],
  Energy: ['Solar & renewable', 'Oil & gas', 'Nuclear research', 'Wind power', 'Battery technology', 'Grid infrastructure', 'Hydrogen fuel cells', 'Geothermal energy', 'Carbon capture', 'Smart grid solutions'],
  Consumer: ['E-commerce platform', 'Food & beverage', 'Luxury goods', 'EV manufacturer', 'Retail chain', 'Entertainment media', 'Streaming service', 'Apparel brand', 'Home goods retailer', 'Consumer electronics'],
  Industrial: ['Heavy machinery', 'Aerospace & defense', 'Steel & materials', 'Industrial conglomerate', 'Logistics & shipping', 'Construction', 'Chemical processing', 'Precision engineering', 'Rail transport', 'Water infrastructure']
}

export const REASONS = {
  Technology: ['cloud adoption', 'AI demand', 'chip shortages', 'enterprise spending', 'cybersecurity growth'],
  Finance: ['interest rates', 'loan growth', 'trading volumes', 'regulatory changes', 'fintech disruption'],
  Healthcare: ['drug pipeline', 'FDA decisions', 'healthcare spending', 'clinical trials', 'patent expirations'],
  Energy: ['oil prices', 'renewable mandates', 'grid modernization', 'carbon credits', 'energy transition'],
  Consumer: ['consumer spending', 'e-commerce trends', 'supply chain costs', 'brand strength', 'retail foot traffic'],
  Industrial: ['infrastructure spending', 'manufacturing PMI', 'defense contracts', 'trade policy', 'raw material costs'],
}

export const PRODUCTS = {
  Technology: ['AI platform', 'cloud service', 'chip design', 'networking gear', 'software suite'],
  Finance: ['trading platform', 'wealth management', 'payment system', 'lending product', 'insurance offering'],
  Healthcare: ['drug candidate', 'medical device', 'therapy', 'diagnostic tool', 'health platform'],
  Energy: ['solar panel', 'battery system', 'turbine', 'grid solution', 'reactor design'],
  Consumer: ['product line', 'store format', 'delivery service', 'subscription', 'loyalty program'],
  Industrial: ['machinery line', 'aerospace component', 'steel product', 'construction system', 'logistics solution'],
}
