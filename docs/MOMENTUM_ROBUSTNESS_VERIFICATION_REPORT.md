# Momentum robustness verification — 12 September 2026

The two pre-specified sensitivity analyses are verified against the frozen reviewed inputs and published in the Momentum dashboard. The verified zero-cost, formation-close baseline is unchanged. This report records the addition to the baseline reviewed at `8b115a7`, using the existing robustness work through `858a99e`.

## Evaluation and actual results

Initial wealth is 1 on **1993-01-29**. Every variant and SPY uses the same **8,460** daily observations from **1993-02-01** to **2026-09-10**, across **404** holding months. The last holding month and first/final calendar years remain partial. No selected quote was missing after next-day entry in this frozen sample.

| Cost per unit of one-way turnover | CAGR | Volatility | Sharpe | Maximum drawdown | Mean recurring drag (bps) | CAGR change (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 bps (gross baseline) | 27.4593% | 24.7200% | 1.008873 | -45.0157% | 0.000000 | 0.000000 |
| 5 bps | 27.2822% | 24.7192% | 1.003263 | -45.0947% | 1.147008 | -0.177069 |
| 10 bps | 27.1053% | 24.7184% | 0.997649 | -45.1736% | 2.294015 | -0.353916 |
| 20 bps | 26.7523% | 24.7171% | 0.986411 | -45.3312% | 4.588030 | -0.706948 |

| Execution convention | CAGR | Volatility | Sharpe | Maximum drawdown | Beta vs SPY | Correlation with SPY | CAGR change (pp) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Formation close (gross baseline) | 27.4593% | 24.7200% | 1.008873 | -45.0157% | 1.053270 | 0.789928 | 0.000000 |
| Next-day close (monthly cash gap) | 23.4298% | 24.1331% | 0.894080 | -46.3266% | 0.999072 | 0.767502 | -4.029443 |
| SPY (continuous) | 10.8017% | 18.5394% | 0.515965 | -55.1895% | 1.000000 | 1.000000 | -16.657594 |

Display values above are rounded for reading; the local frames and downloadable dashboard snapshot retain source precision. Percentage-point differences (pp) are calculated in Python, not in the browser. SPY's difference is also measured against the momentum baseline, as labelled.

## Cost convention and independent identity

The existing convention charges 0/5/10/20 bps per unit of **one-way turnover**, including initial allocation. One-way turnover is half the sum of absolute target-minus-drifted-weight changes including cash. Thus 10 bps with 25% turnover deducts 2.5 bps of portfolio capital. This is not a per-dollar fee on both purchases and sales. Costs reduce capital proportionally before the first gross return each month: `(1 - bps / 10000 * turnover) * (1 + gross return) - 1`. Holdings, signals, relative weights, later daily returns and SPY are unchanged. There is no terminal liquidation charge.

All 404 recorded turnovers were reconstructed independently from the prior raw-price holding paths. For each assumption, every daily wealth value reconciles with gross wealth multiplied by the cumulative product of rebalance cost factors. The final identity is:

| Cost (bps) | Product of cost factors | Actual net / gross ending wealth |
| --- | ---: | ---: |
| 0 | 1.000000000000 | 1.000000000000 |
| 5 | 0.954347251652 | 0.954347251652 |
| 10 | 0.910772709328 | 0.910772709328 |
| 20 | 0.829485181377 | 0.829485181377 |

The 0 bps series equals the baseline daily returns exactly, including avoiding otherwise harmless floating-point changes at zero drag. Every cost summary metric reconciles with independent NumPy identities. Increasing the assumed cost reduces ending wealth, as expected. These are illustrative cost assumptions, not estimates of broker, institutional or market-specific execution costs.

## Next-day convention and independent endpoints

The inherited timing check sells the prior holdings at **each formation close**, holds non-interest-bearing cash through the next trading-day close, enters the same selected ten at that adjusted close, then holds fixed adjusted units for the rest of the month. It therefore has **404 zero-return cash days**. It does not retain the prior holdings through the next-day execution. This distinction is explicit in the script, table, page introduction, methodology and contract.

SPY remains continuously invested, including those cash days. Timing costs stay zero; no combined timing-and-cost result is claimed. All daily dates, risk-free transformations, 252-day estimators and calendar-time CAGR bases match the baseline. Missing execution quotes stop the run; invalid held quotes after entry use the existing write-off/no-resurrection policy. Waiting can help or hurt returns; adjusted closing prices are still idealized fills.

Every delayed daily return and monthly endpoint was independently reconstructed from raw adjusted entry and subsequent prices. Examples retained in the verification manifest are:

| Formation close | Execution close | Raw fixed-unit endpoint return | Compounded daily return |
| --- | --- | ---: | ---: |
| 1993-01-29 | 1993-02-01 | -4.9107989782% | -4.9107989782% |
| 2020-01-31 | 2020-02-03 | -6.6345046814% | -6.6345046814% |
| 2026-08-31 | 2026-09-01 | -0.4645720374% | -0.4645720374% |

The original monthly ranks and targets are reused without reselection. Synthetic checks cover multiple months, changed selections, cash gaps each month, drifting weights, a one-day final partial month, missing execution and benchmark quotes, write-offs without resurrection, complete loss, and invalid formation timing.

## Publication and preservation

The six reviewed robustness frames are retained under `data/reviewed/momentum_robustness/` (ignored by Git). The tracked `data/provenance/momentum-robustness-verification.json` binds them to the full baseline manifest and frame hashes, frozen inputs, both robustness helpers, assumptions and runtime. Missing, stale, incomplete or tampered records are rejected before the combined dashboard is written.

The version 3 contract gains a separately sourced, optional `sensitivities` object for compatibility with older v3 producers. The combined adapter requires the verified robustness outputs and always publishes both tables. Python and TypeScript enforce the fixed assumptions, matching evaluation dates/counts, exact row set and table shape. Baseline metrics and charts stay in their original arrays. The two comparison tables remain together when the baseline entity selector changes. All financial calculations, including percentage-point and bps conversions, remain in Python research.

The adapter generates the sensitivity methodology from the same reviewed metadata on every export. The inherited explanation was made explicit about monthly liquidation/cash and the one-way-turnover fee convention; the unqualified claim that waiting is always more conservative was removed.

Preservation comparison against `8b115a7` passed: all five market sections, the entire baseline Momentum section after removing the new `sensitivities` field, research metadata and every original methodology item are exactly equal. The market and momentum notebooks, baseline calculation/verification helpers, market input provenance, market verification and baseline momentum verification records are byte-identical. Frozen inputs were loaded with their existing hash checks; there was no acquisition or baseline recomputation.

Survivorship and selection bias claims are unchanged. The experiment still reuses today's selected surviving companies, excludes failed and unselected alternatives, and provides no independent out-of-sample evidence. Cost and timing checks do not remove these limitations or establish investability.

## Completed validation

| Check | Result |
| --- | --- |
| Research environment | Python 3.12.14; existing locked local dependencies |
| Robustness execution | PASS on frozen reviewed data; 56 independently checked summary metrics plus all return paths/endpoints |
| Full Python suite | PASS: 42 tests, zero failures and zero skips |
| Snapshot rebuild / check | PASS: exact agreement, 27,754 numeric values |
| Python exporter / shared schema | PASS |
| Frontend suite | PASS: 49 tests in five files |
| ESLint | PASS |
| TypeScript | PASS |
| Production build | PASS under Node 22.23.2; all nine chapters prerendered |
| Local production HTTP smoke | PASS: all nine chapter routes, byte-identical download and unknown-route 404 |
| Desktop / tablet / phone | PASS at 1440 / 768 / 390 px; no document overflow |
| Browser interactions | PASS: sensitivity anchor, numeric sorting, SPY selection retains both comparisons, keyboard horizontal table access |
| Browser warnings / errors | None observed |
| Baseline preservation and whitespace | PASS |

A test-only TypeScript option was corrected during the build pass; the final test, lint, typecheck and production build all pass. Local build/server checks required normal process and localhost access outside the restricted shell sandbox.

Current snapshot SHA-256: `bc2ea7f7bdcb5cf58c703b38126ae81d75eef83e1be3f4cecde03303ecc3b59d`.

See [REPRODUCIBILITY.md](REPRODUCIBILITY.md) for exact offline rerun commands. The verification and result files are ready for a commit on `feature/vercel-dashboard`. No merge to `master`, remote push or deployment is part of this completion.
