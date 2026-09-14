"use client";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DataTable } from "@/lib/types";
import { formatValue } from "@/lib/format";

export function AllocationComparison({ table }: { table: DataTable }) {
  const weight = table.columns.findIndex((column) => column.key === "weight");
  const share = table.columns.findIndex((column) => column.key === "risk_share");
  if (weight < 0 || share < 0) return null;
  const records = table.rows.map((row) => ({
    name: String(row.cells[0]), capital: row.cells[weight], risk: row.cells[share],
  }));
  return <section className="panel chart-panel allocation-chart">
    <div className="panel-title"><div><h2>Capital allocation versus share of volatility</h2>
      <p>The two exported measures are shown side by side. Negative risk shares stay negative; this is not a weight simulator.</p></div></div>
    <div className="chart" role="img" aria-label="Capital weights and volatility risk shares. Exact values are in the source table below.">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={records} layout="vertical" margin={{ left: 0, right: 30, top: 12, bottom: 8 }} accessibilityLayer>
        <CartesianGrid stroke="#cbd2c9" horizontal={false} strokeDasharray="3 5" />
        <XAxis type="number" tickFormatter={(value) => formatValue(value, "percent")} />
        <YAxis type="category" dataKey="name" width={65} tickLine={false} />
        <ReferenceLine x={0} stroke="#252d29" />
        <Tooltip formatter={(value, name) => [formatValue(typeof value === "number" ? value : null, "percent"), String(name)]} />
        <Bar dataKey="capital" name="Capital weight" fill="#35465c" isAnimationActive={false} />
        <Bar dataKey="risk" name="Share of volatility" fill="#087443" isAnimationActive={false} />
      </BarChart></ResponsiveContainer>
    </div>
    <p className="reading-hint">Dark bars: capital weights. Green bars: volatility risk shares. Hover or read the labelled source table; the measures are not interchangeable.</p>
  </section>;
}
