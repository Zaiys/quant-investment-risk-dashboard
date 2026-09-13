"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { DataTable as TableData } from "@/lib/types";
import { formatValue } from "@/lib/format";

const compactColumns: Record<string, string[]> = {
  "full-metrics": ["cagr", "volatility", "sharpe", "max_drawdown"],
  "spy-relationships": ["correlation", "beta", "observations"],
  "history": ["first_date", "last_date", "return_observations"],
  "momentum-walkthrough": ["signal", "rank", "weight", "next_period_return"],
};
const PAGE_SIZE = 10;

export function DataTable({ table }: { table: TableData }) {
  const [sort, setSort] = useState<{ index: number; ascending: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [full, setFull] = useState(false);
  const compact = compactColumns[table.id];
  const columns = table.columns.map((column, index) => ({ ...column, index }))
    .filter((column) => full || !compact || column.index === 0 || compact.includes(column.key));
  const search = query.toLowerCase().trim();
  // Search the full source row, including columns hidden by compact mode.
  const rows = table.rows.filter((row) => !search || [row.id, ...row.cells].some((cell) =>
    cell !== null && String(cell).toLowerCase().includes(search)));
  if (sort) rows.sort((a, b) => {
    const x = a.cells[sort.index], y = b.cells[sort.index];
    if (x === null) return y === null ? 0 : 1;
    if (y === null) return -1;
    const result = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return sort.ascending ? result : -result;
  });
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * PAGE_SIZE;
  const shown = rows.slice(start, start + PAGE_SIZE);
  return (
    <section className="panel table-panel readable-table">
      <div className="panel-title"><div><h2>{table.title}</h2><p>{table.description}</p></div>
        <span className="count-label">{table.rows.length} source rows</span></div>
      {(table.rows.length > PAGE_SIZE || compact) && <div className="readability-controls">
        <label>Search {table.title}<input type="search" value={query} placeholder="Ticker or record"
          onChange={(e) => { setQuery(e.target.value); setPage(0); }} /></label>
        {compact && <button type="button" aria-pressed={full} onClick={() => setFull(!full)}>{full ? "Compact view" : "Full details"}</button>}
      </div>}
      {compact && !full && <p className="reading-hint">Key measures shown. Full details retains all exported columns and their original observation basis.</p>}
      <div className="table-scroll" role="region" aria-label={`${table.title} data`} tabIndex={0}>
        <table><caption className="sr-only">{table.title}. {table.description}</caption>
          <thead><tr>{columns.map((column) => <th key={column.key} scope="col"
            aria-sort={sort?.index === column.index ? sort.ascending ? "ascending" : "descending" : "none"}>
            <button type="button" onClick={() => { setPage(0); setSort({ index: column.index,
              ascending: sort?.index === column.index ? !sort.ascending : true }); }}>
              {column.label}{sort?.index === column.index ? sort.ascending ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : <ArrowUpDown size={14} />}
            </button></th>)}</tr></thead>
          <tbody>{shown.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}
            className={column.unit === "text" ? "" : "numeric"} title={row.cells[column.index] === null ? "Not available" : String(row.cells[column.index])}>
            {formatValue(row.cells[column.index], column.unit)}</td>)}</tr>)}
            {!shown.length && <tr><td colSpan={columns.length}>No matching records.</td></tr>}
          </tbody></table>
      </div>
      {table.rows.length > PAGE_SIZE && <div className="table-pagination">
        <p aria-live="polite">{rows.length ? `Rows ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} of ${rows.length}` : "0 matching rows"}</p>
        <div className="button-row"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous records</button>
          <button type="button" disabled={currentPage >= lastPage} onClick={() => setPage(currentPage + 1)}>Next records</button></div>
      </div>}
    </section>
  );
}
