import type { AvailableSection } from "./types";

export type ComparisonBasis = "common" | "individual";
const scopedIds = {
  common: new Set(["common-index", "risk-common", "common-metrics", "common-correlation"]),
  individual: new Set(["full-index", "risk-full", "full-metrics", "full-correlation"]),
};

export function hasComparisonScopes(section: AvailableSection) {
  return [...section.charts, ...section.tables, ...(section.matrices ?? [])].some((item) => scopedIds.common.has(item.id));
}

// Select precomputed views only; no estimates, rescaling or date changes.
export function chooseComparisonBasis(section: AvailableSection, basis: ComparisonBasis): AvailableSection {
  const hidden = basis === "common" ? scopedIds.individual : scopedIds.common;
  return {
    ...section,
    charts: section.charts.filter((item) => !hidden.has(item.id)),
    tables: section.tables.filter((item) => !hidden.has(item.id)),
    matrices: section.matrices?.filter((item) => !hidden.has(item.id)),
  };
}
