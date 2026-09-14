// Review questions, not claims about an unverified analysis implementation.
export const methodologyChecks = [
  {
    id: "prices",
    title: "Adjusted price data",
    question:
      "Verify the price field, adjustment settings and treatment of dividends and splits. Keep price return and total return explicitly distinguished.",
  },
  {
    id: "listing",
    title: "Different listing dates",
    question:
      "Document the first and last usable observations for every asset. A longer history can include market regimes that a newer listing never experienced.",
  },
  {
    id: "common-period",
    title: "Common-period comparisons",
    question:
      "Identify the common observation window used for cross-asset comparisons. Keep full-history results separate and label both periods.",
  },
  {
    id: "risk-free",
    title: "Historical risk-free-rate proxy",
    question:
      "Verify the Treasury bill series used as the historical proxy, its units, date alignment and conversion to the return frequency. Do not assume a constant rate.",
  },
  {
    id: "annualisation",
    title: "Annualisation assumptions",
    question:
      "Record the sampling frequency, annualisation factor and the precise definitions of return, volatility and Sharpe ratio used in Python.",
  },
  {
    id: "survivorship",
    title: "Universe selection and survivorship",
    question:
      "Document how the asset universe was selected and whether delisted or failed investments are represented. A surviving set of assets may give an incomplete historical picture.",
  },
  {
    id: "rebalancing",
    title: "Portfolio construction and rebalancing",
    question:
      "Verify portfolio weights, return aggregation, rebalancing frequency and any cost assumptions. These choices must come from the research.",
  },
  {
    id: "correlation",
    title: "Relationships across market regimes",
    question:
      "Record the observation window for every correlation and beta estimate. Compare their behaviour across periods before describing an asset as a diversifier.",
  },
  {
    id: "history",
    title: "Limits of historical evidence",
    question:
      "Historical performance does not establish future returns. Review data coverage, implementation constraints and the limitations of the chosen sample before interpreting results.",
  },
];
export const riskMeasures = [
  ["CAGR", "Annualised compound growth over the stated observation period."],
  [
    "Annualised volatility",
    "Variability of returns on the research’s annualisation basis.",
  ],
  [
    "Sharpe ratio",
    "Excess return relative to the documented risk-free-rate proxy, divided by return volatility.",
  ],
  [
    "Maximum drawdown",
    "Largest peak-to-trough decline within the observation period.",
  ],
  ["Beta", "Sensitivity to the benchmark selected in the analysis."],
];
