# StockSim — Simulation Architecture

## Overview
StockSim is a full-market simulation. It starts in 1970 and simulates forward
day-by-day, month-by-month through decades of economic history, building a rich
world the player steps into. Every event is logged. Everything is seed-reproducible.

---

## 1. Core Entities

### Companies
Procedurally generated at game start + dynamically spawned during simulation.
- **Attributes**: name, ticker, sector, basePrice, volatility, trend, outstandingShares,
  revenue, profitMargin, debtToEquity, employees, established, ipoYear, healthScore
- **Lifecycle**:
  - *Born* (established year) — company exists but isn't public yet
  - *IPO* (ipoYear) — goes public, stock becomes tradable
  - *Active* — trading normally, subject to events
  - *Delisted/Bankrupt* — healthScore drops below threshold for 6+ months → $0.01, removed from active lists
  - *Replaced* — new IPOs spawn to maintain min company count (configurable, max 500)

### Indexes
Groups of companies, either sector-based or thematic.
- Dynamic indexes auto-include all companies matching a sector filter
- Static indexes track a curated list
- Benchmark indexes (Americas 500, Euro Stoxx 50, etc.) represent regional markets

### Commodities
Non-company tradable assets: metals (gold, silver, platinum, copper, palladium),
gems (diamond, ruby, sapphire), and energy (crude oil grades — WTI, Brent, etc.).
- Commodity prices are driven by a **materials economy** variable — supply/demand balance
- World events (wars, sanctions, discoveries) shift materials supply/demand

---

## 2. Simulation Engine (`simulationEngine.js`)

Walks from 1970 to the current date, month by month.

### Per month:
1. **Activate IPOs** — companies whose ipoYear matches the current year
2. **IPO replacement** — if active count < min, spawn new companies (up to max 500)
3. **World event check** — annual chance of crash, sector rotation every ~5 years
4. **Company event injection** — per-day noise: earnings surprises, scandals, breakthroughs
5. **Price simulation** — geometric Brownian motion with configurable trend/volatility
6. **Health tracking** — monthly price changes affect healthScore
7. **Bankruptcy check** — 6 consecutive months below threshold → delist
8. **Materials economy** — background supply/demand affects commodity prices

### Configurable parameters (set at New Game):
| Parameter | Range | Effect |
|-----------|-------|--------|
| minCompanies | 20–200 | Minimum active companies (IPOs replace bankrupt ones) |
| maxCompanies | 50–500 | Absolute cap on total companies |
| marketBias | bearish/neutral/bullish | Shifts trend ranges ±0.04 |
| crashFrequency | rare/occasional/common | Annual crash probability (1%/3%/8%) |
| failureRate | low/medium/high | Bankruptcy threshold + negative trend spread |

---

## 3. Event System (`eventEngine.js`)

### Company Events
Events that affect individual companies. Scheduled during calendar build + injected as noise.

| Event | Impact | Duration | Category |
|-------|--------|----------|----------|
| Earnings Beat | +5–15% | 3 days | earnings |
| Earnings Miss | -5–12% | 3 days | earnings |
| Product Launch | +5–20% | 5 days | corporate |
| Product Failure | -10–30% | 7 days | corporate |
| Scandal | -10–40% | 5–10 days | corporate |
| Mass Layoffs | -3–8% | 3 days | corporate |
| Acquisition Rumor | +5–15% | 4 days | corporate |
| Merger Announced | +8–20% | 7 days | corporate |
| Merger Blocked | -10–25% | 5 days | regulatory |
| Regulatory Action | -5–15% | 5 days | regulatory |
| Antitrust Breakup | -15–40% per entity | 10 days | regulatory |
| Research Breakthrough | +10–30% | 5–10 days | corporate |
| Supply Chain Disruption | -5–15% | 4 days | external |
| Analyst Upgrade/Downgrade | ±3–8% | 2 days | analyst |
| Stock Buyback | +3–8% | 5 days | corporate |
| Going Private | +10–25% | n/a | corporate |
| Bankruptcy Filing | -50–90% | immediate | corporate |

### World Events (`worldEvents.js`)
Macro-level events affecting sectors or the entire market.

| Category | Examples |
|----------|----------|
| Geopolitical | Wars, trade wars, sanctions, peace deals, elections |
| Technological | AI breakthroughs, cyber attacks, tech bubbles, internet boom |
| Health | Pandemics, vaccine breakthroughs, healthcare crises |
| Environmental | Climate disasters, green energy booms, carbon regulation |
| Economic | Recessions, booms, interest rate shocks, inflation spikes |
| Resource | Oil discoveries, rare earth shortages, commodity super-cycles |

