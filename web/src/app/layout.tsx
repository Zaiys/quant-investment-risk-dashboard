import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import { PageFooter } from "@/components/ui";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Quantitative Investment & Risk Analysis",
    template: "%s | Quantitative Investment & Risk Analysis",
  },
  description:
    "A self-directed quantitative finance research project investigating historical asset performance, portfolio risk, diversification and investment strategies.",
  openGraph: {
    type: "website",
    title: "Quantitative Investment & Risk Analysis",
    description:
      "Historical asset performance, portfolio risk and diversification. Research, methodology and limitations.",
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
