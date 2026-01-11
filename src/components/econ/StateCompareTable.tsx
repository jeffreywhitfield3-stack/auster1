// src/components/econ/StateCompareTable.tsx
"use client";

import { METRICS, fmtMetric, type MetricKey } from "@/lib/econ/metrics";

type Row = {
  fips: string;
  name: string;
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null;
  bachelorsPlus: number | null;
  medianRent: number | null;
};

function normalizeFips(s: string) {
  const x = String(s).trim();
  return x.length === 1 ? `0${x}` : x;
}

function metricVal(row: Row, key: MetricKey): number | null {
  if (key === "population") return row.population;
  if (key === "median_income") return row.medianIncome;
  if (key === "poverty_rate") return row.povertyRate;
  if (key === "bachelors_plus") return row.bachelorsPlus;
  if (key === "median_rent") return row.medianRent;
  return null;
}

export default function StateCompareTable({
  pinned,
  rows,
  metric,
}: {
  pinned: string[];
  rows: Row[];
  metric: MetricKey;
}) {
  const def = METRICS.find((m) => m.key === metric)!;

  const by = new Map<string, Row>();
  for (const r of rows) by.set(normalizeFips(r.fips), r);

  const pinnedRows = pinned.map((f) => by.get(normalizeFips(f))).filter(Boolean) as Row[];

  if (!pinnedRows.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Pin states on the map to compare them here.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Pinned comparison</div>
          <div className="mt-1 text-xs text-zinc-600">
            This table reacts to the metric you’re exploring across the site.
          </div>
        </div>
        <div className="text-xs text-zinc-500">Metric: {def.label}</div>
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-zinc-200">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">State</th>
              <th className="px-3 py-2 text-right">Selected metric</th>
              <th className="px-3 py-2 text-right">Median income</th>
              <th className="px-3 py-2 text-right">Poverty</th>
              <th className="px-3 py-2 text-right">BA+</th>
              <th className="px-3 py-2 text-right">Median rent</th>
              <th className="px-3 py-2 text-right">Population</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {pinnedRows.map((r) => (
              <tr key={r.fips} className="hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <div className="font-semibold text-zinc-900">{r.name}</div>
                  <div className="text-xs text-zinc-500">FIPS {normalizeFips(r.fips)}</div>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                  {fmtMetric(def.unit, metricVal(r, metric))}
                </td>
                <td className="px-3 py-2 text-right">{fmtMetric("usd", r.medianIncome)}</td>
                <td className="px-3 py-2 text-right">{fmtMetric("pct", r.povertyRate)}</td>
                <td className="px-3 py-2 text-right">{fmtMetric("pct", r.bachelorsPlus)}</td>
                <td className="px-3 py-2 text-right">{fmtMetric("usd", r.medianRent)}</td>
                <td className="px-3 py-2 text-right">{fmtMetric("count", r.population)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Next: we’ll enrich this with “explain” chips (why higher/lower matters) and rank percentiles.
      </div>
    </div>
  );
}