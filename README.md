# Quantitative Investment & Risk Analysis

A research presentation layer for exploring markets, comparing risk and return, examining portfolios, and reviewing stress scenarios. Python analysis supplies the results; the web application presents them with their sources and assumptions.

**Live demo:** pending deployment.

## Current research status

The recovered market notebook has been executed and verified using frozen Yahoo Finance inputs. The version 3 dashboard snapshot covers 50 companies and five benchmark ETFs through **10 September 2026**. Full available histories begin as early as 2 January 1980; the shared 50-company period begins on 2 January 2013.

Overview, Market Explorer, Risk vs Return, Diversification & Correlation, Portfolio Analysis, Stress Testing and Methodology are populated from reviewed Python outputs. See [METHODOLOGY.md](METHODOLOGY.md) for formulas and limitations, and [docs/REPRODUCIBILITY.md](docs/REPRODUCIBILITY.md) for input acquisition, cached execution and exact export checks.

`notebooks/02_momentum_strategy.ipynb` is authored, executed and verified. Its single monthly top-ten, 12-month momentum rule uses the same frozen company prices and compares with SPY on identical dates from 1 February 1993 to 10 September 2026. Chapter 07 presents the reviewed outputs; chapter 09 explains the project for beginners. See [the momentum verification report](docs/MOMENTUM_VERIFICATION_REPORT.md). This is a biased surviving-company historical experiment, gross of trading costs, not predictive evidence.

## Application

| Chapter                          | Presentation                                                                |
| -------------------------------- | --------------------------------------------------------------------------- |
| 01 Overview                      | Research questions, asset universe, date coverage and publication record    |
| 02 Market Explorer               | Indexed performance, asset inspection and available-history dates           |
| 03 Risk vs Return                | Metric definitions, asset inspection and exported risk-return scatter plots |
| 04 Diversification & Correlation | Interactive correlation matrices and period-specific relationships          |
| 05 Portfolio Analysis            | Portfolio/SPY comparisons, weights and component risk contributions         |
| 06 Stress Testing                | Historical scenario selection and exported portfolio/asset comparisons      |
| 07 Quantitative Strategy         | Verified momentum performance, holdings, turnover and limitations           |
| 08 Methodology & Limitations     | Published assumptions and an explicitly unverified review checklist         |
| 09 Research Guide                | Beginner explanations, chapter reading route and an optional future video   |

The presentation uses paper tones, ink-like text, restrained green accents and editorial typography. Each chapter has its own research question and layout. The methodology chapter distinguishes documented assumptions from questions that still need checking. The Global Financial Crisis, COVID crash and 2022 selloff use the exact windows documented in the verified notebook.

Available outputs use metric strips, line/bar/scatter charts, correlation matrices and sortable tables. Optional entity and scenario selectors inspect supplied records; they do not recalculate values. Every available section shows source, observation period, data date, methodology and notes. Chart values remain accessible as tables; missing observations remain missing. Raw share prices are explicitly distinguished from comparable indexed performance.

## Run locally

Prerequisites: Node.js 22 LTS (22.13 or newer), npm, and optionally Python 3.10+ for the export helper. `.nvmrc` selects Node 22. The frontend runs without Python, API keys or environment variables.

From the repository root:

```bash
cd web
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). If that port is occupied, use `npm run dev -- --port 3001` and the corresponding URL.

To verify and run the production build, stop the development server first:

```bash
cd web
npm run build
npm run start
```

With the production server running, use `npm run smoke` in a second terminal inside `web/` to verify all nine chapter routes, the snapshot download and the 404 response.

## Architecture

```text
notebooks/                     Verified market and momentum notebooks
scripts/market_data.py         Resumable Yahoo acquisition and checked offline loading
scripts/run_market_research.py  Fresh-kernel market notebook execution
scripts/build_market_dashboard.py  Combined verified market/momentum adapter to v3
data/provenance/               Tracked input, verification and snapshot hash records
scripts/export_dashboard.py    Validation and atomic JSON publication; no finance logic
requirements-dashboard.txt     Separate optional export-validation dependency
web/
  src/app/                     Next.js routes, layouts, metadata and responsive styles
  src/components/              Navigation, charts, metrics, provenance and sortable tables
  src/lib/                     Type definitions, validation and display formatting
  src/data/dashboard.schema.json  Shared versioned data contract
  src/data/dashboard.json      Verified market and momentum analysis snapshot
  tests/                       Parsing/UI tests and isolated synthetic fixtures
  vercel.json                  Next.js deployment settings
  package-lock.json            Locked frontend dependencies
  .vercelignore                Excludes test fixtures from CLI deployment uploads
