"use client";

import { useState } from "react";
import Tip from "../Tip";

interface VolatilityResult {
  symbol: string;
  price: number;
  ivRank: number;
  ivPercentile: number;
  currentIV: number;
  avgIV: number;
  opportunity: "sell" | "buy";
  score: number;
}

interface VolatilityScreenerProps {
  onAnalyze?: (symbol: string) => void;
}

export default function VolatilityScreener({ onAnalyze }: VolatilityScreenerProps) {
  const [minIVRank, setMinIVRank] = useState(70);
  const [maxIVRank, setMaxIVRank] = useState(30);
  const [opportunity, setOpportunity] = useState<"high" | "low" | "both">("high");
  const [results, setResults] = useState<VolatilityResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const mockResults: VolatilityResult[] = [
    {
      symbol: "TSLA",
      price: 242.50,
      ivRank: 85,
      ivPercentile: 92,
      currentIV: 0.58,
      avgIV: 0.42,
      opportunity: "sell",
      score: 88,
    },
    {
      symbol: "NVDA",
      price: 505.30,
      ivRank: 76,
      ivPercentile: 81,
      currentIV: 0.51,
      avgIV: 0.39,
      opportunity: "sell",
      score: 82,
    },
    {
      symbol: "AMD",
      price: 152.80,
      ivRank: 15,
      ivPercentile: 22,
      currentIV: 0.28,
      avgIV: 0.45,
      opportunity: "buy",
      score: 75,
    },
  ];

  const handleRunScreen = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Filter mock results based on settings
    const filtered = mockResults.filter(r => {
      if (opportunity === "high") return r.ivRank >= minIVRank;
      if (opportunity === "low") return r.ivRank <= maxIVRank;
      return true;
    });

    setResults(filtered);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-zinc-900">Volatility Screener</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Find high IV opportunities (sell premium) or low IV opportunities (buy premium)
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700">
              <Tip label="Opportunity Type">
                <p className="mb-1 font-semibold">Opportunity Type</p>
                <p className="text-xs">High IV = good for selling options. Low IV = good for buying options.</p>
              </Tip>
            </label>
            <select
              value={opportunity}
              onChange={(e) => setOpportunity(e.target.value as any)}
              className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
            >
              <option value="high">High IV (Sell Premium)</option>
              <option value="low">Low IV (Buy Premium)</option>
              <option value="both">Both</option>
            </select>
          </div>

          {(opportunity === "high" || opportunity === "both") && (
            <div>
              <label className="text-xs font-semibold text-zinc-700">
                <Tip label="Min IV Rank">
                  <p className="mb-1 font-semibold">Minimum IV Rank</p>
                  <p className="text-xs">Current IV percentile vs 52-week range. 70+ = elevated IV.</p>
                </Tip>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={minIVRank}
                onChange={(e) => setMinIVRank(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              />
            </div>
          )}

          {(opportunity === "low" || opportunity === "both") && (
            <div>
              <label className="text-xs font-semibold text-zinc-700">
                <Tip label="Max IV Rank">
                  <p className="mb-1 font-semibold">Maximum IV Rank</p>
                  <p className="text-xs">Look for stocks with depressed IV. 30 or below = opportunity to buy cheap options.</p>
                </Tip>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={maxIVRank}
                onChange={(e) => setMaxIVRank(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={handleRunScreen}
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Screening..." : "Run Screen"}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Symbol</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Price</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">IV Rank</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Current IV</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Avg IV</th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-700">Opportunity</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Score</th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {results.map((result, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-semibold text-zinc-900">{result.symbol}</td>
                    <td className="px-4 py-3 text-right">${result.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${result.ivRank > 70 ? "text-red-700" : result.ivRank < 30 ? "text-green-700" : "text-zinc-700"}`}>
                        {result.ivRank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{(result.currentIV * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{(result.avgIV * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        result.opportunity === "sell" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                      }`}>
                        {result.opportunity === "sell" ? "Sell Premium" : "Buy Premium"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900">{result.score}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onAnalyze?.(result.symbol)}
                        className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          Run the screener to find volatility opportunities
        </div>
      )}
    </div>
  );
}
