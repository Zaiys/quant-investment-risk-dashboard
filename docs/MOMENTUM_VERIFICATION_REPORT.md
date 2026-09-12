# Momentum research and project completion report

Historical verification record for the initial momentum and guide addition. For the current source cleanup and preservation checks, see [PUBLICATION_CLEANUP.md](PUBLICATION_CLEANUP.md).

This report records the original gross baseline verification. The subsequent sensitivity addition is documented in [the momentum robustness report](MOMENTUM_ROBUSTNESS_VERIFICATION_REPORT.md); the baseline results and limitations below remain unchanged.

Verified 11 September 2026 on `feature/vercel-dashboard`, continuing from `cb1b896`. This record covers the local research and website verification at that revision.

## 1. Exact strategy

Research question: “Does a simple cross-sectional momentum rule applied to the existing 50-company universe produce different historical return and risk characteristics from SPY?”

Use notebook 01's same 50 companies and frozen Yahoo adjusted Close inputs. At each completed month-end calculate `P[t] / P[t−12] − 1`, including the latest month. Eligibility requires 13 positive month-end observations and complete positive daily prices over that trailing interval. Exact month-end rows are used; a missing endpoint is never replaced with an earlier quote. Rank descending, break exact ties alphabetically by ticker, select exactly ten, and give each a 10% target weight. No partial allocation is substituted when fewer than ten are eligible.

Assume frictionless allocation at the formation close; earn only the following calendar month's returns. Hold fixed adjusted units within each month, allowing weights to drift. Rebalance monthly. No skipped month, alternative lookback, top-N search, filters based on subsequent returns, optimization, leverage, shorting, or costs were introduced. The stated eligibility completeness requirement is a data-validity rule, not a performance filter.

At the first invalid held quote, write that position's remaining value to zero for the rest of the month, without replacement or later recovery within that month. This is a deliberately severe fallback, not an observed delisting return. Missing SPY data, total portfolio loss, or fewer than ten eligible companies after inception stop the run. There were **zero missing held-quote events** in the frozen evaluation.

## 2. Exact observation period

- First signal with ten eligible companies: **1981-01-30**, after the full lookback; it would govern February 1981. No pre-SPY returns are included in the reported comparison.
- First evaluated signal and initial wealth date: **1993-01-29**. SPY's first cached price is on this date; benchmark availability is checked at formation.
- First earned daily return: **1993-02-01**.
- Last earned daily return: **2026-09-10**.
- **8,460 identical daily observations**, **404 holding months**.
- Last evaluated formation date: **2026-08-31**; September 2026 is a partial holding month. Calendar 1993 and 2026 are partial; best/worst years exclude both.
- The initial observation is wealth 1, before the first return, and contributes no extra return.

## 3. Verified strategy versus SPY results

| Measure | Momentum | SPY |
| --- | ---: | ---: |
| Cumulative total return | 348,081.28% | 3,042.79% |
| Arithmetic annualised return | 27.36% | 11.99% |
| CAGR | 27.46% | 10.80% |
| Annualised volatility | 24.72% | 18.54% |
| Sharpe ratio | 1.008873 | 0.515965 |
| Maximum drawdown | -45.02% | -55.19% |
| Beta vs SPY | 1.053270 | 1.000000 |
| Correlation with SPY | 0.789928 | 1.000000 |

Percentages are display-rounded here; full precision is retained in reviewed Parquet tables and the downloadable JSON. Arithmetic annualised return is mean daily return × 252. CAGR uses elapsed calendar days from the initial wealth date divided by 365.25. Volatility uses sample daily standard deviation × √252. Beta uses sample covariance divided by SPY sample variance; correlation is Pearson correlation. Both use exactly the evaluation dates above.

Sharpe preserves notebook 01's method: `(1 + ^IRX Close / 100) ** (1 / 252) − 1`, reindexed to the entire price-date grid and forward-filled only. There are **21** yield fills in the strategy evaluation and no unavailable aligned rates. Same-date rates are used for descriptive excess return; the denominator is the standard deviation of the same aligned asset returns, not of excess returns. This is an approximate effective-rate treatment of a Treasury bill quote.

