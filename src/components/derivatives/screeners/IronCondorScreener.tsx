"use client";

import { useState, useEffect } from "react";
import Tip from "@/components/derivatives/Tip";

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

type SavedPreset = {
  name: string;
  topN: number;
  minOI: number;
  minVol: number;
  maxSpreadPct: number;
  rankBy: "returnOnRisk" | "pop" | "credit";
  dteMin?: number;
  dteMax?: number;
  minPop?: number;
  maxCapital?: number;
};

type IronCondorScreenerProps = {
  symbol: string;
  expiration: string;
  expirations: string[];
  onSendToBuilder?: (condor: Condor) => void;
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

function calculateSafetyScore(condor: Condor): number {
  // Safety score 1-5 based on POP and structure
  const pop = condor.pop ?? 0.5;
  const rorPenalty = condor.returnOnRisk > 0.5 ? -0.5 : 0; // High RoR = more risk

  let score = 1;
  if (pop >= 0.8) score = 5;
  else if (pop >= 0.7) score = 4;
  else if (pop >= 0.6) score = 3;
  else if (pop >= 0.5) score = 2;

  score += rorPenalty;
  return Math.max(1, Math.min(5, Math.round(score)));
}

function SafetyStars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-sm ${i <= score ? "text-yellow-500" : "text-zinc-300"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

const DEFAULT_PRESETS: SavedPreset[] = [
  {
    name: "Weekly Income",
    topN: 30,
    minOI: 500,
    minVol: 100,
    maxSpreadPct: 0.15,
    rankBy: "returnOnRisk",
    dteMax: 7,
    minPop: 0.7,
  },
  {
    name: "Monthly Conservative",
    topN: 50,
    minOI: 1000,
    minVol: 200,
    maxSpreadPct: 0.1,
    rankBy: "pop",
    dteMin: 25,
    dteMax: 35,
    minPop: 0.75,
  },
  {
    name: "Earnings Plays",
    topN: 20,
    minOI: 300,
    minVol: 50,
    maxSpreadPct: 0.3,
    rankBy: "credit",
    dteMin: 0,
    dteMax: 10,
  },
];

export default function IronCondorScreener({
  symbol,
  expiration,
  expirations,
  onSendToBuilder,
}: IronCondorScreenerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CondorResp | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Filters
  const [topN, setTopN] = useState(30);
  const [minOI, setMinOI] = useState(200);
  const [minVol, setMinVol] = useState(50);
  const [maxSpreadPct, setMaxSpreadPct] = useState(0.25);
  const [rankBy, setRankBy] = useState<"returnOnRisk" | "pop" | "credit">("returnOnRisk");
  const [minPop, setMinPop] = useState<number | null>(null);
  const [maxCapital, setMaxCapital] = useState<number | null>(null);

  // Presets
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(DEFAULT_PRESETS);
  const [showPresets, setShowPresets] = useState(false);

  // Load presets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("ironCondorPresets");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedPresets([...DEFAULT_PRESETS, ...parsed]);
      } catch {
        // ignore
      }
    }
  }, []);

  async function runScreen() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/derivatives/iron-condor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol,
          expiration,
          topN,
          rankBy,
          filters: { minOpenInterest: minOI, minVolume: minVol, maxSpreadPct },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();

      // Apply additional client-side filters
      let filtered = data.condors || [];

      if (minPop !== null) {
        filtered = filtered.filter((c: Condor) => (c.pop ?? 0) >= minPop);
      }

      if (maxCapital !== null) {
        filtered = filtered.filter((c: Condor) => Math.abs(c.maxLoss) <= maxCapital);
      }

      setResults({ ...data, condors: filtered });
      setSelectedIdx(0);
    } catch (e: any) {
      setError(String(e?.message || e));
      setResults(null);
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(preset: SavedPreset) {
    setTopN(preset.topN);
    setMinOI(preset.minOI);
    setMinVol(preset.minVol);
    setMaxSpreadPct(preset.maxSpreadPct);
    setRankBy(preset.rankBy);
    setMinPop(preset.minPop ?? null);
    setMaxCapital(preset.maxCapital ?? null);
    setShowPresets(false);
  }

  function saveCurrentAsPreset() {
    const name = prompt("Preset name:");
    if (!name) return;

    const newPreset: SavedPreset = {
      name,
      topN,
      minOI,
      minVol,
      maxSpreadPct,
      rankBy,
      minPop: minPop ?? undefined,
      maxCapital: maxCapital ?? undefined,
    };

    const custom = savedPresets.filter(p => !DEFAULT_PRESETS.includes(p));
    const updated = [...custom, newPreset];
    localStorage.setItem("ironCondorPresets", JSON.stringify(updated));
    setSavedPresets([...DEFAULT_PRESETS, ...updated]);
  }

  const selected = results?.condors?.[selectedIdx] ?? null;
  const safetyScore = selected ? calculateSafetyScore(selected) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-zinc-900">Iron Condor Screener</div>
            <div className="mt-1 text-sm text-zinc-600">
              Find optimal iron condors with liquidity filters and safety scores.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Presets
            </button>
            <button
              onClick={saveCurrentAsPreset}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Save
            </button>
            <button
              onClick={runScreen}
              disabled={busy || !expiration}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {busy ? "Screening..." : "Run Screen"}
            </button>
          </div>
        </div>

        {/* Presets dropdown */}
        {showPresets && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-xs font-semibold text-zinc-700 mb-2">Saved Presets</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedPresets.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => applyPreset(preset)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <div className="font-semibold text-zinc-900">{preset.name}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Top {preset.topN} • {preset.rankBy}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Top N">
                Number of top-ranked condors to return. More results = longer processing.
              </Tip>
            </div>
            <input
              type="number"
              min={10}
              max={300}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Min Open Interest">
                Minimum open interest per leg. Higher = better liquidity and tighter fills.
              </Tip>
            </div>
            <input
              type="number"
              min={0}
              value={minOI}
              onChange={(e) => setMinOI(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Min Volume">
                Minimum daily volume per leg. Helps avoid stale quotes.
              </Tip>
            </div>
            <input
              type="number"
              min={0}
              value={minVol}
              onChange={(e) => setMinVol(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Max Spread %">
                Maximum bid/ask spread as % of mid-price. Lower = more fillable.
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

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Min POP">
                Minimum probability of profit (optional filter).
              </Tip>
            </div>
            <input
              type="number"
              step={0.05}
              min={0}
              max={1}
              value={minPop ?? ""}
              onChange={(e) => setMinPop(e.target.value ? Number(e.target.value) : null)}
              placeholder="0.65"
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Max Capital">
                Maximum capital at risk (max loss) per trade.
              </Tip>
            </div>
            <input
              type="number"
              step={100}
              min={0}
              value={maxCapital ?? ""}
              onChange={(e) => setMaxCapital(e.target.value ? Number(e.target.value) : null)}
              placeholder="500"
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
              <option value="returnOnRisk">Return on Risk</option>
              <option value="pop">Probability of Profit</option>
              <option value="credit">Net Credit</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {/* Results */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Results Table */}
        <div className="lg:col-span-8">
          <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="min-w-full w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left">Rank</th>
                  <th className="px-3 py-2 text-left">Structure</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                  <th className="px-3 py-2 text-right">Max Loss</th>
                  <th className="px-3 py-2 text-right">RoR</th>
                  <th className="px-3 py-2 text-right">POP</th>
                  <th className="px-3 py-2 text-center">Safety</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(results?.condors ?? []).map((c, i) => {
                  const safety = calculateSafetyScore(c);
                  return (
                    <tr
                      key={i}
                      className={`cursor-pointer hover:bg-zinc-50 ${
                        i === selectedIdx ? "bg-blue-50" : ""
                      }`}
                      onClick={() => setSelectedIdx(i)}
                    >
                      <td className="px-3 py-2 text-zinc-600">#{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-zinc-900 text-xs">
                          P: {c.putLong}/{c.putShort}
                        </div>
                        <div className="font-semibold text-zinc-900 text-xs">
                          C: {c.callShort}/{c.callLong}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700">
                        {fmtUSD(c.credit, 2)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-red-700">
                        {fmtUSD(c.maxLoss, 2)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {fmtPct01(c.returnOnRisk, 1)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {c.pop === null ? "—" : fmtPct01(c.pop, 1)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center">
                          <SafetyStars score={safety} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!results?.condors?.length && !busy && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-600">
                      Run the screener to see results
                    </td>
                  </tr>
                )}
                {busy && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-600">
                      Screening...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {results?.notes && results.notes.length > 0 && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-semibold text-amber-900">Notes</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                {results.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-4">
          {selected ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="text-base font-semibold text-zinc-900">Details</div>
                <SafetyStars score={safetyScore} />
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-semibold text-zinc-900">
                  {symbol} {expiration}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Put Long</div>
                    <div className="font-semibold text-zinc-900">${selected.putLong}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Put Short</div>
                    <div className="font-semibold text-zinc-900">${selected.putShort}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Call Short</div>
                    <div className="font-semibold text-zinc-900">${selected.callShort}</div>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="text-zinc-500">Call Long</div>
                    <div className="font-semibold text-zinc-900">${selected.callLong}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Credit Received</span>
                  <span className="font-semibold text-green-700">{fmtUSD(selected.credit, 2)}</span>
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
                <div className="flex justify-between">
                  <span className="text-zinc-600">Lower Breakeven</span>
                  <span className="font-semibold text-zinc-900">{fmtNum(selected.lowerBE, 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Upper Breakeven</span>
                  <span className="font-semibold text-zinc-900">{fmtNum(selected.upperBE, 2)}</span>
                </div>
                {selected.pop !== null && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Probability of Profit</span>
                    <span className="font-semibold text-zinc-900">{fmtPct01(selected.pop, 1)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                <div className="font-semibold">Safety Score: {safetyScore}/5</div>
                <div className="mt-1 leading-relaxed">
                  {safetyScore >= 4 && "High POP and good liquidity. Conservative trade."}
                  {safetyScore === 3 && "Moderate risk. Watch breakevens and catalysts."}
                  {safetyScore <= 2 && "Lower POP or aggressive structure. Consider adjustments."}
                </div>
              </div>

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
                Click a row to see details and send to Strategy Builder
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
