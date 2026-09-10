import Link from "next/link";
import { dashboard } from "@/lib/data";
import { sections } from "@/lib/sections";
import { formatDate } from "@/lib/format";
export default function Overview() {
  const { research, methodology } = dashboard;
  return (
    <>
      <section className="cover grid-12">
        <div className="cover-main">
          <div className="meta-label cover-kicker">
            01 / Overview <span>Self-directed research project</span>
          </div>
          <h1>
            Quantitative
            <br />
            Investment <span className="ampersand">&</span>
            <br />
            Risk Analysis<span className="title-stop">.</span>
          </h1>
          <p className="cover-deck">
            An investigation of historical asset performance, the risks behind
            returns, and the behaviour of a hypothetical portfolio across market
            regimes.
          </p>
        </div>
        <aside className="research-record">
          <span className="meta-label">Research record</span>
          <h2>
            Source &<br />
            publication status.
          </h2>
          <p>
            The study brings together market history, risk measures,
            diversification and portfolio construction. Each comparison depends
            on its data window and assumptions.
          </p>
          <dl>
            <div>
              <dt>Primary analysis</dt>
              <dd>
                <code>01_market_exploration.ipynb</code>
              </dd>
            </div>
            <div>
              <dt>Strategy research</dt>
              <dd>Momentum · in progress</dd>
            </div>
            <div>
              <dt>Research last updated</dt>
              <dd>
                {research.updatedAt
                  ? formatDate(research.updatedAt)
                  : "Not recorded in an export"}
              </dd>
            </div>
          </dl>
          <Link href="/methodology" className="text-link">
            Methodology & limitations <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </section>
      <dl className="study-metadata">
        <div>
          <dt>Asset universe</dt>
          <dd>
            {research.universe.length
              ? research.universe.map((a) => a.id).join(" · ")
              : "Not yet exported"}
          </dd>
        </div>
        <div>
          <dt>Analysis period</dt>
          <dd>
            {research.period
              ? `${formatDate(research.period.start)} to ${formatDate(research.period.end)}`
              : "Not yet verified"}
          </dd>
        </div>
        <div>
          <dt>Methodology status</dt>
          <dd>
            {methodology.status === "available"
              ? "Documented in export"
              : "Awaiting source verification"}
          </dd>
        </div>
        <div>
          <dt>Latest data export</dt>
          <dd>
            {dashboard.generatedAt
              ? formatDate(dashboard.generatedAt)
              : "No research export"}
          </dd>
        </div>
      </dl>
      {dashboard.generatedAt === null && (
        <aside className="publication-note">
          <span className="meta-label">Publication note</span>
          <p>
            The local market notebook and methodology document are currently
            empty. No financial results are presented until the underlying
            analysis is available and its outputs are verified.
          </p>
        </aside>
      )}
      <section className="overview-study grid-12">
        <div className="research-questions">
          <div className="section-line">
            <span className="meta-label">Scope of inquiry</span>
            <h2>
              Three questions
              <br />
              guide the study.
            </h2>
          </div>
          <ol>
            <li>
              <h3>What lies behind an asset’s return?</h3>
              <p>
                Examine growth alongside volatility, drawdown and benchmark
                sensitivity, accounting for differences in available history.
              </p>
            </li>
            <li>
              <h3>What does diversification change?</h3>
              <p>
                Compare capital weights with risk contributions and examine the
                portfolio relative to SPY on a documented basis.
              </p>
            </li>
            <li>
              <h3>How much depends on the regime?</h3>
              <p>
                Compare historical stress periods and investigate a quantitative
                strategy under explicit assumptions.
              </p>
            </li>
          </ol>
        </div>
        <div className="research-index">
          <div className="section-line">
            <span className="meta-label">Navigate the analysis</span>
            <h2>Research chapters</h2>
          </div>
          {sections.map((section) => (
            <Link
              href={`/${section.key}`}
              className="index-entry"
              key={section.key}
            >
              <span className="index-number">{section.number}</span>
              <div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                <span className="index-status">
                  {dashboard.sections[section.key].status === "available"
                    ? "Analysis exported"
                    : section.key === "momentum"
                      ? "Analysis in progress"
                      : "Awaiting research export"}
                </span>
              </div>
              <span className="index-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
          <Link href="/methodology" className="index-entry">
            <span className="index-number">08</span>
            <div>
              <h3>Methodology & Limitations</h3>
              <p>
                Data definitions, comparison windows, assumptions and the
                boundaries of the evidence.
              </p>
            </div>
            <span className="index-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      </section>
    </>
  );
}
