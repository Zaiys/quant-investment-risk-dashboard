import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Database,
  FileText,
  Layers,
} from "lucide-react";
import { dashboard } from "@/lib/data";
import { sections } from "@/lib/sections";
import { formatDate } from "@/lib/format";
import { Status } from "@/components/ui";
export default function Overview() {
  const available = sections.filter(
    (section) => dashboard.sections[section.key].status === "available",
  ).length;
  return (
    <>
      <div className="overview-heading">
        <div className="eyebrow">PROJECT OVERVIEW</div>
        <span className="edition">01 — RESEARCH WORKSPACE</span>
      </div>
      <section className="overview-hero">
        <div className="hero-copy">
          <h1>
            Investment & risk.
            <br />
            <span>In perspective.</span>
          </h1>
          <p>
            A connected view of markets, portfolio behaviour and investment
            risk. Grounded in the underlying Python research.
          </p>
          <Link href="/market" className="primary-link">
            Explore the research <ArrowRight size={17} />
          </Link>
        </div>
        <div className="snapshot">
          <div className="snapshot-heading">
            <Layers size={20} />
            <span>RESEARCH SNAPSHOT</span>
          </div>
          <strong>
            {available}
            <span>/ 4</span>
          </strong>
          <h2>analysis sections available</h2>
          <p>
            {available === 0
              ? "The presentation is ready. Reviewed analysis exports are the next step."
              : "Published research outputs, with their source and assumptions attached."}
          </p>
          <div className="coverage-bars" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span className={index < available ? "filled" : ""} key={index} />
            ))}
          </div>
          <div className="snapshot-footer">
            {dashboard.generatedAt
              ? `Last export · ${formatDate(dashboard.generatedAt)}`
              : "No analysis exported yet"}
          </div>
        </div>
      </section>
      <section className="context-strip" aria-label="Project principles">
        <div>
          <BookOpen size={19} />
          <span>
            <strong>Research led</strong> Python is the source of truth
          </span>
        </div>
        <div>
          <FileText size={19} />
          <span>
            <strong>Traceable results</strong> Sources & assumptions included
          </span>
        </div>
        <div>
          <Database size={19} />
          <span>
            <strong>Snapshot data</strong> No live market feed
          </span>
        </div>
      </section>
      <section id="research-status" className="research-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE RESEARCH</div>
            <h2>From markets to decisions</h2>
          </div>
          <span className="section-meta">Five connected perspectives</span>
        </div>
        <div className="research-list">
          {sections.map((section, index) => (
            <Link
              className="research-row"
              href={`/${section.key}`}
              key={section.key}
            >
              <span className="row-number">0{index + 1}</span>
              <div className="row-copy">
                <h3>
                  {section.title}
                  {section.key === "momentum" && (
                    <span className="small-tag">IN DEVELOPMENT</span>
                  )}
                </h3>
                <p>{section.description}</p>
              </div>
              <Status section={dashboard.sections[section.key]} />
              <ArrowUpRight className="row-arrow" size={21} />
            </Link>
          ))}
        </div>
      </section>
      <section className="overview-bottom">
        <div className="note-block">
          <div className="eyebrow">READING THIS DASHBOARD</div>
          <h2>Every number needs context.</h2>
          <p>
            Each published analysis carries its observation period, source and
            methodology. Missing outputs stay clearly marked until the research
            is ready.
          </p>
        </div>
        <div className="checklist">
          <h3>Publication standard</h3>
          <p>
            <Check size={16} /> Values supplied by the Python analysis
          </p>
          <p>
            <Check size={16} /> No simulated results in the dashboard
          </p>
          <p>
            <Check size={16} /> Momentum research published separately
          </p>
        </div>
      </section>
    </>
  );
}
