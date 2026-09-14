"use client";
import { useId, useState } from "react";

export function AssetPicker({ label, options, value, onChange, emptyLabel }: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const matches = options.filter((option) => option.id === value ||
    `${option.id} ${option.label}`.toLowerCase().includes(query.toLowerCase().trim()));
  return (
    <div className="asset-picker">
      {options.length > 10 && <label className="picker-search">Search {label.toLowerCase()}
        <input type="search" value={query} placeholder="Type a ticker" onChange={(e) => setQuery(e.target.value)} />
      </label>}
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {matches.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {query && !matches.length && <span className="reading-hint">No matching ticker.</span>}
    </div>
  );
}
