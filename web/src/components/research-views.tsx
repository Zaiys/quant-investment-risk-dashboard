import Link from "next/link";
import { FigurePlaceholder } from "./ui";
import { riskMeasures } from "@/lib/research-notes";
import type { SectionKey, ResearchMetadata } from "@/lib/types";
import { formatDate } from "@/lib/format";
function EmptyTable({
  title,
  columns,
  message,
}: {
  title: string;
  columns: string[];
  message: string;
}) {
  return (
    <section className="empty-table">
      <h2>{title}</h2>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        <table>
          <caption className="sr-only">
            {title}. Research data not exported.
          </caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="empty-table-cell">
                {message}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
export function AssetHistory({ research }: { research: ResearchMetadata }) {
  return (
    <>
      {research.universe.length ? (
        <section className="empty-table">
          <h2>Available asset history</h2>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Available asset history"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Asset</th>
                  <th scope="col">Name</th>
                  <th scope="col">First observation</th>
                  <th scope="col">Last observation</th>
                </tr>
              </thead>
              <tbody>
                {research.universe.map((asset) => (
                  <tr key={asset.id}>
                    <th scope="row">{asset.id}</th>
                    <td>{asset.name}</td>
                    <td>{formatDate(asset.availableFrom)}</td>
                    <td>{formatDate(asset.availableTo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyTable
          title="Available asset history"
          columns={[
            "Asset",
            "First observation",
            "Last observation",
            "Comparison window",
          ]}
          message="Asset names and available-history dates have not been exported."
        />
      )}
    </>
  );
}
export function MarketView({ research }: { research: ResearchMetadata }) {
  return (
    <>
      <div className="view-intro grid-12">
        <p className="research-question">
          How does the comparison change when history is put on a common basis?
        </p>
        <aside className="margin-note">
          <span className="meta-label">Comparison basis</span>
          <p>
            Raw share prices are not comparable measures of investment
            performance. Indexed results must come from the Python analysis,
            with the base date and treatment of distributions stated.
          </p>
        </aside>
      </div>
      <div className="disabled-controls">
        <label>
          Compare assets
          <select disabled>
            <option>Awaiting exported asset series</option>
          </select>
        </label>
        <span className="meta-label">Indexed performance / price history</span>
      </div>
      <FigurePlaceholder
        number="01"
        title="Historical performance on a common basis"
      >
        Indexed performance and historical price or return series have not been
        exported. No curves are shown.
      </FigurePlaceholder>
      <AssetHistory research={research} />
    </>
  );
}
export function RiskView() {
  return (
    <>
      <p className="research-question">
        What risk accompanied the observed returns?
      </p>
      <FigurePlaceholder number="02" title="Risk–return comparison">
        The scatter plot awaits Python-computed CAGR and annualised volatility
        for each asset. The observation window must be supplied with the
        estimates.
      </FigurePlaceholder>
      <EmptyTable
        title="Asset-level risk measures"
        columns={[
          "Asset",
          "CAGR",
          "Volatility",
          "Sharpe",
          "Max. drawdown",
          "Beta",
        ]}
        message="No verified risk and return estimates are available."
      />
      <div className="measure-definitions">
        <span className="meta-label">Reading the measures</span>
        <dl>
          {riskMeasures.map(([name, detail]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
        <Link className="text-link" href="/methodology">
          Check definitions and assumptions →
        </Link>
        <p className="reference-note">
          Background reading:{" "}
          <a
            href="https://www.cfainstitute.org/insights/articles/understanding-investment-risk"
            target="_blank"
            rel="noreferrer"
          >
            CFA Institute on investment risk
          </a>
          . The project’s precise definitions still require verification.
        </p>
      </div>
    </>
  );
}
export function CorrelationView() {
  return (
    <>
      <div className="view-intro grid-12">
        <p className="research-question">
          Which relationships persist, and which depend on the period?
        </p>
        <aside className="margin-note">
          <span className="meta-label">Interpretation</span>
          <p>
            Correlation describes co-movement. Beta describes sensitivity to a
            benchmark. The two measures answer different questions.
          </p>
        </aside>
      </div>
      <FigurePlaceholder number="03" title="Cross-asset correlation matrix">
        The asset universe, correlation matrix and estimation window have not
        been exported.
      </FigurePlaceholder>
      <div className="correlation-notes">
        <section>
          <span className="meta-label">Benchmark relationships</span>
          <h2>Correlations with SPY</h2>
          <p>Awaiting the exported estimates and their observation period.</p>
        </section>
        <section>
          <span className="meta-label">Diversification evidence</span>
          <h2>Period-specific diversifiers</h2>
          <p>
            No asset is identified as a diversifier until that interpretation is
            supported by the research. Historical relationships can change
            across regimes.
          </p>
        </section>
      </div>
    </>
  );
}
export function PortfolioView() {
  return (
    <>
      <div className="portfolio-thesis">
        <span className="meta-label">A distinction to retain</span>
        <h2>
          Portfolio weight <span aria-label="is not equal to">≠</span>
          <br />
          portfolio risk contribution.
        </h2>
        <p>
          The allocation of capital and each asset’s contribution to total
          portfolio risk must be examined separately. Both sets of values will
          come from the existing hypothetical portfolio analysis.
        </p>
      </div>
      <div className="portfolio-comparison">
        <EmptyTable
          title="Portfolio and benchmark"
          columns={["Measure", "Hypothetical portfolio", "SPY"]}
          message="Return, volatility, Sharpe ratio and drawdown comparisons await verified outputs."
        />
        <aside className="margin-note">
          <span className="meta-label">Required context</span>
          <p>
            The comparison needs a stated period, weighting rule and rebalancing
            assumption. The dashboard will not choose these settings.
          </p>
        </aside>
      </div>
      <FigurePlaceholder
        number="04"
        title="Capital weights and component risk contributions"
      >
        Portfolio weights and Python-computed component risk contributions have
        not been exported.
      </FigurePlaceholder>
    </>
  );
}
export function StressView() {
  return (
    <>
      <p className="research-question">
        Did diversification behave differently across market regimes?
      </p>
      <p className="reading-column stress-intro">
        The requested comparison covers three historical episodes. Their exact
        start and end dates, constituent coverage and measured outcomes remain
        unverified in the current repository.
      </p>
      <div className="stress-register">
        {[
          ["I", "Global Financial Crisis"],
          ["II", "COVID crash"],
          ["III", "2022 selloff"],
        ].map(([number, label]) => (
          <section key={label}>
            <span className="event-number">{number}</span>
            <h2>{label}</h2>
            <dl>
              <div>
                <dt>Analysis window</dt>
                <dd>Not exported</dd>
              </div>
              <div>
                <dt>Portfolio / SPY / assets</dt>
                <dd>Results awaiting verification</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
      <EmptyTable
        title="Comparison across stress windows"
        columns={["Scenario", "Portfolio", "SPY", "Constituent assets"]}
        message="No stress-test outcomes are published. Scenario comparison becomes available when reviewed results are exported."
      />
      <p className="margin-statement">
        The analysis should establish which assets diversified the portfolio in
        each episode. The interface makes no assumption that the same assets
        provided diversification in every regime.
      </p>
    </>
  );
}
export function StrategyView() {
  return (
    <section className="strategy-notebook grid-12">
      <div className="strategy-main">
        <span className="meta-label">Notebook 02 / Analysis in progress</span>
        <h2>
          Momentum strategy:
          <br />
          analysis in progress.
        </h2>
        <p>
          The momentum strategy is being developed separately. Its signal
          construction, portfolio rules and evaluation method will be documented
          in the research notebook.
        </p>
        <code>notebooks/02_momentum_strategy.ipynb</code>
        <p className="strategy-status">
          No signals, holdings, backtest curves or performance results have been
          supplied.
        </p>
      </div>
      <aside className="strategy-questions">
        <h3>Research to document</h3>
        <ol>
          <li>Signal definition and information timing</li>
          <li>Investment universe and portfolio rules</li>
          <li>Benchmark and evaluation period</li>
          <li>Turnover, costs and implementation assumptions</li>
          <li>Backtest limitations and robustness</li>
        </ol>
        <p>
          The current data contract reserves this chapter for reviewed outputs.
          Results appear only after the notebook and its structured outputs are verified.
        </p>
      </aside>
    </section>
  );
}
export function ResearchView({
  section,
  research,
}: {
  section: SectionKey;
  research: ResearchMetadata;
}) {
  switch (section) {
    case "market":
      return <MarketView research={research} />;
    case "risk-return":
      return <RiskView />;
    case "correlation":
      return <CorrelationView />;
    case "portfolio":
      return <PortfolioView />;
    case "stress":
      return <StressView />;
    case "momentum":
      return <StrategyView />;
  }
}
