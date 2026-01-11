"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import PaywallBanner from "@/components/econ/PaywallBanner";
import UsChoropleth from "@/components/econ/UsChoropleth";
import CorrelationHeatmap from "@/components/econ/heatmaps/CorrelationHeatmap";
import MetricPicker from "@/components/econ/MetricPicker";

import { METRICS, fmtMetric, type MetricKey } from "@/lib/econ/metrics";
import { peekUsage, incrementUsage } from "@/lib/usage-client";

type EntMe = { is_paid: boolean; plan: string };

type CensusStateRow = {
  fips: string; // "24"
  name: string; // "Maryland"
  population: number | null;
  medianIncome: number | null;
  povertyRate: number | null;
  bachelorsPlus: number | null;
  medianRent: number | null;
};

type CensusStateResp = { year: number; rows: CensusStateRow[] };

type OverlayKey = "census_metric" | "unemp_rate" | "hpi";

type OverlayMapResp = {
  overlay: "unemp_rate" | "hpi";
  unit: "pct" | "index";
  rows: { fips: string; usps: string; seriesId: string; date: string | null; value: number | null }[];
};

type WbResp = {
  country: string;
  indicator: string;
  label: string;
  unitHint: string;
  points: { date: string; value: number | null }[];
};

type CountyResp = {
  year: number;
  stateFips: string;
  rows: {
    fips: string;
    name: string;
    population: number | null;
    medianIncome: number | null;
    povertyRate: number | null;
    bachelorsPlus: number | null;
    medianRent: number | null;
  }[];
};

type Tab = "Overview" | "Compare" | "Counties" | "Countries" | "Brief";

// ---- helpers ----
async function apiGetRaw(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  return { r, text };
}
async function apiGet<T>(url: string): Promise<T> {
  const { r, text } = await apiGetRaw(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

// Pearson corr
function corr(xs: number[], ys: number[]) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;

  let sx = 0,
    sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;

  let num = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx <= 0 || dy <= 0) return NaN;
  return num / Math.sqrt(dx * dy);
}

const METRIC_BY_KEY = {
  population: (r: CensusStateRow) => r.population,
  median_income: (r: CensusStateRow) => r.medianIncome,
  poverty_rate: (r: CensusStateRow) => r.povertyRate,
  bachelors_plus: (r: CensusStateRow) => r.bachelorsPlus,
  median_rent: (r: CensusStateRow) => r.medianRent,
} satisfies Record<MetricKey, (r: CensusStateRow) => number | null>;

const FIPS_TO_ABBR: Record<string, string> = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
};

