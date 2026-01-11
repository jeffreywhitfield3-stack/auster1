"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, Button, Badge } from "@/components/ui";
import { incrementUsage, peekUsage } from "@/lib/usage-client";

type ScreenerRow = {
  id: string;
  name: string;
  score: number;

  unemploymentRate?: number;
  unemploymentYoY_pp?: number;
  hpiYoY_pct?: number;
  fmr2br?: number;
  incomeMedian?: number;
  affordabilityIndex?: number;
  rentToIncome_pct?: number;
  rentToPriceProxy?: number;

  updatedAtISO: string;
  notes?: string[];
};

type ScreenerResponse = {
  level: "state";
  rows: ScreenerRow[];
  asOfISO: string;
  cachedHours: number;
};

function fmtPct(x?: number, digits = 1) {
  if (x === undefined || x === null || !Number.isFinite(x)) return "—";
  return `${x.toFixed(digits)}%`;
}
function fmtUSD(x?: number, digits = 0) {
  if (x === undefined || x === null || !Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  });
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function Tip({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50"
        onClick={() => setOpen((v) => !v)}
        aria-label="What is this?"
      >
        ?
      </button>
      {open ? (
        <span
          className="absolute left-0 top-7 z-50 w-[320px] rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700 shadow-lg"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="leading-relaxed">{children}</div>
            <button
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </span>
      ) : null}
    </span>
  );
}

const USAGE_KEY_HOUSING_RUN = "housing_run";

