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

type UsagePeek = {
  allowed: boolean;
  remainingProduct?: number;
  remainingTotal?: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function nfmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}
function money(n: number, d = 0) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${nfmt(n / 1e12, 2)}T`;
  if (abs >= 1e9) return `$${nfmt(n / 1e9, 2)}B`;
  if (abs >= 1e6) return `$${nfmt(n / 1e6, 2)}M`;
  if (abs >= 1e3) return `$${nfmt(n / 1e3, 2)}K`;
  return `$${nfmt(n, d)}`;
}
function pct(n: number, d = 2) {
  if (!Number.isFinite(n)) return "—";
  return `${nfmt(n * 100, d)}%`;
}
function parseNum(s: string) {
  const x = Number(String(s).replace(/[$,%\s]/g, ""));
  return Number.isFinite(x) ? x : NaN;
}

function pv(cf: number, r: number, t: number) {
  return cf / Math.pow(1 + r, t);
}

function buildFCFSeries({
  baseRevenue,
  years,
  revGrowth,
  ebitMargin,
  taxRate,
  salesToCapital,
  wcPctOfRev,
}: {
  baseRevenue: number;
  years: number;
  revGrowth: number[];
  ebitMargin: number;
  taxRate: number;
  salesToCapital: number;
  wcPctOfRev: number;
}) {
  const rows: Array<{
    year: number;
    revenue: number;
    ebit: number;
    nopat: number;
    reinvestment: number;
    fcf: number;
  }> = [];

  let rev = baseRevenue;
  let priorRev = baseRevenue;

  for (let i = 1; i <= years; i++) {
    const g = revGrowth[i - 1] ?? revGrowth[revGrowth.length - 1] ?? 0;
    rev = rev * (1 + g);

    const ebit = rev * ebitMargin;
    const nopat = ebit * (1 - taxRate);

    // Simple reinvestment model:
    // ΔRevenue / (Sales-to-Capital) + ΔWorkingCapital
    const deltaRev = rev - priorRev;
    const reinvestment = (salesToCapital > 0 ? deltaRev / salesToCapital : 0) + deltaRev * wcPctOfRev;

    const fcf = nopat - reinvestment;

    rows.push({ year: i, revenue: rev, ebit, nopat, reinvestment, fcf });
    priorRev = rev;
  }

  return rows;
}

function dcfValue({
  fcfRows,
  wacc,
  terminalGrowth,
}: {
  fcfRows: ReturnType<typeof buildFCFSeries>;
  wacc: number;
  terminalGrowth: number;
}) {
  const n = fcfRows.length;
  if (n === 0) return { pvFCF: 0, pvTV: 0, ev: 0, tv: 0 };

  const pvFCF = fcfRows.reduce((s, r) => s + pv(r.fcf, wacc, r.year), 0);

  const lastFCF = fcfRows[n - 1].fcf;
  const g = terminalGrowth;

  // Gordon growth terminal value at end of year n
  // TV_n = FCF_{n+1} / (WACC - g)
  const fcfNext = lastFCF * (1 + g);
  const denom = wacc - g;
  const tv = denom > 0 ? fcfNext / denom : NaN;

  const pvTV = Number.isFinite(tv) ? pv(tv, wacc, n) : NaN;
  const ev = pvFCF + (Number.isFinite(pvTV) ? pvTV : 0);

  return { pvFCF, pvTV, ev, tv };
}

function impliedPrice({
  enterpriseValue,
  cash,
  debt,
  shares,
}: {
  enterpriseValue: number;
  cash: number;
  debt: number;
  shares: number;
}) {
  const equity = enterpriseValue + cash - debt;
  const px = shares > 0 ? equity / shares : NaN;
  return { equity, px };
}

function waccFromParts({
  rf,
  beta,
  mrp,
  preTaxCostDebt,
  taxRate,
  debtWeight,
}: {
  rf: number;
  beta: number;
  mrp: number;
  preTaxCostDebt: number;
  taxRate: number;
  debtWeight: number;
}) {
  const we = clamp(1 - debtWeight, 0, 1);
  const wd = clamp(debtWeight, 0, 1);
  const costEquity = rf + beta * mrp;
  const afterTaxDebt = preTaxCostDebt * (1 - taxRate);
  const wacc = we * costEquity + wd * afterTaxDebt;
  return { wacc, costEquity, afterTaxDebt };
}

function sensitivityGrid({
  fcfRows,
  cash,
  debt,
  shares,
  waccCenter,
  gCenter,
}: {
  fcfRows: ReturnType<typeof buildFCFSeries>;
  cash: number;
  debt: number;
  shares: number;
  waccCenter: number;
  gCenter: number;
}) {
  // 5x5 around center
  const waccs = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => clamp(waccCenter + d, 0.01, 0.5));
  const gs = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => clamp(gCenter + d, -0.05, 0.10));

  const rows = gs.map((g) => {
    const cols = waccs.map((w) => {
      const { ev } = dcfValue({ fcfRows, wacc: w, terminalGrowth: g });
      const { px } = impliedPrice({ enterpriseValue: ev, cash, debt, shares });
      return px;
    });
    return { g, cols };
  });

  return { waccs, gs, rows };
}

function buildChartSeries({
  fcfRows,
  wacc,
  terminalGrowth,
}: {
  fcfRows: ReturnType<typeof buildFCFSeries>;
  wacc: number;
  terminalGrowth: number;
}) {
  // chart PV of each year + cumulative
  let cum = 0;
  return fcfRows.map((r) => {
    const pvYear = pv(r.fcf, wacc, r.year);
    cum += pvYear;
    return {
      year: `Y${r.year}`,
      fcf: r.fcf,
      pv: pvYear,
      cum,
      revenue: r.revenue,
      nopat: r.nopat,
    };
  });
}

function ValuationInner() {
  const sp = useSearchParams();
  const { isPaid } = useEntitlement();

  const initialSymbol = useMemo(() => (sp.get("symbol") || "AAPL").toUpperCase(), [sp]);

  // Usage / gating
  const [usage, setUsage] = useState<UsagePeek | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    peekUsage("valuation_run").then((u: any) => {
      if (alive) setUsage(u);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Inputs
  const [symbol, setSymbol] = useState(initialSymbol);

  // Basic DCF assumptions
  const [baseRevenue, setBaseRevenue] = useState("300000"); // $M
  const [years, setYears] = useState(5);

  const [growth1, setGrowth1] = useState("0.08");
  const [growth2, setGrowth2] = useState("0.07");
  const [growth3, setGrowth3] = useState("0.06");
  const [growth4, setGrowth4] = useState("0.05");
  const [growth5, setGrowth5] = useState("0.04");

  const [ebitMargin, setEbitMargin] = useState("0.28");
  const [taxRate, setTaxRate] = useState("0.21");
  const [salesToCapital, setSalesToCapital] = useState("2.5");
  const [wcPctOfRev, setWcPctOfRev] = useState("0.02");

  // Capital structure / WACC
  const [rf, setRf] = useState("0.04");
  const [beta, setBeta] = useState("1.15");
  const [mrp, setMrp] = useState("0.05");
  const [preTaxDebt, setPreTaxDebt] = useState("0.055");
  const [debtWeight, setDebtWeight] = useState("0.15");

  // Terminal & equity bridge
  const [terminalGrowth, setTerminalGrowth] = useState("0.025");
  const [cash, setCash] = useState("60000"); // $M
  const [debt, setDebt] = useState("120000"); // $M
  const [shares, setShares] = useState("15500"); // millions of shares

  // Multiples snapshot (user-provided)
  const [marketCap, setMarketCap] = useState("2800000"); // $M
  const [ebitda, setEbitda] = useState("140000"); // $M
  const [netIncome, setNetIncome] = useState("100000"); // $M

  // Derived numeric inputs
  const inputs = useMemo(() => {
    const rev = parseNum(baseRevenue);
    const yrs = clamp(Number(years), 1, 10);
    const gs = [growth1, growth2, growth3, growth4, growth5].slice(0, yrs).map(parseNum).map((x) => (Number.isFinite(x) ? x : 0));
    const em = parseNum(ebitMargin);
    const tr = parseNum(taxRate);
    const stc = parseNum(salesToCapital);
    const wc = parseNum(wcPctOfRev);

    const _rf = parseNum(rf);
    const _beta = parseNum(beta);
    const _mrp = parseNum(mrp);
    const _preTaxDebt = parseNum(preTaxDebt);
    const _dw = parseNum(debtWeight);

    const tg = parseNum(terminalGrowth);

    const _cash = parseNum(cash);
    const _debt = parseNum(debt);
    const _shares = parseNum(shares);

    const _mcap = parseNum(marketCap);
    const _ebitda = parseNum(ebitda);
    const _ni = parseNum(netIncome);

    return {
      rev,
      yrs,
      gs,
      em,
      tr,
      stc,
      wc,
      rf: _rf,
      beta: _beta,
      mrp: _mrp,
      preTaxDebt: _preTaxDebt,
      dw: _dw,
      tg,
      cash: _cash,
      debt: _debt,
      shares: _shares,
      mcap: _mcap,
      ebitda: _ebitda,
      ni: _ni,
    };
  }, [
    baseRevenue,
    years,
    growth1,
    growth2,
    growth3,
    growth4,
    growth5,
    ebitMargin,
    taxRate,
    salesToCapital,
    wcPctOfRev,
    rf,
    beta,
    mrp,
    preTaxDebt,
    debtWeight,
    terminalGrowth,
    cash,
    debt,
    shares,
    marketCap,
    ebitda,
    netIncome,
  ]);

  const waccParts = useMemo(() => {
    const tr = Number.isFinite(inputs.tr) ? inputs.tr : 0.21;
    const out = waccFromParts({
      rf: Number.isFinite(inputs.rf) ? inputs.rf : 0.04,
      beta: Number.isFinite(inputs.beta) ? inputs.beta : 1.0,
      mrp: Number.isFinite(inputs.mrp) ? inputs.mrp : 0.05,
      preTaxCostDebt: Number.isFinite(inputs.preTaxDebt) ? inputs.preTaxDebt : 0.055,
      taxRate: tr,
      debtWeight: Number.isFinite(inputs.dw) ? inputs.dw : 0.15,
    });
    return out;
  }, [inputs]);

  const fcfRows = useMemo(() => {
    const rev = Number.isFinite(inputs.rev) ? inputs.rev : 0;
    const yrs = inputs.yrs;
    const em = Number.isFinite(inputs.em) ? inputs.em : 0;
    const tr = Number.isFinite(inputs.tr) ? inputs.tr : 0.21;
    const stc = Number.isFinite(inputs.stc) ? inputs.stc : 2.5;
    const wc = Number.isFinite(inputs.wc) ? inputs.wc : 0.02;

    return buildFCFSeries({
      baseRevenue: rev,
      years: yrs,
      revGrowth: inputs.gs.length ? inputs.gs : Array.from({ length: yrs }, () => 0.05),
      ebitMargin: em,
      taxRate: tr,
      salesToCapital: stc,
      wcPctOfRev: wc,
    });
  }, [inputs]);

  const dcf = useMemo(() => {
    const wacc = waccParts.wacc;
    const g = Number.isFinite(inputs.tg) ? inputs.tg : 0.02;
    return dcfValue({ fcfRows, wacc, terminalGrowth: g });
  }, [fcfRows, waccParts.wacc, inputs.tg]);

  const equityBridge = useMemo(() => {
    const c = Number.isFinite(inputs.cash) ? inputs.cash : 0;
    const d = Number.isFinite(inputs.debt) ? inputs.debt : 0;
    const sh = Number.isFinite(inputs.shares) ? inputs.shares : 0;
    return impliedPrice({ enterpriseValue: dcf.ev, cash: c, debt: d, shares: sh });
  }, [dcf.ev, inputs.cash, inputs.debt, inputs.shares]);

  const chartSeries = useMemo(() => {
    const g = Number.isFinite(inputs.tg) ? inputs.tg : 0.02;
    return buildChartSeries({ fcfRows, wacc: waccParts.wacc, terminalGrowth: g });
  }, [fcfRows, waccParts.wacc, inputs.tg]);

  const sens = useMemo(() => {
    const w = waccParts.wacc;
    const g = Number.isFinite(inputs.tg) ? inputs.tg : 0.02;
    return sensitivityGrid({
      fcfRows,
      cash: Number.isFinite(inputs.cash) ? inputs.cash : 0,
      debt: Number.isFinite(inputs.debt) ? inputs.debt : 0,
      shares: Number.isFinite(inputs.shares) ? inputs.shares : 1,
      waccCenter: w,
      gCenter: g,
    });
  }, [fcfRows, inputs.cash, inputs.debt, inputs.shares, inputs.tg, waccParts.wacc]);

  const multiples = useMemo(() => {
    const mcap = inputs.mcap;
    const ebitda = inputs.ebitda;
    const ni = inputs.ni;

    const ev = mcap + (Number.isFinite(inputs.debt) ? inputs.debt : 0) - (Number.isFinite(inputs.cash) ? inputs.cash : 0);
    const evEbitda = ebitda > 0 ? ev / ebitda : NaN;
    const pe = ni > 0 ? mcap / ni : NaN;

    return { ev, evEbitda, pe };
  }, [inputs]);

  async function runValuation() {
    setBusy(true);
    try {
      if (!isPaid) {
        const u = (await peekUsage("valuation_run")) as UsagePeek;
        setUsage(u);
        if (!u.allowed) {
          setShowUpgrade(true);
          return;
        }
        await incrementUsage("valuation_run");
        const u2 = (await peekUsage("valuation_run")) as UsagePeek;
        setUsage(u2);
      }
      // All calculations are local; “Run” exists mainly for usage gating + user intent.
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
              <Badge>Valuation</Badge>
              <div className="text-sm text-slate-600">DCF, WACC, multiples, sensitivity</div>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Valuation Lab
            </h1>
            <div className="mt-1 text-sm text-slate-600">
              Build a DCF and get an implied per-share value with a clean explanation of every metric.
            </div>
          </div>

          <Card className="p-3">
            <div className="text-xs text-slate-600">Free usage</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {isPaid ? "Unlimited" : `${usage?.remainingProduct ?? "—"} left here, ${usage?.remainingTotal ?? "—"} left sitewide`}
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* LEFT: Inputs */}
          <div className="lg:col-span-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Inputs</div>
                <Tip text="Enter assumptions in $M for financials, and decimals for rates (e.g., 0.08 = 8%)." />
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                    <span>Ticker (label)</span>
                    <Tip text="This is only a label for your scenario. It does not fetch live fundamentals (yet)." />
                  </div>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                      <span>Base revenue ($M)</span>
                      <Tip text="Starting revenue level. If you don’t know, use latest annual revenue (in millions)." />
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={baseRevenue}
                      onChange={(e) => setBaseRevenue(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                      <span>Forecast years</span>
                      <Tip text="Typical DCFs use 5–10 years. More years increases assumption risk." />
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      type="number"
                      min={1}
                      max={10}
                      value={years}
                      onChange={(e) => setYears(clamp(Number(e.target.value), 1, 10))}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                    <span>Revenue growth by year</span>
                    <Tip text="Growth assumptions drive everything. Start higher and taper toward terminal growth." />
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {[growth1, growth2, growth3, growth4, growth5].slice(0, years).map((g, i) => (
                      <input
                        key={i}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={g}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (i === 0) setGrowth1(v);
                          if (i === 1) setGrowth2(v);
                          if (i === 2) setGrowth3(v);
                          if (i === 3) setGrowth4(v);
                          if (i === 4) setGrowth5(v);
                        }}
                        inputMode="decimal"
                        placeholder="0.05"
                        title={`Year ${i + 1} growth`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                      <span>EBIT margin</span>
                      <Tip text="Operating profitability. EBIT = Revenue × EBIT margin." />
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={ebitMargin}
                      onChange={(e) => setEbitMargin(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                      <span>Tax rate</span>
                      <Tip text="Used to compute NOPAT = EBIT × (1 − tax rate). Use an effective rate." />
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                      <span>Sales-to-capital</span>
                      <Tip text="Efficiency of reinvestment. Higher = less reinvestment needed for growth." />
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={salesToCapital}
                      onChange={(e) => setSalesToCapital(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm font-medium text-slate-800">
                      <span>ΔWC % of ΔRev</span>
                      <Tip text="Working capital drag from growth. Example: 0.02 means 2% of incremental revenue becomes net working capital." />
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      value={wcPctOfRev}
                      onChange={(e) => setWcPctOfRev(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>WACC inputs</span>
                    <Tip text="WACC is the discount rate for the firm’s cash flows. It blends cost of equity and after-tax cost of debt." />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Risk-free (rf)</span>
                        <Tip text="Baseline yield (often long-term Treasuries). Used in CAPM." />
                      </div>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={rf}
                        onChange={(e) => setRf(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Beta</span>
                        <Tip text="Market sensitivity. Beta > 1 is more volatile than the market; < 1 is less." />
                      </div>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={beta}
                        onChange={(e) => setBeta(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Market risk prem (MRP)</span>
                        <Tip text="Extra return investors demand over the risk-free rate. Used in CAPM." />
                      </div>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={mrp}
                        onChange={(e) => setMrp(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Pre-tax cost of debt</span>
                        <Tip text="Approximate yield on debt. After-tax cost is reduced by (1 − taxRate)." />
                      </div>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={preTaxDebt}
                        onChange={(e) => setPreTaxDebt(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Debt weight</span>
                        <Tip text="Capital structure weight. 0.15 means 15% debt, 85% equity." />
                      </div>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={debtWeight}
                        onChange={(e) => setDebtWeight(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Terminal growth (g)</span>
                        <Tip text="Long-run growth rate. Must be less than WACC for Gordon Growth." />
                      </div>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={terminalGrowth}
                        onChange={(e) => setTerminalGrowth(e.target.value)}
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                    <span>Equity bridge</span>
                    <Tip text="DCF gives Enterprise Value (EV). To get Equity Value: EV + Cash − Debt. Then divide by shares." />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Cash ($M)</span>
                        <Tip text="Excess cash and marketable securities (approx.)." />
                      </div>
                      <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={cash} onChange={(e) => setCash(e.target.value)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Debt ($M)</span>
                        <Tip text="Total debt (short + long). You can net it later if you prefer." />
                      </div>
                      <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={debt} onChange={(e) => setDebt(e.target.value)} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span>Shares (M)</span>
                        <Tip text="Diluted shares outstanding (in millions). Implied price uses Equity / Shares." />
                      </div>
                      <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={shares} onChange={(e) => setShares(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="primary" onClick={runValuation} disabled={busy}>
                    {busy ? "Running…" : "Run valuation"}
                  </Button>
                  <Button variant="secondary" href="/pricing">
                    Pricing
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="mt-6 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Multiples snapshot</div>
                <Tip text="Optional: compare implied value to simple multiples. Values are $M." />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>Market cap</span>
                    <Tip text="Current market value of equity." />
                  </div>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={marketCap} onChange={(e) => setMarketCap(e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>EBITDA</span>
                    <Tip text="Proxy for operating cashflow. Used for EV/EBITDA." />
                  </div>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={ebitda} onChange={(e) => setEbitda(e.target.value)} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                    <span>Net income</span>
                    <Tip text="Used for P/E = Market cap / Net income." />
                  </div>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={netIncome} onChange={(e) => setNetIncome(e.target.value)} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>EV</span>
                    <Tip text="Enterprise Value = Market cap + Debt − Cash." />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{money(multiples.ev)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>EV / EBITDA</span>
                    <Tip text="Common valuation multiple. Higher can imply expensive, but depends on growth and margins." />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{nfmt(multiples.evEbitda, 2)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>P / E</span>
                    <Tip text="Price-to-earnings multiple. Sensitive to cyclical earnings and accounting effects." />
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{nfmt(multiples.pe, 2)}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: Outputs */}
          <div className="lg:col-span-8">
            <div className="grid gap-6">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">DCF results</div>
                    <div className="mt-1 text-sm text-slate-600">Enterprise value and implied equity per share</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Cost of equity</span>
                        <Tip text="CAPM: rf + beta × MRP." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{pct(waccParts.costEquity, 2)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>After-tax debt</span>
                        <Tip text="Cost of debt × (1 − tax rate)." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{pct(waccParts.afterTaxDebt, 2)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>WACC</span>
                        <Tip text="Discount rate for firm cashflows. More risk = higher WACC = lower value." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{pct(waccParts.wacc, 2)}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Terminal g</span>
                        <Tip text="Long-run growth rate used in terminal value. Must be < WACC." />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{pct(Number.isFinite(inputs.tg) ? inputs.tg : 0, 2)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>PV of forecast FCF</span>
                      <Tip text="Discounted value of the explicit forecast period cash flows." />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{money(dcf.pvFCF)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>PV of terminal value</span>
                      <Tip text="Discounted value of all cash flows beyond the forecast period (Gordon Growth)." />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{money(dcf.pvTV)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Enterprise value (EV)</span>
                      <Tip text="Total value of the firm’s operations: PV(FCF) + PV(Terminal)." />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{money(dcf.ev)}</div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Equity value</span>
                      <Tip text="Equity = EV + Cash − Debt (simplified bridge)." />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{money(equityBridge.equity)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Implied price / share</span>
                      <Tip text="Implied price = Equity value / Shares. Compare this to market price for ‘upside’." />
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{money(equityBridge.px, 2)}</div>
                  </div>
                </div>

                <div className="mt-5 h-72 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-xs font-semibold text-slate-700">Discounted cash flow (PV) by year</div>
                  <div className="mt-2 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <RTooltip formatter={(v, name) => (name === "pv" || name === "fcf" || name === "cum" ? money(Number(v), 2) : nfmt(Number(v), 2))} />
                        <Line type="monotone" dataKey="pv" dot={false} />
                        <Line type="monotone" dataKey="cum" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Forecast table</div>
                    <div className="mt-1 text-sm text-slate-600">Revenue → EBIT → NOPAT → reinvestment → FCF</div>
                  </div>
                  <Tip text="FCF = NOPAT − reinvestment. Reinvestment here includes growth capex (via sales-to-capital) + working capital drag." />
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[900px] border-collapse text-sm">
                    <thead>
                      <tr>
                        {["Year", "Revenue ($M)", "EBIT", "NOPAT", "Reinvestment", "FCF"].map((h) => (
                          <th key={h} className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-800">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fcfRows.map((r) => (
                        <tr key={r.year}>
                          <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-800">Y{r.year}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(r.revenue)}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(r.ebit)}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(r.nopat)}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(r.reinvestment)}</td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(r.fcf)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Sensitivity (Implied price)</div>
                    <div className="mt-1 text-sm text-slate-600">WACC vs terminal growth</div>
                  </div>
                  <Tip text="If your valuation swings wildly with small changes, you’re overconfident in assumptions. Use this grid to sanity-check." />
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[780px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-800">g \ WACC</th>
                        {sens.waccs.map((w) => (
                          <th key={w} className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-800">
                            {pct(w, 2)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sens.rows.map((row) => (
                        <tr key={row.g}>
                          <td className="border-b border-slate-100 px-3 py-2 font-semibold text-slate-800">{pct(row.g, 2)}</td>
                          {row.cols.map((v, i) => (
                            <td key={i} className="border-b border-slate-100 px-3 py-2 text-slate-700">
                              {money(v, 2)}
                            </td>
                          ))}
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

export default function ValuationClient() {
  return (
      <ValuationInner />
  );
}