### Materials Economy
Background variable tracking global resource supply/demand.
- **Supply factors**: new mine discoveries, OPEC decisions, recycling rates
- **Demand factors**: industrial growth, tech adoption, electrification
- Effects: commodity prices shift 1–5% per month based on supply/demand delta
- World events can spike or crash materials (e.g., war → oil supply drops)

---

## 4. AI Architecture — The Four Minds

There are four AI entities driving the simulation. Each operates on different
timescales and with different goals, but they interact constantly.

---

### 4.1 Company AI (`companyMind.js` — future)

**Every company is an autonomous agent.** Its core directive: *the line must go up.*
But companies can't always make the right call — they have personality, bias,
and incomplete information.

#### Goals (priority-ordered)
1. **Survive** — maintain positive cash flow, avoid bankruptcy
2. **Grow revenue** — expand market share, launch products, enter new markets
3. **Keep shareholders happy** — stock price appreciation, dividends, buybacks
4. **Outcompete rivals** — gain sector dominance, acquire competitors

#### Decision Factors
| Factor | Effect |
|--------|--------|
| Cash reserves | Can they afford this? |
| Debt load | How leveraged are they? |
| Profit margin | Healthy or bleeding? |
| Market conditions | Boom? Crash? Sector rotation? |
| Commodity dependence | Are their input materials cheap or scarce? |
| Regulatory environment | Are they under scrutiny? |
| Competitor actions | Is a rival eating their lunch? |

#### Personality Traits (generated per company)
| Trait | Low | High |
|-------|-----|------|
| riskTolerance | Conservative, hoards cash | Aggressive, leverages up |
| innovationBias | Sticks to core business | Bets on R&D moonshots |
| ethicalStandard | Cuts corners, bribes | Squeaky clean, ESG darling |
| acquisitionHunger | Organic growth only | Serial acquirer |
| transparency | Opaque, hides bad news | Over-communicates |
| laborRelations | Union-busting | Employee-owned |

#### Actions Companies Can Take
| Action | Trigger | Outcome |
|--------|---------|---------|
| Launch product | R&D complete + cash available | Revenue bump or expensive flop |
| Cut costs / layoffs | Margins shrinking | Short-term profit, long-term morale hit |
| Acquire rival | cash > target market cap + ambition | Synergies or integration disaster |
| Merge with peer | Mutual benefit + regulatory greenlight | Combined entity or blocked by antitrust |
| Stock buyback | Excess cash + undervalued stock | Price pop, reduced float |
| Issue dividend | Consistent profits | Shareholder reward, signals strength |
| Take on debt | Growth opportunity | Expansion fuel or debt spiral |
| Go private | Undervalued + PE interest | Delisted, shareholders get premium |
| Restructure | Near bankruptcy | Last-ditch survival or Chapter 11 |
| Lobby government | Regulatory threat | Favourable policy or scandal exposure |
| Pivot business model | Market disruption | Bold reinvention or fatal misstep |

#### Failure Modes
- **Debt spiral**: took on too much debt → can't service → bankruptcy
- **Product flop**: bet big on innovation → market rejected it → write-down
- **Scandal**: cut ethical corners → exposed → reputational collapse
- **Disruption**: ignored market shift → Kodak moment → irrelevance
- **Hostile takeover**: weakened → acquired and broken up
- **Supply shock**: commodity-dependent → input prices spike → margin collapse

#### How It Works (technical)
Each company evaluates its state once per quarter (every ~63 trading days).
A weighted decision matrix scores each possible action against its personality
traits and current conditions. The highest-scoring action is taken, with
probabilistic outcomes based on the company's competence, market conditions,
and an element of luck.

---

### 4.2 World AI (`worldMind.js` — future)

**Simulates the behavior of nations, global systems, and macro forces.**
This is the backdrop against which companies and markets operate.

#### Responsibilities
- Generate geopolitical events (wars, treaties, sanctions, elections)
- Simulate economic cycles (expansion, peak, contraction, trough)
- Control commodity supply (OPEC decisions, mine discoveries, harvest yields)
- Generate health events (pandemics, medical breakthroughs)
- Generate technological paradigm shifts (internet, AI, green energy)
- Set regulatory tone (laissez-faire vs heavy regulation)

