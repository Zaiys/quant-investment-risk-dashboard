"use client";
import { useState } from "react";
import type { Chart } from "@/lib/types";
import { formatValue } from "@/lib/format";

const PAGE_SIZE = 100;

export function ChartValues({ chart }: { chart: Chart }) {
  const [page, setPage] = useState(0);
  const rows = chart.series.flatMap((series) =>
    series.points.map((point, index) => ({
      key: `${series.id}-${index}`,
      label: series.label,
      point,
    })),
  );
  const start = page * PAGE_SIZE;
  const shown = rows.slice(start, start + PAGE_SIZE);
  return (
    <>
      {rows.length > PAGE_SIZE && (
        <div className="chart-values-controls">
          <p role="status">
            Rows {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of{" "}
            {rows.length}
          </p>
          <div>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous rows
            </button>
            <button
              type="button"
              disabled={start + PAGE_SIZE >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Next rows
            </button>
          </div>
        </div>
      )}
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
            {shown.map(({ key, label, point }) => (
              <tr key={key}>
                <td>{label}</td>
                <td>{formatValue(point.x, chart.xUnit)}</td>
                <td className="numeric">{formatValue(point.y, chart.unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