export default function HousingClient() {
  const sp = useSearchParams();

  const [level] = useState<"state">("state");
  const [top, setTop] = useState<number>(() => Number(sp.get("top") || "25"));
  const [sort, setSort] = useState<"score" | "affordability" | "rentToIncome" | "hpiYoY" | "unemployment">(
    () => (sp.get("sort") as any) || "score"
  );

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ScreenerResponse | null>(null);

  // paywall
  const [showPaywall, setShowPaywall] = useState(false);
  const [usageNote, setUsageNote] = useState<string>("");

  const rows = data?.rows ?? [];

  const sorted = useMemo(() => {
    const copy = [...rows];

    const by = {
      score: (r: ScreenerRow) => r.score,
      affordability: (r: ScreenerRow) => r.affordabilityIndex ?? -999,
      rentToIncome: (r: ScreenerRow) => -(r.rentToIncome_pct ?? 999),
      hpiYoY: (r: ScreenerRow) => r.hpiYoY_pct ?? -999,
      unemployment: (r: ScreenerRow) => -(r.unemploymentRate ?? 999),
    }[sort];

    copy.sort((a, b) => (by(b) ?? 0) - (by(a) ?? 0));
    return copy.slice(0, clamp(top, 5, 100));
  }, [rows, sort, top]);

  async function fetchScreener(opts?: { countUsage?: boolean }) {
    const countUsage = Boolean(opts?.countUsage);

    if (countUsage) {
      const u = await peekUsage(USAGE_KEY_HOUSING_RUN);
      if (!u.allowed) {
        setUsageNote(
          `Free limit reached. Remaining: ${u.remainingProduct} housing runs • ${u.remainingTotal} total uses.`
        );
        setShowPaywall(true);
        return;
      }
    }

    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(
        `/api/housing/market/screener?level=${level}&top=${encodeURIComponent(String(top))}&sort=${encodeURIComponent(
          sort
        )}`,
        { cache: "no-store" }
      );
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || `request_failed_${r.status}`);
      setData(j);

      if (countUsage) {
        await incrementUsage(USAGE_KEY_HOUSING_RUN);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Initial load (does NOT count usage)
  useEffect(() => {
    fetchScreener({ countUsage: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRunScreenerClick() {
    setShowPaywall(false);
    setUsageNote("");
    await fetchScreener({ countUsage: true });
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-2">
        <div className="text-2xl font-semibold text-zinc-900">Housing Market Screener</div>
        <div className="text-sm text-zinc-600">
          Ranks markets using free, cached macro indicators (rent proxy, income, unemployment trend, and home price
          trends).
        </div>
      </div>

      {/* ✅ Paywall banner goes right here */}
      {showPaywall ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Free limit reached</div>
          <div className="mt-1 text-amber-800">
            You’ve used all free Housing screener runs. Subscribe for unlimited access.
            {usageNote ? <div className="mt-2 text-xs text-amber-800">{usageNote}</div> : null}
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

      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-700">Top N</span>
              <input
                value={top}
                onChange={(e) => setTop(Number(e.target.value || "25"))}
                className="h-10 rounded-xl border border-zinc-200 px-3 text-sm"
                type="number"
                min={5}
                max={100}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-700">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="h-10 rounded-xl border border-zinc-200 px-3 text-sm"
              >
                <option value="score">Overall score</option>
                <option value="affordability">Affordability</option>
                <option value="rentToIncome">Lower rent burden</option>
                <option value="hpiYoY">Home price momentum (YoY)</option>
                <option value="unemployment">Lower unemployment</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={onRunScreenerClick} disabled={loading}>
              {loading ? "Loading…" : "Run screener"}
            </Button>
            {data ? (
              <Badge>
                Cached ~{data.cachedHours}h • as of {new Date(data.asOfISO).toLocaleString()}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-xs text-zinc-600 md:grid-cols-3">
          <Tip label={<span className="font-semibold text-zinc-800">Score</span>}>
            A synthetic ranker combining affordability, rent burden, unemployment trend, and price momentum. Use it as a
            shortlist generator — not investment advice.
          </Tip>

          <Tip label={<span className="font-semibold text-zinc-800">Rent-to-income</span>}>
            Estimated rent burden using FMR (2BR) as a rent proxy divided by median household income (ACS). Lower is
            generally better for tenant affordability and stability.
          </Tip>

          <Tip label={<span className="font-semibold text-zinc-800">HPI YoY</span>}>
            Year-over-year % change in the All-Transactions House Price Index (FHFA via FRED). Higher = hotter pricing;
            can mean momentum, but also worsened entry affordability.
          </Tip>
        </div>
      </Card>

      {err ? (
        <Card className="mb-6 border-red-200 bg-red-50 p-4">
          <div className="text-sm font-semibold text-red-900">Error</div>
          <div className="mt-1 text-sm text-red-800">{err}</div>
          <div className="mt-2 text-xs text-red-700">
            Check env vars on Vercel: <code>FRED_API_KEY</code>, <code>HUD_USER_TOKEN</code>, (optional){" "}
            <code>CENSUS_API_KEY</code>.
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Ranked markets</div>
          <div className="text-xs text-zinc-500">Market-level screener (not listing-level data).</div>
        </div>

        <div className="overflow-auto rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">Market</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-right">
                  <Tip label="Unemp">Current unemployment rate (state series via FRED). Lower is generally better.</Tip>
                </th>
                <th className="px-3 py-2 text-right">
                  <Tip label="Unemp YoY">
                    Change vs one year ago (percentage points). Negative = improving labor market.
                  </Tip>
                </th>
                <th className="px-3 py-2 text-right">
                  <Tip label="HPI YoY">YoY % change in FHFA HPI (via FRED). Higher = faster price growth.</Tip>
                </th>
                <th className="px-3 py-2 text-right">
                  <Tip label="FMR (2BR)">HUD Fair Market Rent for a 2-bedroom unit, used as a rent proxy.</Tip>
                </th>
                <th className="px-3 py-2 text-right">
                  <Tip label="Median income">ACS median household income used to approximate rent burden.</Tip>
                </th>
                <th className="px-3 py-2 text-right">
                  <Tip label="Rent/Income">Rent burden proxy: (FMR*12) / median income. Lower is better.</Tip>
                </th>
                <th className="px-3 py-2 text-left">Why it ranked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {sorted.map((r, idx) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-zinc-900">
                      #{idx + 1} {r.name} <span className="text-xs font-normal text-zinc-500">({r.id})</span>
                    </div>
                    <div className="text-xs text-zinc-500">Updated {new Date(r.updatedAtISO).toLocaleString()}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{r.score.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(r.unemploymentRate, 1)}</td>
                  <td className="px-3 py-2 text-right">
                    {r.unemploymentYoY_pp === undefined ? "—" : `${r.unemploymentYoY_pp > 0 ? "+" : ""}${r.unemploymentYoY_pp.toFixed(1)}pp`}
                  </td>
                  <td className="px-3 py-2 text-right">{fmtPct(r.hpiYoY_pct, 1)}</td>
                  <td className="px-3 py-2 text-right">{fmtUSD(r.fmr2br, 0)}</td>
                  <td className="px-3 py-2 text-right">{fmtUSD(r.incomeMedian, 0)}</td>
                  <td className="px-3 py-2 text-right">{fmtPct(r.rentToIncome_pct, 1)}</td>
                  <td className="px-3 py-2 text-xs text-zinc-700">
                    {(r.notes ?? []).slice(0, 3).map((n, i) => (
                      <div key={i}>• {n}</div>
                    ))}
                  </td>
                </tr>
              ))}

              {!loading && !sorted.length ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-zinc-600" colSpan={9}>
                    No results. Try “Run screener”.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          Note: This is a <b>market</b> screener. Listing-level deal ranking generally requires paid property datasets.
        </div>
      </Card>
    </main>
  );
}