#### Economic Cycle Model
```
Expansion → Peak → Contraction → Trough → Expansion ...
  (5-8yr)   (1yr)   (1-3yr)     (1-2yr)
```
- **Expansion**: GDP growth ↑, unemployment ↓, consumer confidence ↑
- **Peak**: overheating, inflation risk, rate hikes
- **Contraction**: GDP growth ↓, layoffs, credit tightening
- **Trough**: bottoming, stimulus, green shoots

The cycle affects:
- Interest rates (Fed/base rate changes)
- Sector preferences (cyclicals vs defensives)
- Credit availability (easy money vs tight credit)
- Consumer spending patterns

#### Commodity Supply Control
The World AI manages the materials economy:
| Mechanism | Example |
|-----------|---------|
| New discovery | Major lithium deposit found → supply +15% |
| Geopolitical disruption | War in oil region → supply -20% |
| Technological shift | EVs go mainstream → lithium demand +30% |
| OPEC decision | Production cut → crude supply -10% |
| Climate event | Hurricane hits refineries → supply -15% |
| Sanctions | Export ban on rare earths → supply -25% |

#### Event Frequency (per decade)
| Event Type | Count |
|------------|-------|
| Minor geopolitical | 5–8 |
| Major geopolitical (war, sanctions) | 1–2 |
| Economic recession | 1–2 |
| Technology boom/bubble | 1–2 |
| Health crisis/pandemic | 0–1 |
| Resource discovery | 3–5 |
| Major regulation change | 1–3 |

---

### 4.3 Market AI (`marketMind.js` — future)

**Represents the collective behavior of all non-player market participants.**
This is not one entity — it's a simulation of millions of investors, institutions,
algorithms, and speculators acting as a crowd.

#### Who Makes Up "The Market"

| Group | % of Volume | Behavior |
|-------|-------------|----------|
| Institutional investors | 45% | Long-only, rebalance quarterly, trend-aware |
| Index funds / ETFs | 20% | Passive flows, buy regardless of price |
| Hedge funds | 15% | Active, long/short, event-driven, leveraged |
| Market makers / HFT | 10% | Provide liquidity, scalp spreads, no directional view |
| Retail investors | 8% | Emotional, trend-chasing, panic-selling |
| Corporate buybacks | 2% | Price-insensitive, schedule-driven |

#### Market Sentiment States
The Market AI has a sentiment engine that shifts between states:

```
              ↗ Greedy → Euphoric (bubble top)
Calm / Normal
              ↘ Fearful → Panicked (crash)
```

| State | Characteristics |
|-------|----------------|
| **Calm** | Normal volatility, random walk dominates, efficient pricing |
| **Greedy** | Momentum chasing, rising volume, stocks decouple from fundamentals |
| **Euphoric** | Bubble territory, everything goes up, "this time is different" |
| **Fearful** | Risk-off, flight to quality, volatility spikes, correlations → 1 |
| **Panicked** | Capitulation, forced selling, liquidity dries up, circuit breakers |

#### Transition Triggers
| From → To | Trigger |
|-----------|---------|
| Calm → Greedy | Sustained rally (5%+ in 2 weeks), positive news streak |
| Greedy → Euphoric | 20%+ rally in 3 months, media hype, IPO frenzy |
| Euphoric → Panicked | Catalyst event, margin calls, "emperor has no clothes" |
| Calm → Fearful | Negative shock, rate hike surprise, geopolitical event |
| Fearful → Panicked | Crash event, consecutive down days, VIX spike |
| Any → Calm | Time decay (sentiment fades without reinforcement) |

#### Collective Behaviors
| Behavior | When | Effect |
|----------|------|--------|
| Trend following | Clear directional move | Amplifies the trend |
| Mean reversion | Overextended move | Pulls prices back |
| Herding | Uncertainty | Everyone copies everyone else |
| Flight to safety | Fearful/Panicked | Sell stocks → buy bonds/gold |
| Sector rotation | Economic cycle shift | Money flows between sectors |
| Short squeeze | Heavily shorted stock | Forced buying, explosive rally |
| Passive rebalance | Month/quarter end | Mechanical buying/selling |
| Panic selling | Crash event | Indiscriminate dumping |

#### How It Works (technical)
The Market AI runs once per tick during gameplay (and per day during simulation).
It:
1. Reads current sentiment state
2. Evaluates transition triggers based on recent price action and events
3. Computes aggregate buy/sell pressure per stock
4. Applies pressure as a drift modifier to the GBM price model
5. Volume is derived from sentiment (high in fear/greed, low in calm)

---

### 4.4 Indexes

