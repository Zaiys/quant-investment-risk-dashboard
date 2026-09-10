import type { ReactNode } from "react";
import { ArrowUpRight, Database, FileCheck2 } from "lucide-react";
import type { AvailableSection, Metric, Section } from "@/lib/types";
import { formatDate, formatValue } from "@/lib/format";
export function Status({ section }: { section: Section }) {
  return (
    <span className={`status ${section.status === "available" ? "ready" : ""}`}>
      <span />
      {section.status === "available" ? "Data available" : "Awaiting data"}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function MetricCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <article className="metric" key={metric.id}>
          <span>{metric.label}</span>
          <strong>{formatValue(metric.value, metric.unit)}</strong>
          <p>{metric.note}</p>
        </article>
      ))}
    </div>
  );
}
export function Provenance({ source }: { source: AvailableSection["source"] }) {
  return (
    <section className="provenance panel">
      <div className="panel-title">
        <div>
          <div className="eyebrow">RESEARCH CONTEXT</div>
          <h2>Source & methodology</h2>
        </div>
        <FileCheck2 size={22} />
      </div>
      <dl className="source-grid">
        <div>
          <dt>Source</dt>
          <dd>
            {source.label}
            <code>{source.path}</code>
          </dd>
        </div>
        <div>
          <dt>Observation period</dt>
          <dd>
            {formatDate(source.period.start)} – {formatDate(source.period.end)}
          </dd>
        </div>
        <div>
          <dt>Data as of</dt>
          <dd>{formatDate(source.asOf)}</dd>
        </div>
      </dl>
      <p>{source.methodology}</p>
      {source.notes.length > 0 && (
        <ul>
          {source.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
export function PendingData({
  title,
  reason,
}: {
  title: string;
  reason: string;
}) {
  return (
    <section className="empty-panel">
      <div className="empty-icon">
        <Database size={28} strokeWidth={1.4} />
      </div>
      <div className="eyebrow">ANALYSIS PENDING</div>
      <h2>{title}</h2>
      <p>{reason}</p>
      <span className="empty-note">
        Results will appear here after a reviewed analysis is exported.
      </span>
    </section>
  );
}
export function PageFooter() {
  return (
    <footer className="page-footer">
      <span>
        Quant Research <span className="footer-divider">/</span> Investment &
        risk dashboard
      </span>
      <a
        href="https://github.com/Zaiys/quant-investment-risk-dashboard"
        target="_blank"
        rel="noreferrer"
      >
        View project <ArrowUpRight size={14} />
      </a>
    </footer>
  );
}
