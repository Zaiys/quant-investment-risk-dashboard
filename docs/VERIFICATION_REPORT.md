# Market research and dashboard verification report

Historical verification record for the market-only version 2 snapshot. For the current source cleanup and preservation checks, see [PUBLICATION_CLEANUP.md](PUBLICATION_CLEANUP.md).

Completed 11 September 2026 on `feature/vercel-dashboard`. The market notebook is verified and the existing version 2 dashboard is populated. No push, merge or deployment was performed.

## 1. Stable data

No suitable saved Yahoo inputs were found in the research repository, frontend worktree or nearby project files. The unrelated nearby price exports used a different provider/universe and were not reused. All 55 price histories and ^IRX were freshly downloaded from Yahoo Finance, sequentially, and cached locally.

- Requested: 1980-01-01 inclusive through 2026-09-11 exclusive.
- Acquisition completed: 2026-09-11T10:23:34.223001+00:00.
- Asset settings: Close, auto_adjust=True, repair=False, interval=1d, rounding=False. ^IRX: Close, auto_adjust=False.
- Frozen local inputs: `data/raw/prices.parquet`, `data/raw/risk_free.parquet`, `data/raw/manifest.json`.
- Input files are ignored by Git. Preserve/copy the complete cache for exact reruns; Yahoo may revise later downloads.
- Price checksum: `3b60b8a9da972b892294dfcdcd12062197ab76f4e35a298e313f838920055394`.
- Yield checksum: `80ca3ffefddc66918a24eff6c6c15641121926b857744104efbb02facb9ec83d`.
- Per-symbol timestamps, provenance and observed coverage: [market-inputs.json](../data/provenance/market-inputs.json).

## 2. Exact verified observations

| Sample | Dates | Observations |
| --- | --- | --- |
| Full price-date union | 1980-01-02–2026-09-10 | 11,768 dates; each asset retains its own available history |
| Common 50-company prices | 2013-01-02–2026-09-10 | 3,443 identical dates |
| Common 50-company returns | 2013-01-03–2026-09-10 | 3,442 identical dates per company |
| Portfolio and SPY returns | 2004-11-19–2026-09-10 | 5,485 identical dates; initial wealth date 2004-11-18 |
| Raw ^IRX yield | 1980-01-02–2026-09-10 | 11,704 dates; 64 dates forward filled after alignment |

Every asset and ^IRX ends on **2026-09-10**. No interior asset-price gaps were found; no common-period price/return rows were omitted. No risk-free dates remain unavailable after forward filling. Full-history beta uses the asset/SPY overlap, which can be shorter than the asset history.

## 3. Implemented methodology

- Yahoo adjusted prices: the installed yfinance implementation renames Adj Close to Close when auto_adjust=True.
- Simple daily returns: P[t] / P[t−1] − 1, with no price filling.
- Total return: last adjusted price / first adjusted price − 1.
- CAGR: (last / first)^(1 / years) − 1, where years = elapsed calendar days / 365.25.
- Volatility: sample daily-return standard deviation (ddof=1) × sqrt(252).
- Risk-free proxy: (1 + ^IRX Close / 100)^(1 / 252) − 1; same-date alignment and forward filling only.
- Sharpe: mean(aligned asset return − aligned daily proxy) / sample standard deviation of the aligned asset returns × sqrt(252).
- Beta: aligned covariance with SPY divided by aligned SPY variance. SPY itself remains null in the original asset beta output.
- Pearson correlation: pairwise available full histories; a separately labelled common matrix uses the identical 50-company sample.
- Drawdown: wealth / running maximum wealth − 1; maximum drawdown is the minimum. Every portfolio/stress path explicitly starts from wealth 1.
- Portfolio weights: SPY 35%, QQQ 15%, IWM 10%, TLT 15%, GLD 10%, JPM 5%, JNJ 5%, XOM 5%.
- Constant daily weights imply daily rebalancing, without costs, taxes, slippage or cash flows. Annualised portfolio/SPY return is mean daily return × 252, not CAGR.
- Component volatility contributions use the annualised covariance matrix, sum to total volatility, and produce risk shares summing to 100%.
- Individual indices start at 100 on each asset’s first valid price; common indices start at 100 together. Long-history website charts select existing quarter-end/initial/final observations; all financial metrics use daily data and full daily reviewed series are retained locally. Stress curves retain all daily observations.

