# Research data handoff

## Ownership

Python owns all calculations and methodological choices. The presentation layer accepts finished values and supplied explanations. The exporter does not execute notebooks, download prices, parse notebook display output, or choose formulas or assumptions.

The canonical contract is `web/src/data/dashboard.schema.json` (JSON Schema draft 7). Python validates it with `jsonschema`; TypeScript validates the same file with Ajv before building. Both apply matching consistency checks for dates, table shape and chart coordinates.

## Snapshot

A snapshot contains:

- `schemaVersion`: exactly `3`.
- `generatedAt`: ISO 8601 timestamp including a time zone, or `null` before the first export. Available results require a timestamp.
- `sections`: exactly `market`, `risk-return`, `correlation`, `portfolio`, `stress`, and `momentum`.

A missing section has `status: "awaiting"` and a plain-language `reason`. It has no metric, chart or table arrays. Missing is never represented as a zero result.

An available section has `status: "available"`, `source`, `metrics`, `charts`, and `tables`. It may also contain `matrices`. At least one widget array must be nonempty. Widget IDs must be unique within the section.

Version 3 accepts momentum as awaiting or as a dedicated available section. Available momentum requires `source.path = "notebooks/02_momentum_strategy.ipynb"` and `definition`, in addition to the ordinary widget arrays. The definition requires `lookbackMonths: 12`, `topN: 10`, `rebalance: "monthly"`, `weighting: "equal at formation; drift within month"`, `transactionCosts: 0`, `skipMonth: false`, `initialWealthDate`, `firstReturnDate`, `lastReturnDate`, `dailyObservations`, and `holdingMonths`. Counts are positive integers. Initial wealth must precede the first return; the source period must run from initial wealth through the last return. These are reviewed research choices for one specified experiment; unsupported alternatives require another deliberate contract change.

## Momentum sensitivity extension

Version 3 additionally permits a `sensitivities` object on available momentum. It is optional for older v3 producers, but the combined reviewed-output adapter requires the local robustness manifest and always exports it. Missing or stale reviewed robustness data stops that adapter before publication.

The object requires `definition`, its own `source` with `path: "scripts/momentum_robustness.py"`, and exactly two `tables`: `momentum-cost-sensitivity` followed by `momentum-execution-sensitivity`. Cost rows are ordered `0.0`, `5.0`, `10.0`, `20.0`; timing rows are `FORMATION_CLOSE_BASELINE`, `NEXT_DAY_CLOSE`, `SPY`. Python and TypeScript validate the shared schema, row shapes, numeric types, references and widget-ID uniqueness across baseline and sensitivity tables. The source period and data date, first return and daily count must match the baseline.

The sensitivity definition fixes `baselineUnchanged: true`, `costBps: [0, 5, 10, 20]`, `costBasis: "one-way turnover including initial allocation"`, `executionPolicy: "cash through next trading-day close every month"` and `executionTransactionCosts: 0`, plus `firstReturnDate` and `dailyObservations`. The baseline definition continues to require zero transaction costs and its original rule.

The cost table presents CAGR, volatility, Sharpe, maximum drawdown, mean recurring portfolio drag in bps, and CAGR difference in percentage points. The timing table adds beta and correlation. Bps and percentage-point values are already converted in Python and use the `number` display unit; return/volatility/drawdown fractions use `percent`. The browser only formats and sorts supplied values. Both sensitivity tables remain visible together when a baseline entity is selected, with independent source notes and explicit comparison labels.

## Research record and methodology

The root also requires `research` and `methodology`.

`research` contains `updatedAt` (research update date in `YYYY-MM-DD`, or null), `period` (`{start, end}` or null), and `universe` (an array of `{id, name, availableFrom, availableTo}`). Asset IDs must be unique and date intervals must be ordered. Use an empty array when the universe has not been exported. These fields populate the overview and available-history register. They are supplied explicitly: the app never treats export time as research time or infers a common observation period from asset histories.

`methodology` is either `{status: "awaiting", reason}` or `{status: "available", source, items}`. Available items are `{id, title, detail}`, with unique IDs and a full source object. Available methodology requires `generatedAt`. Only this supplied text is labelled documented. The website's separate review checklist is labelled unverified and does not assert that its subjects were implemented.

