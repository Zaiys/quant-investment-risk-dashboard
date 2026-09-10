"use client";
import { useState } from "react";
import type { Matrix } from "@/lib/types";
import { formatValue } from "@/lib/format";
export function CorrelationMatrix({ matrix }: { matrix: Matrix }) {
  const [selected, setSelected] = useState(0);
  return (
    <section className="matrix-panel">
      <div className="panel-title">
        <div>
          <span className="meta-label">Correlation matrix</span>
          <h2>{matrix.title}</h2>
          <p>{matrix.description}</p>
        </div>
      </div>
      <p className="matrix-instruction">
        Select an asset to inspect its exported relationships. The estimates
        apply to the observation period shown in the source note.
      </p>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${matrix.title} matrix`}
      >
        <table className="correlation-table">
          <caption className="sr-only">
            {matrix.title}. Values range from minus one to one. Missing values
            are labelled.
          </caption>
          <thead>
            <tr>
              <th scope="col">Asset</th>
              {matrix.labels.map((label, index) => (
                <th scope="col" key={label.id}>
                  <button
                    aria-pressed={selected === index}
                    onClick={() => setSelected(index)}
                  >
                    {label.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.values.map((row, r) => (
              <tr
                key={matrix.labels[r].id}
                className={selected === r ? "matrix-selected" : ""}
              >
                <th scope="row">{matrix.labels[r].label}</th>
                {row.map((value, c) => (
                  <td
                    key={matrix.labels[c].id}
                    className={`${value === null ? "matrix-missing" : value < 0 ? "matrix-negative" : value >= 0.5 ? "matrix-positive" : "matrix-low"} ${selected === c ? "matrix-column" : ""}`}
                  >
                    {value === null
                      ? "Not available"
                      : formatValue(value, "ratio")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="matrix-reading" aria-live="polite">
        <h3>Correlations with {matrix.labels[selected].label}</h3>
        <dl>
          {matrix.labels.map((label, index) => (
            <div key={label.id}>
              <dt>{label.label}</dt>
              <dd>{formatValue(matrix.values[selected][index], "ratio")}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
