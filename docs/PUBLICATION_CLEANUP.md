# Publication cleanup verification — 12 September 2026

The source cleanup is complete on `feature/vercel-dashboard`, based on commit `77b029a81a7e218cf5e6cd82873333f9c0e10737`. The local build is ready for a Vercel review preview. This work did not push, merge, deploy or change repository visibility.

## Completed changes

- Made the Research Guide chapter 01 and updated navigation, page numbering and documentation while retaining notebook research filenames.
- Removed the unfinished video section, interview coaching, stale research-status copy, the empty `PROJECT.md` and the empty placeholder notebook. Corrected notebook wording and removed an unused helper parameter.
- Replaced the inaccessible header repository link with the complete reviewed snapshot download. The filename is consistently `research-snapshot.json`.
- Added ignore rules for environment-file variants, logs and Finder metadata. `.env.example` remains eligible for non-secret examples.
- Mounted chart-value tables only when opened, with 100 observations per page in source order. Keyboard controls, null values, series filtering and the complete download are preserved.
- Added chapter canonical/social metadata, a shared 1200 × 630 social image, sitemap and robots routes. Preview/development builds remain non-indexable; production URLs use the configured public origin. See [deployment configuration](DEPLOYMENT.md#publication-metadata-and-source-access).
- Updated current documentation and labelled earlier verification reports as historical records.

## Financial preservation

Both research notebooks were executed from their existing frozen inputs after the source cleanup. The momentum sensitivities and combined export were regenerated through the normal verification pipeline; provenance hashes were renewed from those runs.

The before/after comparison found exact equality for all 44 reviewed Parquet tables, all six financial section objects (including sensitivities), and the complete methodology object. `METHODOLOGY.md` and the frozen input manifest are byte-identical. There was no new data acquisition, financial estimator change or methodology change.

The dashboard JSON changes only its generation timestamp and research review date. The observed data still ends on 10 September 2026. Notebook output metadata and provenance hashes changed as a consequence of execution.

Current snapshot SHA-256: `5ad78f7fa1e2c36871a4d2a4e5daba51c38864881f03d5d399897ce5be1921d1`.

## Validation

| Check | Result |
| --- | --- |
| Frozen market and momentum notebook execution | Passed; 72 and 16 code cells |
| Python tests | 42 passed, no skips |
| Reviewed export cross-check | 27,754 numeric values agree exactly |
| Frontend tests | 64 passed |
| Export schema, lint, TypeScript and Node 22 production build | Passed |
| Nine pages, exact snapshot download, unknown-route 404 | Passed |
| Robots, sitemap, social image response and PNG signature | Passed |
| Isolated production build using a reserved test domain | All nine canonical/social URLs and sitemap entries correct |
| Local preview indexing | No indexing metadata, disallow-all robots, empty sitemap |
| Browser checks | Guide at 390/768/1440 px; market controls and strategy at 390 px; no page overflow in checked views |
| Keyboard, pagination and filtering | Passed; filtering returns values to the first page |
| Browser warnings/errors | None observed |
| Current source copy scan | No stale markers outside regression assertions |

On `/market`, the initial server-rendered HTML decreased from 1,808,919 to 742,353 bytes. Its element count decreased from 60,938 to 1,115 before hydration; the previous 14,955 chart-value rows are now created only as the reader opens and pages through them. These measurements describe document size, not a measured network-speed improvement.

The dependency versions and lockfile are unchanged from the source audit, which reported no known npm vulnerabilities. The audit found no real exposed credentials or tracked prompt/agent logs; this cleanup introduces no credentials or external service dependencies.

## Publication status

No local blocker remains for a Vercel review preview. Public source-code access remains a separate repository-visibility decision; the header download works without it. On the actual production domain, verify canonical URLs, indexing and the social image as described in the deployment guide. No remote preview or production deployment was tested or created by this cleanup.