## Source context

Every available section requires:

| Field                        | Meaning                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `path`                       | Repository-relative analysis or output path; no absolute paths or parent traversal |
| `label`                      | Human-readable source name                                                         |
| `asOf`                       | Data date in `YYYY-MM-DD`                                                          |
| `period.start`, `period.end` | Observation period, in the same date format                                        |
| `methodology`                | Supplied formulas/assumptions context or a readable reference description          |
| `notes`                      | Array of limitations or explanatory notes; may be empty                            |

The period must be ordered and cannot end after `asOf`. These fields are author-supplied provenance; validation does not establish that the source file exists or that the analysis is correct. Record asset-specific coverage in `research.universe` and, when needed, a more detailed table. Export common-period comparisons only when the Python analysis has explicitly computed them.

## Units and missing data

`number` displays a number; `ratio` displays two decimal places; `percent` displays a raw fraction as a percentage. For example, the **formatting convention** is that a fraction of `0.1` displays as `10%`; this is not a reported investment result. The exporter performs no conversion, rounding, or unit inference.

Use JSON `null` for missing observations. Do not supply `NaN`, infinity, percent strings, or stringified numeric values. The frontend displays missing metrics/table cells as an em dash and retains gaps in lines. Display rounding does not change the downloadable raw snapshot.

Dates in textual chart axes are displayed as supplied. Use ISO date strings where applicable and label the frequency in the chart description. The dashboard does not resample observations.

## Metrics

Each metric requires `id`, `label`, `value` (finite number or null), `unit` (`number`, `percent`, `ratio`), and `note`. Optional `entityId` and `scenarioId` associate it with inspection controls.

Use the research's precise label and units. State annualisation basis, period, benchmark or risk-free-rate assumptions where relevant. The UI makes no assumption that a metric is CAGR, arithmetic return, volatility or Sharpe ratio.

## Charts

Each chart requires:

- `id`, `title`, `description`.
- `kind`: `line`, `bar`, or `scatter`.
- `xLabel`, `yLabel`: axis descriptions.
- `xUnit`: `text`, `number`, `percent`, or `ratio`.
- `unit`: y-axis unit (`number`, `percent`, or `ratio`).
- `series`: nonempty array of `{id, label, points}`.
- Each point is `{x, y}`; `x` is a string for `text` axes or a finite number otherwise, and `y` is a finite number or null.

Series IDs are unique. Within a series, x coordinates are unique. Line and bar series must contain the same x coordinates in the same order: align the already-computed observations in Python and represent missing observations as null. The chart preserves supplied order and uses straight line segments, without smoothing, financial transformations or filling gaps.

Scatter plots require numeric x coordinates. Use one-point series to name individual assets when useful. Separate asset series may use the same x coordinate. Every chart exposes a collapsible table of its raw values for accessibility. Tables mount when opened and paginate in source order at 100 rows per page. The complete snapshot remains downloadable, including without JavaScript.

## Tables

Each table requires `id`, `title`, `description`, `columns` and `rows`.

- Columns: `{key, label, unit}`; `unit` may also be `text`.
- Rows: `{id, cells}`; cells appear in exactly the column order.
- Text columns accept strings or null; numeric columns accept numbers or null.
- Column keys and row IDs are unique within a table.

Column headers sort values for viewing. Numeric values are sorted numerically, and nulls remain last in both directions. Sorting never modifies the snapshot.

## Inspection controls

Available sections may include:

- `entities`: nonempty array of `{id, label}` with unique IDs.
- `scenarios`: nonempty array of `{id, label, period: {start, end}, notes}` with unique IDs and ordered dates.

Optional `entityId` can tag metrics, chart series and table rows. Optional `scenarioId` can tag metrics, charts and tables. References must resolve to the section's declared IDs. Export distinct scenario-specific charts in Python; the browser does not crop a full-period series and recompute its statistics.

