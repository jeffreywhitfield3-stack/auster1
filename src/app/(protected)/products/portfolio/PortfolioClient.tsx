"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Tip } from "@/components/Tip";
import { useEntitlement } from "@/hooks/useEntitlement";
import { incrementUsage, peekUsage } from "@/lib/usage-client";
import { Badge, Button, Card, Container } from "@/components/ui";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

/** =========================
 * Types + helpers
 * ========================= */

type AssetRow = {
  id: string;
  ticker: string;
  weight: number;
};

type ParsedSeries = {
  dates: string[];
  series: Record<string, number[]>;
};

function uid() {
  return Math.random().toString(16).slice(2);
}

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}

function mean(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function cov(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (x[i] - mx) * (y[i] - my);
  return s / (n - 1);
}

function corr(x: number[], y: number[]) {
  const sx = stdev(x);
  const sy = stdev(y);
  if (sx === 0 || sy === 0) return 0;
  return cov(x, y) / (sx * sy);
}

function parseCsvPrices(text: string): ParsedSeries {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { dates: [], series: {} };

  const headers = lines[0].split(",").map((h) => h.trim());
  const tickers = headers.slice(1);

  const dates: string[] = [];
  const series: Record<string, number[]> = {};
  tickers.forEach((t) => (series[t.toUpperCase()] = []));

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    if (parts.length < 2) continue;
    const d = parts[0];
    dates.push(d);

    for (let j = 0; j < tickers.length; j++) {
      const key = tickers[j].toUpperCase();
      const v = Number(parts[j + 1]);
      series[key].push(Number.isFinite(v) ? v : NaN);
    }
  }

  return { dates, series };
}

function toReturns(prices: number[]) {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const p0 = prices[i - 1];
    const p1 = prices[i];
    if (!Number.isFinite(p0) || !Number.isFinite(p1) || p0 <= 0 || p1 <= 0) {
      r.push(0);
    } else {
      r.push(Math.log(p1 / p0));
    }
  }
  return r;
}

function normalizeWeights(rows: AssetRow[]) {
  const s = rows.reduce((a, r) => a + Math.max(0, r.weight), 0);
  if (s <= 0) return rows.map((r) => ({ ...r, weight: 0 }));
  return rows.map((r) => ({ ...r, weight: Math.max(0, r.weight) / s }));
}

