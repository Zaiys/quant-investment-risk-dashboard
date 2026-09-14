import { pageMetadata } from "@/lib/site";
import { dashboard } from "@/lib/data";
import { methodologyChecks } from "@/lib/research-notes";
import { PageHeading, Provenance } from "@/components/ui";
export const metadata = pageMetadata(
  "Methodology & Limitations",
  "Data definitions, observation windows, risk-free-rate assumptions and limitations of the quantitative investment research.",
  "/methodology",
);
export default function Methodology() {
  const method = dashboard.methodology;
  return (
    <>
      <PageHeading
        eyebrow="09 / Methodology & limitations"
        title="Methodology & Limitations"
        description="A result is only interpretable alongside the data, definitions and assumptions that produced it."
        action={
          <span className="status">
            {method.status === "available"
              ? "Methodology exported"
              : "Source verification pending"}
          </span>
        }
      />
      <div className="methodology-layout grid-12">
        <aside className="methodology-rail">
          <span className="meta-label">Reading guide</span>
          <h2>Definitions before conclusions.</h2>
          <p>
            {method.status === "available"
              ? "The documented methodology is reproduced from the research export. The review checklist below identifies further points to check."
              : method.reason}
          </p>
          <p className="verification-label">
            The review notes below are questions to verify, not a claim that
            these choices have already been implemented.
          </p>
          <a href="#methodology-checklist" className="text-link">
            Review assumptions ↓
          </a>
        </aside>
        <div className="methodology-body">
          {method.status === "available" && (
            <section className="documented-methodology">
              <span className="meta-label">From the research</span>
              <h2>Documented methodology</h2>
              {method.items.map((item) => (
                <article key={item.id}>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </article>
              ))}
              <Provenance source={method.source} />
            </section>
          )}
          <section id="methodology-checklist">
            <span className="meta-label">Methodological review</span>
            {methodologyChecks.map((item, index) => (
              <article className="methodology-item" key={item.id}>
                <span className="method-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="method-title">
                    <h2>{item.title}</h2>
                    <span className="meta-label">Review question</span>
                  </div>
                  <p>{item.question}</p>
                </div>
              </article>
            ))}
          </section>
          <aside className="limitations-note">
            <h2>What this interface can establish</h2>
            <p>
              Export validation checks that dates, units and records are
              structurally consistent. It does not verify the financial
              calculations, establish statistical validity, or turn historical
              findings into investment recommendations.
            </p>
          </aside>
          <p className="reference-note">
            Background reading:{" "}
            <a
              href="https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/portfolio-risk-return-part-2"
              target="_blank"
              rel="noreferrer"
            >
              CFA Institute on portfolio risk, correlation and beta
            </a>
            . This reference is explanatory context, not a source of project
            results.
          </p>
        </div>
      </div>
    </>
  );
}
