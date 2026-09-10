// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import fixture from "./fixtures/available.json";
import { DataTable } from "@/components/data-table";
import { ResearchChart, alignSeries } from "@/components/research-chart";
import { parseDashboard } from "@/lib/validate";
import { PendingData, MetricCards, Provenance } from "@/components/ui";
const data = parseDashboard(fixture);
const section = data.sections.market;
if (section.status !== "available") throw new Error("Missing test fixture");
afterEach(cleanup);
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
describe("presentation components", () => {
  it("sorts numeric values correctly and keeps missing values last in both directions", () => {
    render(<DataTable table={section.tables[0]} />);
    fireEvent.click(screen.getByRole("button", { name: "Test value" }));
    let rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Test B")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Missing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Test value" }));
    rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("Test A")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Missing")).toBeInTheDocument();
  });
  it("renders real source context and formatted values", () => {
    render(
      <>
        <MetricCards metrics={section.metrics} />
        <Provenance source={section.source} />
      </>,
    );
    expect(screen.getByText("-12%")).toBeInTheDocument();
    expect(screen.getByText(section.source.methodology)).toBeInTheDocument();
    expect(screen.getByText(section.source.path)).toBeInTheDocument();
  });
  it("preserves gaps and does not fill missing chart observations", () => {
    expect(alignSeries(section.charts[0])[1]).toEqual({
      x: "2024-01-02",
      series0: null,
      series1: 6,
    });
  });
  it.each(section.charts)(
    "exposes accessible source values for $kind charts",
    (chart) => {
      render(<ResearchChart chart={chart} />);
      expect(screen.getByRole("img")).toHaveAccessibleName(
        new RegExp(chart.title),
      );
      expect(screen.getByText("View chart values")).toBeInTheDocument();
      expect(screen.getAllByText("Test series A").length).toBeGreaterThan(0);
    },
  );
  it("explains missing outputs without presenting zero as a result", () => {
    render(
      <PendingData
        title="No research yet"
        reason="Awaiting reviewed analysis."
      />,
    );
    expect(screen.getByText("Awaiting reviewed analysis.")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
