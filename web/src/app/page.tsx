import Link from "next/link";
import { dashboard } from "@/lib/data";
import { sections } from "@/lib/sections";
import { formatDate } from "@/lib/format";
import { pageMetadata, siteTitle, siteDescription } from "@/lib/site";
export const metadata = { ...pageMetadata(siteTitle, siteDescription, "/"), title: { absolute: siteTitle } };
export default function Overview() {
  const { research, methodology } = dashboard;
  return <>
    <section className="cover grid-12">
      <div className="cover-main"><div className="meta-label cover-kicker">02 / Overview <span>Self-directed research project</span></div>
        <h1>Quantitative<br />Investment <span className="ampersand">&</span><br />Risk Analysis<span className="title-stop">.</span></h1>
        <p className="cover-deck">An investigation of historical asset performance, the risks behind returns, and the behaviour of a hypothetical portfolio across market regimes.</p>
      </div>
      <aside className="research-record"><span className="meta-label">Research record</span><h2>Source &<br />publication status.</h2>
        <p>The study brings together market history, risk measures, diversification and portfolio construction. Each comparison depends on its data window and assumptions.</p>
        <dl>
          <div><dt>Market exploration</dt><dd><code>01_market_exploration.ipynb</code><br /><small>{dashboard.sections.market.status === "available" ? "Reviewed historical analysis" : "Awaiting research"}</small></dd></div>
          <div><dt>Momentum strategy</dt><dd><code>02_momentum_strategy.ipynb</code><br /><small>{dashboard.sections.momentum.status === "available" ? "Reviewed historical analysis" : "Awaiting research"}</small></dd></div>
          <div><dt>Research last reviewed</dt><dd>{research.updatedAt ? formatDate(research.updatedAt) : "Not recorded in an export"}</dd></div>
        </dl>
        <Link href="/methodology" className="text-link">Methodology & limitations <span aria-hidden="true">→</span></Link>
      </aside>
    </section>
    <dl className="study-metadata">
      <div><dt>Market data through</dt><dd>{research.period ? formatDate(research.period.end) : "Not yet verified"}</dd></div>
      <div><dt>Dataset coverage</dt><dd>{research.period ? `${formatDate(research.period.start)} to ${formatDate(research.period.end)}` : "Not yet verified"}</dd></div>
      <div><dt>Snapshot exported</dt><dd>{dashboard.generatedAt ? formatDate(dashboard.generatedAt) : "No research export"}</dd></div>
      <div><dt>Data mode</dt><dd>Historical research snapshot<br /><small>Not live prices</small></dd></div>
    </dl>
    <p className="snapshot-context">Coverage is the dataset’s overall span, not every asset’s history. Each chart states its own comparison period. Exporting a snapshot does not fetch newer prices; the observation date does not advance when this page opens.</p>
    <details className="research-details"><summary>Asset universe · {research.universe.length} exported assets</summary>
      <p className="universe-tickers">{research.universe.map((a) => a.id).join(" · ") || "Not yet exported"}</p>
      <p>Methodology: {methodology.status === "available" ? "documented in export" : "awaiting source verification"}.</p>
    </details>
    {dashboard.generatedAt === null && <aside className="publication-note"><span className="meta-label">Publication note</span><p>No reviewed research snapshot is available. Financial results appear after the analysis has been exported and verified.</p></aside>}
    <section className="overview-study grid-12">
      <div className="research-questions"><div className="section-line"><span className="meta-label">Scope of inquiry</span><h2>Three questions<br />guide the study.</h2></div>
        <ol><li><h3>What lies behind an asset’s return?</h3><p>Examine growth alongside volatility, drawdown and benchmark sensitivity, accounting for differences in available history.</p></li>
          <li><h3>What does diversification change?</h3><p>Compare capital weights with risk contributions and examine the portfolio relative to SPY on a documented basis.</p></li>
          <li><h3>How much depends on the regime?</h3><p>Compare historical stress periods and investigate a quantitative strategy under explicit assumptions.</p></li></ol>
      </div>
      <div className="research-index"><div className="section-line"><span className="meta-label">Navigate the analysis</span><h2>Research chapters</h2></div>
        <Link href="/guide" className="index-entry"><span className="index-number">01</span><div><h3>How to Read This Project</h3><p>A beginner’s guide to the questions, measures and limits of the evidence.</p></div><span className="index-arrow" aria-hidden="true">↗</span></Link>
        {sections.map((section) => <Link href={`/${section.key}`} className="index-entry" key={section.key}><span className="index-number">{section.number}</span><div><h3>{section.title}</h3><p>{section.description}</p><span className="index-status">{dashboard.sections[section.key].status === "available" ? "Analysis exported" : section.key === "momentum" ? "Analysis in progress" : "Awaiting research export"}</span></div><span className="index-arrow" aria-hidden="true">↗</span></Link>)}
        <Link href="/methodology" className="index-entry"><span className="index-number">09</span><div><h3>Methodology & Limitations</h3><p>Data definitions, comparison windows, assumptions and the boundaries of the evidence.</p></div><span className="index-arrow" aria-hidden="true">↗</span></Link>
      </div>
    </section>
  </>;
}