Full definitions and limitations: [METHODOLOGY.md](../METHODOLOGY.md). Reproduction: [REPRODUCIBILITY.md](REPRODUCIBILITY.md).

## 4. Four research corrections

1. Retained 1980 from the recovered code, explicit comment and pre-1990 investigation; corrected the inconsistent introduction. No 1990 truncation.
2. Enforced a shared window and valid observations for all 50 companies. Returns are computed before incomplete rows are removed, preventing gaps from becoming fictitious daily returns. The 2012 eligibility check remains exploratory.
3. Prepended initial wealth 1 before every portfolio/SPY/stress return path. Immediate first-return losses are now measured. All three stress windows remain unchanged.
4. Added explicit individual-history and common-period indexed outputs, together with consistent portfolio/SPY and stress paths. Raw share prices are never presented as comparable performance.

On these frozen inputs, corrected common-period CAGR/volatility agree with the recovered formulas to floating-point precision, because no interior quotes are missing. Portfolio/SPY maximum drawdowns in the full sample and the three stress windows are unchanged because later peaks determine their worst declines. The new immediate-loss regression test demonstrates the correction on the case the former formula missed. See [research-corrections.json](../data/provenance/research-corrections.json).

## 5. Remaining uncertainty

The preserved ^IRX transformation treats its quoted yield as an effective annual rate. It is a simplifying proxy, not an exact Treasury bill bank-discount-to-holding-period-return conversion; no alternative was silently substituted. Yahoo observations have not been independently reconciled against exchange records. Large historical moves and corporate-action/ticker-history quirks were retained without automatic repair and are flagged in the corrections record.

Survivorship/selection bias, differing listing dates, changing correlations/beta, frictionless constant-weight rebalancing and historical-performance limitations remain. Internal verification does not establish predictive power or investment suitability.

## 6. Key verified results

Portfolio and SPY use 2004-11-19–2026-09-10, with the same 5,485 daily returns. The figures below are display-rounded; the snapshot preserves full precision.

| Measure | Portfolio | SPY |
| --- | ---: | ---: |
| Arithmetic annualised return | 11.715789% | 12.125672% |
| Annualised volatility | 14.168495% | 18.856072% |
| Sharpe | 0.705141 | 0.551582 |
| Maximum drawdown | -36.800422% | -55.189450% |

SPY, QQQ and IWM account for 60% of capital and approximately 81.2275% of portfolio volatility. TLT’s sample risk share is approximately −2.2304%; component contributions reconcile to total volatility.

| Stress window | Portfolio return | SPY return | Portfolio max drawdown | SPY max drawdown |
| --- | ---: | ---: | ---: | ---: |
| Global Financial Crisis | -24.899884% | -45.961356% | -36.800422% | -55.189450% |
| COVID Crash | -3.731765% | -9.182220% | -25.256742% | -33.717276% |
| 2022 Selloff | -15.392532% | -18.175350% | -21.397843% | -24.496382% |

Stress requested windows remain GFC 2007-10-01–2009-03-31 (378 returns), COVID 2020-02-01–2020-04-30 (62 returns; actual first return 2020-02-03), and 2022 2022-01-01–2022-12-31 (251 returns; actual 2022-01-03–2022-12-30).

Common-period leaders by Sharpe, using exactly the same observations:

| Company | CAGR | Volatility | Sharpe |
| --- | ---: | ---: | ---: |
| NVDA | 62.140329% | 45.405782% | 1.254269 |
| AVGO | 44.415100% | 38.367251% | 1.106522 |
| LLY | 28.141609% | 28.300720% | 0.957573 |

## 7. Populated dashboard

Overview; Market Explorer; Risk vs Return; Diversification & Correlation; Portfolio Analysis; Stress Testing; Methodology metadata. The six available chapter views correspond to the five v2 analysis sections plus methodology; overview uses root research metadata. Momentum is the only awaiting analysis section.

The adapter reads reviewed Parquet tables; it does not parse notebook display output or estimate financial measures. Long histories are sampled only by selecting existing points. The existing design, navigation, chart types and v2 schema were retained. Two integration defects received small fixes: server-side JSON text loading avoids build-time floating-point literal drift, and bounded legends/tooltips prevent the populated universe from overwhelming mobile plots.

## 8. Files changed

