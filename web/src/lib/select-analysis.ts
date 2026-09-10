import type { AvailableSection } from "./types";
/** Filter supplied records for inspection. Shared, untagged outputs retain their stated basis. */
export function selectAnalysis(
  section: AvailableSection,
  entityId: string,
  scenarioId: string,
): AvailableSection {
  const entity = (item: { entityId?: string }) =>
    !entityId || !item.entityId || item.entityId === entityId;
  const scenario = (item: { scenarioId?: string }) =>
    !scenarioId || !item.scenarioId || item.scenarioId === scenarioId;
  return {
    ...section,
    metrics: section.metrics.filter((m) => entity(m) && scenario(m)),
    charts: section.charts
      .filter(scenario)
      .map((chart) => ({ ...chart, series: chart.series.filter(entity) }))
      .filter((chart) => chart.series.length),
    tables: section.tables
      .filter(scenario)
      .map((table) => ({ ...table, rows: table.rows.filter(entity) }))
      .filter((table) => table.rows.length),
  };
}
