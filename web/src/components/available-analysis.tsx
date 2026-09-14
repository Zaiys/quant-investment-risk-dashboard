"use client";
import { useState } from "react";
import type { AvailableMomentum, AvailableSection, SectionKey } from "@/lib/types";
import { selectAnalysis } from "@/lib/select-analysis";
import { chooseComparisonBasis, hasComparisonScopes, type ComparisonBasis } from "@/lib/analysis-scope";
import { formatDate, formatValue } from "@/lib/format";
import { MetricCards, Provenance } from "./ui";
import { ResearchChart } from "./research-chart";
import { DataTable } from "./data-table";
import { CorrelationMatrix } from "./correlation-matrix";
import { MomentumSensitivities } from "./momentum-sensitivities";
import { AssetPicker } from "./asset-picker";
import { AllocationComparison } from "./allocation-comparison";

export function AvailableAnalysis({ section, sensitivities, sectionKey }: {
  section: AvailableSection;
  sensitivities?: AvailableMomentum["sensitivities"];
  sectionKey?: SectionKey;
}) {
  const [entityId, setEntityId] = useState("");
  const [scenarioId, setScenarioId] = useState(sectionKey === "stress" ? section.scenarios?.[0]?.id ?? "" : "");
  const [basis, setBasis] = useState<ComparisonBasis>(sectionKey === "correlation" ? "individual" : "common");
  const scopes = hasComparisonScopes(section);
  const scoped = scopes ? chooseComparisonBasis(section, basis) : section;
  const allowed = new Set([...scoped.charts.flatMap((chart) => chart.series.map((s) => s.entityId ?? s.id)),
    ...(scoped.matrices ?? []).flatMap((matrix) => matrix.labels.map((label) => label.id))]);
  const options = section.entities?.filter((entity) => !scopes || allowed.has(entity.id));
  const selected = options?.some((option) => option.id === entityId) ? entityId : "";
  const shown = selectAnalysis(scoped, sectionKey === "risk-return" ? "" : selected, scenarioId);
  const scenario = section.scenarios?.find((item) => item.id === scenarioId);
  const metricsTable = scoped.tables.find((table) => table.id === (basis === "common" ? "common-metrics" : "full-metrics"));
  const assetRow = metricsTable?.rows.find((row) => row.id === selected || row.entityId === selected);
  const riskTable = shown.tables.find((table) => table.id === "risk-contributions");
  const spyTable = scoped.tables.find((table) => table.id === "spy-relationships");
  const primaryTables = shown.tables.filter((table) => !["momentum-calendar", "momentum-best-worst", "momentum-frequency", "momentum-rebalances", "momentum-latest", "history"].includes(table.id));
  const extraTables = shown.tables.filter((table) => !primaryTables.includes(table));
  return <>
    {scopes && <div className="scope-panel"><fieldset className="segmented-control"><legend>Comparison basis</legend>
      <button type="button" aria-pressed={basis === "common"} onClick={() => { setBasis("common"); setEntityId(""); }}>Common company period</button>
      <button type="button" aria-pressed={basis === "individual"} onClick={() => { setBasis("individual"); setEntityId(""); }}>{sectionKey === "correlation" ? "Pairwise available histories" : "Individual histories"}</button>
    </fieldset><p className="reading-hint">{basis === "common" ? "The companies share the same research sample. ETFs are not part of this company-only comparison." : "Available histories differ. Read the dates beside each output; this is not a like-for-like performance ranking."}</p></div>}
    <div className="analysis-toolbar"><div className="analysis-selectors">
      {options && sectionKey !== "correlation" && <AssetPicker label="Inspect asset or portfolio" options={options}
        value={selected} onChange={setEntityId} emptyLabel="All exported entities" />}
      {section.scenarios && <label>Historical scenario<select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
        <option value="">All exported scenarios</option>{section.scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select></label>}
    </div><a className="text-link" href="/export" download="research-snapshot.json">Download source values <span aria-hidden="true">↓</span></a></div>
    {(selected || scenarioId) && <p className="selection-note" role="status">Showing matching records. Untagged comparison outputs retain their original observation period.</p>}
    {scenario && <aside className="scenario-context"><strong>{scenario.label}</strong><span>{formatDate(scenario.period.start)} to {formatDate(scenario.period.end)}</span><p>{scenario.notes}</p></aside>}
    {sectionKey === "risk-return" && <section className="asset-at-glance" aria-live="polite"><h2>{selected ? `${selected} at a glance` : "Select a company to read its measures"}</h2>
      <p className="reading-hint">{metricsTable?.description ?? "Read the selected comparison's observation period."}</p>
      {assetRow && metricsTable && <dl className="glance-values">{["cagr", "volatility", "sharpe", "max_drawdown"].map((key) => {
        const i = metricsTable.columns.findIndex((column) => column.key === key);
        return <div key={key}><dt>{i >= 0 ? metricsTable.columns[i].label : ({ cagr: "CAGR", volatility: "Volatility", sharpe: "Sharpe", max_drawdown: "Maximum drawdown" } as Record<string, string>)[key]}</dt>
          <dd>{i >= 0 ? formatValue(assetRow.cells[i], metricsTable.columns[i].unit) : "Not exported for this sample"}</dd></div>;
      })}</dl>}
      {!selected && <p>Search above or select a scatter point. The table below keeps the other companies available for comparison.</p>}
    </section>}
    <MetricCards metrics={shown.metrics} />
    {shown.charts.map((chart) => <ResearchChart key={`${chart.id}-${sectionKey === "risk-return" ? basis : selected}-${scenarioId}`}
      chart={chart} focusedEntityId={sectionKey === "risk-return" ? selected : undefined}
      onFocusEntity={sectionKey === "risk-return" ? setEntityId : undefined} />)}
    {sensitivities && <MomentumSensitivities sensitivities={sensitivities} />}
    {shown.matrices?.map((matrix) => <CorrelationMatrix matrix={matrix} relationships={basis === "individual" ? spyTable : undefined} key={matrix.id} />)}
    {riskTable && <AllocationComparison table={riskTable} />}
    {primaryTables.map((table) => <DataTable table={table} key={`${table.id}-${selected}-${scenarioId}`} />)}
    {!!extraTables.length && <details className="research-details"><summary>Additional research tables · {extraTables.length}</summary>
      {extraTables.map((table) => <DataTable table={table} key={`${table.id}-${selected}`} />)}
    </details>}
    {!shown.metrics.length && !shown.charts.length && !shown.tables.length && !shown.matrices?.length && <p className="pending-note" role="status">No matching outputs were exported for this selection.</p>}
    <Provenance source={section.source} />
  </>;
}
