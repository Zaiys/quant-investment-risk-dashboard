# Quantitative Investment & Risk Dashboard

A research presentation layer for exploring markets, comparing risk and return, examining portfolios, and reviewing stress scenarios. Python analysis supplies the results; the web application presents them with their sources and assumptions.

**Live demo:** pending deployment.

## Current research status

The repository currently has no published analysis outputs. At implementation, `notebooks/01_market_exploration.ipynb`, `METHODOLOGY.md`, `PROJECT.md` and `requirements.txt` were empty. No research was reconstructed or executed, and no financial assumptions were introduced.

The application deliberately shows **Awaiting data** until reviewed Python outputs are exported. Synthetic numbers exist only in automated test fixtures; the production dashboard contains no sample performance data.

`notebooks/02_momentum_strategy.ipynb` is reserved for separately authored research. The dashboard does not create or modify that notebook. Its momentum page is UI-only, and version 1 of the export contract rejects momentum results.

## Application

| View               | Presentation                                                    |
| ------------------ | --------------------------------------------------------------- |
| Overview           | Project context, export coverage and navigation                 |
| Market Explorer    | Exported market metrics, price/index series and coverage tables |
| Risk vs Return     | Exported comparison metrics, scatter plots and result tables    |
| Portfolio Analysis | Exported portfolio metrics, composition and risk contributions  |
| Stress Testing     | Exported scenario outcomes and comparisons                      |
| Momentum Strategy  | Explicit waiting state for the separate momentum notebook       |

The four analysis views use reusable metric, line/bar/scatter chart and sortable table components. Each available section shows source, observation period, data date, methodology and notes. Chart values remain accessible as tables; missing observations remain missing.

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

With the production server running, use `npm run smoke` in a second terminal inside `web/` to verify all six routes, the snapshot download and the 404 response.

## Architecture

```text
notebooks/                     Research files; preserved
src/                           Optional future Python analysis modules
scripts/export_dashboard.py    Validation and atomic JSON publication; no finance logic
requirements-dashboard.txt     Separate optional export-validation dependency
web/
  src/app/                     Next.js routes, layouts, metadata and responsive styles
  src/components/              Navigation, charts, metrics, provenance and sortable tables
  src/lib/                     Type definitions, validation and display formatting
  src/data/dashboard.schema.json  Shared versioned data contract
  src/data/dashboard.json      Published analysis snapshot; currently awaiting data
  tests/                       Parsing/UI tests and isolated synthetic fixtures
  vercel.json                  Next.js deployment settings
  package-lock.json            Locked frontend dependencies
  .vercelignore                Excludes test fixtures from CLI deployment uploads
tests/                         Python exporter tests
docs/DATA_CONTRACT.md           Data shapes and Python integration instructions
docs/DEPLOYMENT.md              Vercel preview and production instructions
.github/workflows/dashboard.yml  Automated validation on pushes and pull requests
```

`src/` is a future integration location; no finance modules have been fabricated. Next.js statically prerenders all six views from the validated JSON snapshot. The `/export` route downloads the same snapshot. No database, login, live data service, trading execution or background calculation is required.

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

Or call `write_dashboard(sections)` from a Python export adapter. It validates the already-computed outputs, records the export time, and atomically writes `web/src/data/dashboard.json`. Invalid exports do not replace the previous snapshot. The helper publishes a complete snapshot: include all sections to retain, because omitted sections are marked awaiting.

Commit the reviewed snapshot and rebuild/redeploy to update the public app. There is no live connection to a running notebook. Do not commit sensitive information or raw datasets in this presentation snapshot; its contents are available to dashboard visitors.

## Checks

From the repository root:

```bash
.venv-dashboard/bin/python -m unittest discover -s tests -v
.venv-dashboard/bin/python scripts/export_dashboard.py --check
cd web
npm run test
npm run lint
npm run build
npm run typecheck
```

Tests cover validation, source metadata, missing/non-finite values, dates, chart coordinate alignment, sorting, accessible chart values, atomic publication and the momentum guard. Test fixtures are explicitly synthetic and never imported by the application. ESLint 9 is pinned because the current Next.js React lint rules are incompatible with ESLint 10.

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

Momentum integration remains a separate change after the notebook and outputs are reviewed. It will require deliberately extending the contract and replacing the UI-only state; no strategy settings or performance results have been preselected.
