// Company event type definitions — impacts, durations, categories
export const EVENT_DEFS = {
  earningsBeat:    { label: 'Earnings Beat',     icon: '📈', priceImpact: 0.08,  duration: 3,  category: 'earnings' },
  earningsMiss:    { label: 'Earnings Miss',     icon: '📉', priceImpact: -0.07, duration: 3,  category: 'earnings' },
  productLaunch:   { label: 'Product Launch',    icon: '🚀', priceImpact: 0.05,  duration: 5,  category: 'corporate' },
  productFailure:  { label: 'Product Failure',   icon: '💥', priceImpact: -0.12, duration: 7,  category: 'corporate' },
  scandal:         { label: 'Scandal',           icon: '⚠️', priceImpact: -0.10, duration: 5,  category: 'corporate' },
  layoffs:         { label: 'Mass Layoffs',      icon: '🔻', priceImpact: -0.04, duration: 3,  category: 'corporate' },
  acquisition:     { label: 'Acquisition Rumor', icon: '🤝', priceImpact: 0.06,  duration: 4,  category: 'corporate' },
  mergerAnnounced: { label: 'Merger Announced',  icon: '🏛️', priceImpact: 0.10,  duration: 7,  category: 'corporate' },
  mergerBlocked:   { label: 'Merger Blocked',    icon: '🚫', priceImpact: -0.12, duration: 5,  category: 'regulatory' },
  breakthrough:    { label: 'Breakthrough',      icon: '🔬', priceImpact: 0.12,  duration: 5,  category: 'corporate' },
  supplyChain:     { label: 'Supply Chain Issue',icon: '🔗', priceImpact: -0.05, duration: 4,  category: 'external' },
  buyback:         { label: 'Stock Buyback',     icon: '💎', priceImpact: 0.04,  duration: 5,  category: 'corporate' },
  goingPrivate:    { label: 'Going Private',     icon: '🔒', priceImpact: 0.15,  duration: 3,  category: 'corporate' },
  regulation:      { label: 'Regulatory Action', icon: '⚖️', priceImpact: -0.06, duration: 5,  category: 'regulatory' },
  antitrustBreakup:{ label: 'Antitrust Breakup', icon: '🔨', priceImpact: -0.18, duration: 10, category: 'regulatory' },
  upgrade:         { label: 'Analyst Upgrade',   icon: '⭐', priceImpact: 0.03,  duration: 2,  category: 'analyst' },
  downgrade:       { label: 'Analyst Downgrade', icon: '👎', priceImpact: -0.03, duration: 2,  category: 'analyst' },
  bankruptcy:      { label: 'Bankruptcy Filing', icon: '💀', priceImpact: -0.70, duration: 1,  category: 'corporate' },
}

// News hint templates per event type
export const HINT_TEMPLATES = {
  earningsBeat: [
    '{company} is expected to report strong quarterly results, driven by {reason}.',
    'Analysts raise price targets ahead of {company} earnings call.',
    'Insider buying activity surges at {company} — a bullish signal.',
    '{company}\'s {product} segment shows record growth this quarter.',
  ],
  earningsMiss: [
    'Whispers suggest {company} may miss earnings estimates this quarter.',
    '{company} faces headwinds as {reason} weighs on performance.',
    'Analysts cut forecasts for {company} ahead of earnings.',
    'Insiders at {company} have been selling shares recently.',
  ],
  productLaunch: [
    '{company} teases a major new {product} announcement.',
    'Rumors swirl about {company}\'s upcoming {product} reveal.',
    '{company} files patents for next-generation {product} technology.',
  ],
  scandal: [
    'Investigation launched into {company}\'s {reason} practices.',
    'Whistleblower alleges misconduct at {company}.',
    '{company} faces lawsuits over {reason}.',
  ],
  layoffs: [
    '{company} reportedly planning workforce reductions.',
    'Restructuring rumors circulate at {company}.',
    '{company} may cut costs amid slowing demand.',
  ],
  acquisition: [
    '{company} rumored to be in talks to acquire a smaller rival.',
    'M&A speculation grows around {company}.',
    '{company} said to be exploring strategic acquisitions.',
  ],
  regulation: [
    'Regulators eye {company}\'s {reason} practices.',
    'New legislation could impact {company}\'s business model.',
    '{company} faces potential antitrust scrutiny.',
  ],
  breakthrough: [
    '{company} scientists report major {reason} breakthrough.',
    'Clinical trial results exceed expectations for {company}.',
    '{company}\'s R&D pipeline shows promising results.',
  ],
  supplyChain: [
    '{company} warns of potential supply chain bottlenecks.',
    'Global shipping issues may affect {company}\'s deliveries.',
    '{company}\'s suppliers report production delays.',
  ],
  upgrade: [
    'Wall Street analysts turn bullish on {company}.',
    '{company} receives a price target upgrade.',
    'Strong fundamentals cited in {company} analyst note.',
  ],
  downgrade: [
    'Analysts turn cautious on {company} shares.',
    '{company} receives a downgrade amid valuation concerns.',
    'Profit-taking expected as {company} analyst cuts rating.',
  ],
  buyback: [
    '{company} authorizes a major share buyback program.',
    '{company} board approves $5B stock repurchase plan.',
    'Insider buying surges as {company} announces buyback.',
    '{company} to return capital to shareholders through buybacks.',
  ],
  productFailure: [
    '{company}\'s new {product} faces major quality issues.',
    'Early reviews pan {company}\'s latest {product} release.',
    '{company} may recall its flagship {product} — costs mounting.',
  ],
  mergerAnnounced: [
    '{company} in advanced talks to merge with industry rival.',
    'Merger of equals: {company} and competitor near deal.',
    '{company} board reviewing merger proposal — announcement expected.',
  ],
  mergerBlocked: [
    'Regulators signal opposition to {company} merger plans.',
    'Antitrust concerns cloud {company}\'s proposed combination.',
    '{company} merger faces mounting political opposition.',
  ],
  antitrustBreakup: [
    'DOJ preparing antitrust case against {company}.',
    '{company} may be forced to divest key business units.',
    'Lawmakers call for {company} breakup over monopoly concerns.',
  ],
  goingPrivate: [
    '{company} explores going private in leveraged buyout.',
    'Private equity circles {company} for potential acquisition.',
    '{company} management considering take-private transaction.',
  ],
  bankruptcy: [
    '{company} shares halted amid insolvency fears.',
    'Creditors circle as {company} struggles with debt load.',
    '{company} hires restructuring advisors — bankruptcy looms.',
  ],
}
