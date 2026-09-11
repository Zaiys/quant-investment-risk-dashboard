# Reproducing the verified market analysis

The recovered source is preserved at commit `c9fd6cc15537cdd5a5c23a4b67ed260502d4d407`. Research work is on `feature/vercel-dashboard`; the original checkout and its user-authored momentum work are separate. No merge or deployment is part of this workflow.

## Data and execution

Use Python 3.12. `requirements-research-lock.txt` records the exact environment used for verification; `requirements.txt` declares the supported research dependencies.

```bash
python3.12 -m venv .venv-research
.venv-research/bin/python -m pip install -r requirements-research-lock.txt
.venv-research/bin/python -m scripts.market_data --end 2026-09-11
.venv-research/bin/python -m scripts.run_market_research
.venv-research/bin/python -m scripts.build_market_dashboard
.venv-research/bin/python -m scripts.build_market_dashboard --check
.venv-research/bin/python scripts/export_dashboard.py --check
.venv-research/bin/python -m unittest discover -s tests -v
```

Acquisition requests Yahoo Finance daily histories from 1980-01-01 through 2026-09-10 (the end argument is exclusive). One symbol is requested at a time, with bounded retry/backoff and resumable partial results for the same requested interval. An invalid or incomplete symbol fails acquisition; it is never replaced with zeros or another provider. Successful input downloads include all 55 assets and the ^IRX yield proxy.

`data/raw/prices.parquet`, `data/raw/risk_free.parquet` and `data/raw/manifest.json` are the local frozen inputs. The manifest includes source, each download timestamp, requested dates, settings, actual dates/counts, library versions and SHA-256 checksums. A reviewed copy of the acquisition manifest is tracked at `data/provenance/market-inputs.json`. The cache loader checks the input hashes, universe, dates and settings. It never downloads, fills asset prices or switches providers.

To rerun this exact snapshot, keep the existing raw cache and **skip acquisition**. Yahoo can revise historical adjustments; re-downloading the same date interval later does not guarantee the same values or hashes. Raw inputs, partial responses and local notebook output tables are ignored by Git. Transfer the complete cached files and manifest together when exact reproduction is required on another machine. A fresh acquisition is a new dataset requiring another verification and export.

The runner executes only `notebooks/01_market_exploration.ipynb` from top to bottom in a fresh Jupyter kernel and writes its outputs only after successful completion. It checks notebook format, syntax, execution counts and errors. The notebook reads cached inputs, applies the documented research, verifies identities, and saves computed tables under `data/reviewed/`. No momentum notebook is created or executed.

## Reviewed outputs and dashboard

`data/reviewed/manifest.json` binds the computed tables to the notebook source, research-helper hashes and input manifest. `data/provenance/research-verification.json` preserves this verification record in Git, including asset sample counts, stress dates, alignment checks and output hashes. Notebook output images/display tables are not parsed as financial data.

`scripts/build_market_dashboard.py` reads the verified tables, rejects stale source or changed output files, maps finite scalar values without rounding, and publishes version 2 through the existing `scripts/export_dashboard.py` validator. No financial estimators are implemented in the adapter or TypeScript. It also writes `METHODOLOGY.md` from the same reviewed metadata used in the website.

Long-history chart exports contain actual observed quarter ends, every series' first/final valid observations, and gap boundaries if present. The adapter selects existing values only. Stress curves retain daily observations. All estimates and drawdown extrema use full daily data. The full daily indexed series are retained in local reviewed Parquet files. This avoids turning the finished website's accessible chart tables into hundreds of thousands of rows; the sampling frequency is explicit on each chart.

The snapshot retains the notebook's separation between individual histories and the 50-company common period. It preserves null SPY beta, because the original asset beta table excludes SPY itself. Momentum remains an explicit awaiting state. The server reads the original JSON text and parses it at runtime, avoiding the build tool’s numeric-literal rewriting. The snapshot download returns that validated source text byte for byte. Regression tests cover this exact-value boundary. Long legends/tooltips are bounded within the existing chart panels so the full asset universe remains usable at mobile widths; the design and version 2 schema are unchanged.

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
