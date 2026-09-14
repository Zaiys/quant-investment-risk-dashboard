import type { Chart } from "./types";

// Identity is based on the entity, never its position in a filtered result.
const colours = ["#087443", "#205da8", "#ad4e00", "#7853a0", "#007b83", "#ae3764", "#776300", "#35465c"];
const patterns = [undefined, "8 4", "3 3", "10 3 2 3"] as const;
const known: Record<string, { colour: string; dash?: string }> = {
  MOMENTUM: { colour: "#087443" },
  PORTFOLIO: { colour: "#087443" },
  SPY: { colour: "#205da8", dash: "8 4" },
  QQQ: { colour: "#7853a0", dash: "3 3" },
  IWM: { colour: "#ad4e00", dash: "10 3 2 3" },
  TLT: { colour: "#007b83", dash: "8 3" },
  GLD: { colour: "#776300", dash: "2 3" },
  AAPL: { colour: "#ae3764" },
  MSFT: { colour: "#007b83", dash: "10 3 2 3" },
  NVDA: { colour: "#ad4e00", dash: "3 3" },
};

export function seriesStyle(id: string) {
  const key = id.toUpperCase();
  if (known[key]) return known[key];
  let hash = 0;
  for (const letter of key) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return { colour: colours[hash % colours.length], dash: patterns[Math.floor(hash / colours.length) % patterns.length] };
}

export function seriesIdentity(series: Chart["series"][number]) {
  return series.entityId ?? series.id;
}

export function defaultSeries(chart: Chart): string[] {
  if (chart.kind === "scatter" || chart.series.length <= 5) return chart.series.map((s) => s.id);
  const identities = new Map(chart.series.map((s) => [seriesIdentity(s), s.id]));
  const lead = identities.has("MOMENTUM") ? "MOMENTUM" : identities.has("PORTFOLIO") ? "PORTFOLIO" : null;
  if (lead && identities.has("SPY")) return [identities.get(lead)!, identities.get("SPY")!];
  // A declared illustrative selection, not a ranking by realised performance.
  const preferred = ["SPY", "MSFT", "AAPL"]
    .map((id) => identities.get(id)).filter((id): id is string => Boolean(id));
  return preferred.length >= 2 ? preferred : chart.series.slice(0, 3).map((s) => s.id);
}

export function hasDateAxis(chart: Chart): boolean {
  return chart.kind === "line" && chart.xUnit === "text" && chart.series.some((s) => s.points.length > 0) &&
    chart.series.every((s) => s.points.every((p) => typeof p.x === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.x) && Number.isFinite(Date.parse(p.x))));
}

export function isWealthChart(chart: Chart): boolean {
  return chart.kind === "line" && chart.unit === "number" && /indexed|wealth|initial value/i.test(`${chart.title} ${chart.yLabel}`);
}

export function canUseLog(chart: Chart): boolean {
  let count = 0;
  for (const s of chart.series) for (const p of s.points) {
    if (p.y === null) continue;
    if (!Number.isFinite(p.y) || p.y <= 0) return false;
    count += 1;
  }
  return count > 0;
}

export function positiveDomain(chart: Chart): [number, number] {
  let min = Infinity, max = -Infinity;
  for (const s of chart.series) for (const p of s.points) {
    if (p.y !== null && Number.isFinite(p.y) && p.y > 0) {
      min = Math.min(min, p.y); max = Math.max(max, p.y);
    }
  }
  return Number.isFinite(min) ? [min / 1.05, max * 1.05] : [1, 10];
}

// Keep original x and y untouched. The extra coordinate is for calendar spacing only.
export function alignSeries(chart: Chart) {
  return (chart.series[0]?.points ?? []).map((point, index) => Object.fromEntries([
    ["x", point.x], ...chart.series.map((series, i) => [`series${i}`, series.points[index]?.y ?? null]),
  ]));
}

export function plotRows(chart: Chart) {
  const dated = hasDateAxis(chart);
  return alignSeries(chart).map((row) => dated ? { ...row, calendarX: Date.parse(String(row.x)) } : row);
}

export function firstAndLast(series: Chart["series"][number]) {
  const valid = series.points.filter((p) => p.y !== null);
  return valid.length ? { first: valid[0], last: valid[valid.length - 1] } : null;
}
