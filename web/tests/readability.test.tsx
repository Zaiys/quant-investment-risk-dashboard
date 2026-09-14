// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import type { Chart, Matrix, DataTable as TableData, AvailableSection } from "@/lib/types";
import { canUseLog, defaultSeries, hasDateAxis, plotRows, positiveDomain, seriesStyle } from "@/lib/chart-presentation";
import { chooseComparisonBasis } from "@/lib/analysis-scope";
import { ResearchChart } from "@/components/research-chart";
import { DataTable } from "@/components/data-table";
import { CorrelationMatrix } from "@/components/correlation-matrix";
import { AvailableAnalysis } from "@/components/available-analysis";
import { parseDashboard } from "@/lib/validate";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const chart: Chart = {
  id: "momentum-index", title: "Momentum and SPY indexed wealth", description: "Synthetic test data", kind: "line",
  xLabel: "Observation date", yLabel: "Index", xUnit: "text", unit: "number",
  series: [
    { id: "MOMENTUM", entityId: "MOMENTUM", label: "Momentum", points: [{ x: "2020-01-01", y: 100 }, { x: "2020-01-02", y: 110 }, { x: "2020-02-01", y: 5000 }] },
    { id: "SPY", entityId: "SPY", label: "SPY", points: [{ x: "2020-01-01", y: 100 }, { x: "2020-01-02", y: null }, { x: "2020-02-01", y: 130 }] },
  ],
};

