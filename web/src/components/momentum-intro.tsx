import Link from "next/link";
import type { AvailableMomentum } from "@/lib/types";
import { formatDate, formatValue } from "@/lib/format";

export function MomentumIntro({ section }: { section: AvailableMomentum }) {
  const definition = section.definition;
  return (
    <>
      <div className="view-intro grid-12">
        <p className="research-question">
          Rank eligible companies by their past {definition.lookbackMonths}{" "}
          months of adjusted-price return. Hold the top {definition.topN} at
          equal starting weights during the following month.
        </p>
        <aside className="margin-note">
          <span className="meta-label">One specified experiment</span>
          <p>
            Rebalance monthly; weights drift between rebalances. The latest
            month is included in the signal. No parameter tuning. Baseline
            trading costs: {formatValue(definition.transactionCosts, "percent")}
            .
          </p>
        </aside>
      </div>
      <aside className="limitations-note">
        <h2>Read this result with its limitations</h2>
        <p>
          The historical universe consists of today&apos;s 50 selected surviving
          companies. Failed and unselected businesses are absent, and
          eligibility changes with listing history. This can substantially
          overstate performance. Costs, taxes, slippage and market impact are
          omitted from the baseline. Historical results are not forecasts or
          investment recommendations.
        </p>
        <p>
          Signals use only prices through the formation date. Allocation at that
          same closing price is an idealized monthly execution assumption. A
          missing held price triggers a conservative write-off for the rest of
          that month; no future outcome can replace a selected stock.
        </p>
        <Link href="/guide" className="text-link">
          New to backtesting? Read the research guide →
        </Link>
      </aside>
      <p className="margin-statement">
        Earned returns: {formatDate(definition.firstReturnDate)}–
        {formatDate(definition.lastReturnDate)} ·{" "}
        {formatValue(definition.dailyObservations)} shared daily observations.
        Initial wealth: 1 on {formatDate(definition.initialWealthDate)}. The
        final holding month and first/final calendar years are partial.
      </p>
      {section.sensitivities && (
        <p className="margin-statement">
          The baseline remains gross of costs with formation-close execution.{" "}
          <a className="text-link" href="#momentum-sensitivities">
            Compare transaction-cost and next-day-close sensitivities ↓
          </a>
        </p>
      )}
    </>
  );
}
