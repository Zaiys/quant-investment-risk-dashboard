import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "@/data/dashboard.schema.json";
import type { Dashboard } from "./types";
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
export function parseDashboard(input: unknown): Dashboard {
  if (!validate(input))
    throw new Error(
      `Invalid dashboard export: ${ajv.errorsText(validate.errors)}`,
    );
  for (const [key, section] of Object.entries(input.sections)) {
    if (section.status !== "available") continue;
    if (!input.generatedAt)
      throw new Error("Available results require generatedAt");
    if (section.source.period.start > section.source.period.end)
      throw new Error("Source period is reversed");
    if (section.source.period.end > section.source.asOf)
      throw new Error("Source period ends after asOf");
    unique(
      [...section.metrics, ...section.charts, ...section.tables].map(
        (item) => item.id,
      ),
      `${key} widget ID`,
    );
    for (const chart of section.charts) {
      unique(
        chart.series.map((series) => series.id),
        "series ID",
      );
      for (const series of chart.series) {
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
      unique(
        table.columns.map((column) => column.key),
        "column key",
      );
      unique(
        table.rows.map((row) => row.id),
        "row ID",
      );
      for (const row of table.rows) {
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
  }
  return input;
}
