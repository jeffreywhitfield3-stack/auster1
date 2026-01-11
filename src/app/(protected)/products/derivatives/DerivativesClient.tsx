"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PaywallBanner from "@/components/econ/PaywallBanner";
import Tip from "@/components/derivatives/Tip";
import { peekUsage, incrementUsage } from "@/lib/usage-client";

type EntMe = { is_paid: boolean; plan: string };

type Tab = "Overview" | "Iron Condor";

type Quote = { symbol: string; price: number | null; asOf?: string | null };

type ExpResp = { symbol: string; expirations: string[] };

type Condor = {
  putLong: number;
  putShort: number;
  callShort: number;
  callLong: number;
  credit: number;
  maxProfit: number;
  maxLoss: number;
  returnOnRisk: number;
  lowerBE: number;
  upperBE: number;
  pop: number | null;
};

type CondorResp = {
  symbol: string;
  expiration: string;
  underlying: number;
  asOf: string | null;
  condors: Condor[];
  notes?: string[];
};

async function apiGet<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

async function apiPost<T>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 250)}`);
  return JSON.parse(text) as T;
}

function fmtUSD(x: number | null | undefined, digits = 2) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: digits });
}
function fmtPct01(x: number | null | undefined, digits = 1) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}
function fmtNum(x: number | null | undefined, digits = 2) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function condorInsight(c: Condor) {
  const widthPut = c.putShort - c.putLong;
  const widthCall = c.callLong - c.callShort;
  const width = Math.max(widthPut, widthCall);
  const tight = width <= 3;
  const pop = c.pop ?? null;

  const bullets: string[] = [];
  bullets.push(tight ? "Tighter wings: higher credit, more likely to be tested." : "Wider wings: lower credit, tends to win more often.");

  if (pop !== null) {
    if (pop >= 0.75) bullets.push("Higher POP: good for income-style exposure, but check credit vs risk.");
    else if (pop >= 0.6) bullets.push("Mid POP: balance between income and risk. Watch catalysts/earnings.");
    else bullets.push("Lower POP: more aggressive—expect tests and potential adjustments.");
  } else {
    bullets.push("POP unavailable (missing IV/time). Treat as ranking-only and focus on structure + credit/max loss.");
  }

  bullets.push(`Breaks if spot < ${fmtNum(c.lowerBE, 2)} or > ${fmtNum(c.upperBE, 2)} at expiration.`);
  return bullets;
}

export default function DerivativesClient() {
  // ---- entitlements + usage ----
  const [ent, setEnt] = useState<EntMe | null>(null);
  const [usage, setUsage] = useState<{ remainingProduct: number; remainingTotal: number; allowed: boolean } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

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

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet<EntMe>("/api/entitlements/me");
        setEnt(r);
      } catch {
        setEnt({ is_paid: false, plan: "free" });
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const u = await peekUsage("derivatives_action");
      setUsage({ remainingProduct: u.remainingProduct, remainingTotal: u.remainingTotal, allowed: u.allowed });
    })();
  }, []);

  const usageLine = useMemo(() => {
    if (ent?.is_paid) return "Pro: unlimited";
    if (!usage) return "Free: loading credits…";
    return `Free: ${usage.remainingProduct} Derivatives credits left • ${usage.remainingTotal} sitewide left`;
  }, [ent, usage]);

  // ---- UI ----
  const [tab, setTab] = useState<Tab>("Overview");
  const [symbol, setSymbol] = useState("AAPL");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);

  const [expirations, setExpirations] = useState<string[]>([]);
  const [expiration, setExpiration] = useState<string>("");

  // Condor controls
  const [topN, setTopN] = useState(30);
  const [minOI, setMinOI] = useState(200);
  const [minVol, setMinVol] = useState(50);
  const [maxSpreadPct, setMaxSpreadPct] = useState(0.25);
  const [rankBy, setRankBy] = useState<"returnOnRisk" | "pop" | "credit">("returnOnRisk");

  // Results
  const [condors, setCondors] = useState<CondorResp | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Scenario sliders (client-side “what-if”)
  const [spotOverride, setSpotOverride] = useState<number | null>(null);

  const spot = useMemo(() => {
    const s = spotOverride;
    if (typeof s === "number" && Number.isFinite(s) && s > 0) return s;
    return quote?.price ?? condors?.underlying ?? null;
  }, [spotOverride, quote, condors]);

  async function loadQuoteAndExpirations() {
    setBusy("Loading…");
    setErr(null);
    try {
      const sym = symbol.trim().toUpperCase();
      const q = await apiGet<Quote>(`/api/derivatives/quote?symbol=${encodeURIComponent(sym)}`);
      setQuote(q);

      const ex = await apiGet<ExpResp>(`/api/derivatives/expirations?symbol=${encodeURIComponent(sym)}`);
      setExpirations(ex.expirations);

      // auto-pick first expiration if missing
      if (!expiration && ex.expirations.length) setExpiration(ex.expirations[0]);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setQuote(null);
      setExpirations([]);
    } finally {
      setBusy(null);
    }
  }

  async function runCondor() {
    setBusy("Screening…");
    setErr(null);
    try {
      const sym = symbol.trim().toUpperCase();
      if (!expiration) throw new Error("pick_expiration");

      const res = await apiPost<CondorResp>("/api/derivatives/iron-condor", {
        symbol: sym,
        expiration,
        topN,
        rankBy,
        filters: { minOpenInterest: minOI, minVolume: minVol, maxSpreadPct },
      });

      setCondors(res);
      setSelectedIdx(0);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setCondors(null);
    } finally {
      setBusy(null);
    }
  }

  // Auto-load on mount and when symbol changes (guarded usage)
  useEffect(() => {
    if (!ent) return;
    guardUsage("derivatives_action", loadQuoteAndExpirations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ent]);

  useEffect(() => {
    if (!ent) return;
    const t = setTimeout(() => {
      guardUsage("derivatives_action", loadQuoteAndExpirations);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const selected = condors?.condors?.[selectedIdx] ?? null;
  const insight = selected ? condorInsight(selected) : [];

  return (
    <main className="mx-auto max-w-6xl p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold text-zinc-900">Derivatives Lab</div>
          <div className="mt-1 text-sm text-zinc-600">
            Options tools brokerages don’t give you — clearer screening, clearer payoffs, easier decisions.
          </div>
          <div className="mt-2 text-xs text-zinc-500">{usageLine}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="h-10 w-36 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-zinc-400"
            placeholder="AAPL"
          />
          <button
            onClick={() => guardUsage("derivatives_action", loadQuoteAndExpirations)}
            disabled={!!busy}
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {busy ? "Loading…" : "Refresh"}
          </button>

          <div className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900">
            Spot: {fmtUSD(spot, 2)}
          </div>
        </div>
      </div>

      <PaywallBanner
        show={showPaywall}
        onDismiss={() => setShowPaywall(false)}
        remainingProduct={usage?.remainingProduct ?? 0}
        remainingTotal={usage?.remainingTotal ?? 0}
        label="Free limit reached"
        message="This action uses a credit. Subscribe for unlimited Derivatives access."
      />

      {err ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Error</div>
          <div className="mt-1 text-red-800">{err}</div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["Overview", "Iron Condor"] as Tab[]).map((t) => (
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
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-zinc-900">Expiration</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Click an expiration (Robinhood-style). No typing dates.
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTab("Iron Condor");
                  }}
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Go to Iron Condor
                </button>
              </div>

              <div className="mt-4 overflow-auto rounded-xl border border-zinc-200 bg-white p-2">
                <div className="flex gap-2">
                  {expirations.length ? (
                    expirations.slice(0, 16).map((d) => (
                      <button
                        key={d}
                        onClick={() => setExpiration(d)}
                        className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold ${
                          expiration === d ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-900 hover:bg-zinc-100"
                        }`}
                      >
                        {d}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-zinc-600">No expirations loaded (check Massive endpoints/env).</div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                <div className="font-semibold text-zinc-900">Natural workflow</div>
                <div className="mt-1">
                  Pick an expiration → run the screener → click a candidate → read “So what?” → export to CSV.
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-base font-semibold text-zinc-900">Scenario</div>
              <div className="mt-1 text-sm text-zinc-600">Quick what-if before screening.</div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-zinc-700">Spot override</div>
                <input
                  type="number"
                  value={spotOverride ?? ""}
                  onChange={(e) => setSpotOverride(e.target.value === "" ? null : Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                  placeholder={quote?.price ? String(quote.price) : "Spot"}
                />
                <div className="mt-2 text-xs text-zinc-500">
                  Leave blank to use live spot.
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => guardUsage("derivatives_action", runCondor)}
                  disabled={!!busy || !expiration}
                  className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {busy ? "Running…" : "Run Iron Condor"}
                </button>
              </div>

              <div className="mt-4 text-xs text-zinc-500">
                Your free credits apply to refresh/screen actions (data-heavy).
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* IRON CONDOR */}
      {tab === "Iron Condor" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-zinc-900">Iron Condor Screener</div>
                <div className="mt-1 text-sm text-zinc-600">
                  Liquidity filters + ranked condors + “so what?” interpretation.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900">
                  Exp: {expiration || "—"}
                </div>
                <button
                  onClick={() => guardUsage("derivatives_action", runCondor)}
                  disabled={!!busy || !expiration}
                  className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {busy ? "Running…" : "Run"}
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-4 grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <div className="text-xs font-semibold text-zinc-700">Top N</div>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>

              <div className="lg:col-span-3">
                <div className="text-xs font-semibold text-zinc-700">
                  <Tip label="Min OI">
                    Open interest filter. Higher OI generally means better liquidity and tighter fills.
                  </Tip>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={minOI}
                  onChange={(e) => setMinOI(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>

              <div className="lg:col-span-3">
                <div className="text-xs font-semibold text-zinc-700">
                  <Tip label="Min volume">
                    Same-day trading volume filter. Helps avoid stale quotes (but can exclude newer expirations).
                  </Tip>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={minVol}
                  onChange={(e) => setMinVol(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>

              <div className="lg:col-span-3">
                <div className="text-xs font-semibold text-zinc-700">
                  <Tip label="Max spread %">
                    Bid/ask spread as % of mid-price. Lower is more “fillable”. 0.25 = 25%.
                  </Tip>
                </div>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={1}
                  value={maxSpreadPct}
                  onChange={(e) => setMaxSpreadPct(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>

              <div className="lg:col-span-4">
                <div className="text-xs font-semibold text-zinc-700">Rank by</div>
                <select
                  value={rankBy}
                  onChange={(e) => setRankBy(e.target.value as any)}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="returnOnRisk">Return on risk</option>
                  <option value="pop">POP (probability of profit)</option>
                  <option value="credit">Net credit</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results + Details */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white">
                <table className="min-w-[1050px] w-full text-sm">
                  <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Structure</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">Max loss</th>
                      <th className="px-3 py-2 text-right">RoR</th>
                      <th className="px-3 py-2 text-right">Lower BE</th>
                      <th className="px-3 py-2 text-right">Upper BE</th>
                      <th className="px-3 py-2 text-right">POP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(condors?.condors ?? []).map((c, i) => (
                      <tr
                        key={i}
                        className={`cursor-pointer hover:bg-zinc-50 ${i === selectedIdx ? "bg-zinc-50" : ""}`}
                        onClick={() => setSelectedIdx(i)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-semibold text-zinc-900">
                            P: {c.putLong}/{c.putShort} • C: {c.callShort}/{c.callLong}
                          </div>
                          <div className="text-xs text-zinc-500">{symbol} • {expiration}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtUSD(c.credit, 2)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtUSD(c.maxLoss, 2)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{fmtPct01(c.returnOnRisk, 1)}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(c.lowerBE, 2)}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(c.upperBE, 2)}</td>
                        <td className="px-3 py-2 text-right">{c.pop === null ? "—" : fmtPct01(c.pop, 1)}</td>
                      </tr>
                    ))}
                    {!condors?.condors?.length ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-600">
                          Run the screener to see ranked condors.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {condors?.notes?.length ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Notes</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                    {condors.notes.map((n, idx) => (
                      <li key={idx}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="text-base font-semibold text-zinc-900">So what?</div>
                <div className="mt-1 text-sm text-zinc-600">
                  Click a row on the left. This explains it in human terms.
                </div>

                {selected ? (
                  <>
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-sm font-semibold text-zinc-900">
                        P {selected.putLong}/{selected.putShort} • C {selected.callShort}/{selected.callLong}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-zinc-500">Credit</div>
                          <div className="font-semibold text-zinc-900">{fmtUSD(selected.credit, 2)}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-zinc-500">Max loss</div>
                          <div className="font-semibold text-zinc-900">{fmtUSD(selected.maxLoss, 2)}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-zinc-500">Lower BE</div>
                          <div className="font-semibold text-zinc-900">{fmtNum(selected.lowerBE, 2)}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-zinc-500">Upper BE</div>
                          <div className="font-semibold text-zinc-900">{fmtNum(selected.upperBE, 2)}</div>
                        </div>
                      </div>
                    </div>

                    <ul className="mt-4 list-disc pl-5 text-sm text-zinc-700">
                      {insight.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      <div className="text-xs font-semibold text-zinc-700">Spot (what-if)</div>
                      <input
                        type="range"
                        min={Math.max(1, (spot ?? 100) * 0.7)}
                        max={(spot ?? 100) * 1.3}
                        step={0.5}
                        value={spot ?? 100}
                        onChange={(e) => setSpotOverride(Number(e.target.value))}
                        className="mt-2 w-full"
                      />
                      <div className="mt-1 text-xs text-zinc-500">
                        Spot: <b>{fmtUSD(spot, 2)}</b> • Breakevens: {fmtNum(selected.lowerBE, 2)} – {fmtNum(selected.upperBE, 2)}
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={async () => {
                          const r = await fetch(`/api/derivatives/iron-condor?download=csv`, {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              symbol: symbol.trim().toUpperCase(),
                              expiration,
                              topN,
                              rankBy,
                              filters: { minOpenInterest: minOI, minVolume: minVol, maxSpreadPct },
                            }),
                          });
                          const blob = await r.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${symbol.trim().toUpperCase()}_${expiration}_iron_condors.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                      >
                        Export CSV
                      </button>

                      <Link
                        href="/pricing"
                        className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-800"
                      >
                        Upgrade
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                    No selection yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
