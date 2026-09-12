import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import { PageFooter } from "@/components/ui";
import { publication, siteTitle, siteDescription } from "@/lib/site";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: publication.metadataBase,
  title: { default: siteTitle, template: `%s | ${siteTitle}` },
  description: siteDescription,
  robots: { index: publication.indexable, follow: publication.indexable },
  openGraph: {
    type: "website",
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to research
        </a>
        <Navigation />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <PageFooter />
      </body>
    </html>
  );
}
