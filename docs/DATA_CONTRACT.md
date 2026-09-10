# Research data handoff

## Ownership

Python owns all calculations and methodological choices. The presentation layer accepts finished values and supplied explanations. The exporter does not execute notebooks, download prices, parse notebook display output, or choose formulas or assumptions.

The canonical contract is `web/src/data/dashboard.schema.json` (JSON Schema draft 7). Python validates it with `jsonschema`; TypeScript validates the same file with Ajv before building. Both apply matching consistency checks for dates, table shape and chart coordinates.

## Snapshot

A snapshot contains:

- `schemaVersion`: exactly `1`.
- `generatedAt`: ISO 8601 timestamp including a time zone, or `null` before the first export. Available results require a timestamp.
- `sections`: exactly `market`, `risk-return`, `portfolio`, `stress`, and `momentum`.

A missing section has `status: "awaiting"` and a plain-language `reason`. It has no metric, chart or table arrays. Missing is never represented as a zero result.

An available section has `status: "available"`, `source`, `metrics`, `charts`, and `tables`. At least one of the three widget arrays must be nonempty. Widget IDs must be unique within the section.

Momentum accepts only the awaiting shape in version 1. The Python helper also rejects momentum as an input section. This is an intentional UI-only boundary until the separate research is reviewed.

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

The period must be ordered and cannot end after `asOf`. These fields are author-supplied provenance; validation does not establish that the source file exists or that the analysis is correct. Record asset-specific coverage in a table when periods differ. Export common-period comparisons only when the Python analysis has explicitly computed them.

## Units and missing data

`number` displays a number; `ratio` displays two decimal places; `percent` displays a raw fraction as a percentage. For example, the **formatting convention** is that a fraction of `0.1` displays as `10%`; this is not a reported investment result. The exporter performs no conversion, rounding, or unit inference.

Use JSON `null` for missing observations. Do not supply `NaN`, infinity, percent strings, or stringified numeric values. The frontend displays missing metrics/table cells as an em dash and retains gaps in lines. Display rounding does not change the downloadable raw snapshot.

Dates in textual chart axes are displayed as supplied. Use ISO date strings where applicable and label the frequency in the chart description. The dashboard does not resample observations.

## Metrics

Each metric requires `id`, `label`, `value` (finite number or null), `unit` (`number`, `percent`, `ratio`), and `note`.

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

Scatter plots require numeric x coordinates. Use one-point series to name individual assets when useful. Separate asset series may use the same x coordinate. Every chart exposes a collapsible table of its raw values for accessibility.

## Tables

Each table requires `id`, `title`, `description`, `columns` and `rows`.

- Columns: `{key, label, unit}`; `unit` may also be `text`.
- Rows: `{id, cells}`; cells appear in exactly the column order.
- Text columns accept strings or null; numeric columns accept numbers or null.
- Column keys and row IDs are unique within a table.

Column headers sort values for viewing. Numeric values are sorted numerically, and nulls remain last in both directions. Sorting never modifies the snapshot.

## Python integration

Run an export adapter from the repository root or add the repository root to your Python import path. Use values and metadata that already exist in the reviewed analysis:

```python
from scripts.export_dashboard import write_dashboard

# These dictionaries are assembled from the reviewed analysis outputs.
# Their metrics, charts, tables, dates and assumptions follow the contract above.
write_dashboard({
    "market": market_section,
    "risk-return": risk_return_section,
    "portfolio": portfolio_section,
    "stress": stress_section,
})
```

The variables above are integration interfaces, not implemented research or invented results. `write_dashboard` serializes ordinary Python dictionaries/lists/scalars. Convert pandas/NumPy containers to their Python equivalents in the adapter; explicitly map missing observations to `None`. Do not infer financial units during that conversion.

You may omit unavailable sections. The helper always writes a complete snapshot, so pass all sections you want to retain. It adds a current UTC export timestamp and fixes momentum to awaiting. It does not overwrite notebooks, and output targets must use `.json`.

Alternatively, produce a complete JSON snapshot using your own adapter, then run:

```bash
.venv-dashboard/bin/python scripts/export_dashboard.py --input path/to/reviewed-dashboard.json --check
.venv-dashboard/bin/python scripts/export_dashboard.py --input path/to/reviewed-dashboard.json
```

The second command validates before atomically replacing the app snapshot. It preserves the supplied export timestamp. The Next.js build validates again, then prerenders the pages. Publication requires committing the JSON and rebuilding or redeploying.

## Evolution

To add momentum later, first review the separately created `notebooks/02_momentum_strategy.ipynb` and agree its export definitions. Then update the JSON Schema, TypeScript types, Python helper, validation tests and momentum route together. The existing widget components can present its reviewed outputs. Changing formulas, assumptions or data periods remains Python research work.

The schema deliberately contains no hardcoded universe, portfolio allocation, signal definition, lookback period, rebalancing schedule, cost assumption or performance estimate.
