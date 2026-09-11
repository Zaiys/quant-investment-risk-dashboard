import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/ui";
import { dashboard } from "@/lib/data";
import { formatValue, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Research Guide",
  description:
    "A beginner's guide to the questions, risk measures, historical experiments and limitations in this research project.",
};

const concepts = [
  [
    "Return and CAGR",
    "Total return describes the change from the beginning to the end, including the provider's distribution adjustments. CAGR is the constant yearly compound rate that would connect those endpoints. Arithmetic annualised return is the mean daily return multiplied by 252. It describes a daily average scaled to a year; it does not reproduce the compounded path. Always read which return measure and dates a table uses.",
  ],
  [
    "Volatility",
    "Volatility measures how widely daily returns vary around their average. This project uses sample daily standard deviation, annualised with the square root of 252. Higher volatility means a less steady historical path. It treats upward and downward moves alike and does not capture every form of risk.",
  ],
  [
    "Sharpe ratio",
    "Sharpe relates average return above a risk-free proxy to return volatility. Here the proxy comes from historical short-term Treasury bill yields, using the same approximate conversion in both notebooks. A higher historical Sharpe means more measured excess return per unit of measured variability on that sample. It does not promise a better future outcome or fully describe large losses.",
  ],
  [
    "Maximum drawdown",
    "Drawdown is the fall from the highest wealth level reached so far. Maximum drawdown is the deepest such fall in the observed period. A negative value represents a loss. The portfolio calculations start from wealth 1 before the first return, so an immediate loss counts. Read the drawdown path as well as its minimum: depth and time spent below a peak answer different questions.",
  ],
  [
    "Correlation",
    "Correlation describes how returns move together, from −1 to +1. Positive values indicate a tendency to move in the same direction; negative values indicate the opposite. A value near zero means little linear association in the measured sample, not complete independence. Some project tables use a different overlap period for each pair; the common-company table uses matching dates. These relationships can change.",
  ],
  [
    "Beta",
    "Beta measures historical sensitivity to SPY: covariance with SPY divided by SPY's variance. A beta above one means larger estimated benchmark-related moves; below one means smaller estimated moves on that sample. Beta is different from correlation: correlation is standardised co-movement, while beta also depends on relative volatility. Neither measure is a forecast or a complete measure of risk.",
  ],
  [
    "Diversification",
    "Combining assets that behave differently can change a portfolio's overall variability. The portfolio chapter compares a fixed hypothetical allocation with SPY, then asks which holdings contributed to its measured risk. Diversification is a property of the combination and the observation period; it does not ensure protection in every crisis.",
  ],
  [
    "Portfolio risk contribution",
    "A capital weight tells you how much money is assigned to an asset. Its risk contribution also depends on its volatility and covariance with the other holdings. Here component contributions add up to portfolio volatility; their shares add up to the total. A small capital allocation can contribute substantial risk, and an offsetting holding can have a negative contribution in a particular sample.",
  ],
  [
    "Stress testing",
    "The stress chapter replays three historical episodes: the Global Financial Crisis, the COVID crash and the 2022 selloff. It compares period returns and drawdowns on shared dates, beginning each window from the same wealth level. This shows what happened in those selected episodes. It is not a simulation of every possible future shock, and a window's endpoint return can conceal a much deeper loss along the way.",
  ],
  [
    "Momentum",
    "Momentum here means ranking the 50 selected companies by their preceding 12-month adjusted-price return. At each month-end the rule chooses the top ten eligible companies, gives each the same starting weight, and holds them during the following month. The most recent month is included in the signal. Weights drift as prices change, then reset at the next rebalance. It is one specified historical experiment, with no parameter search.",
  ],
  [
    "Backtesting and look-ahead bias",
    "A backtest applies a rule to historical data in chronological order. Look-ahead bias occurs when a historical decision uses information that arrived later. This strategy forms its signal before the returns it earns, requires a full prior history, and never chooses stocks according to next-month return availability. Tests change future prices to check that earlier selections stay fixed. Assuming allocation at the signal's closing price is still an idealized execution assumption.",
  ],
  [
    "Survivorship bias",
    "The company list was selected today and then used throughout history. It leaves out failed, delisted and unselected businesses that a researcher might have considered at the time. This can make a historical strategy look much stronger. Preventing future-price leakage does not repair this universe bias. The early strategy also has fewer eligible companies because some companies do not yet have enough history.",
  ],
];