Best full year: Momentum **1999 (160.37%)**; SPY **1995 (38.05%)**. Worst full year: Momentum **2008 (-33.97%)**; SPY **2008 (-36.80%)**.

## 4. Holdings, turnover and stress diagnostics

One-way turnover is half the sum of absolute changes from actual drifted pretrade weights to new target weights, including cash. It includes resizing retained names. Initial cash-to-stock allocation is 100%, separately recorded and excluded from recurring averages.

- Mean recurring turnover: **22.94%** across **403** rebalances.
- Median: **21.75%**; maximum: **54.07%**.
- Mean new names per recurring rebalance: **2.109181**.
- Exactly ten selected at every evaluated formation. Eligible universe: **31–50** companies. All **50** companies were held at least once.
- Most frequently selected: NVDA (173 months), AAPL (171 months), NFLX (159 months), AMD (148 months), AMZN (143 months).
- First evaluated top ten, in signal rank order: CSCO, ORCL, HD, UNH, TXN, JPM, DIS, BAC, PEP, QCOM.
- Latest historical allocation (2026-08-31), in rank order: AMD, CAT, CSCO, GOOGL, LLY, AMGN, JNJ, MS, XOM, GS. Each has a 10% formation weight. This is a dated historical allocation, not a recommendation.

The first rebalance walkthrough includes all 31 eligible companies, raw adjusted prices on 1992-01-31 and 1993-01-29, each signal/rank/weight and the following period's endpoint return. The ten contributions sum to **-3.0656132284%**, agreeing with compounded daily returns through 1993-02-26. An additional raw-endpoint check covers 2020-01-31 formation through February 2020.

The unchanged three market-research stress windows are also applied to momentum. Both entities start each window at wealth 1 and share daily dates. These are period outcomes, not annualised results.

| Window | Entity | Total return | Maximum drawdown |
| --- | --- | ---: | ---: |
| Global Financial Crisis | MOMENTUM | -29.33% | -45.02% |
| Global Financial Crisis | SPY | -45.96% | -55.19% |
| COVID Crash | MOMENTUM | 3.32% | -32.51% |
| COVID Crash | SPY | -9.18% | -33.72% |
| 2022 Selloff | MOMENTUM | -12.00% | -24.29% |
| 2022 Selloff | SPY | -18.18% | -24.50% |

## 5. Look-ahead controls and verification

Signals depend only on raw quotes dated at or before formation. The ranking function never receives subsequent returns. Thirteen valid endpoints span twelve months. No formation-date return is assigned to the new weights; every holding date is strictly later. Benchmark availability is known at the initial formation close, and no subsequent missing rows are dropped to improve the comparison.

Independent checks recalculate every eligible signal and selected ranking from raw prices, verify ten unique 10% target weights, reconcile every monthly fixed-unit endpoint with compounded daily returns, compare SPY with direct daily price returns, and recompute all summary estimates using NumPy identities. Drawdowns include initial wealth. The risk-free transform and alignment match notebook 01 exactly.

Synthetic adversarial tests alter future prices (including a huge future winner and a disappearing selected stock), truncate the future, add IPO history gaps and missing month-end prices, test exact ties and fewer-than-ten cases, distinguish monthly from accidental daily rebalancing, and verify the write-off/no-resurrection rule. Cache and source tampering are rejected. These establish timing and internal consistency; they do not certify historical investability or independently validate Yahoo against exchange records.

## 6. Material limitations

The striking CAGR is especially vulnerable to **survivorship and selection bias**: today's selected surviving companies are reused historically, excluding failed, delisted and unselected alternatives. This is not a point-in-time opportunity set. Zero transaction costs, taxes, slippage and market impact further limit interpretation. Turnover is activity, not a net-cost estimate.

Company listing dates and available histories differ. Frozen provider adjustments may include errors, later revisions, imperfect corporate-action histories and reinvestment conventions; they are not vintage information records. Formation-close signal and execution share an idealized price, which does not guarantee a feasible fill after observing the close. The write-off fallback is conservative and hypothetical. The risk-free conversion is approximate. Beta, correlation and volatility can change. Selected historical stress episodes do not represent all possible future shocks.

Only one specified rule was evaluated, with no tuning or alternative variants. There is no independent out-of-sample test, significance claim, prediction, or claim of investment suitability. Historical performance does not imply future performance.

