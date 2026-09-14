"use client";
import { useId, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, LabelList, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Chart } from "@/lib/types";
import { formatDate, formatValue } from "@/lib/format";
import {
  canUseLog, defaultSeries, firstAndLast, hasDateAxis, isWealthChart,
  plotRows, positiveDomain, seriesIdentity, seriesStyle,
} from "@/lib/chart-presentation";
import { AssetPicker } from "./asset-picker";
import { ChartValues } from "./chart-values";
export { alignSeries } from "@/lib/chart-presentation";

export function ResearchChart({ chart: original, focusedEntityId, onFocusEntity }: {
  chart: Chart; focusedEntityId?: string; onFocusEntity?: (id: string) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [localFocus, setLocalFocus] = useState("");
  const [query, setQuery] = useState("");
  const [valuesOpen, setValuesOpen] = useState(false);
  const [scale, setScale] = useState<"linear" | "log">(isWealthChart(original) && canUseLog(original) ? "log" : "linear");
  const scatter = original.kind === "scatter";
  const focus = focusedEntityId ?? localFocus;
  const presentIds = selectedIds?.filter((id) => original.series.some((s) => s.id === id));
  const chosen = presentIds?.length ? presentIds : defaultSeries(original);
  const chart = { ...original, series: scatter ? original.series : original.series.filter((s) => chosen.includes(s.id)) };
  const highlighted = original.series.find((s) => s.id === focus || seriesIdentity(s) === focus);
  const valuesChart = scatter && highlighted ? { ...chart, series: [highlighted] } : chart;
  const dated = hasDateAxis(chart);
  const logarithmic = isWealthChart(chart) && scale === "log" && canUseLog(chart);
  const matches = original.series.filter((s) => `${s.id} ${s.label}`.toLowerCase().includes(query.toLowerCase().trim()));
  const denseScatter = scatter && original.series.length > 8;
  const focusOn = (id: string) => {
    const s = original.series.find((item) => item.id === id);
    setLocalFocus(id);
    onFocusEntity?.(s ? seriesIdentity(s) : "");
  };
  const setSingle = (id: string) => {
    if (scatter) focusOn(id);
    else setSelectedIds(id ? [id] : defaultSeries(original));
  };
  const toggle = (id: string) => {
    if (chosen.includes(id)) {
      if (chosen.length > 1) setSelectedIds(chosen.filter((item) => item !== id));
    } else if (chosen.length < 5) setSelectedIds([...chosen, id]);
  };
  const numericX = scatter || chart.xUnit !== "text" || dated;
  const tickX = (value: string | number) => dated
    ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Number(value)))
    : formatValue(value, chart.xUnit);
  const tickY = (value: number) => chart.unit === "number" && Math.abs(value) >= 10000
    ? new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : formatValue(value, chart.unit);
  const common = { margin: { top: 28, right: 24, bottom: 12, left: 0 }, accessibilityLayer: true };
  const grid = <CartesianGrid stroke="#cbd2c9" strokeDasharray="3 5" vertical={false} />;
  const xAxis = <XAxis name={chart.xLabel} dataKey={dated ? "calendarX" : "x"}
    type={numericX ? "number" : "category"} scale={dated ? "time" : "auto"}
    domain={numericX ? ["dataMin", "dataMax"] : undefined}
    tickLine={false} axisLine={false} minTickGap={38} padding={dated ? undefined : { left: 18, right: 24 }}
    tick={{ fontSize: 12 }} tickFormatter={tickX} />;
  const yAxis = <YAxis name={chart.yLabel} dataKey={scatter ? "y" : undefined} type="number"
    scale={logarithmic ? "log" : "linear"} domain={logarithmic ? positiveDomain(chart) : ["auto", "auto"]}
    tickLine={false} axisLine={false} width={80} tick={{ fontSize: 12 }} tickFormatter={tickY} />;
  const tooltip = <Tooltip cursor={scatter ? { strokeDasharray: "3 3" } : undefined}
    content={({ active, payload, label }) => {
      if (!active || !payload?.length) return null;
      const first = payload[0].payload as Record<string, unknown>;
      if (scatter) {
        return <div className="readable-tooltip"><strong>{String(first.ticker ?? payload[0].name ?? "Asset")}</strong>
          <dl><div><dt>{chart.xLabel}</dt><dd>{formatValue(typeof first.x === "number" ? first.x : null, chart.xUnit)}</dd></div>
          <div><dt>{chart.yLabel}</dt><dd>{formatValue(typeof first.y === "number" ? first.y : null, chart.unit)}</dd></div></dl></div>;
      }
      return <div className="readable-tooltip"><strong>{dated && typeof first.x === "string" ? formatDate(first.x) : String(label ?? "")}</strong>
        <dl>{payload.map((entry, i) => <div key={String(entry.dataKey ?? i)}>
          <dt>{String(entry.name)}</dt><dd>{formatValue(typeof entry.value === "number" ? entry.value : null, chart.unit)}</dd>
        </div>)}</dl></div>;
    }} />;
  return (
    <section className="panel chart-panel readable-chart">
      <div className="panel-title"><div><h2>{chart.title}</h2><p>{chart.description}</p></div>
        <span className="chart-unit">{chart.yLabel}{logarithmic ? " · logarithmic scale" : ""}</span></div>
      <div className="readability-controls">
        {original.series.length > 1 && <AssetPicker label="Inspect series" options={original.series}
          value={scatter ? (highlighted?.id ?? "") : chosen.length === 1 ? chosen[0] : ""}
          onChange={setSingle} emptyLabel={scatter ? "All companies · highlight none" : "Comparison view"} />}
        {isWealthChart(chart) && <fieldset className="segmented-control"><legend>Wealth scale</legend>
          <button type="button" aria-pressed={!logarithmic} onClick={() => setScale("linear")}>Linear</button>
          <button type="button" disabled={!canUseLog(chart)} aria-pressed={logarithmic} onClick={() => setScale("log")}>Logarithmic</button>
        </fieldset>}
      </div>
      {!scatter && original.series.length > 2 && <details className="comparison-picker">
        <summary>Choose a comparison · {chosen.length} of {original.series.length} series</summary>
        <p className="reading-hint">Choose up to five series for a readable comparison. Defaults are illustrative, not a performance ranking.</p>
        <label>Search comparison tickers<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="For example, MSFT" /></label>
        <div className="ticker-options">{matches.map((s) => <label key={s.id}>
          <input type="checkbox" checked={chosen.includes(s.id)} disabled={!chosen.includes(s.id) && chosen.length >= 5}
            onChange={() => toggle(s.id)} />{s.label}</label>)}</div>
        {!matches.length && <p>No matching ticker.</p>}
        <div className="button-row"><button type="button" onClick={() => setSelectedIds(defaultSeries(original))}>Reset comparison</button>
          <button type="button" onClick={() => setSelectedIds(original.series.map((s) => s.id))}>Show all series</button></div>
      </details>}
      {!scatter && chosen.length > 5 && <p className="reading-hint">All-series overview: lines may overlap. Choose a smaller comparison to identify individual assets.</p>}
      {isWealthChart(chart) && <p className="reading-hint">{logarithmic
        ? "Log scale: equal vertical distances mean equal proportional changes. Source values and initial bases are unchanged."
        : "Linear scale: equal vertical distances mean equal changes in index or wealth units."}
        {!canUseLog(chart) && " Log scale is unavailable because this selection includes zero, negative or invalid values; no observations have been removed."}</p>}
      {denseScatter && <p className="reading-hint">Search for a ticker or select a point. Other companies stay visible as context; colour is not a ranking.</p>}
      {scatter && highlighted && <div className="scatter-reading" aria-live="polite">
        <strong>{highlighted.label}</strong><span>{chart.xLabel}: {formatValue(highlighted.points[0]?.x ?? null, chart.xUnit)}</span>
        <span>{chart.yLabel}: {formatValue(highlighted.points[0]?.y ?? null, chart.unit)}</span>
      </div>}
      <div className="chart" role="img" aria-label={`${chart.title}. ${chart.description}. ${logarithmic ? "Logarithmic scale." : "Linear scale."} Values are available in the table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          {scatter ? <ScatterChart {...common}>{grid}{xAxis}{yAxis}{tooltip}
            {chart.series.map((s) => {
              const selected = highlighted?.id === s.id;
              const style = seriesStyle(seriesIdentity(s));
              return <Scatter key={s.id} name={s.label} data={s.points.filter((p) => p.y !== null).map((p) => ({ ...p, ticker: s.label }))}
                dataKey="y" fill={denseScatter && !selected ? "#78847d" : style.colour}
                fillOpacity={denseScatter && highlighted && !selected ? 0.28 : 0.85}
                stroke={selected ? "#252d29" : undefined} strokeWidth={selected ? 2 : 0}
                shape={selected ? "diamond" : "circle"} onClick={() => focusOn(s.id)} isAnimationActive={false}>
                {selected && <LabelList dataKey="ticker" position="top" fill="#252d29" fontSize={13} />}
              </Scatter>;
            })}</ScatterChart> : original.kind === "bar" ? <BarChart {...common} data={plotRows(chart)}>
              <defs>{chart.series.map((s) => {
                const style = seriesStyle(seriesIdentity(s));
                return <pattern key={s.id} id={`${uid}-${s.id.replace(/[^a-z0-9]/gi, "_")}`} width="7" height="7" patternUnits="userSpaceOnUse">
                  <rect width="7" height="7" fill={style.colour} /><path d="M-1 1L1-1M0 7L7 0M6 8L8 6" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.3" />
                </pattern>;
              })}</defs>{grid}{xAxis}{yAxis}{tooltip}<ReferenceLine y={0} stroke="#59645d" />
              {chart.series.map((s, i) => { const style = seriesStyle(seriesIdentity(s)); return <Bar key={s.id} name={s.label}
                dataKey={`series${i}`} fill={style.dash ? `url(#${uid}-${s.id.replace(/[^a-z0-9]/gi, "_")})` : style.colour}
                stroke={style.colour} isAnimationActive={false} />; })}
            </BarChart> : <LineChart {...common} data={plotRows(chart)}>{grid}{xAxis}{yAxis}{tooltip}
              {chart.unit === "percent" && <ReferenceLine y={0} stroke="#59645d" />}
              {chart.series.map((s, i) => { const style = seriesStyle(seriesIdentity(s)); return <Line key={s.id} name={s.label}
                dataKey={`series${i}`} type="linear" stroke={style.colour} strokeWidth={2.4} strokeDasharray={style.dash}
                dot={s.points.length < 2 || s.points.some((p) => p.y === null) ? { r: 2.5, strokeWidth: 0 } : false}
                activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />; })}
            </LineChart>}
        </ResponsiveContainer>
      </div>
      <div className="chart-axis-label">{chart.xLabel}{dated ? " · calendar spacing" : ""}</div>
      {!denseScatter && <ul className="series-key" aria-label="Series identification">{chart.series.map((s) => {
        const style = seriesStyle(seriesIdentity(s));
        const end = isWealthChart(chart) ? firstAndLast(s)?.last : null;
        return <li key={s.id} data-series-id={seriesIdentity(s)} data-colour={style.colour}>
          <svg width="30" height="12" aria-hidden="true"><line x1="0" x2="30" y1="6" y2="6" stroke={style.colour} strokeWidth="3" strokeDasharray={style.dash} /></svg>
          <span><strong>{s.label}</strong>{end && <small>{typeof end.x === "string" && dated ? formatDate(end.x) : String(end.x)}: {formatValue(end.y, chart.unit)}</small>}</span>
          {!scatter && chart.series.length > 1 && <button type="button" className="remove-series" aria-label={`Remove ${s.label} from comparison`} onClick={() => toggle(s.id)}>×</button>}
        </li>;
      })}</ul>}
      <details className="chart-values" onToggle={(e) => setValuesOpen(e.currentTarget.open)}>
        <summary>View chart values</summary>
        {scatter && highlighted && <p className="reading-hint">Source values for the highlighted asset. Clear the selection to inspect every company.</p>}
        {valuesOpen && <ChartValues key={JSON.stringify(valuesChart.series.map((s) => s.id))} chart={valuesChart} />}
        <noscript><p><a href="/export" download="research-snapshot.json">Download the source values</a> to inspect the snapshot without JavaScript.</p></noscript>
      </details>
    </section>
  );
}