describe("presentation identity and source integrity", () => {
  it("keeps SPY's colour and line pattern independent of selection or ordering", () => {
    expect(seriesStyle("SPY")).toEqual({ colour: "#205da8", dash: "8 4" });
    expect(seriesStyle("MOMENTUM").colour).not.toBe(seriesStyle("SPY").colour);
    const { rerender } = render(<ResearchChart chart={chart} />);
    const original = document.querySelector('[data-series-id="SPY"]')?.getAttribute("data-colour");
    fireEvent.change(screen.getByLabelText("Inspect series"), { target: { value: "SPY" } });
    expect(document.querySelector('[data-series-id="SPY"]')).toHaveAttribute("data-colour", original);
    rerender(<ResearchChart chart={{ ...chart, series: [...chart.series].reverse() }} />);
    expect(document.querySelector('[data-series-id="SPY"]')).toHaveAttribute("data-colour", original);
  });
  it("spaces irregular observations in calendar time without changing source values or gaps", () => {
    const original = structuredClone(chart);
    expect(hasDateAxis(chart)).toBe(true);
    const rows = plotRows(chart);
    expect(Number(rows[2].calendarX) - Number(rows[1].calendarX)).toBe(30 * 86400000);
    expect(Number(rows[1].calendarX) - Number(rows[0].calendarX)).toBe(86400000);
    expect(rows[1].x).toBe("2020-01-02");
    expect(rows[1].series1).toBeNull();
    expect(chart).toEqual(original);
  });
  it("uses a positive log domain, disables invalid log selections and never logs drawdown", () => {
    expect(canUseLog(chart)).toBe(true);
    expect(positiveDomain(chart)[0]).toBeGreaterThan(0);
    const invalid = { ...chart, series: [{ ...chart.series[0], points: [{ x: "2020-01-01", y: 0 }] }] };
    render(<ResearchChart chart={invalid} />);
    expect(screen.getByRole("button", { name: "Logarithmic" })).toBeDisabled();
    cleanup();
    render(<ResearchChart chart={{ ...chart, title: "Drawdown", unit: "percent" }} />);
    expect(screen.queryByRole("button", { name: "Logarithmic" })).toBeNull();
  });
  it("switches log and linear display without changing any inspected source row", async () => {
    const original = structuredClone(chart);
    render(<ResearchChart chart={chart} />);
    expect(screen.getByRole("button", { name: "Logarithmic" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByText("View chart values"));
    const table = await screen.findByRole("table");
    const before = table.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Linear" }));
    expect(table.textContent).toBe(before);
    fireEvent.change(screen.getByLabelText("Inspect series"), { target: { value: "SPY" } });
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByRole("table")).toHaveTextContent("130");
    expect(chart).toEqual(original);
  });
  it("shows only a small illustrative default while keeping an explicit all-series view", () => {
    const many = { ...chart, series: Array.from({ length: 20 }, (_, i) => ({ ...chart.series[0], id: `C${i}`, entityId: `C${i}`, label: `Company ${i}` })) };
    expect(defaultSeries(many)).toHaveLength(3);
    render(<ResearchChart chart={many} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    fireEvent.click(screen.getByText(/Choose a comparison/));
    fireEvent.click(screen.getByRole("button", { name: "Show all series" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: "Reset comparison" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
  it("preserves all published momentum points in the rendering adapter", () => {
    const data = parseDashboard(JSON.parse(readFileSync("src/data/dashboard.json", "utf8")));
    if (data.sections.momentum.status !== "available") throw new Error("Reviewed momentum required");
    const wealth = data.sections.momentum.charts.find((item) => item.id === "momentum-index")!;
    const before = JSON.stringify(wealth);
    const rows = plotRows(wealth);
    wealth.series.forEach((series, i) => series.points.forEach((point, j) => {
      expect(rows[j].x).toBe(point.x);
      expect(rows[j][`series${i}`]).toBe(point.y);
    }));
    expect(JSON.stringify(wealth)).toBe(before);
  });
});

describe("compact exact-value inspection", () => {
  const table: TableData = { id: "many-records", title: "Test records", description: "Synthetic", columns: [
    { key: "id", label: "Record", unit: "text" }, { key: "value", label: "Measure", unit: "number" },
  ], rows: Array.from({ length: 21 }, (_, i) => ({ id: `C${i}`, cells: [`C${i}`, i === 20 ? null : 10 - i] })) };
  it("paginates, searches and sorts without losing nulls, signs or source order", () => {
    const before = structuredClone(table);
    render(<DataTable table={table} />);
    expect(screen.getAllByRole("row")).toHaveLength(11);
    fireEvent.click(screen.getByRole("button", { name: "Next records" }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("C10");
    fireEvent.click(screen.getByRole("button", { name: "Next records" }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("C20—");
    fireEvent.change(screen.getByLabelText("Search Test records"), { target: { value: "C12" } });
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("C12-2");
    fireEvent.change(screen.getByLabelText("Search Test records"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Measure" }));
    expect(screen.getAllByRole("row")[1]).toHaveTextContent("C19-9");
    expect(table).toEqual(before);
  });
  it("looks up a matrix pair and keeps the full large matrix unmounted until requested", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `C${i}`);
    const matrix: Matrix = { id: "matrix", title: "Pair test", description: "Synthetic common period", labels: ids.map((id) => ({ id, label: id })), values: ids.map((_, r) => ids.map((_, c) => r === c ? 1 : (r === 0 && c === 1) || (r === 1 && c === 0) ? -0.25 : null)) };
    const before = structuredClone(matrix);
    render(<CorrelationMatrix matrix={matrix} />);
    expect(screen.queryByRole("table")).toBeNull();
    const answer = document.querySelector(".correlation-answer")!;
    expect(answer).toHaveTextContent("C0 / C1");
    expect(answer).toHaveTextContent("-0.25");
    fireEvent.change(screen.getByLabelText("Compare with"), { target: { value: "C2" } });
    expect(answer).toHaveTextContent("Not available");
    fireEvent.click(screen.getByText(/Open full matrix/));
    expect(matrix).toEqual(before);
  });
  it("switches only between exported samples and does not invent unavailable common metrics", () => {
    const source = { path: "test", label: "test", asOf: "2024-01-01", period: { start: "2020-01-01", end: "2024-01-01" }, methodology: "test", notes: [] };
    const base: AvailableSection = { status: "available", source, metrics: [], charts: [], tables: [
      { id: "common-metrics", title: "Common metrics", description: "Same daily sample", columns: [{ key: "id", label: "Asset", unit: "text" }, { key: "cagr", label: "CAGR", unit: "percent" }], rows: [{ id: "A", cells: ["A", 0.1] }] },
      { id: "full-metrics", title: "Own metrics", description: "Own history", columns: [{ key: "id", label: "Asset", unit: "text" }, { key: "max_drawdown", label: "Drawdown", unit: "percent" }], rows: [{ id: "A", cells: ["A", -0.5] }] },
    ] };
    expect(chooseComparisonBasis(base, "common").tables.map((t) => t.id)).toEqual(["common-metrics"]);
    expect(chooseComparisonBasis(base, "individual").tables.map((t) => t.id)).toEqual(["full-metrics"]);
  });
  it("preserves both sensitivity tables when inspecting SPY", () => {
    const data = parseDashboard(JSON.parse(readFileSync("src/data/dashboard.json", "utf8")));
    const momentum = data.sections.momentum;
    if (momentum.status !== "available") throw new Error("Momentum required");
    render(<AvailableAnalysis section={{ ...momentum, charts: [] }} sectionKey="momentum" sensitivities={momentum.sensitivities} />);
    fireEvent.change(screen.getByLabelText("Inspect asset or portfolio"), { target: { value: "SPY" } });
    expect(screen.getByRole("heading", { name: "Transaction-cost sensitivity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Next-day-close execution sensitivity" })).toBeInTheDocument();
  });
});