## 7. Dashboard contract changes

Version **3** deliberately replaces the v2 momentum prohibition with a dedicated available-momentum schema. It requires notebook 02 provenance and a fixed definition: 12 months, top ten, monthly rebalance, equal formation/drifting weights, no skipped month, zero baseline transaction costs, initial wealth date, first/last return dates, daily observation count and holding-month count. Both Python and TypeScript reject unsupported settings, missing provenance and inconsistent formation/source periods. Earlier schema versions fail validation.

The market section schema and estimators are preserved. The existing export command now requires both reviewed datasets, rejects stale/missing momentum outputs, and attaches the new section through `scripts/build_momentum_dashboard.py`. It cannot silently erase the completed strategy. The five existing market section objects and all existing market methodology items match `cb1b896` exactly. The original JSON precision/loading/download boundary remains in place.

## 8. Strategy page

`/momentum` now includes the plain rule and limitations before results, exact evaluation dates, arithmetic annualised return, CAGR, volatility, Sharpe and drawdown metric strips, indexed wealth and drawdown comparisons, annual return bars, a full performance table including beta/correlation, full-year extrema, turnover diagnostics, selection frequency, the first-rebalance audit, historical stress comparisons, recent rebalance history and the latest dated allocation.

Existing selectors, sortable tables and accessible chart-value tables are reused. No frontend financial calculations were added. Momentum plots contain **458** actual selected observations per series: month ends, initial/final observations and each year's daily drawdown troughs. All estimators use full daily data. The combined linear wealth chart compresses SPY visually because of the large historical gap; the existing series selector displays SPY separately on its own scale. The notebook's wealth figure uses a labelled logarithmic scale.

## 9. Educational page

`/guide`, chapter **09**, is titled **How to Read This Project**. It explains quantitative investment research, risk research, this project's questions, SPY as benchmark, total/arithmetic return versus CAGR, volatility, Sharpe, drawdown, correlation, beta, diversification, risk contribution, stress testing, momentum, backtesting, look-ahead bias, survivorship bias and why historical results are not forecasts.

The guide supplies a beginner reading route, instructions for inspection controls and source values, and an example reading the directly exported strategy/SPY CAGR. Navigation includes nine chapters in the existing editorial style.

