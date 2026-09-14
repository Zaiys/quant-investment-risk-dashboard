import Link from "next/link";
import type { ReactNode } from "react";
import type { Source, Metric, Section } from "@/lib/types";
import { formatDate, formatValue } from "@/lib/format";
export function Status({ section }: { section: Section }) {
  return (
    <span className={`status ${section.status === "available" ? "ready" : ""}`}>
      {section.status === "available"
        ? "Exported analysis"
        : "Awaiting research export"}
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
      <div className="heading-meta">
        <span className="meta-label">{eyebrow}</span>
        {action}
      </div>
      <h1>{title}</h1>
      <p className="lead">{description}</p>
    </header>
  );
}
export function MetricCards({ metrics }: { metrics: Metric[] }) {
  if (!metrics.length) return null;
  return (
    <dl className="metric-grid">
      {metrics.map((metric) => (
        <div className="metric" key={metric.id}>
          <dt>{metric.label}</dt>
          <dd>{formatValue(metric.value, metric.unit)}</dd>
          <dd className="metric-note">{metric.note}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Provenance({ source }: { source: Source }) {
  return (
    <section className="provenance">
      <div className="section-line">
        <span className="meta-label">Source note</span>
        <h2>Data & measurement basis</h2>
      </div>
      <dl className="source-grid">
        <div>
          <dt>Analysis</dt>
          <dd>
            {source.label}
            <code>{source.path}</code>
          </dd>
        </div>
        <div>
          <dt>Observation period</dt>
          <dd>
            {formatDate(source.period.start)} to {formatDate(source.period.end)}
          </dd>
        </div>
        <div>
          <dt>Data as of</dt>
          <dd>{formatDate(source.asOf)}</dd>
        </div>
      </dl>
      <div className="reading-column">
        <p>{source.methodology}</p>
        {source.notes.length > 0 && (
          <ul>
            {source.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        )}
      </div>
      <Link className="text-link" href="/methodology">
        Read methodology & limitations <span aria-hidden="true">→</span>
      </Link>
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
    <aside className="pending-note">
      <span className="meta-label">Evidence status</span>
      <div>
        <h2>{title}</h2>
        <p>{reason}</p>
      </div>
    </aside>
  );
}
export function FigurePlaceholder({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <figure className="empty-figure">
      <figcaption>
        <span className="meta-label">Figure {number}</span>
        <h2>{title}</h2>
      </figcaption>
      <div className="figure-unavailable">
        <span className="figure-cross" aria-hidden="true">
          +
        </span>
        <p>{children}</p>
        <span className="meta-label">No values plotted</span>
      </div>
    </figure>
  );
}
export function PageFooter() {
  return (
    <footer className="page-footer">
      <span>Quantitative Investment & Risk Analysis</span>
      <div>
        <Link href="/methodology">Methodology & limitations</Link>
        <span>Research interface · v3</span>
      </div>
    </footer>
  );
}
