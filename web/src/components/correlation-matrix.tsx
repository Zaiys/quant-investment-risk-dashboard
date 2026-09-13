"use client";
import { useState } from "react";
import type { Matrix, DataTable as TableData } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { AssetPicker } from "./asset-picker";

export function CorrelationMatrix({ matrix, relationships }: { matrix: Matrix; relationships?: TableData }) {
  const initial = matrix.labels.findIndex((label) => label.id === "SPY");
  const [selected, setSelected] = useState(initial >= 0 ? initial : 0);
  const [other, setOther] = useState((initial >= 0 ? initial : 0) === 0 && matrix.labels.length > 1 ? 1 : 0);
  const [direction, setDirection] = useState<"positive" | "negative">("positive");
  const [expanded, setExpanded] = useState(false);
  const [fullOpen, setFullOpen] = useState(matrix.labels.length <= 10);
  if (!matrix.labels.length) return <p>No correlation values are available.</p>;
  const first = matrix.labels[Math.min(selected, matrix.labels.length - 1)];
  const second = matrix.labels[Math.min(other, matrix.labels.length - 1)];
  const a = matrix.labels.indexOf(first), b = matrix.labels.indexOf(second);
  const value = matrix.values[a][b];
  const ranked = matrix.labels.map((label, i) => ({ ...label, value: matrix.values[a][i] }))
    .filter((label) => label.id !== first.id)
    .sort((x, y) => {
      if (x.value === null) return y.value === null ? x.id.localeCompare(y.id) : 1;
      if (y.value === null) return -1;
      const delta = direction === "positive" ? y.value - x.value : x.value - y.value;
      return delta || x.id.localeCompare(y.id);
    });
  const spyPair = first.id === "SPY" ? second.id : second.id === "SPY" ? first.id : null;
  const record = spyPair ? relationships?.rows.find((row) => row.id === spyPair || row.entityId === spyPair) : undefined;
  const sampleCell = (key: string) => {
    const index = relationships?.columns.findIndex((column) => column.key === key) ?? -1;
    return index >= 0 ? record?.cells[index] ?? null : null;
  };
  return (
    <section className="matrix-panel readable-matrix">
      <div className="panel-title"><div><span className="meta-label">Correlation lookup</span><h2>{matrix.title}</h2><p>{matrix.description}</p></div></div>
      <div className="pair-controls">
        <AssetPicker label="First asset" options={matrix.labels} value={first.id}
          onChange={(id) => { setSelected(matrix.labels.findIndex((label) => label.id === id)); setExpanded(false); }} />
        <AssetPicker label="Compare with" options={matrix.labels} value={second.id}
          onChange={(id) => setOther(matrix.labels.findIndex((label) => label.id === id))} />
        <div className="correlation-answer" aria-live="polite"><span>{first.label} / {second.label}</span>
          <strong>{value === null ? "Not available" : formatValue(value, "ratio")}</strong>
          <small>{a === b ? "An asset's correlation with itself." : value === null ? "No exported estimate for this pair." : value < 0 ? "Negative historical co-movement" : value > 0 ? "Positive historical co-movement" : "No measured linear association"}</small>
        </div>
      </div>
      {record ? <p className="reading-hint">Exported SPY overlap: {String(sampleCell("first_return") ?? "not recorded")} to {String(sampleCell("last_return") ?? "not recorded")}; {String(sampleCell("observations") ?? "not recorded")} daily observations.</p>
        : <p className="reading-hint">Use the comparison basis above. Pair-specific dates are not supplied here; they are not inferred from the colours or matrix.</p>}
      <div className="relationship-heading"><h3>Correlations with {first.label}</h3>
        <fieldset className="segmented-control"><legend>Order relationships</legend>
          <button type="button" aria-pressed={direction === "positive"} onClick={() => setDirection("positive")}>Most positive</button>
          <button type="button" aria-pressed={direction === "negative"} onClick={() => setDirection("negative")}>Most negative</button>
        </fieldset></div>
      <dl className="relationship-list">{ranked.slice(0, expanded ? ranked.length : 8).map((label) => <div key={label.id}>
        <dt><button type="button" aria-label={`Compare ${first.label} with ${label.label}`} onClick={() => setOther(matrix.labels.findIndex((item) => item.id === label.id))}>{label.label}</button></dt>
        <dd aria-label={label.value === null ? "Not available" : undefined}>{label.value === null ? "—" : formatValue(label.value, "ratio")}</dd>
      </div>)}</dl>
      {ranked.length > 8 && <button type="button" className="detail-button" onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer relationships" : "Show all relationships"}</button>}
      <p className="reading-hint">Self-correlation is excluded from the list. These are signed historical estimates, not permanent hedges or investment rankings.</p>
      <details className="full-matrix" open={fullOpen} onToggle={(e) => setFullOpen(e.currentTarget.open)}>
        <summary>Open full matrix · {matrix.labels.length} assets</summary>
        <p className="matrix-instruction">Select a ticker heading to highlight its row and column. Scroll within the table; keyboard users can focus the table region and use arrow keys.</p>
        {fullOpen && <div className="table-scroll matrix-scroll" tabIndex={0} role="region" aria-label={`${matrix.title} matrix`}>
          <table className="correlation-table"><caption className="sr-only">{matrix.title}. Signed values from minus one to one; missing values are labelled.</caption>
            <thead><tr><th scope="col">Asset</th>{matrix.labels.map((label, index) => <th scope="col" key={label.id}>
              <button type="button" aria-pressed={a === index} onClick={() => setSelected(index)}>{label.label}</button></th>)}</tr></thead>
            <tbody>{matrix.values.map((row, r) => <tr key={matrix.labels[r].id} className={a === r ? "matrix-selected" : ""}>
              <th scope="row">{matrix.labels[r].label}</th>{row.map((entry, c) => <td key={matrix.labels[c].id}
                className={`${entry === null ? "matrix-missing" : entry < 0 ? "matrix-negative" : entry >= 0.5 ? "matrix-positive" : "matrix-low"} ${a === c ? "matrix-column" : ""}`}>
                {entry === null ? "Not available" : formatValue(entry, "ratio")}</td>)}</tr>)}</tbody>
          </table>
        </div>}
      </details>
    </section>
  );
}
