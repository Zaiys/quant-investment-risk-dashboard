# Reproducing the verified market and momentum analysis

The recovered source is preserved at commit `c9fd6cc15537cdd5a5c23a4b67ed260502d4d407`. The market and momentum notebooks use the same frozen input cache.

## Data and execution

Use Python 3.12. `requirements-research-lock.txt` records the exact environment used for verification; `requirements.txt` declares the supported research dependencies.

```bash
python3.12 -m venv .venv-research
.venv-research/bin/python -m pip install -r requirements-research-lock.txt
.venv-research/bin/python -m scripts.market_data --end 2026-09-11
.venv-research/bin/python -m scripts.run_market_research
.venv-research/bin/python -m scripts.run_momentum_research
.venv-research/bin/python -m scripts.momentum_robustness
.venv-research/bin/python -m scripts.build_market_dashboard
.venv-research/bin/python -m scripts.build_market_dashboard --check
.venv-research/bin/python scripts/export_dashboard.py --check
.venv-research/bin/python -m unittest discover -s tests -v
```

Acquisition requests Yahoo Finance daily histories from 1980-01-01 through 2026-09-10 (the end argument is exclusive). One symbol is requested at a time, with bounded retry/backoff and resumable partial results for the same requested interval. An invalid or incomplete symbol fails acquisition; it is never replaced with zeros or another provider. Successful input downloads include all 55 assets and the ^IRX yield proxy.

`data/raw/prices.parquet`, `data/raw/risk_free.parquet` and `data/raw/manifest.json` are the local frozen inputs. The manifest includes source, each download timestamp, requested dates, settings, actual dates/counts, library versions and SHA-256 checksums. A reviewed copy of the acquisition manifest is tracked at `data/provenance/market-inputs.json`. The cache loader checks the input hashes, universe, dates and settings. It never downloads, fills asset prices or switches providers.

To rerun this exact snapshot, keep the existing raw cache and **skip acquisition**. Yahoo can revise historical adjustments; re-downloading the same date interval later does not guarantee the same values or hashes. Raw inputs, partial responses and local notebook output tables are ignored by Git. Transfer the complete cached files and manifest together when exact reproduction is required on another machine. A fresh acquisition is a new dataset requiring another verification and export.

The runner executes only `notebooks/01_market_exploration.ipynb` from top to bottom in a fresh Jupyter kernel and writes its outputs only after successful completion. It checks notebook format, syntax, execution counts and errors. The notebook reads cached inputs, applies the documented research, verifies identities, and saves computed tables under `data/reviewed/`. The separate runner for notebook 02 is described below; the market runner does not modify it.

## Reviewed outputs and dashboard

`data/reviewed/manifest.json` binds the computed tables to the notebook source, research-helper hashes and input manifest. `data/provenance/research-verification.json` preserves this verification record in Git, including asset sample counts, stress dates, alignment checks and output hashes. Notebook output images/display tables are not parsed as financial data.

`scripts/build_market_dashboard.py` reads the verified tables, rejects stale source or changed output files, maps finite scalar values without rounding, and publishes version 3 through the existing `scripts/export_dashboard.py` validator. No financial estimators are implemented in the adapter or TypeScript. It also writes `METHODOLOGY.md` from the same reviewed metadata used in the website.

Long-history chart exports contain actual observed quarter ends, every series' first/final valid observations, and gap boundaries if present. The adapter selects existing values only. Stress curves retain daily observations. All estimates and drawdown extrema use full daily data. The full daily indexed series are retained in local reviewed Parquet files. This avoids turning the finished website's accessible chart tables into hundreds of thousands of rows; the sampling frequency is explicit on each chart. Website chart-value tables mount when opened and show 100 rows per page; pagination does not change the exported observations.

The snapshot retains the notebook's separation between individual histories and the 50-company common period. It preserves null SPY beta, because the original asset beta table excludes SPY itself. Momentum is supplied separately from the reviewed notebook 02 outputs. The server reads the original JSON text and parses it at runtime, avoiding the build tool’s numeric-literal rewriting. The snapshot download returns that validated source text byte for byte. Regression tests cover this exact-value boundary. Long legends/tooltips are bounded within the existing chart panels so the full asset universe remains usable at mobile widths; the design is preserved; the version 3 schema adds a dedicated momentum definition.

