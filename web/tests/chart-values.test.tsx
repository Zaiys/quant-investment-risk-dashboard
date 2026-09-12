// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ResearchChart } from "@/components/research-chart";
import type { Chart } from "@/lib/types";

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 400,
    top: 0,
    left: 0,
    right: 800,
    bottom: 400,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const chart: Chart = {
  id: "paged-values",
  title: "Synthetic pagination check",
  description: "Test observations only",
  kind: "line",
  xLabel: "Observation",
  yLabel: "Value",
  xUnit: "text",
  unit: "number",
  series: [
    {
      id: "a",
      label: "First series",
      points: Array.from({ length: 101 }, (_, i) => ({
        x: `date-${i}`,
        y: i === 100 ? null : i,
      })),
    },
    {
      id: "b",
      label: "Second series",
      points: Array.from({ length: 101 }, (_, i) => ({
        x: `date-${i}`,
        y: -i,
      })),
    },
  ],
};

describe("chart value pagination", () => {
  it("mounts values only when opened, exposes every row in source order and preserves missing values", async () => {
    const before = structuredClone(chart);
    render(<ResearchChart chart={chart} />);
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByText("View chart values"));
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(101);
    expect(
      screen.getByRole("button", { name: "Previous rows" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next rows" }));
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
      "First seriesdate-100—",
    );
    expect(within(table).getAllByRole("row")[2]).toHaveTextContent(
      "Second seriesdate-0-0",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next rows" }));
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getAllByRole("row")[2]).toHaveTextContent(
      "Second seriesdate-100-100",
    );
    expect(screen.getByRole("button", { name: "Next rows" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Rows 201–202 of 202");
    expect(chart).toEqual(before);
  });
  it("resets pagination when the inspected series changes", async () => {
    render(<ResearchChart chart={chart} />);
    fireEvent.click(screen.getByText("View chart values"));
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Next rows" }));
    fireEvent.change(screen.getByLabelText("Inspect series"), {
      target: { value: "b" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Rows 1–100 of 101");
    const table = screen.getByRole("table");
    expect(within(table).queryByText("First series")).toBeNull();
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
      "Second seriesdate-0-0",
    );
  });
  it("resets pagination when the page-level asset filter supplies fewer series", async () => {
    const { rerender } = render(<ResearchChart chart={chart} />);
    fireEvent.click(screen.getByText("View chart values"));
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("button", { name: "Next rows" }));
    fireEvent.click(screen.getByRole("button", { name: "Next rows" }));
    rerender(<ResearchChart chart={{ ...chart, series: [chart.series[0]] }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Rows 1–100 of 101");
    expect(
      within(screen.getByRole("table")).getAllByRole("row")[1],
    ).toHaveTextContent("First seriesdate-00");
  });
});
