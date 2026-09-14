import type { Unit } from "./types";
export function formatValue(
  value: number | string | null,
  unit: Unit | "text" = "number",
): string {
  if (value === null) return "—";
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: unit === "percent" ? "percent" : "decimal",
    minimumFractionDigits: unit === "ratio" ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
