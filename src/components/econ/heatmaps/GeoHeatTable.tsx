// src/components/econ/heatmaps/GeoHeatTable.tsx
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

function val(r: Row, key: MetricKey) {
  if (key === "population") return r.population;
  if (key === "median_income") return r.medianIncome;
  if (key === "poverty_rate") return r.povertyRate;
  if (key === "bachelors_plus") return r.bachelorsPlus;
  if (key === "median_rent") return r.medianRent;
  return null;
}

function normalizeFips(s: string) {
  const x = String(s).trim();
  return x.length === 1 ? `0${x}` : x;
}

export default function GeoHeatTable({
  pinned,
  rows,
}: {
  pinned: string[];
  rows: Row[];
}) {
  const by = new Map<string, Row>();
  for (const r of rows) by.set(normalizeFips(r.fips), r);

  const pinnedRows = pinned.map((f) => by.get(normalizeFips(f))).filter(Boolean) as Row[];
  if (!pinnedRows.length) return null;

  // percentile color by metric across all rows
  function percentileColor(metric: MetricKey, v: number | null) {
    if (v === null || !Number.isFinite(v)) return "transparent";
    const arr = rows
      .map((r) => val(r, metric))
      .filter((x): x is number => x !== null && Number.isFinite(x))
      .sort((a, b) => a - b);

    if (!arr.length) return "transparent";
    let idx = 0;
    // linear scan ok for 50 states; for counties we’ll optimize later
    while (idx < arr.length && arr[idx] < v) idx++;
    const p = idx / Math.max(1, arr.length - 1); // 0..1

    // darker = more extreme
    const shade = 245 - Math.round(p * 110);
    return `rgb(${shade},${shade},${shade})`;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">Pinned heat table</div>
      <div className="mt-1 text-xs text-zinc-600">
        Cells are shaded by percentile among all states. Great for quick comparisons and screenshots.
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-zinc-200">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">State</th>
              {METRICS.map((m) => (
                <th key={m.key} className="px-3 py-2 text-right">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {pinnedRows.map((r) => (
              <tr key={r.fips} className="hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <div className="font-semibold text-zinc-900">{r.name}</div>
                  <div className="text-xs text-zinc-500">FIPS {normalizeFips(r.fips)}</div>
                </td>
                {METRICS.map((m) => {
                  const v = val(r, m.key);
                  return (
                    <td
                      key={m.key}
                      className="px-3 py-2 text-right font-semibold"
                      style={{ background: percentileColor(m.key, v) }}
                    >
                      {fmtMetric(m.unit, v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Next: add overlay columns (Unemployment, HPI) to this heat table as soon as we fetch them.
      </div>
    </div>
  );
}