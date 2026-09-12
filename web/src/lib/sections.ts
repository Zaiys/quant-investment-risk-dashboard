import type { SectionKey } from "./types";
export const sections: {
  key: SectionKey;
  number: string;
  title: string;
  nav: string;
  question: string;
  description: string;
}[] = [
  {
    key: "market",
    number: "03",
    title: "Market Explorer",
    nav: "Market explorer",
    question:
      "How does the comparison change when history is put on a common basis?",
    description:
      "Historical performance, available observation periods and asset-by-asset comparisons.",
  },
  {
    key: "risk-return",
    number: "04",
    title: "Risk vs Return",
    nav: "Risk vs return",
    question: "What risk accompanied the observed returns?",
    description:
      "CAGR, annualised volatility, Sharpe ratio, maximum drawdown and beta, with their measurement assumptions.",
  },
  {
    key: "correlation",
    number: "05",
    title: "Diversification & Correlation",
    nav: "Diversification",
    question: "Which relationships persist, and which depend on the period?",
    description:
      "Pairwise correlations, relationships with SPY and the distinction between co-movement and benchmark sensitivity.",
  },
  {
    key: "portfolio",
    number: "06",
    title: "Portfolio Analysis",
    nav: "Portfolio",
    question: "How does capital allocation translate into portfolio risk?",
    description:
      "The hypothetical portfolio, its comparison with SPY and the contribution of each constituent to total risk.",
  },
  {
    key: "stress",
    number: "07",
    title: "Stress Testing",
    nav: "Stress testing",
    question: "Did diversification behave differently across market regimes?",
    description:
      "Historical comparisons across the Global Financial Crisis, COVID crash and 2022 selloff.",
  },
  {
    key: "momentum",
    number: "08",
    title: "Quantitative Strategy",
    nav: "Strategy",
    question:
      "Can a clearly specified investment rule withstand a historical test?",
    description:
      "A pre-specified monthly momentum rule, its comparison with SPY, and the limitations of the historical experiment.",
  },
];
export const chapters = [
  { href: "/guide", number: "01", label: "Research guide" },
  { href: "/", number: "02", label: "Overview" },
  ...sections.map((s) => ({
    href: `/${s.key}`,
    number: s.number,
    label: s.nav,
  })),
  { href: "/methodology", number: "09", label: "Methodology" },
];
