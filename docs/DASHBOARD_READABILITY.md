# Dashboard readability revision

This presentation-only revision is based on the reviewed feature branch at `7986235f939ba277f0a043a4c0eb5589059754b3`. It does not update market data, rerun the research, or replace any baseline or sensitivity result.

## Reading the figures

SPY remains blue and dashed. Momentum and the hypothetical portfolio use green in their separate benchmark comparisons. Other tickers receive stable colours and line patterns from their identifiers, not their positions in a filtered list. Ticker text, hover values and accessible tables remain available; colour is not the only identification mechanism. Grouped bar comparisons also use a patterned fill for dashed-series identities.

Positive indexed-wealth charts open on a logarithmic scale, with a labelled linear alternative. Both modes read exactly the same source values and bases on one shared axis. Nonpositive values disable the log option instead of disappearing. Drawdown and annual return charts stay linear and include a zero line. ISO date observations are positioned by elapsed calendar time, while source tables retain the original date strings.

Normal line comparisons start with no more than five series. Portfolio and strategy comparisons use their benchmark pair. Other large line charts use a declared illustrative selection, not the highest returning names. The comparison picker supports searching, adding and removing tickers, resetting and an explicit all-series overview. Scatter plots retain the whole exported sample as context and identify the selected company by name and values.

Market and risk chapters initially show the common company sample. Individual histories remain available through a comparison-basis control. The risk summary reads only from the chosen sample's table. A metric absent from that table is labelled unavailable; it is not borrowed from another sample. There is no metric recalculation or chart-window return calculation in TypeScript.

The correlation page opens with a two-asset lookup and a short signed relationship list. Self-correlation is excluded from that list. The complete matrix mounts when opened. Exact SPY-overlap metadata is shown where supplied; arbitrary pair windows are not invented. The common-company matrix cannot select SPY or another absent ETF.

General research tables support search, stable numeric sorting, ten-row pagination and selected compact-column views. Full details retains every exported column. Signs, nulls and source order are preserved. Sensitivity tables remain complete and visible independently of the selected baseline entity. The optional allocation comparison displays the existing capital-weight and signed risk-share columns; it is not a simulator.

## Freshness

The overview distinguishes market-data cutoff, overall dataset coverage and snapshot-export date. Both notebooks have a descriptive research name, filename and availability status. A browser visit never advances the observation dates. Every financial chart retains its supplied sampling and observation-period description.

## Preservation and review

No files under `notebooks/`, `data/`, the Python financial helpers, shared financial schema or `METHODOLOGY.md` are part of this revision. In particular, `web/src/data/dashboard.json` and its exact-value download are unchanged. The CI browser check compares the downloaded bytes with the committed snapshot.

Added tests cover stable series styles, irregular date spacing, null preservation, log/linear invariance, source-value filtering, restricted default comparisons, exact published momentum coordinates, table pagination/search, correlation lookup, comparison-basis filtering and sensitivity visibility. CI continues to distinguish cache-independent checks from the integration tests requiring local ignored research caches. It does not claim an offline historical rerun on GitHub.

The browser review script runs the built application at 390, 768 and 1440 pixels; checks all nine routes, chart and matrix controls, source download and console messages; and retains screenshots as a private workflow artifact. A hosted review is separate from this built-app check. No merge into master or production deployment is included.

## Deferred

Automatic data refresh, arbitrary custom-weight portfolio simulation, and alternative financial methodology remain outside this revision. The frozen source data, zero-cost baseline, transaction-cost convention, separate monthly cash-gap sensitivity and survivorship/selection-bias disclosures are preserved.

## Technical references

- Recharts axis domains and scales: https://recharts.github.io/en-US/guide/domainAndTicks/
- Recharts chronological/numeric axes: https://recharts.github.io/en-US/api/XAxis/
- W3C colour plus patterns: https://www.w3.org/WAI/WCAG22/Techniques/general/G111
