"use client";

import { useState } from "react";
import Tip from "@/components/derivatives/Tip";

type DirectionalSpread = {
  type: "bull_call" | "bear_put";
  longStrike: number;
  shortStrike: number;
  debit: number;
  maxProfit: number;
  maxLoss: number;
  returnOnRisk: number;
  breakeven: number;
  pop: number | null;
  width: number;
};

type DirectionalScreenerProps = {
  symbol: string;
  expiration: string;
  spot: number | null;
  onSendToBuilder?: (spread: DirectionalSpread) => void;
};

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

// Mock function - in production this would call an API endpoint
function generateDirectionalSpreads(
  spot: number,
  type: "bull_call" | "bear_put" | "both",
  minPop: number,
  maxCapital: number,
  minWidth: number,
  maxWidth: number
): DirectionalSpread[] {
  const spreads: DirectionalSpread[] = [];

  if (type === "bull_call" || type === "both") {
    // Generate bull call spreads (ATM to OTM)
    for (let width = minWidth; width <= maxWidth; width += 1) {
      for (let offset = 0; offset <= 10; offset += 1) {
        const longStrike = Math.round(spot + offset);
        const shortStrike = longStrike + width;

        // Simplified Greeks estimation
        const debit = width * 0.4 - offset * 0.1; // Rough approximation
        const maxProfit = width - debit;
        const maxLoss = debit;
        const returnOnRisk = maxProfit / maxLoss;
        const breakeven = longStrike + debit;

        // Rough POP estimation based on distance from spot
        const distanceFromSpot = (longStrike - spot) / spot;
        const pop = Math.max(0.3, Math.min(0.85, 0.65 - distanceFromSpot * 2));

        if (debit > 0 && debit <= maxCapital && pop >= minPop) {
          spreads.push({
            type: "bull_call",
            longStrike,
            shortStrike,
            debit,
            maxProfit,
            maxLoss,
            returnOnRisk,
            breakeven,
            pop,
            width,
          });
        }
      }
    }
  }

  if (type === "bear_put" || type === "both") {
    // Generate bear put spreads (ATM to OTM)
    for (let width = minWidth; width <= maxWidth; width += 1) {
      for (let offset = 0; offset <= 10; offset += 1) {
        const longStrike = Math.round(spot - offset);
        const shortStrike = longStrike - width;

        const debit = width * 0.4 - offset * 0.1;
        const maxProfit = width - debit;
        const maxLoss = debit;
        const returnOnRisk = maxProfit / maxLoss;
        const breakeven = longStrike - debit;

        const distanceFromSpot = (spot - longStrike) / spot;
        const pop = Math.max(0.3, Math.min(0.85, 0.65 - distanceFromSpot * 2));

        if (debit > 0 && debit <= maxCapital && pop >= minPop) {
          spreads.push({
            type: "bear_put",
            longStrike,
            shortStrike,
            debit,
            maxProfit,
            maxLoss,
            returnOnRisk,
            breakeven,
            pop,
            width,
          });
        }
      }
    }
  }

  // Sort by POP descending
  return spreads.sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0)).slice(0, 50);
}

