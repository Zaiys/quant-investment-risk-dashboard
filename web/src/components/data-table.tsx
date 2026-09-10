"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { DataTable as TableData } from "@/lib/types";
import { formatValue } from "@/lib/format";
export function DataTable({ table }: { table: TableData }) {
  const [sort, setSort] = useState<{
    index: number;
    ascending: boolean;
  } | null>(null);
  const rows = [...table.rows];
  if (sort)
    rows.sort((a, b) => {
      const x = a.cells[sort.index];
      const y = b.cells[sort.index];
      if (x === null) return y === null ? 0 : 1;
      if (y === null) return -1;
      const result =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y));
      return sort.ascending ? result : -result;
    });
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <h2>{table.title}</h2>
          <p>{table.description}</p>
        </div>
        <span className="count-label">{rows.length} rows</span>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label={`${table.title} data`}
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">
            {table.title}. {table.description}
          </caption>
          <thead>
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    sort?.index === index
                      ? sort.ascending
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSort({
                        index,
                        ascending:
                          sort?.index === index ? !sort.ascending : true,
                      })
                    }
                  >
                    {column.label}
                    {sort?.index === index ? (
                      sort.ascending ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )
                    ) : (
                      <ArrowUpDown size={14} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, index) => (
                  <td
                    key={table.columns[index].key}
                    className={
                      table.columns[index].unit === "text" ? "" : "numeric"
                    }
                  >
                    {formatValue(cell, table.columns[index].unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
