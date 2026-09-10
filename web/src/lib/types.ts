export type SectionKey =
  "market" | "risk-return" | "portfolio" | "stress" | "momentum";
export type Unit = "number" | "percent" | "ratio";
export type Metric = {
  id: string;
  label: string;
  value: number | null;
  unit: Unit;
  note: string;
};
export type Chart = {
  id: string;
  title: string;
  description: string;
  kind: "line" | "bar" | "scatter";
  xLabel: string;
  yLabel: string;
  xUnit: Unit | "text";
  unit: Unit;
  series: {
    id: string;
    label: string;
    points: { x: string | number; y: number | null }[];
  }[];
};
export type DataTable = {
  id: string;
  title: string;
  description: string;
  columns: { key: string; label: string; unit: Unit | "text" }[];
  rows: { id: string; cells: (string | number | null)[] }[];
};
export type AwaitingSection = { status: "awaiting"; reason: string };
export type AvailableSection = {
  status: "available";
  source: {
    path: string;
    label: string;
    asOf: string;
    period: { start: string; end: string };
    methodology: string;
    notes: string[];
  };
  metrics: Metric[];
  charts: Chart[];
  tables: DataTable[];
};
export type Section = AwaitingSection | AvailableSection;
export type Dashboard = {
  schemaVersion: 1;
  generatedAt: string | null;
  sections: Record<Exclude<SectionKey, "momentum">, Section> & {
    momentum: AwaitingSection;
  };
};
