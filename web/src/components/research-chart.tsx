"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Chart } from "@/lib/types";
import { formatValue } from "@/lib/format";
const palette = [
  "#1a6b66",
  "#4c72b5",
  "#b47829",
  "#9065ad",
  "#bf5968",
  "#65768e",
];
// Align coordinates for rendering only. Missing values stay null; no interpolation or finance calculations.
export function alignSeries(chart: Chart) {
  const xs = Array.from(
    new Set(
      chart.series.flatMap((series) => series.points.map((point) => point.x)),
    ),
  );
  return xs.map((x) =>
    Object.fromEntries([
      ["x", x],
      ...chart.series.map((series, index) => [
        `series${index}`,
        series.points.find((point) => point.x === x)?.y ?? null,
      ]),
    ]),
  );
}
export function ResearchChart({ chart }: { chart: Chart }) {
  const numericX = chart.xUnit !== "text";
  const grid = (
    <CartesianGrid stroke="#e9edf1" strokeDasharray="3 5" vertical={false} />
  );
  const xAxis = (
    <XAxis
      name={chart.xLabel}
      dataKey="x"
      type={numericX ? "number" : "category"}
      domain={numericX ? ["auto", "auto"] : undefined}
      tickLine={false}
      axisLine={false}
      minTickGap={30}
      padding={{ left: 18, right: 42 }}
      tick={{ fontSize: 12 }}
      tickFormatter={(value) => formatValue(value, chart.xUnit)}
    />
  );
  const yAxis = (
    <YAxis
      name={chart.yLabel}
      dataKey={chart.kind === "scatter" ? "y" : undefined}
      type="number"
      tickLine={false}
      axisLine={false}
      width={74}
      tick={{ fontSize: 12 }}
      tickFormatter={(value) => formatValue(value, chart.unit)}
    />
  );
  const tooltip = (
    <Tooltip
      formatter={(value, _name, item) =>
        formatValue(
          typeof value === "number" ? value : null,
          chart.kind === "scatter" && item.dataKey === "x"
            ? chart.xUnit
            : chart.unit,
        )
      }
      contentStyle={{
        borderRadius: 8,
        border: "1px solid #dce3e9",
        fontSize: 14,
      }}
    />
  );
  const common = {
    margin: { top: 16, right: 20, bottom: 12, left: 0 },
    accessibilityLayer: true,
  };
  return (
    <section className="panel chart-panel">
      <div className="panel-title">
        <div>
          <h2>{chart.title}</h2>
          <p>{chart.description}</p>
        </div>
        <span className="chart-unit">{chart.yLabel}</span>
      </div>
      <div
        className="chart"
        role="img"
        aria-label={`${chart.title}. ${chart.description}. Values are available in the table below.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          {chart.kind === "scatter" ? (
            <ScatterChart {...common}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              <Legend />
              {chart.series.map((series, index) => (
                <Scatter
                  key={series.id}
                  name={series.label}
                  data={series.points.filter((point) => point.y !== null)}
                  dataKey="y"
                  fill={palette[index % palette.length]}
                  isAnimationActive={false}
                />
              ))}
            </ScatterChart>
          ) : chart.kind === "bar" ? (
            <BarChart {...common} data={alignSeries(chart)}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              <Legend />
              {chart.series.map((series, index) => (
                <Bar
                  key={series.id}
                  name={series.label}
                  dataKey={`series${index}`}
                  fill={palette[index % palette.length]}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart {...common} data={alignSeries(chart)}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              <Legend />
              {chart.series.map((series, index) => (
                <Line
                  key={series.id}
                  name={series.label}
                  dataKey={`series${index}`}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2.2}
                  dot={
                    series.points.length < 2 ||
                    series.points.some((point) => point.y === null)
                      ? { r: 2.5, strokeWidth: 0 }
                      : false
                  }
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <div className="chart-axis-label">{chart.xLabel}</div>
      <details className="chart-values">
        <summary>View chart values</summary>
        <div
          className="table-scroll"
          role="region"
          aria-label={`${chart.title} values`}
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">{chart.title} values</caption>
            <thead>
              <tr>
                <th scope="col">Series</th>
                <th scope="col">{chart.xLabel}</th>
                <th scope="col">{chart.yLabel}</th>
              </tr>
            </thead>
            <tbody>
              {chart.series.flatMap((series) =>
                series.points.map((point, index) => (
                  <tr key={`${series.id}-${index}`}>
                    <td>{series.label}</td>
                    <td>{formatValue(point.x, chart.xUnit)}</td>
                    <td className="numeric">
                      {formatValue(point.y, chart.unit)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
