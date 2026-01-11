// src/components/econ/StateTileMap.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { Card, Button, Badge } from "@/components/ui";
import { MAP_METRICS, type MapMetricId } from "@/lib/econ/map-metrics";
import { peekUsage, incrementUsage } from "@/lib/usage-client";

type MapResp = {
  metric: string;
  label: string;
  units: string;
  decimals: number;
  description: string;
  asOf: string | null;
  min: number | null;
  max: number | null;
  states: { abbr: string; name: string; value: number | null }[];
};

type StateSeriesResp = {
  metric: string;
  state: string;
  seriesId?: string;
  points: { date: string; value: number }[];
  note?: string;
};

const TILE_POS: Record<string, { r: number; c: number }> = {
  WA:{r:0,c:0}, OR:{r:1,c:0}, CA:{r:2,c:0}, AK:{r:6,c:0},
  ID:{r:0,c:1}, NV:{r:2,c:1}, UT:{r:2,c:2}, AZ:{r:3,c:1},
  MT:{r:0,c:2}, WY:{r:1,c:2}, CO:{r:2,c:3}, NM:{r:3,c:2},
  ND:{r:0,c:3}, SD:{r:1,c:3}, NE:{r:2,c:4}, KS:{r:3,c:4}, OK:{r:4,c:4}, TX:{r:5,c:4},
  MN:{r:0,c:4}, IA:{r:1,c:4}, MO:{r:2,c:5}, AR:{r:3,c:5}, LA:{r:4,c:5},
  WI:{r:0,c:5}, IL:{r:1,c:5}, KY:{r:2,c:6}, TN:{r:3,c:6}, MS:{r:4,c:6}, AL:{r:5,c:6},
  MI:{r:0,c:6}, IN:{r:1,c:6}, OH:{r:1,c:7}, WV:{r:2,c:7}, GA:{r:5,c:7},
  PA:{r:0,c:7}, VA:{r:2,c:8}, NC:{r:3,c:8}, SC:{r:4,c:8}, FL:{r:6,c:8},
  NY:{r:0,c:8}, NJ:{r:1,c:8}, DE:{r:2,c:9}, MD:{r:2,c:9}, DC:{r:2,c:9},
  CT:{r:0,c:9}, RI:{r:0,c:10}, MA:{r:0,c:10}, VT:{r:0,c:9}, NH:{r:0,c:10}, ME:{r:0,c:11},
  HI:{r:6,c:1},
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function fmtValue(v: number | null | undefined, units: string, decimals: number) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  if (units === "$") {
    return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: decimals });
  }
  if (units === "pp") return `${v.toFixed(decimals)}pp`;
  if (units === "%") return `${v.toFixed(decimals)}%`;
  return v.toFixed(decimals);
}

function colorFor(value: number | null, min: number | null, max: number | null) {
  if (value === null || !Number.isFinite(value)) return "bg-zinc-100";
  if (min === null || max === null || min === max) return "bg-zinc-200";
  const t = clamp((value - min) / (max - min), 0, 1);
  // Higher intensity => darker. Keep grayscale to match your aesthetic.
  // We map t into a set of tailwind zinc shades.
  if (t < 0.15) return "bg-zinc-100";
  if (t < 0.3) return "bg-zinc-200";
  if (t < 0.45) return "bg-zinc-300";
  if (t < 0.6) return "bg-zinc-400";
  if (t < 0.75) return "bg-zinc-500 text-white";
  if (t < 0.9) return "bg-zinc-700 text-white";
  return "bg-zinc-900 text-white";
}

async function apiGet<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

