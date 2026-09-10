import type { SectionKey } from "./types";
export const sections: {
  key: SectionKey;
  title: string;
  short: string;
  description: string;
  inputs: string[];
}[] = [
  {
    key: "market",
    title: "Market Explorer",
    short: "Market exploration",
    description:
      "Explore the investment universe and its historical market behaviour.",
    inputs: [
      "Asset universe and observation dates",
      "Price or indexed performance series",
      "Data coverage and source notes",
    ],
  },
  {
    key: "risk-return",
    title: "Risk vs Return",
    short: "Risk & return",
    description:
      "Compare return and risk estimates on the basis defined by the research.",
    inputs: [
      "Python-computed return and risk estimates",
      "Comparison period and annualisation basis",
      "Benchmark and risk-free-rate assumptions",
    ],
  },
  {
    key: "portfolio",
    title: "Portfolio Analysis",
    short: "Portfolio analysis",
    description:
      "Understand portfolio composition, performance and sources of risk.",
    inputs: [
      "Reviewed portfolio weights",
      "Portfolio performance and risk contributions",
      "Weighting and rebalancing assumptions",
    ],
  },
  {
    key: "stress",
    title: "Stress Testing",
    short: "Stress testing",
    description:
      "Examine how the portfolio behaves under the scenarios chosen in the analysis.",
    inputs: [
      "Research-defined scenarios and windows",
      "Measured portfolio and asset outcomes",
      "Scenario definitions and limitations",
    ],
  },
  {
    key: "momentum",
    title: "Momentum Strategy",
    short: "Momentum strategy",
    description:
      "A dedicated space for the strategy research and its future results.",
    inputs: [
      "Strategy definition and signal construction",
      "Reviewed backtest and benchmark results",
      "Implementation assumptions and limitations",
    ],
  },
];
