import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dashboard, snapshotText } from "@/lib/data";
import { GET } from "@/app/export/route";

describe("source precision", () => {
  it("loads every source value without compilation or rounding", () => {
    const text = readFileSync("src/data/dashboard.json", "utf8");
    expect(snapshotText).toBe(text);
    expect(dashboard).toEqual(JSON.parse(text));
  });
  it("downloads the validated source byte for byte", async () => {
    expect(await GET().text()).toBe(snapshotText);
  });
});
