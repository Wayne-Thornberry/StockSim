<template>
  <div class="help-panel">
    <h2>📖 StockSim Help</h2>

    <div class="help-section">
      <h3>🎮 Getting Started</h3>
      <p>Click <b>New Game</b> to open the configuration screen. Choose:</p>
      <ul>
        <li><b>Difficulty</b> — Easy ($100K), Medium ($1K), Hard ($500 + $5K loan), Creative (unlimited)</li>
        <li><b>Region</b> — Americas, Europe, Asia-Pacific, or India — determines which companies and currencies appear</li>
        <li><b>Min/Max Companies</b> — Controls how many companies exist (50–500 cap). Bankrupt companies are replaced by new IPOs</li>
        <li><b>Market Bias</b> — Bullish, neutral, or bearish market tone</li>
        <li><b>Crash Frequency</b> — How often market crashes, booms, and dips occur</li>
        <li><b>Failure Rate</b> — How often companies go bankrupt</li>
        <li><b>Seed</b> — Same seed = same world every time. Leave blank for random</li>
      </ul>
      <p>The game simulates from <b>1970 to today</b> to build realistic company histories before you start playing.</p>
    </div>

    <div class="help-section">
      <h3>⏰ Time & Market Sessions</h3>
      <p>The trading day runs from <b>4:00 AM to 8:00 PM</b> in three phases:</p>
      <ul>
        <li>🌅 <b>Pre-Market</b> (4:00–9:00) — Low liquidity, 70% reduced volatility</li>
        <li>🟢 <b>Regular</b> (9:00–4:00) — Full trading, normal volatility</li>
        <li>🌙 <b>After-Hours</b> (4:00–8:00) — 50% reduced volatility</li>
      </ul>
      <p>Use speed controls (1×–10×) and skip buttons (⏭ Day/Week/Month) to fast-forward.</p>
    </div>

    <div class="help-section">
      <h3>📈 Stock Trading</h3>
      <ul>
        <li><b>Buy</b> — Purchase shares at the ask price (spread + commission)</li>
        <li><b>Sell</b> — Sell shares you own</li>
        <li><b>Short</b> — Borrow and sell shares, profit when price falls</li>
        <li><b>Cover</b> — Buy back shares to close a short position</li>
      </ul>
      <p><b>💰 Cash vs 📈 Margin (2×)</b> — Toggle margin to trade with 2:1 leverage. You put up 50%, borrow 50%. Interest accrues daily at 1.5× the Fed rate. Margin debt appears in the bottom bar.</p>
      <p><b>Market Impact</b> — Large orders move the price. A square-root model means small trades are negligible but large ones shift the market. Effective price is shown in the trade summary.</p>
    </div>

    <div class="help-section">
      <h3>📦 Indexes & ETFs</h3>
      <p>Indexes are collections of companies you buy as <b>ETFs</b> (exchange-traded funds):</p>
      <ul>
        <li><b>Benchmark indexes</b> (Americas 500, Euro Stoxx 50) are <b>cap-weighted</b> — bigger companies have more influence on the price</li>
        <li><b>Sector indexes</b> (Tech Titans, Financial Leaders) auto-include all companies in their sector</li>
        <li><b>Expense ratios</b> (0.05–0.20%) are charged daily — small short-term, meaningful over decades</li>
        <li><b>Rebalancing</b> occurs every ~63 days (quarterly)</li>
        <li>Toggle between 💰 <b>ETF</b> (buy shares directly) and 📜 <b>Futures</b> (leveraged contracts)</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>🏷 Commodities</h3>
      <p>Commodities trade differently from stocks — they're physical assets, not companies:</p>
      <ul>
        <li><b>💰 Spot</b> — Buy/sell units directly (oz, barrels, carats) at market price. No leverage, no expiration.</li>
        <li><b>📜 Futures</b> — Leveraged contracts with standardized sizes and monthly expiration (30 days):</li>
      </ul>
      <table class="help-table">
        <tr><th>Commodity</th><th>Contract</th><th>Margin</th><th>~Notional</th></tr>
        <tr><td>Gold</td><td>100 oz</td><td>12%</td><td>$235,000</td></tr>
        <tr><td>Silver</td><td>5,000 oz</td><td>15%</td><td>$160,000</td></tr>
        <tr><td>WTI Crude</td><td>1,000 bbl</td><td>10%</td><td>$78,000</td></tr>
        <tr><td>Natural Gas</td><td>10,000 MMBtu</td><td>12%</td><td>$35,000</td></tr>
        <tr><td>Copper</td><td>25,000 lb</td><td>12%</td><td>$120,000</td></tr>
      </table>
      <p>Commodity prices are driven by a <b>materials economy</b> — supply/demand for each resource shifts monthly. Wars, sanctions, and discoveries affect supply. Futures expire and auto-settle. Margin calls liquidate if equity drops too low.</p>
    </div>

    <div class="help-section">
      <h3>📜 Index Futures</h3>
      <p>Like commodity futures but for indexes. <b>$50 × index value</b> per contract with <b>5% margin (20× leverage)</b>:</p>
      <ul>
        <li>Americas 500 at $800 → 1 contract = $40,000 notional, $2,000 margin</li>
        <li>30-day expiration. Cash-settled at expiry</li>
        <li>Available for all indexes — toggle between ETF and Futures in the trade panel</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>🎯 Options Trading</h3>
      <p>Options use the <b>Black-Scholes model</b> for fair pricing based on volatility, time, and interest rates:</p>
      <ul>
        <li><b>📈 CALL</b> — Right to buy at the strike. Profits when stock rises above strike + premium</li>
        <li><b>📉 PUT</b> — Right to sell at the strike. Profits when stock falls below strike − premium</li>
      </ul>
      <p><b>Three strike prices</b> available:</p>
      <ul>
        <li><b>ITM</b> (In-the-Money) — Already profitable at current price. Higher premium, safer.</li>
        <li><b>ATM</b> (At-the-Money) — Strike = current price. Balanced risk/reward.</li>
        <li><b>OTM</b> (Out-of-the-Money) — Needs the stock to move. Cheaper premium, higher risk.</li>
      </ul>
      <p>Each contract = 100 shares. Max loss = premium paid. <b>Time decay</b> reduces value as expiration approaches.</p>
    </div>

    <div class="help-section">
      <h3>🤖 Market AI — Sentiment</h3>
      <p>The market itself has moods that affect all stocks:</p>
      <ul>
        <li>⚪ <b>Calm</b> — Normal trading, efficient pricing</li>
        <li>🟢 <b>Greedy</b> — Momentum chasing, rising volume</li>
        <li>🔥 <b>Euphoric</b> — Bubble territory, everything goes up</li>
        <li>🟡 <b>Fearful</b> — Risk-off, volatility spikes, flight to safety</li>
        <li>🔴 <b>Panicked</b> — Capitulation, forced selling</li>
      </ul>
      <p>Sentiment shifts based on recent price momentum, events, and time decay. It affects every stock's price drift and volatility. Sentiment changes are logged in the activity feed.</p>
    </div>

    <div class="help-section">
      <h3>🌍 World AI — Economic Cycles</h3>
      <p>The world simulates macro forces that shape the investing backdrop:</p>
      <ul>
        <li>📈 <b>Expansion</b> (5–8 years) — GDP growth, low unemployment, cyclicals thrive</li>
        <li>⚠️ <b>Peak</b> (~1 year) — Overheating, inflation risk, rate hikes</li>
        <li>📉 <b>Contraction</b> (1–3 years) — Recession, credit tightening, defensives hold up</li>
        <li>🔻 <b>Trough</b> (~1 year) — Bottoming, stimulus, green shoots</li>
      </ul>
      <p>Economic cycles affect interest rates, sector performance (cyclicals vs defensives), and trigger geopolitical events (wars, sanctions, trade disputes) every 2–5 years.</p>
    </div>

    <div class="help-section">
      <h3>🏢 Company AI — Decisions</h3>
      <p>Every company is an autonomous agent with its own personality and goals:</p>
      <ul>
        <li><b>Traits</b> — Risk tolerance, innovation bias, ethics, acquisition hunger, transparency, labor relations</li>
        <li><b>Quarterly decisions</b> — Launch products, cut costs, acquire rivals, R&D push, stock buybacks, dividends, market expansion, restructuring</li>
        <li><b>Success/failure</b> depends on the company's competence vs the riskiness of the action</li>
        <li><b>Failure modes</b> — Debt spirals, product flops, scandals, disruption, hostile takeovers</li>
      </ul>
      <p>Company actions and results are logged in the activity feed. You can see which companies are making smart moves — and which are heading for bankruptcy.</p>
    </div>

    <div class="help-section">
      <h3>📰 Events & News</h3>
      <ul>
        <li><b>Earnings</b> — Quarterly. Beat raises the stock, miss lowers it</li>
        <li><b>Corporate</b> — Product launches, scandals, mergers, layoffs, buybacks, breakthroughs</li>
        <li><b>Regulatory</b> — Antitrust actions, merger blocks, regulatory shifts</li>
        <li><b>Market-wide</b> — Booms (+10–25%), dips (−5–15%), crashes (−15–40%)</li>
        <li><b>Sector rotations</b> — Every ~5 years, one sector surges while another falls out of favor</li>
        <li><b>Dividends</b> — Paid on earnings events. Long holders receive, short sellers pay</li>
      </ul>
      <p>News hints appear 10, 5, and 1 day before events. Click 📋 <b>Activity</b> to open the full scrollable event log.</p>
    </div>

    <div class="help-section">
      <h3>💼 Holdings & Portfolio</h3>
      <ul>
        <li><b>Holdings</b> — Long positions, shorts (⚡), index ETFs, options, pending orders</li>
        <li><b>Futures positions</b> — Shown in bottom bar. Managed automatically (expiry, margin calls)</li>
        <li><b>Activity Feed</b> — Full event log. Click header to open scrollable history of all events</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>💰 Costs & Fees</h3>
      <ul>
        <li><b>Bid/Ask Spread</b> — 0.05–0.5% based on volatility. Buy at ask, sell at bid</li>
        <li><b>Commission</b> — 0.1%, $1 minimum</li>
        <li><b>ETF Expense Ratios</b> — 0.05–0.20% annually, charged daily</li>
        <li><b>Margin Interest</b> — 1.5× Fed rate on borrowed stock margin</li>
        <li><b>Loan Interest</b> — 0.4× Fed rate on bank loans</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>💾 Save & Load</h3>
      <p>10 save slots in Settings (⚙️). Export/import all saves as JSON. The welcome screen's <b>Continue</b> button loads the most recent save.</p>
    </div>

    <div class="help-section">
      <h3>💡 Tips</h3>
      <ul>
        <li>Use <b>stop-loss orders</b> to protect against sudden drops</li>
        <li>Watch <b>news hints</b> — they telegraph upcoming events 1–10 days ahead</li>
        <li><b>Diversify</b> across sectors and asset types (stocks, ETFs, commodities)</li>
        <li>Check <b>fundamentals</b> — high debt companies suffer when interest rates rise</li>
        <li><b>Commodity futures</b> and <b>index futures</b> offer high leverage but can wipe you out</li>
        <li>The <b>Market AI's sentiment</b> affects every stock — pay attention to mood shifts in the activity feed</li>
        <li><b>Economic cycles</b> favor different sectors — cyclicals in expansion, defensives in contraction</li>
        <li>Click 📋 <b>Activity</b> to see the full event history including pre-game simulation events</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.help-panel { padding: 16px; max-height: 75vh; overflow-y: auto; }
.help-panel h2 { font-size: 15px; margin-bottom: 12px; }
.help-section {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 4px; padding: 10px 12px; margin-bottom: 8px;
}
.help-section h3 { font-size: 12px; margin: 0 0 6px 0; color: var(--accent); }
.help-section p { font-size: 11px; color: var(--text-secondary); line-height: 1.6; margin: 0 0 4px 0; }
.help-section ul { margin: 4px 0 0 0; padding-left: 16px; }
.help-section li { font-size: 11px; color: var(--text-secondary); line-height: 1.6; padding: 1px 0; }
.help-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
.help-table th { text-align: left; color: var(--text-muted); padding: 2px 6px; border-bottom: 1px solid var(--border); }
.help-table td { padding: 2px 6px; color: var(--text-secondary); }
</style>