tests/                         Python exporter tests
docs/DATA_CONTRACT.md           Data shapes and Python integration instructions
docs/DEPLOYMENT.md              Vercel preview and production instructions
docs/DESIGN.md                  Research-specific design system and accessibility rules
.github/workflows/dashboard.yml  Automated validation on pushes and pull requests
```

Next.js statically prerenders all nine chapters from the validated JSON snapshot. The `/export` route downloads the same snapshot. No database, login, live data service, trading execution or background calculation is required.

The browser formats numbers and arranges chart coordinates; it does not calculate returns, annualise volatility, estimate Sharpe ratios, construct weights, rebalance portfolios or simulate strategies. Those decisions belong to the Python research.

## Feed the app from Python

Install the optional export dependency separately from the research environment:

```bash
python3 -m venv .venv-dashboard
.venv-dashboard/bin/python -m pip install -r requirements-dashboard.txt
.venv-dashboard/bin/python scripts/export_dashboard.py --check
```

Once an analysis produces a complete snapshot following [the data contract](docs/DATA_CONTRACT.md), publish it with:

```bash
.venv-dashboard/bin/python scripts/export_dashboard.py --input path/to/reviewed-dashboard.json
```

Or call `write_dashboard(sections, research=research_metadata, methodology=methodology_document)` from a Python export adapter. It validates the already-computed outputs, records the export time separately from the supplied research update date, and atomically writes `web/src/data/dashboard.json`. Invalid exports do not replace the previous snapshot. The helper publishes a complete snapshot: include all sections to retain, because omitted sections are marked awaiting.

Commit the reviewed snapshot and rebuild/redeploy to update the public app. There is no live connection to a running notebook. Do not commit sensitive information or raw datasets in this presentation snapshot; its contents are available to dashboard visitors.

## Checks

After setting up the research environment as described in [reproducibility instructions](docs/REPRODUCIBILITY.md), from the repository root:

```bash
.venv-research/bin/python -m unittest discover -s tests -v
.venv-research/bin/python -m scripts.build_market_dashboard --check
.venv-research/bin/python scripts/export_dashboard.py --check
cd web
npm run test
npm run lint
npm run build
npm run typecheck
```

Tests cover validation, source metadata, missing/non-finite values, dates, chart coordinate alignment, sorting, asset/scenario selection, correlation matrices, accessible chart values, atomic publication, momentum timing/accounting and the v3 strategy definition. Test fixtures are explicitly synthetic and never imported by the application. ESLint 9 is pinned because the current Next.js React lint rules are incompatible with ESLint 10.

For an isolated visual test of populated components, run `npm run test:preview` in `web/` and open the printed local URL. The page is labelled as synthetic test data and does not change the production snapshot.

## Deploy to Vercel

Full instructions: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Quick preview from this branch, starting at the repository root:

```bash
cd web
npx vercel login
npx vercel link
npx vercel deploy --target=preview
```

When creating a project from this directory, use `./` as its code directory. Select Next.js, Node 22.x, `npm ci` and `npm run build`; leave output directory at the Next.js default. No environment variables are needed.

For a Git-connected project imported from the repository root, set **Root Directory = `web`** and retain **Production Branch = `master`**. The current `master` does not contain the frontend until this feature branch is reviewed and merged. Use a CLI preview first. Deployment and merging are separate actions; no deployment is performed by the test workflow.

## Research boundaries

The dashboard validates presentation structure, not financial correctness. A successful build does not verify investment methodology, data quality, statistical validity, or whether observation periods are comparable. Supply those definitions and limitations with each export.

Momentum uses one pre-specified rule without parameter tuning. The notebook documents formation-close execution, missing-price write-offs, drift between monthly rebalances, universe selection bias, costs and the limits of historical inference.

Version 3 preserves the market sections and deliberately adds a reviewed momentum definition. Earlier snapshot versions must be re-exported with the new structure; no values or assumptions are inferred during migration.
