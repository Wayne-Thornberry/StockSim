# 📈 StockSim

**A deep stock market simulation game** — trade stocks, commodities, index ETFs, options, and futures across a realistic simulated economy spanning 1970 to today.

Built with Vue 3, Pinia, Chart.js, and TypeScript.

---

## 🎮 Features

- **56-Year Forward Simulation** — Every company's price history is generated tick-by-tick from their IPO year using geometric Brownian motion, not random backfill
- **500+ Companies** across 6 sectors: Technology, Finance, Healthcare, Energy, Consumer, Industrial
- **Commodity Trading** — Gold, silver, oil, natural gas, copper, and more with materials-economy-driven pricing
- **Index ETFs** — Americas 500, TECHX, FINX, GRNX, HLTH, CONX, INDX, GROX, VALX with cap-weighting and expense ratios
- **Options Trading** — Black-Scholes pricing with ITM/ATM/OTM strikes
- **Futures Contracts** — Commodity futures (12 specs) + index futures (5% margin)
- **Margin Trading** — Borrow to amplify positions with interest accrual
- **Short Selling** — Bet against overvalued companies
- **AI Market Systems**
  - *Market Mind* — Sentiment cycles (calm → greedy → euphoric → panicked → fearful)
  - *World Mind* — 4-phase economic cycles + geopolitical events
  - *Company Mind* — 6 personality traits per company driving quarterly decisions
- **Influence System** — Insider trading detection and market manipulation mechanics
- **Bank & Loans** — Deposit cash, take loans, manage interest rates
- **4 Presets** — Classic, Volatile, Boom, and Doom starting scenarios
- **Save/Load** — Full game state persistence

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build    # outputs to dist/
npm run preview  # preview production build locally
```

---

## 🏗️ Architecture

```
src/
├── components/        # Vue components (TradePanel, StockChart)
├── views/             # Route views (Dashboard, Bank, AdminPanel, etc.)
├── stores/            # Pinia stores (market, portfolio, game, currency, influence)
├── utils/             # Engine logic
│   ├── simulationEngine.ts   # Forward simulation 1970→today
│   ├── marketEngine.ts       # GBM tick price, daily snapshots
│   ├── blackScholes.ts       # Options pricing
│   ├── futuresEngine.ts      # Futures specs & margin
│   ├── materialsEngine.ts    # 14-material supply/demand
│   ├── marketMind.ts         # Sentiment AI
│   ├── worldMind.ts          # Economic cycle AI
│   ├── companyMind.ts        # Per-company decision AI
│   └── eventEngine.ts        # Scheduled company events
├── data/              # Static data (names, sectors, events, indexes, etc.)
├── router/            # Vue Router config
├── types.ts           # TypeScript interfaces
├── App.vue
├── main.ts
└── styles.css
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 (Composition API) |
| State | Pinia |
| Charts | Chart.js + vue-chartjs |
| Routing | Vue Router 4 |
| Build | Vite 6 |
| Language | TypeScript |

---

## 📄 License

[MIT](LICENSE)

---

## 🔗 Play Online

**[Play StockSim on GitHub Pages](https://wayno717.github.io/StockSim/)**
