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
async function capture(locator, name) {
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: `${dir}/${name}.png`, animations: "disabled" });
}
try {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of ["/", "/guide", "/market", "/risk-return", "/correlation", "/portfolio", "/stress", "/momentum", "/methodology"]) {
      const response = await page.goto(base + route, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.locator("h1").count(), 1, route);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, `${route} overflow at ${width}`);
      const name = route.replaceAll("/", "") || "overview";
      await page.screenshot({ path: `${dir}/${name}-${width}.png` });
      // Capture the actual figures as well as the page opening, so visual review
      // does not mistake a clean heading for a checked chart.
      const figures = page.locator("section.readable-chart");
      if (await figures.count()) {
        await capture(figures.first(), `${name}-chart-${width}`);
        if (route === "/momentum" || route === "/portfolio") {
          await capture(figures.nth(1), `${name}-drawdown-${width}`);
        }
      }
      const matrix = page.locator(".readable-matrix");
      if (await matrix.count()) await capture(matrix, `${name}-pair-lookup-${width}`);
      const allocation = page.locator(".allocation-chart");
      if (await allocation.count()) await capture(allocation, `${name}-allocation-${width}`);
      checks.push(`${route} at ${width}px: 200, one heading, no page overflow`);
    }
  }
  await page.goto(base + "/momentum", { waitUntil: "networkidle" });
  const wealth = page.locator("section.readable-chart").filter({ has: page.getByRole("heading", { name: "Momentum and SPY indexed wealth", exact: true }) });
  assert.equal(await wealth.getByRole("button", { name: "Logarithmic", exact: true }).getAttribute("aria-pressed"), "true");
  const colour = await wealth.locator('[data-series-id="SPY"]').getAttribute("data-colour");
  await capture(wealth, "momentum-both-log");
  await wealth.getByRole("button", { name: "Linear", exact: true }).click();
  await capture(wealth, "momentum-both-linear");
  await wealth.getByLabel("Inspect series", { exact: true }).selectOption("SPY");
  assert.equal(await wealth.locator('[data-series-id="SPY"]').getAttribute("data-colour"), colour);
  await capture(wealth, "momentum-spy-linear");
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
  await capture(page.locator(".asset-at-glance"), "risk-common-summary-msft");
  await capture(page.locator(".readable-chart").first(), "risk-common-scatter-msft");
  await page.getByRole("button", { name: "Individual histories", exact: true }).click();
  await page.getByLabel("Inspect asset or portfolio", { exact: true }).selectOption("MSFT");
  assert.doesNotMatch(await page.locator(".asset-at-glance").innerText(), /Not exported for this sample/);
  await capture(page.locator(".asset-at-glance"), "risk-individual-summary-msft");
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
  await capture(page.locator(".readable-matrix"), "correlation-spy-tlt");
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
