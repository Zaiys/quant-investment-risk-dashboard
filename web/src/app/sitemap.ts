import type { MetadataRoute } from "next";
import { chapters } from "@/lib/sections";
import { publication } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!publication.indexable) return [];
  return chapters.map(({ href }) => ({
    url: new URL(href, publication.origin).href,
  }));
}
