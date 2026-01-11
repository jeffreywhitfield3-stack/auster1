"use client";

import React, { useState } from "react";
import Link from "next/link";

type Leg = {
  type: "call" | "put";
  strike: number;
  expiry: string;
  quantity: number;
  price?: number;
};

type Greeks = {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
};

type LegWithGreeks = Leg & {
  greeks: Greeks;
  timeToExpiry: number;
  daysToExpiry: number;
};

type GreeksResponse = {
  symbol: string;
  currentPrice: number;
  riskFreeRate: number;
  legs: LegWithGreeks[];
  portfolio: Greeks;
  hedging: {
    deltaShares: number;
    isDeltaNeutral: boolean;
  };
};

export default function GreeksClient() {
  const [symbol, setSymbol] = useState("AAPL");
  const [legs, setLegs] = useState<Leg[]>([
    { type: "call", strike: 150, expiry: "2024-03-15", quantity: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GreeksResponse | null>(null);

  async function calculate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/derivatives/greeks/position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, legs }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "unknown" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  function addLeg() {
    setLegs([...legs, { type: "call", strike: 150, expiry: "2024-03-15", quantity: 1 }]);
  }

  function removeLeg(index: number) {
    setLegs(legs.filter((_, i) => i !== index));
  }

  function updateLeg(index: number, field: keyof Leg, value: any) {
    const newLegs = [...legs];
    newLegs[index] = { ...newLegs[index], [field]: value };
    setLegs(newLegs);
  }

  function formatGreek(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/products/derivatives"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ← Back to Derivatives Lab
        </Link>
        <h1 className="mt-4 text-4xl font-bold text-zinc-900 sm:text-5xl">
          🧮 Greeks Calculator
        </h1>
        <p className="mt-4 text-lg leading-7 text-zinc-600">
          Calculate position and portfolio Greeks. Analyze delta, gamma, theta, vega, and rho for complex options strategies.
        </p>
      </div>

      {/* Symbol Input */}
      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-6">
        <label className="block text-sm font-semibold text-zinc-900">Underlying Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="mt-2 w-full max-w-xs rounded-lg border border-zinc-300 px-4 py-2 font-semibold uppercase"
          placeholder="AAPL"
        />
      </section>

      {/* Position Legs */}
      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Position Legs</h2>
          <button
            onClick={addLeg}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add Leg
          </button>
        </div>

        <div className="space-y-4">
          {legs.map((leg, index) => (
            <div key={index} className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-700">Type</label>
                <select
                  value={leg.type}
                  onChange={(e) => updateLeg(index, "type", e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                >
                  <option value="call">Call</option>
                  <option value="put">Put</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">Strike</label>
                <input
                  type="number"
                  value={leg.strike}
                  onChange={(e) => updateLeg(index, "strike", Number(e.target.value))}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">Expiry</label>
                <input
                  type="date"
                  value={leg.expiry}
                  onChange={(e) => updateLeg(index, "expiry", e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700">Quantity</label>
                <input
                  type="number"
                  value={leg.quantity}
                  onChange={(e) => updateLeg(index, "quantity", Number(e.target.value))}
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => removeLeg(index)}
                  className="w-full rounded border border-red-300 bg-white px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={calculate}
          disabled={loading || legs.length === 0}
          className="mt-6 w-full rounded-lg bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Calculate Greeks"}
        </button>
      </section>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">Error: {error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Portfolio Greeks */}
          <section className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="mb-4 text-lg font-bold text-emerald-900">Portfolio Greeks</h2>
            <div className="grid gap-4 sm:grid-cols-5">
              {[
                { label: "Delta", value: result.portfolio.delta, desc: "Directional exposure" },
                { label: "Gamma", value: result.portfolio.gamma, desc: "Delta sensitivity" },
                { label: "Theta", value: result.portfolio.theta, desc: "Time decay (per day)" },
                { label: "Vega", value: result.portfolio.vega, desc: "IV sensitivity" },
                { label: "Rho", value: result.portfolio.rho, desc: "Rate sensitivity" },
              ].map((greek) => (
                <div key={greek.label} className="rounded-lg border border-emerald-300 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{greek.label}</div>
                  <div className="mt-2 text-2xl font-bold text-zinc-900">{formatGreek(greek.value)}</div>
                  <p className="mt-1 text-xs text-zinc-600">{greek.desc}</p>
                </div>
              ))}
            </div>

            {/* Delta Hedging */}
            <div className="mt-6 rounded-lg border border-emerald-300 bg-white p-4">
              <h3 className="text-sm font-bold text-emerald-900">Delta Hedging</h3>
              <p className="mt-2 text-sm text-zinc-700">
                To achieve delta neutrality, {result.hedging.deltaShares >= 0 ? "buy" : "sell"}{" "}
                <strong>{Math.abs(result.hedging.deltaShares)}</strong> shares of {result.symbol}.
              </p>
              {result.hedging.isDeltaNeutral && (
                <p className="mt-2 text-sm font-semibold text-emerald-600">✓ Position is already delta-neutral</p>
              )}
            </div>
          </section>

          {/* Individual Legs */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">Individual Leg Greeks</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-right font-semibold">Strike</th>
                    <th className="px-4 py-3 text-right font-semibold">DTE</th>
                    <th className="px-4 py-3 text-right font-semibold">Delta</th>
                    <th className="px-4 py-3 text-right font-semibold">Gamma</th>
                    <th className="px-4 py-3 text-right font-semibold">Theta</th>
                    <th className="px-4 py-3 text-right font-semibold">Vega</th>
                  </tr>
                </thead>
                <tbody>
                  {result.legs.map((leg, index) => (
                    <tr key={index} className="border-b border-zinc-100">
                      <td className="px-4 py-3 capitalize">{leg.type}</td>
                      <td className="px-4 py-3 text-right font-mono">${leg.strike}</td>
                      <td className="px-4 py-3 text-right">{leg.daysToExpiry}d</td>
                      <td className="px-4 py-3 text-right font-mono">{formatGreek(leg.greeks.delta)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatGreek(leg.greeks.gamma, 4)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatGreek(leg.greeks.theta)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatGreek(leg.greeks.vega)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Info */}
      <section className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
        <h3 className="text-sm font-bold text-zinc-900">Greek Definitions</h3>
        <dl className="mt-4 space-y-2 text-xs text-zinc-700">
          <div>
            <dt className="font-semibold">Delta:</dt>
            <dd>Change in option value for $1 move in underlying. Portfolio delta shows net directional exposure.</dd>
          </div>
          <div>
            <dt className="font-semibold">Gamma:</dt>
            <dd>Rate of delta change. High gamma means delta is unstable and changes quickly.</dd>
          </div>
          <div>
            <dt className="font-semibold">Theta:</dt>
            <dd>Time decay per day. Negative theta means you're losing money daily from time passage.</dd>
          </div>
          <div>
            <dt className="font-semibold">Vega:</dt>
            <dd>Sensitivity to implied volatility. Positive vega benefits from rising IV.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
