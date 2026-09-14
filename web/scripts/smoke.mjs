import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const routes = [
  "/",
  "/market",
  "/risk-return",
  "/correlation",
  "/methodology",
  "/portfolio",
  "/stress",
  "/momentum",
  "/guide",
];
for (const route of routes) {
  const response = await fetch(new URL(route, base));
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.match(html, /<h1[\s>]/, `${route} must have a page heading`);
  assert.doesNotMatch(
    html,
    /SYNTHETIC PRESENTATION TEST/,
    `${route} must not include test fixtures`,
  );
  assert.match(
    html,
    /<meta name="description"/,
    `${route} needs a description`,
  );
  assert.ok(/property="og:image"/.test(html), `${route} needs a social image`);
  assert.ok(
    /name="twitter:image"/.test(html),
    `${route} needs a Twitter image`,
  );
  if (route === "/guide")
    assert.doesNotMatch(
      html,
      /Video walkthrough coming later|For an interview/,
    );
  if (route === "/momentum") {
    assert.match(html, /Transaction-cost sensitivity/);
    assert.match(html, /Next-day-close execution sensitivity/);
    assert.match(html, /monthly cash gap/);
    assert.match(html, /gross baseline/);
    assert.match(html, /CAGR change \(pp\)/);
  }
  console.log(`PASS ${route}`);
}
const exported = await fetch(new URL("/export", base));
assert.equal(exported.status, 200);
assert.match(exported.headers.get("content-disposition") ?? "", /attachment/);
const expectedText = readFileSync(
  new URL("../src/data/dashboard.json", import.meta.url),
  "utf8",
);
const downloadedText = await exported.text();
assert.equal(
  downloadedText,
  expectedText,
  "Download must preserve exact source bytes",
);
const expected = JSON.parse(expectedText);
assert.deepEqual(
  JSON.parse(downloadedText),
  expected,
  "Downloaded snapshot must match the published file",
);
console.log("PASS /export (snapshot and download headers)");
const missing = await fetch(new URL("/unknown-research-view", base));
assert.equal(missing.status, 404);
console.log("PASS unknown route returns 404");

for (const [route, contentType] of [
  ["/robots.txt", "text/plain"],
  ["/sitemap.xml", "application/xml"],
  ["/opengraph-image", "image/png"],
]) {
  const response = await fetch(new URL(route, base));
  assert.equal(response.status, 200, route);
  assert.ok(
    response.headers.get("content-type")?.startsWith(contentType),
    `${route} content type`,
  );
  if (route === "/opengraph-image") {
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.deepEqual(
      Array.from(bytes.slice(0, 8)),
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
  }
  console.log(`PASS ${route}`);
}
