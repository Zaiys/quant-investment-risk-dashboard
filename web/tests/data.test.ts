import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseDashboard } from "@/lib/validate";
import { formatDate, formatValue } from "@/lib/format";
import snapshot from "@/data/dashboard.json";
const fixture = () =>
  JSON.parse(
    readFileSync(new URL("./fixtures/available.json", import.meta.url), "utf8"),
  );
describe("research handoff", () => {
  it("validates the committed snapshot and keeps momentum UI-only", () => {
    expect(parseDashboard(snapshot).sections.momentum.status).toBe("awaiting");
  });
  it("accepts an empty snapshot without supplying fake metrics", () => {
    const data = parseDashboard({
      schemaVersion: 1,
      generatedAt: null,
      sections: Object.fromEntries(
        Object.keys(snapshot.sections).map((key) => [
          key,
          { status: "awaiting", reason: "Awaiting a reviewed export." },
        ]),
      ),
    });
    expect(
      Object.values(data.sections).every(
        (section) => section.status === "awaiting",
      ),
    ).toBe(true);
    expect(data.generatedAt).toBeNull();
  });
  it("preserves all values, metadata and missing values in a valid export", () => {
    const input = fixture();
    expect(parseDashboard(input)).toEqual(input);
  });
  it.each([
    [
      "unknown version",
      (d: ReturnType<typeof fixture>) => {
        d.schemaVersion = 2;
      },
    ],
    [
      "momentum data",
      (d: ReturnType<typeof fixture>) => {
        d.sections.momentum = d.sections.market;
      },
    ],
    [
      "no provenance",
      (d: ReturnType<typeof fixture>) => {
        delete d.sections.market.source;
      },
    ],
    [
      "absolute path",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.source.path = "/private/research.ipynb";
      },
    ],
    [
      "path traversal",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.source.path = "../research.ipynb";
      },
    ],
    [
      "impossible date",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.source.asOf = "2024-02-31";
      },
    ],
    [
      "reversed period",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.source.period.start = "2025-01-01";
      },
    ],
    [
      "period after as-of date",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.source.asOf = "2023-01-01";
      },
    ],
    [
      "missing generation time",
      (d: ReturnType<typeof fixture>) => {
        d.generatedAt = null;
      },
    ],
    [
      "non-finite metric",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.metrics[0].value = Infinity;
      },
    ],
    [
      "duplicate widget",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.metrics.push(d.sections.market.metrics[0]);
      },
    ],
    [
      "duplicate coordinate",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.charts[0].series[0].points[1].x = "2024-01-01";
      },
    ],
    [
      "misaligned series",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.charts[0].series[1].points.pop();
      },
    ],
    [
      "wrong x type",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.charts[2].series[0].points[0].x = "0.1";
      },
    ],
    [
      "wrong cell type",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.tables[0].rows[0].cells[1] = "20%";
      },
    ],
    [
      "wrong row width",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.tables[0].rows[0].cells.pop();
      },
    ],
    [
      "empty available section",
      (d: ReturnType<typeof fixture>) => {
        d.sections.market.metrics = [];
        d.sections.market.charts = [];
        d.sections.market.tables = [];
      },
    ],
  ])("rejects %s", (_, mutate) => {
    const data = fixture();
    mutate(data);
    expect(() => parseDashboard(data)).toThrow();
  });
});
describe("display formatting", () => {
  it("distinguishes missing values from zero", () => {
    expect(formatValue(null)).toBe("—");
    expect(formatValue(0, "percent")).toBe("0%");
  });
  it("formats raw fractions without changing the data", () => {
    expect(formatValue(-0.125, "percent")).toBe("-12.5%");
    expect(formatValue(1.2, "ratio")).toBe("1.20");
  });
  it("does not shift observation dates across time zones", () => {
    expect(formatDate("2024-01-01")).toBe("1 Jan 2024");
  });
});
