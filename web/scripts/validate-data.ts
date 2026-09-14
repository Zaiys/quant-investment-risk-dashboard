import { readFileSync } from "node:fs";
import { parseDashboard } from "../src/lib/validate";
const data = parseDashboard(
  JSON.parse(
    readFileSync(
      new URL("../src/data/dashboard.json", import.meta.url),
      "utf8",
    ),
  ),
);
const available = Object.values(data.sections).filter(
  (section) => section.status === "available",
).length;
console.log(
  `Dashboard export valid: ${available} available research sections; momentum ${data.sections.momentum.status}.`,
);
