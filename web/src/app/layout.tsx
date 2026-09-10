import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import { PageFooter } from "@/components/ui";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Overview | Quant Research",
    template: "%s | Quant Research",
  },
  description:
    "A transparent presentation of quantitative investment research, market exploration and portfolio risk analysis.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Navigation />
        <div className="workspace">
          <div className="topbar">
            <span>INVESTMENT RESEARCH</span>
            <span className="topbar-right">
              Research dashboard <span className="topbar-slash">/</span> v1.0
            </span>
          </div>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <PageFooter />
        </div>
      </body>
    </html>
  );
}
