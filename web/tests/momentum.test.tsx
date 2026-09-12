// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { parseDashboard } from "@/lib/validate";
import { MomentumIntro } from "@/components/momentum-intro";
import { MomentumSensitivities } from "@/components/momentum-sensitivities";
import ResearchGuide from "@/app/guide/page";
import { formatValue } from "@/lib/format";
import { chapters } from "@/lib/sections";

const snapshot = () =>
  JSON.parse(readFileSync("src/data/dashboard.json", "utf8"));
afterEach(cleanup);
describe("reviewed momentum", () => {
  it("requires the specified rule, source and identical evaluation period", () => {
    const mutations = [
      (s: ReturnType<typeof snapshot>) => {
        s.schemaVersion = 2;
      },
      (s: ReturnType<typeof snapshot>) => {
        delete s.sections.momentum.definition;
      },
      (s: ReturnType<typeof snapshot>) => {
        s.sections.momentum.definition.topN = 5;
      },
      (s: ReturnType<typeof snapshot>) => {
        s.sections.momentum.definition.skipMonth = true;
      },
      (s: ReturnType<typeof snapshot>) => {
        s.sections.momentum.definition.firstReturnDate =
          s.sections.momentum.definition.initialWealthDate;
      },
      (s: ReturnType<typeof snapshot>) => {
        s.sections.momentum.definition.lastReturnDate = "2026-09-09";
      },
      (s: ReturnType<typeof snapshot>) => {
        s.sections.momentum.source.path =
          "notebooks/01_market_exploration.ipynb";
      },
      (s: ReturnType<typeof snapshot>) => {
        s.sections.momentum.tables[0].rows[0].cells.pop();
      },
      (s: ReturnType<typeof snapshot>) => {
        s.sections.momentum.charts[0].series[1].points.pop();
      },
    ];
    for (const mutate of mutations) {
      const s = snapshot();
      mutate(s);
      expect(() => parseDashboard(s)).toThrow();
    }
  });
  it("keeps limitations and timing beside the results", () => {
    const section = parseDashboard(snapshot()).sections.momentum;
    if (section.status !== "available")
      throw new Error("Momentum results required");
    render(<MomentumIntro section={section} />);
    expect(
      screen.getByText(/Failed and unselected businesses are absent/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/idealized monthly execution assumption/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /research guide/ }),
    ).toHaveAttribute("href", "/guide");
  });
  it("uses the reviewed CAGR in the guide and leaves video explicitly unavailable", () => {
    render(<ResearchGuide />);
    const section = parseDashboard(snapshot()).sections.momentum;
    if (section.status !== "available")
      throw new Error("Momentum results required");
    const cagr = section.metrics.find(
      (metric) => metric.id === "MOMENTUM-cagr",
    )!;
    expect(
      screen.getByText(
        new RegExp(
          `measured CAGR is ${formatValue(cagr.value, "percent").replace(".", "\\.")}`,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Video walkthrough coming later"),
    ).toBeInTheDocument();
    expect(document.querySelector("video, iframe")).toBeNull();
    expect(chapters.some((chapter) => chapter.href === "/guide")).toBe(true);
    expect(
      screen.getByRole("link", { name: "Quantitative Strategy" }),
    ).toHaveAttribute("href", "/momentum");
  });
  it("rejects unsupported sensitivity conventions, missing outputs and mismatched dates", () => {
    type Sensitivity = ReturnType<
      typeof snapshot
    >["sections"]["momentum"]["sensitivities"];
    const mutations: ((s: Sensitivity) => void)[] = [
      (s) => {
        s.definition.baselineUnchanged = false;
      },
      (s) => {
        s.definition.costBps = [0, 5, 10];
      },
      (s) => {
        s.definition.executionTransactionCosts = 10;
      },
      (s) => {
        s.definition.executionPolicy = "retain old holdings";
      },
      (s) => {
        s.definition.dailyObservations = 1;
      },
      (s) => {
        s.definition.firstReturnDate = "2000-01-01";
      },
      (s) => {
        s.source.path = "notebooks/02_momentum_strategy.ipynb";
      },
      (s) => {
        s.source.period.end = "2026-09-09";
      },
      (s) => {
        s.tables.pop();
      },
      (s) => {
        s.tables[0].rows.pop();
      },
      (s) => {
        s.tables[0].rows[0].cells.pop();
      },
      (s) => {
        s.tables[0].rows[0].cells[1] = Infinity;
      },
      (s) => {
        s.tables[0].rows[0].cells[1] = "0.2746";
      },
    ];
    for (const mutate of mutations) {
      const data = snapshot();
      mutate(data.sections.momentum.sensitivities);
      expect(() => parseDashboard(data)).toThrow();
    }
  });
  it("shows two separately sourced sensitivity tables and sorts supplied values", () => {
    const section = parseDashboard(snapshot()).sections.momentum;
    if (section.status !== "available" || !section.sensitivities)
      throw new Error("Reviewed sensitivity outputs required");
    const before = structuredClone(section);
    render(<MomentumSensitivities sensitivities={section.sensitivities} />);
    expect(
      screen.getByRole("heading", { name: "Transaction-cost sensitivity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Next-day-close execution sensitivity",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/first trading day of every month/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("scripts/momentum_robustness.py"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not retain old holdings/),
    ).toBeInTheDocument();
    const costs = screen.getByRole("region", {
      name: "Transaction-cost sensitivity data",
    });
    const timing = screen.getByRole("region", {
      name: "Next-day-close execution sensitivity data",
    });
    expect(within(costs).getAllByRole("row")).toHaveLength(5);
    expect(within(timing).getAllByRole("row")).toHaveLength(4);
    for (const [table, region] of [
      [section.sensitivities.tables[0], costs],
      [section.sensitivities.tables[1], timing],
    ] as const) {
      const displayedRows = within(region).getAllByRole("row").slice(1);
      table.rows.forEach((row, rowIndex) => {
        const cells = within(displayedRows[rowIndex]).getAllByRole("cell");
        row.cells.forEach((value, index) => {
          expect(cells[index]).toHaveTextContent(
            formatValue(value, table.columns[index].unit),
          );
        });
      });
    }
    fireEvent.click(
      within(costs).getByRole("button", { name: /^CAGR$/ }),
    );
    expect(within(costs).getAllByRole("row")[1]).toHaveTextContent("20 bps");
    expect(section).toEqual(before);
    expect(section.definition.transactionCosts).toBe(0);
  });
});
