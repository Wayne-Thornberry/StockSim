# Rebuild companies.js with correct trend values (scaled 100x)
# Original trends: 0.000X -> 0.0X, 0.00XX -> 0.XX
import re

# Define the correct content with proper trends
content = r"""// --- Region mapping ---
// Each company belongs to one or more regions (global = appears everywhere)
export const REGIONS = {
  americas: { name: 'Americas', icon: '\U0001f30e', benchmark: 'Americas 500', benchmarkId: 'americas500', currencies: ['USD','CAD','MXN','BRL'] },
  europe:   { name: 'Europe',    icon: '\U0001f1ea\U0001f1fa', benchmark: 'Euro Stoxx 50', benchmarkId: 'eurostoxx50', currencies: ['EUR','GBP','CHF'] },
  asia:     { name: 'Asia-Pacific', icon: '\U0001f30f', benchmark: 'Asia Pac 200', benchmarkId: 'asiapac200', currencies: ['JPY','CNY','KRW','AUD'] },
  india:    { name: 'India',     icon: '\U0001f1ee\U0001f1f3', benchmark: 'Nifty 50', benchmarkId: 'nifty50', currencies: ['INR'] },
}
"""

print(content)
