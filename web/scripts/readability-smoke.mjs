/* global document */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const base = process.env.READABILITY_URL || "http://127.0.0.1:3000";
const snapshotBytes = readFileSync("src/data/dashboard.json");
const snapshot = JSON.parse(snapshotBytes);
const digest = createHash("sha256").update(snapshotBytes).digest("hex");
const dir = "../readability-browser-results";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ reducedMotion: "reduce" });
const warnings = [], errors = [], checks = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
  if (message.type() === "warning") warnings.push(message.text());
});
try {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/", "/guide", "/market", "/risk-return", "/correlation", "/portfolio", "/stress", "/momentum", "/methodology"]) {
      const response = await page.goto(base + route, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.locator("h1").count(), 1, route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${route} overflow at ${width}`);
      await page.screenshot({ path: `${dir}/${route.replaceAll("/", "") || "overview"}-${width}.png` });
      checks.push(`${route} at ${width}px: 200, one heading, no page overflow`);
    }
  }
  await page.goto(base + "/momentum", { waitUntil: "networkidle" });
  const wealth = page.locator("section.readable-chart").filter({ has: page.getByRole("heading", { name: "Momentum and SPY indexed wealth", exact: true }) });
  assert.equal(await wealth.getByRole("button", { name: "Logarithmic", exact: true }).getAttribute("aria-pressed"), "true");
  const colour = await wealth.locator('[data-series-id="SPY"]').getAttribute("data-colour");
  await wealth.getByRole("button", { name: "Linear", exact: true }).click();
  await wealth.getByLabel("Inspect series", { exact: true }).selectOption("SPY");
  assert.equal(await wealth.locator('[data-series-id="SPY"]').getAttribute("data-colour"), colour);
  await wealth.getByText("View chart values", { exact: true }).click();
  await wealth.locator("table tbody tr").first().waitFor();
  assert.equal(await wealth.locator("table tbody tr").first().locator("td").first().innerText(), "SPY");
  await wealth.getByRole("button", { name: "Logarithmic", exact: true }).click();
  assert.equal(await wealth.locator("table tbody tr").first().locator("td").first().innerText(), "SPY");
  checks.push("Momentum all/single and linear/log preserve SPY identity and source inspection");
  await page.getByLabel("Inspect asset or portfolio", { exact: true }).selectOption("SPY");
  assert.equal(await page.getByRole("heading", { name: "Transaction-cost sensitivity", exact: true }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "Next-day-close execution sensitivity", exact: true }).count(), 1);
  checks.push("SPY inspection retains both separately labelled sensitivities");

  await page.goto(base + "/risk-return", { waitUntil: "networkidle" });
  await page.getByLabel("Inspect asset or portfolio", { exact: true }).selectOption("MSFT");
  assert.equal(await page.getByRole("heading", { name: "MSFT at a glance" }).count(), 1);
  assert.match(await page.locator(".asset-at-glance").innerText(), /Not exported for this sample/);
  await page.getByRole("button", { name: "Individual histories", exact: true }).click();
  await page.getByLabel("Inspect asset or portfolio", { exact: true }).selectOption("MSFT");
  assert.doesNotMatch(await page.locator(".asset-at-glance").innerText(), /Not exported for this sample/);
  checks.push("Risk basis switch does not borrow individual-history drawdown for common sample");

  await page.goto(base + "/correlation", { waitUntil: "networkidle" });
  await page.getByLabel("First asset", { exact: true }).selectOption("SPY");
  await page.getByLabel("Compare with", { exact: true }).selectOption("TLT");
  const matrix = snapshot.sections.correlation.matrices.find((m) => m.id === "full-correlation");
  const row = matrix.labels.findIndex((l) => l.id === "SPY");
  const column = matrix.labels.findIndex((l) => l.id === "TLT");
  const expected = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(matrix.values[row][column]);
  assert.equal(await page.locator(".correlation-answer > strong").innerText(), expected);
  assert.equal(await page.locator(".correlation-table").count(), 0);
  await page.getByText(/Open full matrix/).click();
  await page.locator(".correlation-table").waitFor();
  await page.getByRole("region", { name: / matrix$/ }).focus();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Common company period", exact: true }).click();
  assert.equal(await page.getByLabel("First asset", { exact: true }).locator('option[value="SPY"]').count(), 0);
  checks.push("Correlation exact pair lookup, lazy full matrix, keyboard scrolling and scope restriction");

  const download = await page.request.get(base + "/export");
  assert.equal(download.status(), 200);
  assert.equal(Buffer.compare(await download.body(), snapshotBytes), 0);
  checks.push("Snapshot download remains byte-identical");
  assert.equal(createHash("sha256").update(readFileSync("src/data/dashboard.json")).digest("hex"), digest);
  assert.deepEqual(errors, [], "Browser errors");
  assert.deepEqual(warnings, [], "Browser warnings");
  writeFileSync(`${dir}/report.json`, JSON.stringify({ checks, snapshotSha256: digest, errors, warnings }, null, 2));
  console.log(JSON.stringify({ result: "PASS", checks: checks.length, snapshotSha256: digest, errors, warnings }));
} finally {
  writeFileSync(`${dir}/console.json`, JSON.stringify({ errors, warnings }, null, 2));
  await browser.close();
}
