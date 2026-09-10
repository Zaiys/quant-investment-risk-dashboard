import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Clock3,
  FileCode2,
  Workflow,
} from "lucide-react";
import { dashboard } from "@/lib/data";
import { sections } from "@/lib/sections";
import { DataTable } from "@/components/data-table";
import { ResearchChart } from "@/components/research-chart";
import {
  MetricCards,
  PageHeading,
  PendingData,
  Provenance,
  Status,
} from "@/components/ui";
export const dynamicParams = false;
export function generateStaticParams() {
  return sections.map((section) => ({ section: section.key }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return {
    title: sections.find((item) => item.key === section)?.title ?? "Not found",
  };
}
export default async function ResearchPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: key } = await params;
  const config = sections.find((section) => section.key === key);
  if (!config) notFound();
  const data = dashboard.sections[config.key];
  return (
    <>
      <PageHeading
        eyebrow={`RESEARCH / 0${sections.indexOf(config) + 1}`}
        title={config.title}
        description={config.description}
        action={<Status section={data} />}
      />
      {data.status === "available" ? (
        <>
          <div className="data-toolbar">
            <span>Published analysis · {data.source.label}</span>
            <a href="/export" download="dashboard.json">
              Download research snapshot <ArrowDownToLine size={16} />
            </a>
          </div>
          <MetricCards metrics={data.metrics} />
          <div className="visuals-grid">
            {data.charts.map((chart) => (
              <ResearchChart key={chart.id} chart={chart} />
            ))}
          </div>
          {data.tables.map((table) => (
            <DataTable key={table.id} table={table} />
          ))}
          <Provenance source={data.source} />
        </>
      ) : config.key === "momentum" ? (
        <>
          <section className="momentum-hero">
            <div className="momentum-mark">
              <Workflow size={40} strokeWidth={1.3} />
            </div>
            <div className="eyebrow">NEXT CHAPTER</div>
            <h2>
              The strategy starts
              <br />
              with the research.
            </h2>
            <p>
              This section is reserved for the momentum strategy. Signals,
              portfolio construction and performance will come from the
              completed analysis.
            </p>
            <div className="notebook-label">
              <FileCode2 size={19} />
              <code>notebooks/02_momentum_strategy.ipynb</code>
            </div>
            <div className="momentum-state">
              <Clock3 size={16} /> Awaiting notebook outputs
            </div>
          </section>
          <div className="momentum-process">
            <div>
              <span>01</span>
              <h3>Define</h3>
              <p>Document the strategy and its assumptions in Python.</p>
            </div>
            <ArrowRight size={18} />
            <div>
              <span>02</span>
              <h3>Evaluate</h3>
              <p>Review backtest outputs and their limitations.</p>
            </div>
            <ArrowRight size={18} />
            <div>
              <span>03</span>
              <h3>Present</h3>
              <p>Connect the approved outputs to this dashboard.</p>
            </div>
          </div>
          <p className="methodology-note">
            No strategy signals, portfolio weights or performance estimates have
            been supplied. This section currently presents no momentum results.
          </p>
        </>
      ) : (
        <>
          <div className="notice">
            <Clock3 size={17} />
            <span>This view is waiting for its first analysis export.</span>
          </div>
          <PendingData
            title={`${config.short.charAt(0).toUpperCase() + config.short.slice(1)} is not available yet`}
            reason={data.reason}
          />
          <section className="requirements-panel">
            <div>
              <div className="eyebrow">WHAT THIS VIEW WILL USE</div>
              <h2>Ready for the underlying analysis</h2>
              <p>
                The dashboard presents the outputs and definitions supplied by
                the research.
              </p>
            </div>
            <ol>
              {config.inputs.map((input, index) => (
                <li key={input}>
                  <span>0{index + 1}</span>
                  {input}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
