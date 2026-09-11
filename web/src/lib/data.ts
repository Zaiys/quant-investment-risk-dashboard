import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDashboard } from "./validate";
// Parse the source text on the server. JSON module compilation can rewrite
// decimal literals by one floating-point step before they reach JavaScript.
export const snapshotText = readFileSync(
  join(process.cwd(), "src/data/dashboard.json"),
  "utf8",
);
export const dashboard = parseDashboard(JSON.parse(snapshotText));
