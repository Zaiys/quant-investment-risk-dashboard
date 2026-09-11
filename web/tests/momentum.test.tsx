// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { parseDashboard } from "@/lib/validate";
import { MomentumIntro } from "@/components/momentum-intro";
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
});