function dot(w: number[], x: number[]) {
  const n = Math.min(w.length, x.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += w[i] * x[i];
  return s;
}

function quantile(xs: number[], q: number) {
  if (xs.length === 0) return 0;
  const a = [...xs].sort((m, n) => m - n);
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return a[lo];
  const w = pos - lo;
  return a[lo] * (1 - w) + a[hi] * w;
}

/** =========================
 * Inner component (your full UI)
 * ========================= */

function PortfolioInner({ initialSym }: { initialSym: string }) {
  const { isPaid } = useEntitlement();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [busy, setBusy] = useState(false);

  const [assets, setAssets] = useState<AssetRow[]>([
    { id: uid(), ticker: initialSym || "AAPL", weight: 0.5 },
    { id: uid(), ticker: "MSFT", weight: 0.5 },
  ]);

  const [csv, setCsv] = useState(
    "Date,AAPL,MSFT\n2025-01-01,100,200\n2025-01-02,102,201\n2025-01-03,101,205\n2025-01-04,104,204\n2025-01-05,106,208"
  );

  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    peekUsage("portfolio_run").then((u) => {
      if (alive) setUsage(u);
    });
    return () => {
      alive = false;
    };
  }, []);

  const parsed = useMemo(() => parseCsvPrices(csv), [csv]);

  const tickers = useMemo(() => {
    const fromAssets = assets.map((a) => a.ticker.trim()).filter(Boolean);
    const fromCsv = Object.keys(parsed.series || {});
    const set = new Set([...fromAssets, ...fromCsv].map((t) => t.toUpperCase()));
    return [...set].filter(Boolean);
  }, [assets, parsed.series]);

  const weights = useMemo(() => {
    const normalized = normalizeWeights(assets);
    const map: Record<string, number> = {};
    normalized.forEach((a) => {
      const t = a.ticker.trim().toUpperCase();
      if (!t) return;
      map[t] = (map[t] ?? 0) + a.weight;
    });
    return map;
  }, [assets]);

  const returns = useMemo(() => {
    const out: Record<string, number[]> = {};
    tickers.forEach((t) => {
      const prices = parsed.series?.[t] as number[] | undefined;
      if (!prices || prices.length < 2) out[t] = [];
      else out[t] = toReturns(prices);
    });
    return out;
  }, [tickers, parsed.series]);

  const alignedLen = useMemo(() => {
    const lens = tickers.map((t) => returns[t]?.length ?? 0).filter((n) => n > 0);
    if (lens.length === 0) return 0;
    return Math.min(...lens);
  }, [tickers, returns]);

  const portfolioSeries = useMemo(() => {
    if (alignedLen === 0) return [];
    const wVec = tickers.map((t) => weights[t] ?? 0);
    const points: { k: string; r: number; nav: number }[] = [];
    let nav = 1;
    for (let i = 0; i < alignedLen; i++) {
      const rVec = tickers.map((t) => returns[t]?.[i] ?? 0);
      const r = dot(wVec, rVec);
      nav *= Math.exp(r);
      const date = parsed.dates[i + 1] ?? `T${i + 1}`;
      points.push({ k: date, r, nav });
    }
    return points;
  }, [alignedLen, tickers, weights, returns, parsed.dates]);

  const stats = useMemo(() => {
    if (portfolioSeries.length === 0) {
      return { mu: 0, sigma: 0, sharpe: 0, var95: 0, cvar95: 0, maxdd: 0 };
    }
    const rs = portfolioSeries.map((p) => p.r);
    const mu = mean(rs);
    const sigma = stdev(rs);
    const rf = 0;
    const sharpe = sigma === 0 ? 0 : (mu - rf) / sigma;
    const q05 = quantile(rs, 0.05);
    const var95 = -q05;
    const tail = rs.filter((x) => x <= q05);
    const cvar95 = tail.length === 0 ? 0 : -mean(tail);

    let peak = -Infinity;
    let maxdd = 0;
    for (const p of portfolioSeries) {
      if (p.nav > peak) peak = p.nav;
      const dd = peak === 0 ? 0 : (peak - p.nav) / peak;
      if (dd > maxdd) maxdd = dd;
    }

    return { mu, sigma, sharpe, var95, cvar95, maxdd };
  }, [portfolioSeries]);

  async function runPortfolio() {
    setBusy(true);
    try {
      if (!isPaid) {
        const u = await peekUsage("portfolio_run");
        if (!u?.allowed) {
          setShowUpgrade(true);
          return;
        }
        await incrementUsage("portfolio_run");
        // refresh usage display after increment
        const refreshed = await peekUsage("portfolio_run");
        setUsage(refreshed);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pb-20 pt-10">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge>Risk</Badge>
              <div className="text-sm text-slate-600">Portfolio analytics</div>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Portfolio &amp; Risk Lab
            </h1>
            <div className="mt-1 text-sm text-slate-600">
              Build a portfolio, compute volatility, VaR, drawdowns, and correlations.
            </div>
          </div>

          <Card className="p-3">
            <div className="text-xs text-slate-600">Free usage</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {isPaid
                ? "Unlimited"
                : `${usage?.remainingProduct ?? "—"} left here, ${usage?.remainingTotal ?? "—"} left sitewide`}
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Portfolio</div>
                <Tip text="Weights are normalized to sum to 1. Use CSV below to compute returns and risk." />
              </div>

              <div className="mt-4 grid gap-3">
                {assets.map((a) => (
                  <div key={a.id} className="grid grid-cols-5 gap-2">
                    <input
                      className="col-span-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={a.ticker}
                      onChange={(e) =>
                        setAssets((prev) =>
                          prev.map((x) => (x.id === a.id ? { ...x, ticker: e.target.value } : x))
                        )
                      }
                      placeholder="Ticker"
                    />
                    <input
                      className="col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      type="number"
                      step="0.01"
                      value={a.weight}
                      onChange={(e) =>
                        setAssets((prev) =>
                          prev.map((x) =>
                            x.id === a.id ? { ...x, weight: Number(e.target.value) } : x
                          )
                        )
                      }
                      placeholder="Weight"
                    />
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setAssets((p) => [...p, { id: uid(), ticker: "", weight: 0 }])}>
                    Add asset
                  </Button>
                  <Button variant="secondary" onClick={() => setAssets((p) => (p.length <= 1 ? p : p.slice(0, p.length - 1)))}>
                    Remove
                  </Button>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                    <span>Prices CSV</span>
                    <Tip text="Format: Date,TICKER1,TICKER2... with prices. Used to compute log returns and risk." />
                  </div>
                  <textarea
                    className="mt-2 h-48 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                  />
                </div>

                <div className="mt-1 flex gap-3">
                  <Button variant="primary" onClick={runPortfolio} disabled={busy}>
                    {busy ? "Running…" : "Run risk"}
                  </Button>
                  <Button variant="secondary" href="/pricing">
                    Pricing
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-6">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Risk summary</div>
                    <div className="mt-1 text-sm text-slate-600">Based on the CSV window</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Mean return</span>
                        <Tip text="Average log return per period in the CSV." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{fmt(stats.mu * 100, 2)}%</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Volatility</span>
                        <Tip text="Standard deviation of returns. Higher volatility means higher uncertainty." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{fmt(stats.sigma * 100, 2)}%</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Sharpe</span>
                        <Tip text="Return per unit of risk (risk-free assumed 0 for now)." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{fmt(stats.sharpe, 2)}</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>VaR 95%</span>
                        <Tip text="Estimated loss threshold exceeded ~5% of the time (historical quantile)." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{fmt(stats.var95 * 100, 2)}%</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>CVaR 95%</span>
                        <Tip text="Average loss in the worst ~5% tail." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{fmt(stats.cvar95 * 100, 2)}%</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Max drawdown</span>
                        <Tip text="Largest peak-to-trough decline in portfolio value over the window." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{fmt(stats.maxdd * 100, 2)}%</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-64 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-700">Portfolio NAV</div>
                  <div className="mt-2 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={portfolioSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="k" />
                        <YAxis />
                        <RTooltip formatter={(v) => fmt(Number(v), 4)} />
                        <Line type="monotone" dataKey="nav" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Correlation matrix</div>
                    <div className="mt-1 text-sm text-slate-600">Computed from CSV log returns</div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-800">
                          {" "}
                        </th>
                        {tickers.map((t) => (
                          <th
                            key={t}
                            className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-800"
                          >
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tickers.map((a) => (
                        <tr key={a}>
                          <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-800">{a}</td>
                          {tickers.map((b) => {
                            const v =
                              a === b
                                ? 1
                                : corr((returns[a] ?? []).slice(0, alignedLen), (returns[b] ?? []).slice(0, alignedLen));
                            return (
                              <td key={`${a}-${b}`} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                                {fmt(v, 2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>

        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </Container>
    </main>
  );
}

/** =========================
 * Exported client component
 * ========================= */

export default function PortfolioClient() {
  const sp = useSearchParams();
  const initialSym = useMemo(() => (sp.get("symbol") || "AAPL").toUpperCase(), [sp]);

  return (
      <PortfolioInner initialSym={initialSym} />
  );
}