Selectors retain matching records and untagged comparison outputs. A visible note explains that untagged outputs retain their original period. Do not leave an output untagged if that would make it misleading across selections. Selection never mutates source values. Each chart also permits inspection of one supplied series.

## Correlation matrices

An available section may supply `matrices`, each with `id`, `title`, `description`, `labels` and `values`. Labels are a nonempty array of `{id, label}` with unique IDs. Values form a square matrix in label order; each cell is a finite number from -1 to 1 or null. Include the observation window and estimation basis in the section's source context. The presentation verifies shape and bounds, not the estimator, symmetry or financial validity.

The semantic table displays exact supplied values, with restrained contrast bands as a visual aid. Column buttons select an asset and display its relationships. No correlations, beta estimates, rankings or diversifier conclusions are computed in the browser. Matrices retain their supplied comparison context when other outputs are filtered.

## Python integration

Run an export adapter from the repository root or add the repository root to your Python import path. Use values and metadata that already exist in the reviewed analysis:

```python
from scripts.export_dashboard import write_dashboard

# These dictionaries are assembled from the reviewed analysis outputs.
# Their metrics, charts, tables, dates and assumptions follow the contract above.
write_dashboard({
    "market": market_section,
    "risk-return": risk_return_section,
    "correlation": correlation_section,
    "portfolio": portfolio_section,
    "stress": stress_section,
    "momentum": reviewed_momentum_section,
}, research=research_metadata, methodology=methodology_document)
```

The variables above are integration interfaces, not implemented research or invented results. `write_dashboard` serializes ordinary Python dictionaries/lists/scalars. Convert pandas/NumPy containers to their Python equivalents in the adapter; explicitly map missing observations to `None`. Do not infer financial units during that conversion.

The metadata variables are explicit reviewed dictionaries with the shapes above. Omitting either keyword argument publishes unknown research metadata or awaiting methodology, respectively.

You may omit unavailable sections. The helper always writes a complete snapshot, so pass all sections you want to retain. It adds a current UTC export timestamp and marks any omitted section awaiting. It does not overwrite notebooks, and output targets must use `.json`.

Alternatively, produce a complete JSON snapshot using your own adapter, then run:

```bash
.venv-dashboard/bin/python scripts/export_dashboard.py --input path/to/reviewed-dashboard.json --check
.venv-dashboard/bin/python scripts/export_dashboard.py --input path/to/reviewed-dashboard.json
```

The second command validates before atomically replacing the app snapshot. It preserves the supplied export timestamp. The Next.js build validates again, then prerenders the pages. Publication requires committing the JSON and rebuilding or redeploying.

## Version 3 migration

Version 3 extends version 2 with the dedicated reviewed momentum shape. Versions 1 and 2 now fail validation. Preserve all previously supplied market sections and research metadata, set the new version, and add either an awaiting momentum section or its full reviewed definition, source and outputs. Do not relabel a market section as momentum or invent missing results. JSON Schema, TypeScript types, Python packaging, semantic validation, tests and the route were updated together.

The ordinary market schemas and financial estimators remain unchanged. Version 3 intentionally constrains momentum to the pre-specified rule; it is not a generic strategy optimizer. The beginner guide is a static editorial route, not another computed-results section. Its numeric example references the validated momentum metrics.

## Verified market adapter

The market notebook now writes checked numeric tables to `data/reviewed/` through `scripts/research_outputs.py`. Run `python -m scripts.build_market_dashboard` to map those tables into the version 3 contract, or add `--check` to require exact agreement with the existing snapshot. The adapter performs presentation sampling of existing long-history points without computing financial estimators or rounding. All daily calculations remain in Python research.

See [REPRODUCIBILITY.md](REPRODUCIBILITY.md) for cache provenance, execution, sampling frequency, output hashes and the independent published-value checks. The same command now requires reviewed momentum outputs and attaches them using `scripts/build_momentum_dashboard.py`. Each market section is preserved. See `data/provenance/momentum-verification.json` for strategy provenance.

The server reads and validates the original JSON text rather than importing it as a compiled JSON module. This prevents numeric-literal rewriting during the build. `/export` returns the original validated bytes; production smoke checks verify byte-for-byte equality.
