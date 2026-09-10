import React from "react";
import { createRoot } from "react-dom/client";
import { ResearchChart } from "@/components/research-chart";
import { DataTable } from "@/components/data-table";
import { MetricCards, Provenance } from "@/components/ui";
import { parseDashboard } from "@/lib/validate";
import fixture from "./fixtures/available.json";
import "@fontsource/dm-sans/400.css";
import "@fontsource/manrope/600.css";
import "@/app/globals.css";
const section = parseDashboard(fixture).sections.market;
if (section.status !== "available")
  throw new Error("Missing presentation test fixture");
createRoot(document.getElementById("root")!).render(
  <main style={{ maxWidth: 1200 }}>
    <div className="notice">
      SYNTHETIC PRESENTATION TEST — NOT INVESTMENT RESEARCH RESULTS
    </div>
    <h1 style={{ marginBottom: 28 }}>Component verification</h1>
    <MetricCards metrics={section.metrics} />
    {section.charts.map((chart) => (
      <ResearchChart chart={chart} key={chart.id} />
    ))}
    {section.tables.map((table) => (
      <DataTable table={table} key={table.id} />
    ))}
    <Provenance source={section.source} />
  </main>,
);