**Indexes are not an AI — they are derived instruments.** Their value is computed
as the (cap-weighted or equal-weighted) average of their constituent companies.
They serve as:
- Benchmarks for sector/regional performance
- Low-cost diversified investment vehicles for the player
- Indicators of broader market health

However, indexes have a subtle impact: the 20% of volume from passive index
funds means that inclusion in a major index creates automatic buying pressure.
The Market AI simulates this passive flow.

Index types:
- **Sector indexes** (Tech Titans, Financial Leaders, etc.) — dynamic, auto-include
  all companies matching a sector filter
- **Thematic indexes** (Growth 50, Dividend Aristocrats) — curated lists
- **Regional benchmarks** (Americas 500, Euro Stoxx 50, Nifty 50) — represent
  the broad market of a region

---

### 4.5 AI Interaction Diagram

```
                    ┌──────────────┐
                    │  WORLD AI    │
                    │  wars, econ  │
                    │  supply, reg │
                    └──────┬───────┘
                           │ affects
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │COMPANY A │ │COMPANY B │ │COMPANY C │  ... × N
       │ decisions│ │ decisions│ │ decisions│
       │ actions  │ │ actions  │ │ actions  │
       └────┬─────┘ └────┬─────┘ └────┬─────┘
            │            │            │
            └────────────┼────────────┘
                         │ stock prices, events, news
                         ▼
                  ┌──────────────┐
                  │  MARKET AI   │
                  │  sentiment   │
                  │  collective  │
                  │  behavior    │
                  └──────┬───────┘
                         │ price impact, volume, volatility
                         ▼
                  ┌──────────────┐
                  │   PLAYER     │
                  │  trades,     │
                  │  reacts      │
                  └──────────────┘
```

The feedback loop: World events → affect companies → companies react (good/bad
decisions) → stock prices move → Market AI interprets and amplifies/dampens →
player sees the result and trades → player actions feed back into market dynamics.

---

## 5. Activity & Event Log

### Universal Event Log
Every simulation event is logged with:
- Timestamp (game day)
- Event type, category
- Affected company/commodity/index
- Description text
- Price impact
- Severity level

### Activity Feed (UI)
- Scrollable feed in the Dashboard
- Shows: company events, world events, price movements, player trades
- Badge count of unread items
- Click to expand details
- During simulation (loading screen): highlights scroll by in real-time
- Historical feed: scroll back through pre-game history

---

## 6. Player Actions (future)

The player can:
- Trade stocks, indexes, commodities
- Short sell
- Trade options (calls/puts)
- Take loans
- Use market influence (with heat/consequence system)
- See their actions reflected in the activity feed

---

## 7. File Map

```
src/
  utils/
    simulationEngine.js   — 1970→today forward simulation with events
    marketEngine.js        — Per-tick price movement, initialization
    eventEngine.js         — Company event definitions, calendar, hints
    worldEvents.js         — World event definitions, sector effects
    materialsEngine.js     — Resource supply/demand tracking
    companyMind.js         — Company AI: decisions, personality, actions (FUTURE)
    worldMind.js           — World AI: geopolitics, cycles, supply (FUTURE)
    marketMind.js          — Market AI: sentiment, collective behavior (FUTURE)
    companyGenerator.js    — Procedural company creation
    seededRng.js           — Deterministic random numbers
  stores/
    marketStore.js         — Market state, tick loop, event processing
    gameStore.js           — Game state, day/tick, speed
    portfolioStore.js      — Player holdings, orders
    currencyStore.js       — Region/currency
  views/
    Dashboard.vue          — Main game UI, activity feed
    NewGameConfig.vue      — Pre-game configuration
  components/
    StockChart.vue         — Price chart (Chart.js)
    TradePanel.vue         — Trading interface
  data/
    companies.js           — REGIONS only (no hardcoded companies)
  DESIGN.md                — This file
```

---

## 8. Design Principles

1. **Everything is logged.** No event happens without leaving a trace in the activity feed.
2. **Seed reproducibility.** Same seed + same config = same world, every time.
3. **Procedural generation.** No hardcoded companies. The world is built from fragments.
4. **Configurable chaos.** Players control how volatile, failure-prone, and crash-heavy their world is.
5. **The market has a mind.** It's not just random — it has states, moods, and reacts to information.
6. **Companies are agents.** Each company has goals, personality, and makes decisions — sometimes bad ones.
7. **The world is alive.** Geopolitics, economic cycles, and resource supply create the backdrop.
8. **Deep simulation.** Companies don't just exist — they live, fail, merge, break up, innovate, and die.
