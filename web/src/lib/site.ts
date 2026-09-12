import type { Metadata } from "next";

export const siteTitle = "Quantitative Investment & Risk Analysis";
export const siteDescription =
  "A self-directed quantitative finance research project investigating historical asset performance, portfolio risk, diversification and investment strategies.";

function publicOrigin(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]"
  )
    throw new Error(
      "Site URL must be a public HTTPS origin without a path or credentials",
    );
  return url;
}

export function publicationSettings(env: Record<string, string | undefined>) {
  const origin = publicOrigin(
    env.SITE_URL ||
      (env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined),
  );
  const indexable =
    Boolean(origin) &&
    (env.VERCEL_ENV === "production" ||
      (!env.VERCEL_ENV && Boolean(env.SITE_URL)));
  const deploymentOrigin = publicOrigin(
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
  );
  return {
    origin,
    indexable,
    metadataBase:
      (indexable ? origin : deploymentOrigin) ??
      origin ??
      new URL("http://127.0.0.1:3000"),
  };
}

export const publication = publicationSettings(process.env);

export function pageMetadata(
  title: string,
  description: string,
  pathname: string,
): Metadata {
  const url = publication.indexable
    ? new URL(pathname, publication.origin).href
    : undefined;
  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      type: "website",
      siteName: siteTitle,
      title,
      description,
      url,
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: siteTitle },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: "/opengraph-image", alt: siteTitle }],
    },
  };
}
