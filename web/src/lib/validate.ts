import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/data/dashboard.schema.json";
import type { AvailableMomentum, Dashboard, Period, Source } from "./types";
const ajv = new Ajv({
  allErrors: true,
  strictNumbers: true,
  allowUnionTypes: true,
});
addFormats(ajv);
const validate = ajv.compile<Dashboard>(schema);
function unique(values: (string | number)[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}
function period(value: Period) {
  if (value.start > value.end) throw new Error("Source period is reversed");
}
function source(value: Source) {
  period(value.period);
  if (value.period.end > value.asOf)
    throw new Error("Source period ends after asOf");
}
export function parseDashboard(input: unknown): Dashboard {
  if (!validate(input))
    throw new Error(
      `Invalid dashboard export: ${ajv.errorsText(validate.errors)}`,
    );
  unique(
    input.research.universe.map((asset) => asset.id),
    "universe ID",
  );
  if (input.research.period) period(input.research.period);
  input.research.universe.forEach((asset) =>
    period({ start: asset.availableFrom, end: asset.availableTo }),
  );
  if (input.methodology.status === "available") {
    if (!input.generatedAt)
      throw new Error("Available methodology requires generatedAt");
    source(input.methodology.source);
    unique(
      input.methodology.items.map((item) => item.id),
      "methodology item ID",
    );
  }
  for (const [key, section] of Object.entries(input.sections)) {
    if (section.status !== "available") continue;
    if (!input.generatedAt)
      throw new Error("Available results require generatedAt");
    source(section.source);
    if (key === "momentum") {
      const definition = (section as AvailableMomentum).definition;
      if (!(
        definition.initialWealthDate < definition.firstReturnDate &&
        definition.firstReturnDate <= definition.lastReturnDate
      ))
        throw new Error("Momentum formation must precede evaluation returns");
      if (
        section.source.period.start !== definition.initialWealthDate ||
        section.source.period.end !== definition.lastReturnDate
      )
        throw new Error("Momentum source period differs from definition");
    }
    const entityIds = (section.entities ?? []).map((entity) => entity.id);
    const scenarioIds = (section.scenarios ?? []).map(
      (scenario) => scenario.id,
    );
    unique(entityIds, "entity ID");
    unique(scenarioIds, "scenario ID");
    section.scenarios?.forEach((scenario) => period(scenario.period));
    function references(item: { entityId?: string; scenarioId?: string }) {
      if (item.entityId && !entityIds.includes(item.entityId))
        throw new Error("Unknown entity reference");
      if (item.scenarioId && !scenarioIds.includes(item.scenarioId))
        throw new Error("Unknown scenario reference");
    }
    unique(
      [
        ...section.metrics,
        ...section.charts,
        ...section.tables,
        ...(section.matrices ?? []),
      ].map((item) => item.id),
      `${key} widget ID`,
    );
    section.metrics.forEach(references);
    for (const chart of section.charts) {
      references(chart);
      unique(
        chart.series.map((series) => series.id),
        "series ID",
      );
      for (const series of chart.series) {
        references(series);
        if (
          chart.kind !== "scatter" &&
          JSON.stringify(series.points.map((point) => point.x)) !==
            JSON.stringify(chart.series[0].points.map((point) => point.x))
        )
          throw new Error(
            "Line and bar series must share ordered x coordinates",
          );
        unique(
          series.points.map((point) => point.x),
          "x coordinate",
        );
        for (const point of series.points) {
          if (
            chart.xUnit === "text"
              ? typeof point.x !== "string"
              : typeof point.x !== "number"
          )
            throw new Error("Chart x coordinate does not match xUnit");
          if (chart.kind === "scatter" && typeof point.x !== "number")
            throw new Error("Scatter charts require numeric x coordinates");
        }
      }
    }
    for (const table of section.tables) {
      references(table);
      unique(
        table.columns.map((column) => column.key),
        "column key",
      );
      unique(
        table.rows.map((row) => row.id),
        "row ID",
      );
      for (const row of table.rows) {
        references(row);
        if (row.cells.length !== table.columns.length)
          throw new Error("Table row length does not match columns");
        row.cells.forEach((cell, index) => {
          if (
            cell !== null &&
            typeof cell !==
              (table.columns[index].unit === "text" ? "string" : "number")
          )
            throw new Error("Table cell does not match column unit");
        });
      }
    }
    for (const matrix of section.matrices ?? []) {
      unique(
        matrix.labels.map((label) => label.id),
        "matrix label ID",
      );
      if (
        matrix.values.length !== matrix.labels.length ||
        matrix.values.some((row) => row.length !== matrix.labels.length)
      )
        throw new Error("Matrix dimensions do not match labels");
    }
  }
  return input;
}
