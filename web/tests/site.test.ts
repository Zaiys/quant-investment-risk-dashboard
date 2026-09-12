import { describe, expect, it } from "vitest";
import { publicationSettings } from "@/lib/site";

describe("publication metadata", () => {
  it("keeps an unconfigured local build out of search results", () => {
    const settings = publicationSettings({});
    expect(settings.indexable).toBe(false);
    expect(settings.origin).toBeUndefined();
  });
  it.each(["preview", "development"])(
    "keeps %s non-indexable even with a production domain",
    (environment) => {
      const settings = publicationSettings({
        VERCEL_ENV: environment,
        SITE_URL: "https://research.example.com",
        VERCEL_URL: "review.example.com",
      });
      expect(settings.indexable).toBe(false);
      expect(settings.metadataBase.origin).toBe("https://review.example.com");
    },
  );
  it("uses Vercel's production domain instead of an individual deployment URL", () => {
    const settings = publicationSettings({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "research.example.com",
      VERCEL_URL: "deployment.example.com",
    });
    expect(settings.indexable).toBe(true);
    expect(settings.origin?.origin).toBe("https://research.example.com");
    expect(settings.metadataBase).toEqual(settings.origin);
  });
  it("supports a deliberate custom canonical origin", () => {
    const settings = publicationSettings({
      SITE_URL: "https://research.example.com",
    });
    expect(settings.indexable).toBe(true);
    expect(settings.origin?.href).toBe("https://research.example.com/");
  });
  it("does not index a production build without a known production origin", () => {
    expect(
      publicationSettings({
        VERCEL_ENV: "production",
        VERCEL_URL: "deployment.example.com",
      }).indexable,
    ).toBe(false);
  });
  it.each([
    "http://research.example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://user:password@research.example.com",
    "https://research.example.com/path",
    "https://research.example.com/?query=1",
  ])("rejects an unsuitable canonical origin: %s", (SITE_URL) => {
    expect(() => publicationSettings({ SITE_URL })).toThrow();
  });
});