`data/provenance/dashboard-crosscheck.json` records the published snapshot hash and exact-value comparison. Integration tests compare every table cell, chart coordinate/value and matrix cell with its reviewed Python frame. The standalone `--check` adapter run compares the entire snapshot with a rebuilt payload. Local integration tests require the reviewed cache; on fresh CI checkouts those cache-dependent tests are explicitly skipped, while deterministic correction, sampling, exporter and frontend tests run normally.

## Research corrections

1. **Start date:** retain 1980 from the recovered code, its explicit comment and its pre-1990 inspection; correct the introduction. No observations are truncated to 1990.
2. **Common observations:** retain the final company-only universe and latest listing/history start. Restrict price levels to one valid shared window; compute returns on the original date grid before dropping incomplete rows. This prevents a missing quote from being converted into a multi-day return labelled daily. The preliminary 2012 eligibility check remains exploratory and cannot overwrite the final comparison.
3. **Initial wealth:** prepend 1.0 on the previous observed price date to portfolio, SPY and every stress path. Drawdown now includes an immediate first-return loss. Stress request windows are unchanged.
4. **Indexed performance:** explicitly compute each-asset index from its first valid price and common indices from the shared start, both at 100. Portfolio/SPY indices share an explicit initial 100. Raw share prices are not used as performance comparisons.

No formulas were changed to force execution. CAGR, sample volatility, Sharpe, covariance beta, weights, 252-day annualisation, the ^IRX approximation and constant-weight rebalancing are preserved. Result-specific prose from the old saved run was replaced with explanations referring to the newly computed tables. The added common correlation matrix and constituent stress drawdowns reuse existing estimators on the explicit shared samples.

## Interpretation limits

Verification establishes source settings, reproducible execution and internal mathematical consistency. It does not independently certify Yahoo prices against exchange records. The preserved ^IRX transformation is an approximation rather than an exact bank-discount-yield conversion. The documented survivorship bias, corporate-action risks, changing correlations and frictionless rebalancing assumptions remain material. See [METHODOLOGY.md](../METHODOLOGY.md).

