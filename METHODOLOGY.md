# Research methodology

Market research verified from `notebooks/01_market_exploration.ipynb`; the separate Momentum Strategy sections come from `notebooks/02_momentum_strategy.ipynb`.

## Yahoo Finance and adjusted prices

Yahoo Finance via yfinance 1.7.0. Asset field: Close with auto_adjust=True, repair=False, interval=1d and rounding=False. The installed yfinance implementation renames Yahoo Adj Close to Close; these are split/distribution-adjusted prices, not unadjusted share prices. ^IRX uses Close with auto_adjust=False. Inputs were downloaded 2026-09-11T10:23:34.223001+00:00 and are frozen locally with SHA-256 checksums; acquisition details are recorded in data/provenance/market-inputs.json.

## Requested and actual observations

Requested from 1980-01-01 inclusive to 2026-09-11 exclusive. Actual full coverage: 1980-01-02 to 2026-09-10; the last observation is 2026-09-10 for every asset and ^IRX. The 1980 start follows the recovered code and its pre-1990 investigation. Every asset retains its own first observation, shown in the history table.

## Universe

50 selected companies plus five benchmark ETFs: SPY, QQQ, IWM, TLT, GLD. Companies: AAPL, MSFT, NVDA, AVGO, ORCL, CRM, CSCO, IBM, AMD, QCOM, TXN, INTU, NOW, GOOGL, META, NFLX, DIS, AMZN, TSLA, WMT, COST, HD, MCD, NKE, BKNG, JPM, BAC, GS, MS, AXP, V, MA, BRK-B, LLY, JNJ, ABBV, UNH, TMO, ABT, AMGN, XOM, CVX, GE, CAT, RTX, PG, KO, PEP, PM, LIN. Ticker symbols are the identifiers supplied by the research; fund/company names are not inferred.

## Daily returns and CAGR

Simple daily return r[t] = P[t] / P[t-1] - 1, using pct_change(fill_method=None). Missing prices are not filled. Full-history total return = last adjusted price / first adjusted price - 1. CAGR = (last / first) ** (1 / years) - 1, with years = elapsed calendar days / 365.25. CAGR differs from arithmetic annualised return.

## Annualisation and Sharpe

Volatility = sample standard deviation of daily asset returns (ddof=1) × sqrt(252). Sharpe = mean(aligned asset return minus daily risk-free proxy) / sample standard deviation of those same aligned asset returns × sqrt(252). The denominator is asset-return volatility, not excess-return volatility. Each full-history Sharpe uses its own valid asset/risk-free overlap.

## Treasury bill proxy and alignment

Preserved approximation: daily_rf = (1 + ^IRX Close / 100) ** (1 / 252) - 1. The percentage yield is treated as an effective annual rate; this is not an exact conversion of a Treasury bill bank-discount quote into holding-period returns. Align to price dates, forward fill only, then use shared nonmissing return/rate dates. The snapshot forward fills 64 dates and leaves 0 dates unavailable. It uses same-date yields without a lag; this is descriptive historical analysis, not an implementable risk-free trading strategy.

## Beta and correlations

Beta = sample covariance(asset daily return, SPY daily return) / sample variance(SPY), using identical pairwise valid observations. The original beta table excludes SPY itself; its asset-level beta is null. The full-history Pearson correlation matrix uses pairwise available daily returns, so estimation periods differ by pair; the SPY relationships table gives exact overlap dates/counts. The separate common-company matrix uses the shared company return sample. Correlations are not assumed stable across regimes.

## Full histories and common observations

Full-history metrics use each asset's available history. The fair company-only comparison uses all 50 companies from 2013-01-02 to 2026-09-10: 3443 shared prices and 3442 identical daily returns per company. The exploratory 2012 eligibility count is not the final sample. Levels are restricted to dates valid for every company; daily returns are computed on the original date grid before removing incomplete rows, so gaps cannot become multi-day returns labelled daily. This snapshot omits 0 internal price rows and 0 daily return rows. Common Sharpe uses the same aligned risk-free dates for every company.

## Indexed performance and chart sampling

Full-history index = 100 × adjusted price / that asset’s first valid adjusted price; these individual starts differ. Common-period index = 100 × adjusted price / adjusted price at the shared start. Portfolio and SPY paths start at 100 on the same initial date. Long-history website charts select existing quarter-end observations plus initial/final observations and any gap boundaries in Python; no financial values are averaged or recomputed. Stress charts retain every daily observation. Full daily indexed outputs remain in the local reviewed tables; all metrics use daily data.

## Maximum drawdown

Drawdown = wealth / running maximum wealth - 1; maximum drawdown is its minimum, reported as a negative fraction. Full-history asset drawdown uses the adjusted price path from its first valid price. Portfolio and every stress evaluation explicitly prepend wealth 1.0 before the first included return, so an immediate decline is counted. The baseline date is the preceding observed price date, which can precede the requested stress window; it contributes no extra return.

## Portfolio construction and comparison