export default function StateTileMap() {
  const [metric, setMetric] = useState<MapMetricId>("unemployment_level");
  const m = MAP_METRICS[metric];

  const [map, setMap] = useState<MapResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  const [seriesBusy, setSeriesBusy] = useState(false);
  const [series, setSeries] = useState<StateSeriesResp | null>(null);

  const [compare, setCompare] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{ remainingProduct: number; remainingTotal: number } | null>(null);

  // Change this to whatever you called your econ refresh usage key in DB.
  // We’ll enforce usage on: load map + switching metric (counts as a “refresh”).
  const USAGE_KEY = "econ_refresh";

  const stateValueMap = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const s of map?.states ?? []) out[s.abbr] = s.value;
    return out;
  }, [map]);

  const ranked = useMemo(() => {
    const arr = (map?.states ?? [])
      .filter((s) => s.abbr && s.abbr.length >= 2)
      .slice()
      .sort((a, b) => {
        const av = Number.isFinite(a.value as any) ? (a.value as number) : -Infinity;
        const bv = Number.isFinite(b.value as any) ? (b.value as number) : -Infinity;
        return bv - av;
      });
    return arr;
  }, [map]);

  async function refreshMap({ countUsage }: { countUsage: boolean }) {
    setBusy(true);
    setErr(null);
    setShowPaywall(false);

    try {
      // Usage gate (free users)
      if (countUsage) {
        const u = await peekUsage(USAGE_KEY);
        setUsageInfo({ remainingProduct: u.remainingProduct, remainingTotal: u.remainingTotal });
        if (!u.allowed) {
          setShowPaywall(true);
          setBusy(false);
          return;
        }
        await incrementUsage(USAGE_KEY);
        // Re-peek after increment (optional)
        const u2 = await peekUsage(USAGE_KEY);
        setUsageInfo({ remainingProduct: u2.remainingProduct, remainingTotal: u2.remainingTotal });
      }

      const data = await apiGet<MapResp>(`/api/econ/map?metric=${encodeURIComponent(metric)}`);
      setMap(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setMap(null);
    } finally {
      setBusy(false);
    }
  }

  async function loadSeries(state: string) {
    setSeriesBusy(true);
    try {
      const s = await apiGet<StateSeriesResp>(`/api/econ/map/state?metric=${encodeURIComponent(metric)}&state=${encodeURIComponent(state)}`);
      setSeries(s);
    } catch (e: any) {
      setSeries(null);
    } finally {
      setSeriesBusy(false);
    }
  }

  useEffect(() => {
    // Initial load should NOT count usage automatically (optional).
    // If you want it to count, set countUsage:true here.
    refreshMap({ countUsage: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Switching metric counts as a refresh action
    refreshMap({ countUsage: true });
    setPinned(null);
    setSeries(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);

  const grid = useMemo(() => {
    const rows = 7;
    const cols = 12;
    const cells: Array<Array<string | null>> = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    for (const [abbr, pos] of Object.entries(TILE_POS)) {
      if (pos.r >= 0 && pos.r < rows && pos.c >= 0 && pos.c < cols) cells[pos.r][pos.c] = abbr;
    }
    return cells;
  }, []);

  function toggleCompare(abbr: string) {
    setCompare((prev) => {
      if (prev.includes(abbr)) return prev.filter((x) => x !== abbr);
      return prev.length >= 5 ? prev : [...prev, abbr];
    });
  }

  const min = map?.min ?? null;
  const max = map?.max ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: map + controls */}
      <div className="lg:col-span-8">
        {showPaywall ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-semibold">Free limit reached</div>
            <div className="mt-1 text-amber-800">
              You’ve used all free Econ refreshes. Subscribe for unlimited access.
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href="/pricing"
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                View pricing
              </Link>
              <button
                onClick={() => setShowPaywall(false)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Not now
              </button>
            </div>
          </div>
        ) : null}

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-base font-semibold text-zinc-900">US Macro Map</div>
                <Badge>Interactive</Badge>
              </div>
              <div className="mt-1 text-sm text-zinc-600">{m.description}</div>
              <div className="mt-2 text-xs text-zinc-500">
                {map?.asOf ? <>As of {map.asOf}</> : "—"}
                {usageInfo ? (
                  <> • Remaining: {usageInfo.remainingProduct} here, {usageInfo.remainingTotal} sitewide</>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as MapMetricId)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
              >
                {Object.values(MAP_METRICS).map((mm) => (
                  <option key={mm.id} value={mm.id}>
                    {mm.label}
                  </option>
                ))}
              </select>

              <Button variant="secondary" onClick={() => refreshMap({ countUsage: true })} disabled={busy}>
                {busy ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Error: {err}
            </div>
          ) : null}

          {/* Tile map */}
          <div className="mt-5 overflow-auto">
            <div className="inline-block rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="grid gap-2" style={{ gridTemplateRows: `repeat(${grid.length}, minmax(0, 1fr))` }}>
                {grid.map((row, r) => (
                  <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                    {row.map((abbr, c) => {
                      if (!abbr) return <div key={`${r}-${c}`} className="h-10 w-10" />;

                      const val = stateValueMap[abbr] ?? null;
                      const col = colorFor(val, min, max);

                      const isPinned = pinned === abbr;
                      const isCompare = compare.includes(abbr);

                      return (
                        <button
                          key={abbr}
                          className={[
                            "h-10 w-10 rounded-xl border text-[11px] font-extrabold tracking-tight",
                            "transition hover:scale-[1.02]",
                            isPinned ? "border-zinc-900" : "border-zinc-200",
                            isCompare ? "ring-2 ring-zinc-900" : "",
                            col,
                          ].join(" ")}
                          onMouseEnter={() => setHover(abbr)}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => {
                            setPinned(abbr);
                            loadSeries(abbr);
                          }}
                          title={`${abbr}: ${fmtValue(val, map?.units ?? "", map?.decimals ?? 1)}`}
                        >
                          {abbr}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hover / legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-zinc-700">
              {hover ? (
                <>
                  <span className="font-semibold">{hover}</span>{" "}
                  <span className="text-zinc-500">•</span>{" "}
                  <span className="font-semibold">
                    {fmtValue(stateValueMap[hover] ?? null, map?.units ?? "", map?.decimals ?? 1)}
                  </span>
                </>
              ) : (
                <span className="text-zinc-500">Hover a state for value. Click to pin.</span>
              )}
            </div>
            <div className="text-xs text-zinc-500">
              Low → High (auto-scaled)
            </div>
          </div>
        </Card>

        {/* Ranked table */}
        <div className="mt-6">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">Ranked states</div>
              <div className="text-xs text-zinc-500">Click a state to pin. Add up to 5 to compare.</div>
            </div>

            <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white">
              <table className="min-w-[720px] text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">State</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-right">Compare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {ranked.map((s, i) => (
                    <tr key={s.abbr} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 text-zinc-600">#{i + 1}</td>
                      <td className="px-3 py-2">
                        <button
                          className="font-semibold text-zinc-900 hover:underline"
                          onClick={() => {
                            setPinned(s.abbr);
                            loadSeries(s.abbr);
                          }}
                        >
                          {s.abbr}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {fmtValue(s.value, map?.units ?? "", map?.decimals ?? 1)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                          onClick={() => toggleCompare(s.abbr)}
                        >
                          {compare.includes(s.abbr) ? "Remove" : "Add"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!ranked.length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-sm text-zinc-600">
                        No data yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {compare.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-800">Compare:</span>
                {compare.map((abbr) => (
                  <button
                    key={abbr}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-semibold text-zinc-800 hover:bg-zinc-100"
                    onClick={() => toggleCompare(abbr)}
                    title="Remove"
                  >
                    {abbr} ✕
                  </button>
                ))}
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      {/* Right: pinned state panel */}
      <div className="lg:col-span-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">State detail</div>
              <div className="mt-1 text-xs text-zinc-600">
                Click a state on the map or table to see its trend.
              </div>
            </div>
            {pinned ? (
              <Badge>{pinned}</Badge>
            ) : null}
          </div>

          {!pinned ? (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              No state selected yet.
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="font-semibold text-zinc-900">{m.label}</div>
                <div className="font-semibold text-zinc-900">
                  {fmtValue(stateValueMap[pinned] ?? null, map?.units ?? "", map?.decimals ?? 1)}
                </div>
              </div>

              <div className="mt-3 h-[240px] w-full">
                {seriesBusy ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                    Loading series…
                  </div>
                ) : series?.points?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series.points.slice(-240)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" minTickGap={28} />
                      <YAxis tickFormatter={(v) => (typeof v === "number" ? v.toFixed(1) : String(v))} />
                      <RTooltip
                        formatter={(v: any) => fmtValue(Number(v), map?.units ?? "", map?.decimals ?? 1)}
                        labelFormatter={(l) => `Date: ${l}`}
                      />
                      <Line type="monotone" dataKey="value" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                    {series?.note ? "No trend series for this metric yet." : "No data."}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  onClick={() => {
                    if (!pinned) return;
                    toggleCompare(pinned);
                  }}
                >
                  {compare.includes(pinned) ? "Remove from compare" : "Add to compare"}
                </button>
                <button
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                  onClick={() => {
                    setPinned(null);
                    setSeries(null);
                  }}
                >
                  Clear
                </button>
              </div>

              <div className="mt-4 text-xs text-zinc-500">
                Tip: Use <span className="font-semibold">YoY</span> metrics to compare momentum across states.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}