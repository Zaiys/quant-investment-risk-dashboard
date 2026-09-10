"use client";
import { useState } from "react";
import type { AvailableSection } from "@/lib/types";
import { selectAnalysis } from "@/lib/select-analysis";
import { formatDate } from "@/lib/format";
import { MetricCards, Provenance } from "./ui";
import { ResearchChart } from "./research-chart";
import { DataTable } from "./data-table";
import { CorrelationMatrix } from "./correlation-matrix";
export function AvailableAnalysis({ section }: { section: AvailableSection }) {
  const [entityId, setEntityId] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const shown = selectAnalysis(section, entityId, scenarioId);
  const scenario = section.scenarios?.find((item) => item.id === scenarioId);
  return (
    <>
      <div className="analysis-toolbar">
        <div className="analysis-selectors">
          {section.entities && (
            <label>
              Inspect asset or portfolio
              <select
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              >
                <option value="">All exported entities</option>
                {section.entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {section.scenarios && (
            <label>
              Historical scenario
              <select
                value={scenarioId}
                onChange={(e) => setScenarioId(e.target.value)}
              >
                <option value="">All exported scenarios</option>
                {section.scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <a
          className="text-link"
          href="/export"
          download="research-snapshot.json"
        >
          Download source values <span aria-hidden="true">↓</span>
        </a>
      </div>
      {(entityId || scenarioId) && (
        <p className="selection-note" role="status">
          Showing matching records. Untagged comparison outputs retain their
          original observation period.
        </p>
      )}
      {scenario && (
        <aside className="scenario-context">
          <strong>{scenario.label}</strong>
          <span>
            {formatDate(scenario.period.start)} to{" "}
            {formatDate(scenario.period.end)}
          </span>
          <p>{scenario.notes}</p>
        </aside>
      )}
      <MetricCards metrics={shown.metrics} />
      {shown.charts.map((chart) => (
        <ResearchChart
          chart={chart}
          key={`${chart.id}-${entityId}-${scenarioId}`}
        />
      ))}
      {shown.matrices?.map((matrix) => (
        <CorrelationMatrix matrix={matrix} key={matrix.id} />
      ))}
      {shown.tables.map((table) => (
        <DataTable table={table} key={table.id} />
      ))}
      {!shown.metrics.length &&
        !shown.charts.length &&
        !shown.tables.length &&
        !shown.matrices?.length && (
          <p className="pending-note" role="status">
            No matching outputs were exported for this selection.
          </p>
        )}
      <Provenance source={section.source} />
    </>
  );
}
