import type { AvailableMomentum } from "@/lib/types";
import { DataTable } from "./data-table";
import { Provenance } from "./ui";

export function MomentumSensitivities({
  sensitivities,
}: {
  sensitivities: NonNullable<AvailableMomentum["sensitivities"]>;
}) {
  return (
    <section id="momentum-sensitivities" aria-labelledby="sensitivity-heading">
      <span className="meta-label">Sensitivity analyses</span>
      <div className="view-intro grid-12">
        <h2 id="sensitivity-heading" className="research-question">
          How much do implementation assumptions matter?
        </h2>
        <aside className="margin-note">
          <span className="meta-label">Read the conventions</span>
          <p>
            Cost and timing are tested separately. The timing check holds cash
            for the first trading day of every month. Neither check removes
            survivorship or selection bias, or establishes executable returns.
          </p>
        </aside>
      </div>
      <p className="margin-statement">
        Compare these checks with the verified gross baseline above. The
        12-month signal, top ten and monthly selection rule are unchanged.
      </p>
      {sensitivities.tables.map((table) => (
        <DataTable key={table.id} table={table} />
      ))}
      <Provenance source={sensitivities.source} />
    </section>
  );
}