export default function DirectionalScreener({
  symbol,
  expiration,
  spot,
  onSendToBuilder,
}: DirectionalScreenerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DirectionalSpread[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Filters
  const [spreadType, setSpreadType] = useState<"bull_call" | "bear_put" | "both">("both");
  const [minPop, setMinPop] = useState(0.65);
  const [maxCapital, setMaxCapital] = useState(500);
  const [minWidth, setMinWidth] = useState(2);
  const [maxWidth, setMaxWidth] = useState(10);
  const [rankBy, setRankBy] = useState<"pop" | "returnOnRisk" | "maxProfit">("pop");

  async function runScreen() {
    if (!spot) {
      setError("Need spot price to calculate spreads");
      return;
    }

    setBusy(true);
    setError(null);
    setResults([]);

    try {
      // In production, this would call an API endpoint
      // For now, using client-side generation for demonstration
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call

      const spreads = generateDirectionalSpreads(
        spot,
        spreadType,
        minPop,
        maxCapital,
        minWidth,
        maxWidth
      );

      // Apply ranking
      const sorted = [...spreads].sort((a, b) => {
        if (rankBy === "pop") return (b.pop ?? 0) - (a.pop ?? 0);
        if (rankBy === "returnOnRisk") return b.returnOnRisk - a.returnOnRisk;
        return b.maxProfit - a.maxProfit;
      });

      setResults(sorted);
      setSelectedIdx(0);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const selected = results[selectedIdx] ?? null;
  const bullSpreads = results.filter(s => s.type === "bull_call");
  const bearSpreads = results.filter(s => s.type === "bear_put");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-zinc-900">Directional Screener</div>
            <div className="mt-1 text-sm text-zinc-600">
              Bull call spreads and bear put spreads with high probability of profit.
            </div>
          </div>

          <button
            onClick={runScreen}
            disabled={busy || !spot}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {busy ? "Screening..." : "Run Screen"}
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-semibold text-zinc-700">Spread Type</div>
            <select
              value={spreadType}
              onChange={(e) => setSpreadType(e.target.value as any)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="both">Both Directions</option>
              <option value="bull_call">Bull Call Spreads</option>
              <option value="bear_put">Bear Put Spreads</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Min POP">
                Minimum probability of profit. 65%+ recommended for directional plays.
              </Tip>
            </div>
            <input
              type="number"
              step={0.05}
              min={0.5}
              max={0.95}
              value={minPop}
              onChange={(e) => setMinPop(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Max Capital">
                Maximum debit (capital at risk) per spread.
              </Tip>
            </div>
            <input
              type="number"
              step={50}
              min={50}
              max={5000}
              value={maxCapital}
              onChange={(e) => setMaxCapital(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">Rank by</div>
            <select
              value={rankBy}
              onChange={(e) => setRankBy(e.target.value as any)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="pop">Probability of Profit</option>
              <option value="returnOnRisk">Return on Risk</option>
              <option value="maxProfit">Max Profit</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Min Width">
                Minimum strike width. Narrower = less capital, less profit.
              </Tip>
            </div>
            <input
              type="number"
              min={1}
              max={20}
              value={minWidth}
              onChange={(e) => setMinWidth(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Max Width">
                Maximum strike width. Wider = more capital, more profit potential.
              </Tip>
            </div>
            <input
              type="number"
              min={1}
              max={50}
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>
        </div>

        {spot && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
            Current spot: <strong className="text-zinc-900">{fmtUSD(spot, 2)}</strong>.
            Spreads will be generated around this price.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {/* Summary Stats */}
      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs text-zinc-600">Total Spreads</div>
            <div className="mt-1 text-2xl font-bold text-zinc-900">{results.length}</div>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="text-xs text-green-700">Bull Call Spreads</div>
            <div className="mt-1 text-2xl font-bold text-green-900">{bullSpreads.length}</div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="text-xs text-red-700">Bear Put Spreads</div>
            <div className="mt-1 text-2xl font-bold text-red-900">{bearSpreads.length}</div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="min-w-full w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Strikes</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Max Profit</th>
                  <th className="px-3 py-2 text-right">RoR</th>
                  <th className="px-3 py-2 text-right">Breakeven</th>
                  <th className="px-3 py-2 text-right">POP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {results.map((s, i) => (
                  <tr
                    key={i}
                    className={`cursor-pointer hover:bg-zinc-50 ${
                      i === selectedIdx ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedIdx(i)}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.type === "bull_call"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {s.type === "bull_call" ? "BULL" : "BEAR"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-zinc-900">
                        Long: ${s.longStrike}
                      </div>
                      <div className="text-xs text-zinc-600">
                        Short: ${s.shortStrike}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-red-700">
                      {fmtUSD(s.debit, 2)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">
                      {fmtUSD(s.maxProfit, 2)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {fmtPct01(s.returnOnRisk, 1)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      ${fmtNum(s.breakeven, 2)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">
                      {s.pop ? fmtPct01(s.pop, 1) : "—"}
                    </td>
                  </tr>
                ))}
                {!results.length && !busy && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-600">
                      Run the screener to see directional spreads
                    </td>
                  </tr>
                )}
                {busy && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-600">
                      Generating spreads...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-4">
          {selected ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="text-base font-semibold text-zinc-900">
                  {selected.type === "bull_call" ? "Bull Call Spread" : "Bear Put Spread"}
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    selected.type === "bull_call"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selected.type === "bull_call" ? "BULLISH" : "BEARISH"}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-semibold text-zinc-900">
                  {symbol} {expiration}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Long Strike</div>
                    <div className="font-semibold text-zinc-900">${selected.longStrike}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Short Strike</div>
                    <div className="font-semibold text-zinc-900">${selected.shortStrike}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Width</div>
                    <div className="font-semibold text-zinc-900">${selected.width}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Breakeven</div>
                    <div className="font-semibold text-zinc-900">${fmtNum(selected.breakeven, 2)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Debit Paid</span>
                  <span className="font-semibold text-red-700">{fmtUSD(selected.debit, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Max Profit</span>
                  <span className="font-semibold text-green-700">{fmtUSD(selected.maxProfit, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Max Loss</span>
                  <span className="font-semibold text-red-700">{fmtUSD(selected.maxLoss, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Return on Risk</span>
                  <span className="font-semibold text-zinc-900">
                    {fmtPct01(selected.returnOnRisk, 1)}
                  </span>
                </div>
                {selected.pop && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Probability of Profit</span>
                    <span className="font-semibold text-blue-700">{fmtPct01(selected.pop, 1)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 leading-relaxed">
                <div className="font-semibold">Strategy Notes</div>
                <div className="mt-2">
                  {selected.type === "bull_call" ? (
                    <>
                      Profits if {symbol} moves above ${selected.breakeven} by expiration.
                      Maximum profit at ${selected.shortStrike}+. Risk is limited to debit paid.
                    </>
                  ) : (
                    <>
                      Profits if {symbol} moves below ${selected.breakeven} by expiration.
                      Maximum profit at ${selected.shortStrike} or below. Risk is limited to debit paid.
                    </>
                  )}
                </div>
              </div>

              {selected.pop && selected.pop >= 0.65 && (
                <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-900">
                  <div className="font-semibold">High Probability</div>
                  <div className="mt-1">
                    POP of {fmtPct01(selected.pop, 1)} indicates this spread has favorable odds.
                  </div>
                </div>
              )}

              {onSendToBuilder && (
                <button
                  onClick={() => onSendToBuilder(selected)}
                  className="mt-4 w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Send to Strategy Builder
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">
                Click a spread to see details
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Educational Info */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="text-sm font-semibold text-zinc-900">About Directional Spreads</div>
        <div className="mt-3 grid gap-3 text-xs text-zinc-700 sm:grid-cols-2">
          <div>
            <div className="font-semibold">Bull Call Spread</div>
            <div className="mt-1 leading-relaxed">
              Buy a lower-strike call, sell a higher-strike call. Profits from upward movement.
              Limited risk and limited profit. Best when moderately bullish.
            </div>
          </div>
          <div>
            <div className="font-semibold">Bear Put Spread</div>
            <div className="mt-1 leading-relaxed">
              Buy a higher-strike put, sell a lower-strike put. Profits from downward movement.
              Limited risk and limited profit. Best when moderately bearish.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