- `.github/workflows/dashboard.yml`
- `.gitignore`
- `METHODOLOGY.md`
- `README.md`
- `data/provenance/dashboard-crosscheck.json`
- `data/provenance/market-inputs.json`
- `data/provenance/research-corrections.json`
- `data/provenance/research-verification.json`
- `data/provenance/site-review.json`
- `docs/DATA_CONTRACT.md`
- `docs/REPRODUCIBILITY.md`
- `docs/VERIFICATION_REPORT.md`
- `notebooks/01_market_exploration.ipynb`
- `requirements-research-lock.txt`
- `requirements.txt`
- `scripts/build_market_dashboard.py`
- `scripts/market_data.py`
- `scripts/research_checks.py`
- `scripts/research_outputs.py`
- `scripts/run_market_research.py`
- `tests/test_market_integration.py`
- `tests/test_research_checks.py`
- `web/scripts/smoke.mjs`
- `web/src/app/export/route.ts`
- `web/src/app/globals.css`
- `web/src/components/research-chart.tsx`
- `web/src/data/dashboard.json`
- `web/src/lib/data.ts`
- `web/tests/data.test.ts`
- `web/tests/snapshot-precision.test.ts`

Local, untracked data artifacts: the frozen raw inputs and manifest, resumable partial input cache, and reviewed output tables. The original checkout and all momentum notebook variants were untouched.

## 9. Checks and outcomes

- Original recovery verified by commit and matching notebook blob hash before modification (79 cells / 69 code cells).
- Final notebook format/syntax and fresh-kernel execution: 83 cells / 72 code cells; all executed, no errors or captured warnings.
- Research identities and aligned-sample checks: passed. Source/settings, manual return, weights, CAGR, 252-day volatility, ^IRX, Sharpe, beta, drawdowns, common dates, indexed series, risk contributions and all stress results checked.
- Python tests: 19 passed, none skipped locally. Cache-dependent tests are explicitly skipped on CI machines without the private local cache.
- Frontend tests: 44 passed. Lint and TypeScript: passed.
- Python and frontend schema validators: passed. Version 2 schema unchanged.
- Exact adapter comparison: 25,264 numeric values preserved; every published table cell, chart coordinate/value and matrix value checked against reviewed Python outputs.
- Snapshot SHA-256: `3aad8edb4fa7afb2630c20c5b5e6f680aa25d3f6993fb8761fc55ca3f88c7a64`.
- Production build: passed on Node.js 22.16.0, matching the documented Vercel major version. Python verification used 3.12.14.
- Local production smoke: all eight chapters HTTP 200, unknown chapter HTTP 404, snapshot response byte-for-byte equal to the source JSON.
- Browser review: 32 page/viewport combinations (eight chapters × 375/768/1280/1440px); one page heading each and no document-level horizontal overflow. Asset filters, chart-value expansion, common Sharpe sorting, stress filtering and keyboard matrix selection passed. No captured browser errors/warnings.
- Public-file scan and Git whitespace checks: passed. No new tool branding, instruction files or prompt transcripts.
- Local checks only; no remote CI run or Vercel deployment was triggered.

## 10. Commits and repository safety

- `c9fd6cc15537cdd5a5c23a4b67ed260502d4d407`: original recovered notebook, preserved.
- `bbd8c2e`: recovery applied to the existing feature worktree.
- `f63137b`: reproducible Yahoo acquisition and local cache.
- `2bb3c64`: verified notebook and research corrections.
- `3a135fc`: verified dashboard integration and precision/overflow fixes.
- The methodology and this report are recorded in the final documentation commit; its history is available through Git.

Original local `master` remains at `5a47b8fd843276d15d628a5544a2a98fba8dbc0c`. Its pre-existing deletion of `notebooks/moment_strategy.ipynb` and untracked `notebooks/02_moment_strategy.ipynb` were not changed. Fetch updated only the remote-tracking `origin/master` to the recovered commit. The existing feature worktree remained on its own branch throughout.

## 11. Awaiting the strategy notebook

`notebooks/02_momentum_strategy.ipynb` was not created or modified. Signals, holdings, backtest curves, turnover/cost assumptions and momentum results await the user’s research and a separate review. The v2 contract intentionally continues to reject momentum results; integration will require a deliberate contract update.

## 12. Preview readiness

**Ready for a user-approved Vercel preview deployment.** The populated production build, data provenance, precision checks and local review pass. No push, merge, preview deployment or production deployment was performed. Vercel account/project linking and the deployment itself remain untested until authorized.