Background references in the notebook/guide: [Kenneth French's momentum construction](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/Data_Library/det_mom_factor_daily.html), [SPY fund objective](https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy), and [SEC performance-claims bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47). These provide context, not project results; French's factor uses a different rule.

## 10. Files and outputs

There are **20** reviewed momentum Parquet tables in `data/reviewed/momentum/`, plus a checksum manifest. The raw cache and reviewed tables remain ignored by Git; they must accompany the project for exact offline reproduction on another machine. The executed notebook, input references, verification manifest and presentation snapshot are tracked. No new research dependencies were needed.

The full changed-file inventory for this task is listed at the end of this report. Key documentation is `METHODOLOGY.md`, `docs/REPRODUCIBILITY.md`, `docs/DATA_CONTRACT.md`, this report, and `data/provenance/momentum-verification.json`. The pre-existing market notebook, legacy momentum notebook, raw inputs, market verification record and populated market sections were preserved.

## 11. Checks and outcomes

| Check | Final outcome |
| --- | --- |
| Notebook 02 fresh kernel, Python 3.12.14 | PASS: 36 cells, 16 consecutively executed code cells, no cell errors |
| Notebook output inspection | PASS: cumulative wealth, drawdown and annual figures present; wealth and annual figures visually inspected |
| Complete Python suite | PASS: 28 tests, no failures or skips locally |
| Momentum timing/accounting/missing-data tests | PASS; included in Python suite |
| Reviewed-source hashes and frozen cache | PASS; no acquisition or live data request |
| Exact combined snapshot rebuild | PASS; 27,703 numeric values in the combined payload |
| Every momentum metric/table/point vs reviewed Python | PASS; exact unrounded agreement |
| Python exporter and shared JSON Schema/Ajv | PASS; v3 validation and rejection tests |
| Frontend suite under Node 22.23.2 | PASS: 47 tests in five files |
| ESLint | PASS |
| TypeScript | PASS |
| Production build under Node 22.23.2 | PASS; all nine chapters prerendered |
| HTTP smoke | PASS: nine chapter routes, byte-identical download, unknown-route 404 |
| Responsive review | PASS: `/momentum` and `/guide` at 390, 768 and 1440 px; no page overflow |
| Browser interaction review | PASS: mobile menu, guide anchors, entity/series selection, expandable source values |
| Browser warnings/errors | None observed |
| Preservation against `cb1b896` | PASS: original notebooks/provenance byte-identical; five market sections and market definitions unchanged |
| Whitespace/diff check | PASS |

The automated CI configuration still uses Node 22 and Python 3.12. On fresh clones, local-cache-dependent tests are explicitly skipped; deterministic timing, exporter and frontend tests run. The local checks above included the frozen caches and did not skip any Python test. Compatibility was verified under Node 22.23.2.

## 12. Commits and repository state

Implementation commit: **`a8551cc780fda397a0078b22b9e87b928e1614bf`** — Add verified monthly momentum research and beginner guide.

This report and `data/provenance/momentum-site-review.json` are committed separately as the final verification record. Their history is available through `git log -- docs/MOMENTUM_VERIFICATION_REPORT.md`. Work remains on `feature/vercel-dashboard`; no push, merge to `master`, or deployment was performed.

## 13. Vercel preview readiness

**Ready for a user-approved preview.** The complete app builds under the documented Node 22 runtime, all nine routes and the download work, and the populated strategy and guide have been reviewed responsively. Vercel only needs the committed frontend and snapshot; it does not execute Python or require the ignored raw cache. Hosting account/project selection and the actual preview deployment remain future authorized actions. No production deployment or merge is implied.

## 14. Tracing a rebalance

Explain the research question and methodology before presenting the CAGR. Be able to trace the first rebalance from 1992/1993 raw adjusted prices to signals, ranking, ten target weights and February 1993 returns. Explain why 13 endpoints span 12 months, why monthly weights drift, why next-period availability must not drive selection, and why a closing-price signal is not proof of executable closing-price fills.

Distinguish CAGR from arithmetic annualised return, and beta from correlation. Explain initial-wealth drawdowns and the approximate ^IRX Sharpe convention. Describe turnover as a measure of trading activity; this initial baseline record excludes costs; the subsequent robustness report documents separate cost and timing sensitivities. Emphasize that eliminating future-return leakage leaves substantial survivorship and selection bias intact. Present the work as a reproducible educational research exercise, without predictive or investment-suitability claims.

The next walkthrough can start at notebook section 16, then trace the construction back through sections 4–11 and finish with the guide's result interpretation and limitations.

## Changed-file inventory

- `METHODOLOGY.md`
- `README.md`
- `data/provenance/dashboard-crosscheck.json`
- `data/provenance/momentum-site-review.json`
- `data/provenance/momentum-verification.json`
- `docs/DATA_CONTRACT.md`
- `docs/DEPLOYMENT.md`
- `docs/DESIGN.md`
- `docs/MOMENTUM_VERIFICATION_REPORT.md`
- `docs/REPRODUCIBILITY.md`
- `notebooks/02_momentum_strategy.ipynb`
- `scripts/build_market_dashboard.py`
- `scripts/build_momentum_dashboard.py`
- `scripts/export_dashboard.py`
- `scripts/momentum_outputs.py`
- `scripts/momentum_research.py`
- `scripts/run_momentum_research.py`
- `tests/test_export_dashboard.py`
- `tests/test_market_integration.py`
- `tests/test_momentum.py`
- `web/scripts/smoke.mjs`
- `web/scripts/validate-data.ts`
- `web/src/app/[section]/page.tsx`
- `web/src/app/globals.css`
- `web/src/app/guide/page.tsx`
- `web/src/app/page.tsx`
- `web/src/components/momentum-intro.tsx`
- `web/src/components/research-views.tsx`
- `web/src/components/ui.tsx`
- `web/src/data/dashboard.json`
- `web/src/data/dashboard.schema.json`
- `web/src/lib/sections.ts`
- `web/src/lib/types.ts`
- `web/src/lib/validate.ts`
- `web/tests/data.test.ts`
- `web/tests/fixtures/available.json`
- `web/tests/momentum.test.tsx`