Weights: SPY 35%, QQQ 15%, IWM 10%, TLT 15%, GLD 10%, JPM 5%, JNJ 5%, XOM 5%. Weights sum to 100%. Daily portfolio return is the weighted sum of constituent simple daily returns on complete shared observations. Constant weights imply daily rebalancing, without costs, taxes, slippage or cash flows. Arithmetic annualised portfolio/SPY return = daily mean × 252, not CAGR. The portfolio and SPY share 5485 returns from 2004-11-19 to 2026-09-10, with wealth initially 1 on 2004-11-18.

## Component risk contributions

Annual covariance matrix = sample daily covariance × 252. Portfolio volatility = sqrt(wᵀΣw). Marginal volatility contribution = Σw / portfolio volatility; component contribution = weight × marginal contribution. Components sum to portfolio volatility; each component divided by total volatility gives its risk share, summing to 100%. Negative shares are allowed and reflect this sample.

## Historical stress windows

Global Financial Crisis: 2007-10-01 through 2009-03-31; COVID Crash: 2020-02-01 through 2020-04-30; 2022 Selloff: 2022-01-01 through 2022-12-31. Returns whose dates fall inside each inclusive window are compounded from initial wealth 1. Portfolio, SPY and constituent outcomes use identical dates; tables report compounded period return and minimum drawdown, not annualised returns. Actual first/last return dates and counts accompany each scenario.

## Limitations and uncertainty

The selected surviving companies introduce survivorship and selection bias; delisted/failed companies are not represented. Listing dates and available histories differ. Yahoo adjustments, corporate actions, ticker histories and later data revisions can affect results; downloads were checked for structure and internal identities, not independently reconciled against exchange records. Unusually large historical moves are retained without automatic repair. Correlations and beta can change across regimes. The risk-free transformation and constant-weight frictionless portfolio are simplifying assumptions. Historical performance does not predict future results.

## Momentum Strategy — definition

Fixed 50-company universe from notebook 01; monthly trailing 12-month adjusted-price total return including the latest month; top 10 eligible companies, 10% target weight each, no skipped month or parameter tuning. Exact ties use alphabetical ticker order. Fixed adjusted units are held through the following month, so weights drift between monthly rebalances.

## Momentum Strategy — eligibility and timing

Use exact final observed prices of completed months, not last nonmissing quotes. Require 13 valid month-end prices and complete positive daily prices across the trailing year. Eligibility and rank use only information dated at or before formation. Assume frictionless allocation at the formation close and earn returns strictly afterward. Same-close signal and execution is a monthly idealization, not an executable fill guarantee. SPY must be observed at the initial formation close.

## Momentum Strategy — missing observations

No asset-price forward fill or hindsight replacement. At the first invalid held quote, mark that position to zero and keep it there for the remainder of the month. This is a severe fallback, not a measured delisting return. Missing SPY prices, complete portfolio loss, or fewer than ten eligible stocks after inception stop the run. The final incomplete month contributes observed returns using the previous signal.

## Momentum Strategy — metrics and turnover

Identical daily returns from 1993-02-01 through 2026-09-10; initial wealth 1 on 1993-01-29. Total return, daily mean × 252, calendar-time CAGR, sample daily volatility × square root of 252, covariance beta and Pearson correlation are calculated in Python. Sharpe uses the same aligned ^IRX transformation, same-date yield and asset-volatility denominator as notebook 01. Maximum drawdown includes initial wealth. One-way turnover is half the absolute target-minus-drifted-weight changes including cash; its recurring mean excludes initial allocation. Best/worst calendar years exclude partial years.

## Momentum Strategy — robustness checks

The verified zero-cost, formation-close strategy remains the baseline. Two separate robustness checks are added without changing the signal rule, lookback, top-10 selection or monthly rebalance frequency.

**Transaction-cost sensitivity.** The same verified daily strategy returns are recalculated under 0, 5, 10 and 20 basis points of implementation cost per unit of the project's one-way turnover measure. The recorded initial cash-to-stock allocation is charged as well as recurring rebalances. A 10 bp assumption with 25% one-way turnover therefore applies a 2.5 bp portfolio drag at that rebalance. The cost is deducted multiplicatively before the first gross return of the holding month. This is a transparent sensitivity assumption, not an estimate of BlackRock, broker or market-specific execution costs.

**Next-day-close execution sensitivity.** Company selections still use only the completed formation-close signal. Instead of assuming allocation at that same close, the sensitivity portfolio stays in cash through the next trading day's close, earns zero strategy return on that first holding day, then enters at that day's adjusted closing prices and holds fixed adjusted units for the rest of the month. SPY remains continuously invested on the original daily calendar. This deliberately includes the opportunity cost of waiting one day and isolates timing from transaction costs, which remain zero in this execution check. It is more conservative than the baseline but still does not model intraday fills, bid-ask spreads or slippage.

These checks are sensitivity analyses, not parameter tuning. They must be interpreted alongside the baseline rather than substituted after observing which version produces the best result.

## Momentum Strategy — limitations

Present-day universe survivorship and selection bias; changing listing/history eligibility; no transaction costs, taxes, slippage or market impact in the baseline; provider and corporate-action limitations; monthly close execution and distribution-reinvestment simplifications; no independent out-of-sample evidence or tuning. Historical performance is not a forecast or a claim of investment suitability. The added cost and next-day execution checks reduce two implementation assumptions but do not remove survivorship bias or make the backtest investable proof.
