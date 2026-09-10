export type SectionKey =
  | "market"
  | "risk-return"
  | "correlation"
  | "portfolio"
  | "stress"
  | "momentum";
export type Unit = "number" | "percent" | "ratio";
export type Period = { start: string; end: string };
export type Source = {
  path: string;
  label: string;
  asOf: string;
  period: Period;
  methodology: string;
  notes: string[];
};
export type Metric = {
  id: string;
  label: string;
  value: number | null;
  unit: Unit;
  note: string;
  entityId?: string;
  scenarioId?: string;
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
  scenarioId?: string;
  series: {
    id: string;
    label: string;
    entityId?: string;
    points: { x: string | number; y: number | null }[];
  }[];
};
export type DataTable = {
  id: string;
  title: string;
  description: string;
  scenarioId?: string;
  columns: { key: string; label: string; unit: Unit | "text" }[];
  rows: { id: string; cells: (string | number | null)[]; entityId?: string }[];
};
export type Matrix = {
  id: string;
  title: string;
  description: string;
  labels: { id: string; label: string }[];
  values: (number | null)[][];
};
export type AwaitingSection = { status: "awaiting"; reason: string };
export type AvailableSection = {
  status: "available";
  source: Source;
  metrics: Metric[];
  charts: Chart[];
  tables: DataTable[];
  matrices?: Matrix[];
  entities?: { id: string; label: string }[];
  scenarios?: { id: string; label: string; period: Period; notes: string }[];
};
export type Section = AwaitingSection | AvailableSection;
export type ResearchMetadata = {
  updatedAt: string | null;
  period: Period | null;
  universe: {
    id: string;
    name: string;
    availableFrom: string;
    availableTo: string;
  }[];
};
export type Dashboard = {
  schemaVersion: 2;
  generatedAt: string | null;
  research: ResearchMetadata;
  methodology:
    | AwaitingSection
    | {
        status: "available";
        source: Source;
        items: { id: string; title: string; detail: string }[];
      };
  sections: Record<Exclude<SectionKey, "momentum">, Section> & {
    momentum: AwaitingSection;
  };
};