export default function EconClient() {
  const router = useRouter();

  // --- entitlement + usage ---
  const [ent, setEnt] = useState<EntMe | null>(null);
  const [usage, setUsage] = useState<{ remainingProduct: number; remainingTotal: number; allowed: boolean } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // --- UI ---
  const [tab, setTab] = useState<Tab>("Overview");

  const [mapMode, setMapMode] = useState<OverlayKey>("census_metric");
  const [metric, setMetric] = useState<MetricKey>("median_income");
  const [overlay, setOverlay] = useState<"unemp_rate" | "hpi">("unemp_rate");

  const [pinned, setPinned] = useState<string[]>(["24"]);
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
  const [activeFips, setActiveFips] = useState<string>("24");

  // data
  const [stateCensus, setStateCensus] = useState<CensusStateResp | null>(null);
  const [overlayMap, setOverlayMap] = useState<OverlayMapResp | null>(null);

  // counties
  const [countyStateFips, setCountyStateFips] = useState("24");
  const [counties, setCounties] = useState<CountyResp | null>(null);

  // countries
  const [country, setCountry] = useState("USA");
  const [wbIndicator, setWbIndicator] = useState("gdp_current_usd");
  const [wb, setWb] = useState<WbResp | null>(null);

  // status
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function togglePin(fips: string) {
    const norm = String(fips).padStart(2, "0");
    setPinned((prev) => {
      const s = new Set(prev.map((x) => String(x).padStart(2, "0")));
      if (s.has(norm)) s.delete(norm);
      else s.add(norm);
      return Array.from(s);
    });
  }

  // --- guarded usage ---
  async function guardUsage(productKey: string, fn: () => Promise<void>) {
    if (ent?.is_paid) {
      await fn();
      return;
    }

    const u = await peekUsage(productKey);
    setUsage({ remainingProduct: u.remainingProduct, remainingTotal: u.remainingTotal, allowed: u.allowed });

    if (!u.allowed) {
      setShowPaywall(true);
      return;
    }

    await fn();
    await incrementUsage(productKey);

    const u2 = await peekUsage(productKey);
    setUsage({ remainingProduct: u2.remainingProduct, remainingTotal: u2.remainingTotal, allowed: u2.allowed });
  }

  // --- fetchers ---
  async function loadStateCensus() {
    setBusy("Loading state metrics…");
    setErr(null);
    try {
      const data = await apiGet<CensusStateResp>("/api/econ/census/state");
      setStateCensus(data);
    } catch (e: any) {
      setStateCensus(null);
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function loadOverlayMap(which: "unemp_rate" | "hpi") {
    setBusy("Loading overlay…");
    setErr(null);
    try {
      const data = await apiGet<OverlayMapResp>(`/api/econ/fred/overlay-map?overlay=${encodeURIComponent(which)}`);
      setOverlayMap(data);
    } catch (e: any) {
      setOverlayMap(null);
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function loadCounties() {
    setBusy("Loading counties…");
    setErr(null);
    try {
      const data = await apiGet<CountyResp>(`/api/econ/census/county?state=${encodeURIComponent(countyStateFips)}`);
      setCounties(data);
    } catch (e: any) {
      setCounties(null);
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  async function loadWorldBank() {
    setBusy("Loading country series…");
    setErr(null);
    try {
      const data = await apiGet<WbResp>(
        `/api/econ/worldbank/indicator?country=${encodeURIComponent(country)}&indicator=${encodeURIComponent(wbIndicator)}`
      );
      setWb(data);
    } catch (e: any) {
      setWb(null);
      setErr(String(e?.message ?? e));
    } finally {
      setBusy(null);
    }
  }

  // --- auth gate ---
  useEffect(() => {
    (async () => {
      const { r, text } = await apiGetRaw("/api/entitlements/me");

      // Not logged in -> no access
      if (r.status === 401 || r.status === 403) {
        router.replace(`/login?next=${encodeURIComponent("/products/econ")}`);
        return;
      }

      if (!r.ok) {
        // fail-soft: show page as free (still protected at route level)
        setEnt({ is_paid: false, plan: "free" });
        return;
      }

      try {
        setEnt(JSON.parse(text) as EntMe);
      } catch {
        setEnt({ is_paid: false, plan: "free" });
      }
    })();
  }, [router]);

  // initial usage peek
  useEffect(() => {
    (async () => {
      const u = await peekUsage("econ_action");
      setUsage({ remainingProduct: u.remainingProduct, remainingTotal: u.remainingTotal, allowed: u.allowed });
    })();
  }, []);

  // initial load
  useEffect(() => {
    if (!ent) return;
    guardUsage("econ_action", loadStateCensus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ent]);

  // overlays load when mode changes
  useEffect(() => {
    if (!ent) return;
    if (mapMode === "unemp_rate") guardUsage("econ_action", async () => loadOverlayMap("unemp_rate"));
    if (mapMode === "hpi") guardUsage("econ_action", async () => loadOverlayMap("hpi"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode, ent]);

  // map values
  const valueByFips = useMemo(() => {
    const out: Record<string, number | null> = {};

    if (mapMode === "census_metric") {
      for (const r of stateCensus?.rows ?? []) {
        const f = String(r.fips).padStart(2, "0");
        out[f] = METRIC_BY_KEY[metric](r) ?? null;
      }
      return out;
    }

    for (const r of overlayMap?.rows ?? []) {
      const f = String(r.fips).padStart(2, "0");
      out[f] = r.value ?? null;
    }
    return out;
  }, [mapMode, metric, stateCensus, overlayMap]);

  const pinnedRows = useMemo(() => {
    const by = new Map<string, CensusStateRow>();
    for (const r of stateCensus?.rows ?? []) by.set(String(r.fips).padStart(2, "0"), r);
    return pinned.map((f) => by.get(String(f).padStart(2, "0"))).filter(Boolean) as CensusStateRow[];
  }, [stateCensus, pinned]);

  const activeRow = useMemo(() => {
    const f = String(activeFips).padStart(2, "0");
    return (stateCensus?.rows ?? []).find((x) => String(x.fips).padStart(2, "0") === f) ?? null;
  }, [activeFips, stateCensus]);

  const activeOverlay = useMemo(() => {
    const f = String(activeFips).padStart(2, "0");
    return (overlayMap?.rows ?? []).find((x) => String(x.fips).padStart(2, "0") === f) ?? null;
  }, [activeFips, overlayMap]);

  // compare heatmap
  const compareMetrics: MetricKey[] = ["median_income", "poverty_rate", "bachelors_plus", "median_rent", "population"];
  const corrHeat = useMemo(() => {
    if (pinnedRows.length < 4) return null;

    const cols = compareMetrics.map((k) =>
      pinnedRows.map((r) => METRIC_BY_KEY[k](r)).map((v) => (v === null ? NaN : Number(v)))
    );

    const validIdx: number[] = [];
    for (let i = 0; i < pinnedRows.length; i++) {
      let ok = true;
      for (const c of cols) if (!Number.isFinite(c[i])) ok = false;
      if (ok) validIdx.push(i);
    }
    if (validIdx.length < 4) return null;

    const clean = cols.map((c) => validIdx.map((i) => c[i]));
    const labels = compareMetrics.map((k) => ({
      id: k,
      title: METRICS.find((m) => m.key === k)?.label ?? k,
    }));

    const matrix = labels.map((_, i) => labels.map((__, j) => corr(clean[i], clean[j])));
    return { labels, matrix, n: validIdx.length };
  }, [pinnedRows]);

  const usageLine = useMemo(() => {
    if (ent?.is_paid) return "Pro: unlimited";
    if (!usage) return "Free: loading credits…";
    return `Free: ${usage.remainingProduct} Econ credits left • ${usage.remainingTotal} sitewide left`;
  }, [ent, usage]);

  const mapTitle = useMemo(() => {
    if (mapMode === "census_metric") {
      const m = METRICS.find((x) => x.key === metric);
      return `US Map • ${m?.label ?? metric} (ACS)`;
    }
    return `US Map • ${mapMode === "unemp_rate" ? "Unemployment rate" : "House Price Index"} (FRED)`;
  }, [mapMode, metric]);

  return (
    <main className="mx-auto max-w-6xl p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Econ Lab</div>
          <div className="mt-1 text-sm text-zinc-600">
            Interactive map + comparison tools for fast, accurate, shareable macro research.
          </div>
          <div className="mt-2 text-xs text-zinc-500">{usageLine}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => guardUsage("econ_action", loadStateCensus)}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            disabled={!!busy}
          >
            {busy ? "Loading…" : "Refresh data"}
          </button>

          <Link
            href="/products/econ/brief"
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Research brief
          </Link>
        </div>
      </div>

      <PaywallBanner
        show={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        remainingProduct={usage?.remainingProduct ?? 0}
        remainingTotal={usage?.remainingTotal ?? 0}
        label="Free limit reached"
        message="This action uses an Econ credit. Subscribe for unlimited access."
      />

      {err ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Error</div>
          <div className="mt-1 text-red-800">{err}</div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["Overview", "Compare", "Counties", "Countries", "Brief"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === t ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "Overview" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-3">
            <MetricPicker
              mode={mapMode}
              onModeChange={setMapMode}
              metric={metric}
              onMetricChange={setMetric}
              overlay={overlay}
              onOverlayChange={(k) => {
                setOverlay(k);
                setMapMode(k);
              }}
              disabled={!!busy}
            />

            <UsChoropleth
  valueByFips={valueByFips}
  selectedFips={pinnedSet}
  onToggle={(fips: string) => togglePin(fips)}
  title={mapTitle}
  unitLabel={
    mapMode === "census_metric"
      ? METRICS.find((m) => m.key === metric)?.unit
      : overlayMap?.unit
  }
/>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {/* Drilldown */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">State drilldown</div>
                  <div className="mt-1 text-xs text-zinc-500">Click a state on the map to pin + inspect.</div>
                </div>
                <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800">
                  {FIPS_TO_ABBR[String(activeFips).padStart(2, "0")] ?? "—"}
                </div>
              </div>

              {!activeRow ? (
                <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                  Load data, then click a state.
                </div>
              ) : (
                <>
                  <div className="mt-4">
                    <div className="text-lg font-semibold text-zinc-900">{activeRow.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">FIPS {String(activeRow.fips).padStart(2, "0")}</div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-zinc-50 p-2">
                      <div className="text-zinc-500">Median income</div>
                      <div className="font-semibold text-zinc-900">{fmtMetric("usd", activeRow.medianIncome)}</div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 p-2">
                      <div className="text-zinc-500">Poverty</div>
                      <div className="font-semibold text-zinc-900">{fmtMetric("pct", activeRow.povertyRate)}</div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 p-2">
                      <div className="text-zinc-500">Bachelor’s+</div>
                      <div className="font-semibold text-zinc-900">{fmtMetric("pct", activeRow.bachelorsPlus)}</div>
                    </div>
                    <div className="rounded-xl bg-zinc-50 p-2">
                      <div className="text-zinc-500">Median rent</div>
                      <div className="font-semibold text-zinc-900">{fmtMetric("usd", activeRow.medianRent)}</div>
                    </div>
                  </div>

                  {(mapMode === "unemp_rate" || mapMode === "hpi") ? (
                    <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 text-xs">
                      <div className="font-semibold text-zinc-900">
                        Latest overlay: {mapMode === "unemp_rate" ? "Unemployment rate" : "House Price Index"}
                      </div>
                      <div className="mt-1 text-zinc-600">
                        {activeOverlay?.value == null ? (
                          <>No value available.</>
                        ) : (
                          <>
                            Value: <span className="font-semibold">{String(activeOverlay.value)}</span>{" "}
                            <span className="text-zinc-500">({activeOverlay.date ?? "—"})</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                    <div className="font-semibold text-zinc-900">Interpretation</div>
                    <div className="mt-1 leading-5">
                      Use income + rent to read affordability pressure, poverty as stress context, BA+ as human capital.
                      Overlays answer “what’s changing now?” and help you tell a clean story across regions.
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Pinned list */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold text-zinc-900">Pinned states</div>
              <div className="mt-1 text-xs text-zinc-500">Pin 5–15 states for best Compare results.</div>

              <div className="mt-4 space-y-3">
                {pinnedRows.length ? (
                  pinnedRows.map((r) => (
                    <div key={r.fips} className="rounded-xl border border-zinc-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-zinc-900">{r.name}</div>
                        <button
                          onClick={() => togglePin(String(r.fips).padStart(2, "0"))}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-zinc-50 p-2">
                          <div className="text-zinc-500">Income</div>
                          <div className="font-semibold text-zinc-900">{fmtMetric("usd", r.medianIncome)}</div>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-2">
                          <div className="text-zinc-500">Poverty</div>
                          <div className="font-semibold text-zinc-900">{fmtMetric("pct", r.povertyRate)}</div>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-2">
                          <div className="text-zinc-500">BA+</div>
                          <div className="font-semibold text-zinc-900">{fmtMetric("pct", r.bachelorsPlus)}</div>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-2">
                          <div className="text-zinc-500">Rent</div>
                          <div className="font-semibold text-zinc-900">{fmtMetric("usd", r.medianRent)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                    Click states on the map to pin them.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* COMPARE */}
      {tab === "Compare" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900">Compare pinned states</div>
                <div className="mt-1 text-xs text-zinc-500">Reactive to your pinned list from the map.</div>
              </div>

              <button
                onClick={() => {
                  const qs = new URLSearchParams();
                  qs.set("metric", metric);
                  qs.set("pinned", pinned.join(","));
                  qs.set("overlay", mapMode === "census_metric" ? "census" : mapMode);
                  const url = `/products/econ/brief?${qs.toString()}`;
                  navigator.clipboard?.writeText(`${window.location.origin}${url}`);
                }}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Copy share link
              </button>
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
                        <div className="text-xs text-zinc-500">
                          {FIPS_TO_ABBR[String(r.fips).padStart(2, "0")] ?? "—"} • FIPS{" "}
                          {String(r.fips).padStart(2, "0")}
                        </div>
                      </td>
                      {METRICS.map((m) => (
                        <td key={m.key} className="px-3 py-2 text-right font-semibold">
                          {fmtMetric(m.unit, METRIC_BY_KEY[m.key](r))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!pinnedRows.length ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-sm text-zinc-600">
                        Pin states on the map first (Overview tab).
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {corrHeat ? (
            <CorrelationHeatmap labels={corrHeat.labels} matrix={corrHeat.matrix} />
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
              Correlation heatmap needs at least <b>4 pinned states</b> with complete data.
            </div>
          )}
        </div>
      ) : null}

      {/* COUNTIES */}
      {tab === "Counties" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">County mode (ACS 5-year)</div>
              <div className="mt-1 text-xs text-zinc-500">Fast and reliable county-level tables.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={countyStateFips}
                onChange={(e) => setCountyStateFips(e.target.value)}
                className="h-10 w-24 rounded-xl border border-zinc-200 px-3 text-sm"
                placeholder="FIPS"
              />
              <button
                onClick={() => guardUsage("econ_action", loadCounties)}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                disabled={!!busy}
              >
                {busy ? "Loading…" : "Load counties"}
              </button>
            </div>
          </div>

          {counties ? (
            <div className="mt-4 overflow-auto rounded-2xl border border-zinc-200">
              <table className="min-w-[1000px] w-full text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
                  <tr>
                    <th className="px-3 py-2 text-left">County</th>
                    <th className="px-3 py-2 text-right">Population</th>
                    <th className="px-3 py-2 text-right">Median income</th>
                    <th className="px-3 py-2 text-right">Poverty rate</th>
                    <th className="px-3 py-2 text-right">Bachelor’s+ %</th>
                    <th className="px-3 py-2 text-right">Median rent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {counties.rows.slice(0, 200).map((r) => (
                    <tr key={r.fips} className="hover:bg-zinc-50">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-zinc-900">{r.name}</div>
                        <div className="text-xs text-zinc-500">FIPS {r.fips}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{r.population ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtMetric("usd", r.medianIncome)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtMetric("pct", r.povertyRate)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtMetric("pct", r.bachelorsPlus)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmtMetric("usd", r.medianRent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              Enter a state FIPS (e.g., <b>24</b> for Maryland) and click “Load counties”.
            </div>
          )}
        </div>
      ) : null}

      {/* COUNTRIES */}
      {tab === "Countries" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Country mode (World Bank)</div>
              <div className="mt-1 text-xs text-zinc-500">ISO3 codes (USA, CHN, IND, BRA, DEU…).</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                className="h-10 w-28 rounded-xl border border-zinc-200 px-3 text-sm"
                placeholder="USA"
              />
              <select
                value={wbIndicator}
                onChange={(e) => setWbIndicator(e.target.value)}
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="gdp_current_usd">GDP (current US$)</option>
                <option value="gdp_per_capita">GDP per capita</option>
                <option value="inflation_cpi">Inflation (CPI, %)</option>
                <option value="unemployment">Unemployment (%)</option>
                <option value="population">Population</option>
              </select>

              <button
                onClick={() => guardUsage("econ_action", loadWorldBank)}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                disabled={!!busy}
              >
                {busy ? "Loading…" : "Load series"}
              </button>
            </div>
          </div>

          {wb ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold text-zinc-900">{wb.label}</div>
              <div className="mt-1 text-xs text-zinc-500">
                {wb.country} • Unit: {wb.unitHint}
              </div>

              <div className="mt-3 overflow-auto rounded-xl border border-zinc-200">
                <table className="min-w-[700px] w-full text-sm">
                  <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Year</th>
                      <th className="px-3 py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {wb.points.slice(0, 40).map((p) => (
                      <tr key={p.date}>
                        <td className="px-3 py-2">{p.date}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {p.value === null ? "—" : String(p.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              Choose country + indicator and click “Load series”.
            </div>
          )}
        </div>
      ) : null}

      {/* BRIEF */}
      {tab === "Brief" ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Exportable research brief</div>
          <div className="mt-1 text-xs text-zinc-500">Generates a shareable URL for a clean report page.</div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const qs = new URLSearchParams();
                qs.set("metric", metric);
                qs.set("pinned", pinned.join(","));
                qs.set("overlay", mapMode === "census_metric" ? "census" : mapMode);
                const url = `/products/econ/brief?${qs.toString()}`;
                navigator.clipboard?.writeText(`${window.location.origin}${url}`);
              }}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Copy brief link
            </button>

            <Link
              href={`/products/econ/brief?metric=${encodeURIComponent(metric)}&pinned=${encodeURIComponent(
                pinned.join(",")
              )}&overlay=${encodeURIComponent(mapMode === "census_metric" ? "census" : mapMode)}`}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Open brief
            </Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}