"use client";
import { useState } from "react";
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
import { ChartValues } from "./chart-values";
const palette = ["#245548", "#353c3c", "#667069", "#496d60", "#71776f"];
// Align coordinates for rendering only. Missing values stay null; no interpolation or finance calculations.
export function alignSeries(chart: Chart) {
  return chart.series[0].points.map((point, index) =>
    Object.fromEntries([
      ["x", point.x],
      ...chart.series.map((series, seriesIndex) => [
        `series${seriesIndex}`,
        series.points[index].y,
      ]),
    ]),
  );
}
export function ResearchChart({ chart: original }: { chart: Chart }) {
  const [seriesId, setSeriesId] = useState("");
  const [valuesOpen, setValuesOpen] = useState(false);
  const chart = {
    ...original,
    series: seriesId
      ? original.series.filter((series) => series.id === seriesId)
      : original.series,
  };

  const numericX = chart.xUnit !== "text";
  const grid = (
    <CartesianGrid stroke="#d7dcd5" strokeDasharray="3 5" vertical={false} />
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
      wrapperStyle={{ pointerEvents: "auto", maxWidth: "100%" }}
      formatter={(value, _name, item) =>
        formatValue(
          typeof value === "number" ? value : null,
          chart.kind === "scatter" && item.dataKey === "x"
            ? chart.xUnit
            : chart.unit,
        )
      }
      contentStyle={{
        borderRadius: 0,
        border: "1px solid #dce3e9",
        fontSize: 14,
        maxHeight: 240,
        overflowY: "auto",
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
      {original.series.length > 1 && (
        <div className="chart-controls">
          <label>
            Inspect series
            <select
              value={seriesId}
              onChange={(event) => setSeriesId(event.target.value)}
            >
              <option value="">All series</option>
              {original.series.map((series) => (
                <option value={series.id} key={series.id}>
                  {series.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
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
              <Legend wrapperStyle={{ maxHeight: 88, overflowY: "auto" }} />
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
              <Legend wrapperStyle={{ maxHeight: 88, overflowY: "auto" }} />
              {chart.series.map((series, index) => (
                <Bar
                  key={series.id}
                  name={series.label}
                  dataKey={`series${index}`}
                  fill={palette[index % palette.length]}
                  radius={0}
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
              <Legend wrapperStyle={{ maxHeight: 88, overflowY: "auto" }} />
              {chart.series.map((series, index) => (
                <Line
                  key={series.id}
                  name={series.label}
                  dataKey={`series${index}`}
                  stroke={palette[index % palette.length]}
                  strokeWidth={2}
                  strokeDasharray={
                    index % 3 === 0
                      ? undefined
                      : index % 3 === 1
                        ? "7 3"
                        : "2 3"
                  }
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
      <details
        className="chart-values"
        onToggle={(event) => setValuesOpen(event.currentTarget.open)}
      >
        <summary>View chart values</summary>
        {valuesOpen && (
          <ChartValues
            key={JSON.stringify(chart.series.map((series) => series.id))}
            chart={chart}
          />
        )}
        <noscript>
          <p>
            <a
              className="text-link"
              href="/export"
              download="research-snapshot.json"
            >
              Download the source values
            </a>{" "}
            to inspect the complete snapshot without JavaScript.
          </p>
        </noscript>
      </details>
    </section>
  );
}
