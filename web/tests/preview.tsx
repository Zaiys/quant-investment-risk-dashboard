import React from "react";
import { createRoot } from "react-dom/client";
import { AvailableAnalysis } from "@/components/available-analysis";
import { CorrelationMatrix } from "@/components/correlation-matrix";
import { parseDashboard } from "@/lib/validate";
import fixture from "./fixtures/available.json";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/600.css";
import "@/app/globals.css";
const data = parseDashboard(fixture);
if (
  data.sections.market.status !== "available" ||
  data.sections.correlation.status !== "available"
)
  throw new Error("Missing test fixture");
createRoot(document.getElementById("root")!).render(
  <main>
    <aside className="pending-note">
      <strong>SYNTHETIC PRESENTATION TEST</strong>
      <p>
        Not investment research results. This page does not change the published
        snapshot.
      </p>
    </aside>
    <h1 style={{ fontSize: "3rem", marginBottom: "2rem" }}>
      Research component verification
    </h1>
    <AvailableAnalysis section={data.sections.market} />
    <CorrelationMatrix matrix={data.sections.correlation.matrices![0]} />
  </main>,
);
