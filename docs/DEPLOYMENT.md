# Deployment

The app is a standard Next.js/TypeScript project in `web/`. All pages are prerendered from the committed JSON snapshot. Vercel does not run Python or notebooks. No database, API key or application environment variable is required.

## Verify first

From the repository root, on `feature/vercel-dashboard`:

```bash
git branch --show-current
cd web
npm ci
npm run test
npm run lint
npm run build
npm run typecheck
```

Use Node.js 22 LTS, at least 22.13. The lockfile pins package versions. The build validates the snapshot before compiling. Check that the resulting pages show the intended published data and provenance; a successful schema check does not review financial correctness.

## Preview before merging

These steps deploy the feature branch without merging it into `master`.

1. Start in the feature branch's checkout and enter `web/`.
2. Run `npx vercel login` and sign in to the intended Vercel account.
3. Run `npx vercel link`. Choose the intended scope and create a project named `quant-investment-risk-dashboard`, or select the intended existing project. If asked where the code lives, choose `./` because the command is running inside `web/`.
4. Confirm Next.js detection, Node.js **22.x**, install command **`npm ci`**, and build command **`npm run build`**. Leave the output directory at its Next.js default. No environment variables are needed.
5. Run `npx vercel deploy --target=preview`.
6. Open the returned deployment URL and verify `/`, `/market`, `/risk-return`, `/correlation`, `/portfolio`, `/stress`, `/momentum`, `/methodology`, `/guide`, and the `/export` download. Verify the deployment is labelled **Preview** in Vercel before sharing it as a preview.
7. Review the feature branch separately. Do not promote or merge solely because deployment succeeded.

Commands, from the repository root:

```bash
cd web
npx vercel login
npx vercel link
npx vercel deploy --target=preview
```

`.vercelignore` keeps automated test fixtures out of CLI upload bundles. The production application does not import these fixtures. Fonts are bundled locally with the application.

## Connect Git deployments

1. Push the feature branch when ready: `git push -u origin feature/vercel-dashboard`.
2. Connect `Zaiys/quant-investment-risk-dashboard` to the intended Vercel project.
3. In project settings set **Root Directory = `web`** for the repository checkout. This differs from `./` used by the standalone CLI upload above.
4. Select **Next.js**, **Node.js 22.x**, **Install Command = `npm ci`**, and **Build Command = `npm run build`**. Leave output-directory override disabled. No files outside the root directory are required by the production app.
5. Keep **Production Branch = `master`**. Other branches use preview deployments. The current `master` lacks `web/`, so it cannot build this frontend until the feature branch is reviewed and merged. The CLI preview path works before that merge.
6. Open a pull request from `feature/vercel-dashboard` to `master`, review code and available deployment checks, and merge only after review.
7. After an approved merge, Vercel builds `master` for production. Verify the nine chapters, the snapshot download and source notes, then add the verified production URL to the README.

The GitHub workflow performs tests and builds; it does not merge or deploy. No production deployment, remote push, repository connection or domain change is performed by these setup files alone.

## Publication metadata and source access

Local builds and Vercel Preview/Development deployments emit `noindex, nofollow` metadata and `Disallow: /` in `robots.txt`. Their sitemap is empty. This controls indexing; it is not access protection. Use Vercel deployment protection when a preview should require authentication.

Vercel Production builds use `VERCEL_PROJECT_PRODUCTION_URL` for canonical URLs and the nine-chapter sitemap. Ensure Vercel system environment variables are available to the build. To select a custom domain or publish on another host, set `SITE_URL` to that site's public HTTPS origin, without a path, credentials or query string. A Preview deployment remains non-indexable even if `SITE_URL` is set. Without a known production origin, the app keeps indexing disabled rather than publishing a guessed canonical URL.

`/opengraph-image` generates the shared 1200 × 630 social image from the bundled DM Sans font. Each chapter supplies its own social title and description. Before public release, check canonical URLs, `robots.txt`, `sitemap.xml` and the social image on the actual production domain.

The header's **Source values** link downloads the complete reviewed snapshot from `/export` as `research-snapshot.json`. It works without GitHub access. The previous repository URL did not resolve without authentication; repository visibility has not been changed. Add a source-code link only after its intended URL is accessible to the target audience. Repository publication is separate from a Vercel preview.

Environment files matching `.env` and `.env.*` are ignored at every directory level; `.env.example` may be tracked only with non-secret example settings.

## Updates and rollback

For data updates, validate and publish the reviewed Python snapshot, commit it with the relevant explanation, and deploy the new revision. Pages show a snapshot rather than live notebook state. Stop and restart `next start` after rebuilding locally.

To roll back a deployed UI or data snapshot, use Vercel's deployment history to promote the previous reviewed deployment, or revert the relevant commit through normal review. Keep a copy of the prior snapshot in Git history.

## References

- [Next.js installation and local development](https://nextjs.org/docs/app/getting-started/installation)
- [Vercel CLI deployment](https://vercel.com/docs/cli/deploy)
- [Deploying from the CLI](https://vercel.com/docs/projects/deploy-from-cli)
- [Vercel monorepo root directories](https://vercel.com/docs/monorepos)
- [Vercel Git deployment behaviour](https://vercel.com/docs/git)