export default function ResearchGuide() {
  const momentum = dashboard.sections.momentum;
  const example = momentum.status === "available" ? momentum : null;
  const cagr = (entity: string) =>
    example?.metrics.find((metric) => metric.id === `${entity}-cagr`);
  return (
    <>
      <PageHeading
        eyebrow="09 / Research guide"
        title="How to Read This Project"
        description="Start with the question, follow the evidence, then examine what the result leaves unanswered."
      />
      <div className="methodology-layout grid-12 research-guide">
        <aside className="methodology-rail">
          <span className="meta-label">Start here</span>
          <h2>A guided reading of the research.</h2>
          <p>
            No trading experience is needed. Each chapter connects a financial
            question to historical data and a stated calculation.
          </p>
          <a href="#reading-order" className="text-link">
            Choose a reading route ↓
          </a>
          <p>
            <a href="#concepts" className="text-link">
              Understand the measures ↓
            </a>
          </p>
          <p>
            <a href="#video-walkthrough" className="text-link">
              Video walkthrough ↓
            </a>
          </p>
        </aside>
        <div className="methodology-body">
          <section className="documented-methodology">
            <h2>What is quantitative investment research?</h2>
            <p>
              It is the practice of turning an investment question into a clear
              rule or measurement, examining data, and checking whether the
              evidence supports an interpretation. Risk research asks what
              uncertainty, variability, losses and concentrations accompany
              those outcomes. Clear definitions and fair comparisons matter as
              much as a calculation.
            </p>
            <h3>What this project investigates</h3>
            <p>
              The first notebook explores adjusted market histories for 50
              companies and five ETFs, compares return with risk, studies
              correlations, and evaluates a hypothetical diversified portfolio.
              The second tests a monthly momentum rule against SPY. The website
              presents their frozen, reviewed results so you can compare charts,
              inspect tables and read the assumptions alongside them.
            </p>
            <p>
              You can use it to practise comparing like-for-like periods,
              distinguishing different risk measures, tracing a portfolio rule
              into returns, and questioning a backtest. It has no live trading,
              personalized allocation or forecasting function.
            </p>
            <h3>What is a benchmark, and why SPY?</h3>
            <p>
              A benchmark is a reference for comparison. SPY is an ETF that
              tracks the S&amp;P 500, so this study uses it as a broad US
              large-company equity reference. It provides context for a
              stock-based strategy; it is not a perfect match for the selected
              company list or the mixed-asset portfolio. Compare each experiment
              with SPY on that experiment&apos;s own dates, rather than
              comparing headline numbers across chapters with different periods.
            </p>
          </section>
          <section id="reading-order" className="documented-methodology">
            <h2>A beginner&apos;s route through the chapters</h2>
            <ol>
              <li>
                <Link href="/">Overview</Link>: read the research questions and
                the available history.
              </li>
              <li>
                <Link href="/market">Market Explorer</Link>: compare indexed
                wealth and common periods. The same starting index makes growth
                comparable; raw share prices do not.
              </li>
              <li>
                <Link href="/risk-return">Risk vs Return</Link>: place growth
                beside volatility, Sharpe and drawdown. Change the selected
                asset and inspect its table.
              </li>
              <li>
                <Link href="/correlation">
                  Diversification &amp; Correlation
                </Link>
                : compare co-movement with benchmark sensitivity and check the
                overlap dates.
              </li>
              <li>
                <Link href="/portfolio">Portfolio Analysis</Link>: distinguish
                capital weights from risk contributions and compare the
                portfolio with SPY.
              </li>
              <li>
                <Link href="/stress">Stress Testing</Link>: inspect each
                historical episode, including losses inside the window.
              </li>
              <li>
                <Link href="/momentum">Quantitative Strategy</Link>: read the
                rule and limitations, then follow the first rebalance from raw
                prices to holdings and next-month returns.
              </li>
              <li>
                <Link href="/methodology">Methodology &amp; Limitations</Link>:
                check the source, return definitions, risk-free approximation
                and assumptions before drawing a conclusion.
              </li>
            </ol>
            <h3>How to inspect the evidence</h3>
            <p>
              Selectors show already-calculated assets or scenarios. Table
              headings sort the supplied values; “View chart values” opens the
              observations behind a figure. “Download source values” saves the
              reviewed snapshot. A chart may show selected observation dates for
              readability while its risk statistics use every daily return. Read
              the sampling note, initial date and coverage label.
            </p>
          </section>
          <section id="concepts">
            <span className="meta-label">Concepts used in the analysis</span>
            {concepts.map(([title, detail], index) => (
              <article className="methodology-item" key={title}>
                <span className="method-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{title}</h2>
                  <p>{detail}</p>
                </div>
              </article>
            ))}
          </section>
          {example && (
            <section className="documented-methodology">
              <h2>Read a result without turning it into a forecast</h2>
              <p>
                The momentum comparison uses returns from{" "}
                {formatDate(example.definition.firstReturnDate)} to{" "}
                {formatDate(example.definition.lastReturnDate)}. Its measured
                CAGR is{" "}
                {formatValue(cagr("MOMENTUM")?.value ?? null, "percent")},
                compared with{" "}
                {formatValue(cagr("SPY")?.value ?? null, "percent")} for SPY.
                Those values come directly from the reviewed strategy results.
              </p>
              <p>
                This is a large historical difference, but the experiment uses
                today&apos;s selected surviving companies and assumes zero
                trading costs. It does not establish a future expected return,
                statistical significance, or investment suitability. Read its
                volatility, drawdown, turnover and changing eligible universe
                before discussing the growth figure.
              </p>
              <Link href="/momentum" className="text-link">
                Inspect the complete comparison →
              </Link>
            </section>
          )}
          <aside className="limitations-note">
            <h2>Why history is not a forecast</h2>
            <p>
              Future businesses, prices, market conditions and costs will
              differ. A frozen dataset makes this experiment repeatable; it does
              not make it representative of every investment opportunity. Price
              adjustments can contain errors or revisions, and the historical
              universe is biased. The results describe what this specified
              calculation produced on these inputs.
            </p>
            <p>
              For an interview, explain the research question, information
              timing, portfolio accounting and strongest limitation before
              citing performance. Be comfortable saying what the study has not
              established.
            </p>
          </aside>
          <section
            id="video-walkthrough"
            className="empty-figure"
            aria-labelledby="video-title"
          >
            <h2 id="video-title">Video walkthrough</h2>
            <div className="figure-unavailable">
              <p>Video walkthrough coming later</p>
              <span className="meta-label">
                Optional companion to this written guide
              </span>
            </div>
          </section>
          <p className="reference-note">
            Background reading:{" "}
            <a href="https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy">
              SPY&apos;s fund objective
            </a>
            ,{" "}
            <a href="https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/Data_Library/det_mom_factor_daily.html">
              Kenneth French&apos;s momentum construction
            </a>{" "}
            (a different rule), and the{" "}
            <a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-47">
              SEC bulletin on performance claims
            </a>
            . These explain context; the project&apos;s own results come from
            its notebooks.
          </p>
        </div>
      </div>
      <div className="chapter-end">
        <Link href="/">← Research overview</Link>
        <Link href="/momentum">Explore the strategy →</Link>
      </div>
    </>
  );
}
