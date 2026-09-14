import type { MetadataRoute } from "next";
import { publication } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!publication.indexable)
    return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/export" },
    sitemap: new URL("/sitemap.xml", publication.origin).href,
  };
}
