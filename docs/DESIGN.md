# Research interface design

The website presents a self-directed investigation of historical asset performance and portfolio risk. Its structure follows the research questions and evidence, with each chapter retaining a distinct layout and an explicit publication status.

## Visual system

Tokens live in `web/src/app/globals.css`.

| Token           | Value     | Purpose                                    |
| --------------- | --------- | ------------------------------------------ |
| `--paper`       | `#f6f6f1` | Main paper-toned background                |
| `--surface`     | `#fcfcf8` | Chart and figure background                |
| `--ink`         | `#252d29` | Primary text                               |
| `--muted`       | `#5c675f` | Supporting text and metadata               |
| `--accent`      | `#245548` | Navigation, rules, focus and selected data |
| `--rule`        | `#cbd2c9` | Nonessential separators                    |
| `--rule-strong` | `#818d82` | Control boundaries and major rules         |
| `--measure`     | `42rem`   | Reading-column limit                       |
| `--page-width`  | `84rem`   | Maximum content width                      |

DM Sans carries body text, controls and uppercase metadata; Georgia carries editorial headings. Fonts are limited to these two families. DM Sans is bundled locally. Data values use tabular numerals. Corners are square, separators thin, and interactive focus is visible. There are no gradients, decorative illustrations, shadows or animated chart entrances.

The page grid has twelve columns. Reading sections occupy narrower spans; plots and tables have wide areas. Layout begins as a single column, introduces split reading columns at 768px, and expands chapter navigation to eight columns at 1100px. At smaller widths, a labelled button opens the chapter navigation.

## Chapter-specific decisions

- Overview uses a research title, publication record, metadata strip, questions and numbered chapter index.
- Market Explorer distinguishes indexed performance from raw prices and carries an explicit available-history register.
- Risk vs Return introduces the measurement question before the scatter plot and asset estimates.
- Diversification distinguishes correlation from beta and supports inspecting a matrix of supplied estimates.
- Portfolio Analysis keeps capital weights and component risk contributions conceptually separate.
- Stress Testing gives the three requested historical episodes a comparison register. Exact windows and findings remain source-supplied.
- Quantitative Strategy identifies the separate notebook and the unanswered research questions without presenting results.
- Methodology distinguishes documented export text from unverified review questions, in a narrow reading layout.

## Evidence and interaction

Unknown values stay unknown. Waiting figures contain no sample curves or axes that imply measurements. Published results must carry provenance. The export date and research update date are distinct fields. Test data is isolated from the application and labelled synthetic.

Selection filters supplied records, never recomputes performance. Untagged benchmark/context records retain their stated period and a visible note explains this behaviour. Tables expose sorting through native buttons. Chart values have an accessible table alternative. Correlation cells show their numerical value and missing state as text; selection also has an outline/underline and an announced relationship list.

## Accessibility and verification

Use semantic headings, one page heading per route, a skip link, labelled native controls, visible focus, `aria-current` for chapters and `aria-pressed` for correlation selection. Table overflow stays inside a keyboard-focusable region. Main text colours meet WCAG AA contrast on their intended backgrounds. Control boundaries use the stronger rule token; pale rules are decorative. Charts disable animation and CSS respects reduced-motion preferences.

Verify every chapter at 375, 768, 1280 and 1440px, with no document-level horizontal overflow. Verify populated components separately using `npm run test:preview`, including asset/scenario selection, series inspection, table sorting and keyboard correlation selection. A full screen-reader audit is still a separate manual review; automated structure checks alone do not establish complete WCAG conformance.