Source-setting references: [yfinance download parameters](https://ranaroussi.github.io/yfinance/reference/api/yfinance.download.html), [Yahoo ^IRX historical field definitions](https://finance.yahoo.com/quote/%5EIRX/history/). The installed yfinance adjustment implementation was also inspected: it renames Yahoo `Adj Close` to `Close` when `auto_adjust=True`.

## Momentum notebook 02 — frozen-data rerun

The completed `notebooks/02_momentum_strategy.ipynb` uses the same verified 50-company list and cache. Do not acquire new data for this rerun. The original market notebook and its reviewed outputs remain unchanged.

```bash
.venv-research/bin/python -m scripts.run_momentum_research
.venv-research/bin/python -m scripts.momentum_robustness
.venv-research/bin/python -m scripts.build_market_dashboard
.venv-research/bin/python -m unittest discover -s tests -v
.venv-research/bin/python -m scripts.build_market_dashboard --check
.venv-research/bin/python scripts/export_dashboard.py --check
```

The runner starts a fresh Jupyter kernel with the selected Python environment, executes all 16 code cells, and writes notebook output only after successful completion. No additional packages beyond the locked research environment are required. The reusable calculation functions are in `scripts/momentum_research.py`; the notebook supplies the sequence, explanations, diagnostics, charts, summary and verification. `scripts/momentum_outputs.py` independently checks the raw-price signal and rank identities, every holding-month endpoint return, daily benchmark alignment, risk-free conversion and performance estimates before persisting outputs.

`data/reviewed/momentum/` holds 20 Parquet tables: monthly endpoint prices, signals, target weights, selected holdings, daily and monthly returns, wealth and indexed wealth, drawdowns, performance summary, annual returns, best/worst full years, rebalance diagnostics, end-of-month drifted weights, aggregate diagnostics, company selection frequency, the first-rebalance raw-price walkthrough, stress results, and two sampled chart frames. The manifest hashes every frame, both calculation and verification helpers, the shared market helpers, notebook source, and the frozen input manifest. `data/provenance/momentum-verification.json` is its tracked copy.

All signal and target-weight dates are retained, including pre-SPY formation history. Evaluated holdings and portfolio outputs begin at the first SPY-comparable allocation: initial wealth on 1993-01-29 and daily returns from 1993-02-01 to 2026-09-10. There are 8,460 shared daily returns and 404 holding months; September 2026 is partial. Best/worst calendar years exclude the partial first/final years. No selected quote was missing in this snapshot, so the conservative write-off fallback did not affect observed results.

The existing `build_market_dashboard` command now loads the verified market, baseline momentum and robustness output sets and calls `scripts/build_momentum_dashboard.py` to attach the strategy section. Missing or stale momentum outputs fail the command; it cannot silently erase the completed strategy. It reuses the market section objects without changing their numbers, sources, observations or sampling. Market definitions in `METHODOLOGY.md` are preserved and distinct Momentum Strategy sections are appended from the reviewed notebook metadata.

Momentum charts select already-calculated month-end observations, initial/final observations and each calendar year's daily drawdown minima for both series. No estimators run in the exporter or frontend. Python tests cross-check every published momentum metric, every numeric table cell and every chart coordinate/value against the reviewed frames. The guide reads its illustrative strategy/SPY CAGR directly from that snapshot. The v3 definition additionally requires the fixed rule, costs, frequency and evaluation dates; Python and TypeScript reject inconsistent formation periods and unsupported rule settings.

For final local UI checks, build and start `web/`, run `npm run smoke`, and inspect `/momentum` and `/guide` at desktop, tablet and mobile widths. The Research Guide is chapter 01; notebook filenames retain their research numbering. Fresh CI clones lack ignored raw/reviewed caches, so cache-dependent research integration tests are explicitly skipped there; deterministic timing/accounting, schema and frontend tests still run. Exact research reruns on another machine require transfer of the frozen raw and reviewed cache directories and their manifests.

## Momentum robustness — existing frozen baseline

With the existing reviewed baseline and frozen cache, run:

```bash
.venv-research/bin/python -m unittest tests.test_momentum_robustness -v
.venv-research/bin/python -m scripts.momentum_robustness
.venv-research/bin/python -m scripts.build_market_dashboard
.venv-research/bin/python -m unittest discover -s tests -v
.venv-research/bin/python -m scripts.build_market_dashboard --check
.venv-research/bin/python scripts/export_dashboard.py --check
```

This path neither downloads prices nor rewrites the baseline notebook or its reviewed tables. Use `python -m scripts.momentum_robustness --no-write` to recompute and independently verify the sensitivities without changing the output files or verification timestamp.

The six local Parquet frames in `data/reviewed/momentum_robustness/` retain cost summary, all four cost-adjusted daily return series plus SPY, timing comparison, next-day daily returns and wealth, and execution diagnostics. `scripts/momentum_robustness_outputs.py` independently reconstructs every baseline turnover from raw prices, reconciles all cost wealth paths against the cumulative product of cost factors, verifies each delayed daily path and monthly endpoint, and checks 56 summary metrics with NumPy identities. Zero-cost daily returns and SPY must match the baseline exactly.

The local manifest and its tracked copy `data/provenance/momentum-robustness-verification.json` bind the results to the baseline manifest, all baseline frame hashes, frozen input manifest, calculation and verification helpers, assumptions, runtime and output hashes. The loader rejects stale or incomplete records. Re-running either baseline research notebook requires regenerating the sensitivity verification and combined snapshot afterward. The dashboard adapter uses only checked frames and generates the methodology document from the same metadata, so sensitivity explanations survive future exports.

See [MOMENTUM_ROBUSTNESS_VERIFICATION_REPORT.md](MOMENTUM_ROBUSTNESS_VERIFICATION_REPORT.md) for the verified results and the explicit monthly cash-gap execution convention.
