// --- Region mapping ---
// Each company belongs to one or more regions (global = appears everywhere)
export const REGIONS = {
  americas: { name: 'Americas', icon: '🌎', benchmark: 'Americas 500', benchmarkId: 'americas500', currencies: ['USD','CAD','MXN','BRL'] },
  europe:   { name: 'Europe',    icon: '🇪🇺', benchmark: 'Euro Stoxx 50', benchmarkId: 'eurostoxx50', currencies: ['EUR','GBP','CHF'] },
  asia:     { name: 'Asia-Pacific', icon: '🌏', benchmark: 'Asia Pac 200', benchmarkId: 'asiapac200', currencies: ['JPY','CNY','KRW','AUD'] },
  india:    { name: 'India',     icon: '🇮🇳', benchmark: 'Nifty 50', benchmarkId: 'nifty50', currencies: ['INR'] },
}

