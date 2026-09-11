import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { dashboard } from "@/lib/data";
import { sections } from "@/lib/sections";
import { PageHeading, PendingData, Status } from "@/components/ui";
import { MomentumIntro } from "@/components/momentum-intro";
import { AvailableAnalysis } from "@/components/available-analysis";
import { ResearchView, AssetHistory } from "@/components/research-views";
// Known chapters are prerendered; unknown names use the explicit notFound guard.
export function generateStaticParams() {
  return sections.map((section) => ({ section: section.key }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const config = sections.find((item) => item.key === section);
  if (!config) notFound();
  return {
    title: config.title,
    description: config.description,
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
        eyebrow={`${config.number} / Research chapter`}
        title={config.title}
        description={config.description}
        action={<Status section={data} />}
      />
      {data.status === "available" ? (
        <>
          <p className="research-question available-question">
            {config.question}
          </p>
          {config.key === "market" && (
            <p className="margin-statement">
              Raw share prices are not comparable performance measures. Read
              indexed results alongside the supplied base date, adjustment
              settings and observation period.
            </p>
          )}
          {config.key === "portfolio" && (
            <p className="margin-statement">
              Portfolio weight ≠ portfolio risk contribution. Read the
              allocation and risk-contribution outputs separately.
            </p>
          )}
          {config.key === "correlation" && (
            <p className="margin-statement">
              Correlation describes co-movement; beta describes benchmark
              sensitivity. Both estimates apply to the exported observation
              window and can change across regimes.
            </p>
          )}
          {config.key === "momentum" &&
            dashboard.sections.momentum.status === "available" && (
              <MomentumIntro section={dashboard.sections.momentum} />
            )}
          <AvailableAnalysis section={data} />
          {config.key === "market" && (
            <AssetHistory research={dashboard.research} />
          )}
        </>
      ) : (
        <>
          {config.key !== "momentum" && (
            <PendingData
              title="No verified results published"
              reason={data.reason}
            />
          )}
          <ResearchView section={config.key} research={dashboard.research} />
        </>
      )}
      <div className="chapter-end">
        <Link href="/">← Research overview</Link>
        <Link href="/methodology">Methodology & limitations →</Link>
      </div>
    </>
  );
}
