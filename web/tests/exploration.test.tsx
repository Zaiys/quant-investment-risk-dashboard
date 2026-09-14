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
import { parseDashboard } from "@/lib/validate";
import { selectAnalysis } from "@/lib/select-analysis";
import { AvailableAnalysis } from "@/components/available-analysis";
import { CorrelationMatrix } from "@/components/correlation-matrix";
import { ResearchChart } from "@/components/research-chart";
const data = parseDashboard(fixture);
const market = data.sections.market;
const correlation = data.sections.correlation;
if (market.status !== "available" || correlation.status !== "available")
  throw new Error("Missing fixture");
afterEach(cleanup);
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
describe("research inspection", () => {
  it("filters tagged records while preserving untagged comparisons and original values", () => {
    const before = JSON.stringify(market);
    const shown = selectAnalysis(market, "b", "second");
    expect(shown.metrics).toHaveLength(0);
    expect(shown.charts.map((c) => c.id)).toEqual(["test-bar", "test-scatter"]);
    expect(shown.charts[0].series.map((s) => s.id)).toEqual(["test-b"]);
    expect(shown.tables[0].rows.map((r) => r.id)).toEqual(["b", "c"]);
    expect(JSON.stringify(market)).toBe(before);
  });
  it("lets a visitor select an asset and a historical scenario", () => {
    render(<AvailableAnalysis section={market} />);
    fireEvent.change(screen.getByLabelText("Inspect asset or portfolio"), {
      target: { value: "b" },
    });
    fireEvent.change(screen.getByLabelText("Historical scenario"), {
      target: { value: "second" },
    });
    expect(screen.queryByText("Test line chart")).not.toBeInTheDocument();
    expect(screen.getByText("Test bar chart")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing matching records",
    );
  });
  it("lets a visitor inspect a series without rescaling or rebasing it", async () => {
    render(<ResearchChart chart={market.charts[0]} />);
    fireEvent.change(screen.getByLabelText("Inspect series"), {
      target: { value: "test-b" },
    });
    fireEvent.click(screen.getByText("View chart values"));
    await screen.findByRole("table");
    expect(
      within(screen.getByRole("table")).queryByText("Test series A"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Test series B").length).toBeGreaterThan(0);
  });
  it("provides keyboard-operable matrix selection with exact exported values", () => {
    render(<CorrelationMatrix matrix={correlation.matrices![0]} />);
    const control = screen.getByRole("button", { name: "Test B" });
    fireEvent.click(control);
    expect(control).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: "Correlations with Test B" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("-0.40").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Not available")).toHaveLength(2);
    expect(within(screen.getByRole("region")).getAllByRole("row")).toHaveLength(
      4,
    );
  });
});
