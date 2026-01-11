"use client";

import { useState } from "react";
import Tip from "@/components/derivatives/Tip";

type AnomalyData = {
  ticker: string;
  date: string;
  transactions: number;
  avgTransactions: number;
  stdTransactions?: number;
  zScore: number;
  priceChange?: number;
  priceChangePct: number;
  volume: number;
  close: number;
  anomalyType?: "high_volume" | "extreme_volume";
};

type ScreenerResponse = {
  tickersScanned: number;
  anomaliesFound: number;
  minZScore: number;
  anomalies: AnomalyData[];
  timestamp: string;
};

type AnomalyDetectionScreenerProps = {
  onAnalyzeChain?: (symbol: string) => void;
};

function fmtNum(x: number | null | undefined, digits = 2) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtPct(x: number | null | undefined, digits = 2) {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return `${x >= 0 ? "+" : ""}${x.toFixed(digits)}%`;
}

function getAnomalyStrengthColor(zScore: number): string {
  if (zScore >= 10) return "bg-red-100 border-red-300 text-red-900";
  if (zScore >= 6) return "bg-orange-100 border-orange-300 text-orange-900";
  return "bg-yellow-100 border-yellow-300 text-yellow-900";
}

function getAnomalyStrengthLabel(zScore: number): string {
  if (zScore >= 10) return "EXTREME";
  if (zScore >= 6) return "HIGH";
  return "ELEVATED";
}

function AnomalyStrengthIndicator({ zScore }: { zScore: number }) {
  const strength = getAnomalyStrengthLabel(zScore);
  const colorClass = getAnomalyStrengthColor(zScore);

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full border px-2 py-0.5 text-xs font-bold ${colorClass}`}>
        {strength}
      </div>
      <div className="text-xs text-zinc-600">z={zScore.toFixed(2)}</div>
    </div>
  );
}

const POPULAR_TICKERS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
  "JPM", "BAC", "GS", "WFC",
  "DIS", "NKE", "SBUX", "MCD",
  "JNJ", "UNH", "PFE",
  "AMC", "GME", "PLTR", "RIVN",
  "SPY", "QQQ", "IWM"
];

export default function AnomalyDetectionScreener({
  onAnalyzeChain,
}: AnomalyDetectionScreenerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScreenerResponse | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyData | null>(null);

  // Filters
  const [minZScore, setMinZScore] = useState(3);
  const [maxResults, setMaxResults] = useState(50);
  const [customTickers, setCustomTickers] = useState("");
  const [useCustomTickers, setUseCustomTickers] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  async function runScreen() {
    setBusy(true);
    setError(null);
    setResults(null);
    setSelectedAnomaly(null);

    try {
      const tickers = useCustomTickers && customTickers.trim()
        ? customTickers.split(",").map(t => t.trim().toUpperCase()).filter(Boolean)
        : POPULAR_TICKERS;

      const res = await fetch("/api/derivatives/screener-anomalies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tickers,
          minZScore,
          maxResults,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      setResults(data);

      if (data.anomalies && data.anomalies.length > 0) {
        setSelectedAnomaly(data.anomalies[0]);
      }
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-zinc-900">
              Anomaly Detection Screener
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Find stocks with unusual volume spikes using z-score analysis.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowMethodology(!showMethodology)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              How It Works
            </button>
            <button
              onClick={runScreen}
              disabled={busy}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {busy ? "Scanning..." : "Scan Market"}
            </button>
          </div>
        </div>

        {/* Methodology Panel */}
        {showMethodology && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <div className="font-semibold">Polygon/Massive Anomaly Detection</div>
            <div className="mt-2 space-y-2 text-xs leading-relaxed">
              <p>
                <strong>How it works:</strong> We analyze trading activity using statistical z-scores
                to detect unusual volume patterns.
              </p>
              <p>
                <strong>Z-score formula:</strong> (current_transactions - avg_transactions) / std_deviation
              </p>
              <p>
                <strong>Threshold:</strong> Z-score &gt; 3 indicates activity 3 standard deviations above
                normal (99.7% confidence interval).
              </p>
              <p>
                <strong>Window:</strong> 5-day rolling average for baseline comparison.
              </p>
              <p>
                <strong>What it means:</strong> Higher z-scores indicate unusual institutional or retail
                activity. Often precedes significant price moves or option activity.
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Min Z-Score">
                Minimum z-score threshold. Higher = more unusual activity. 3 = 99.7% confidence.
              </Tip>
            </div>
            <input
              type="number"
              step={0.5}
              min={1}
              max={15}
              value={minZScore}
              onChange={(e) => setMinZScore(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-700">
              <Tip label="Max Results">
                Maximum number of anomalies to return, sorted by z-score.
              </Tip>
            </div>
            <input
              type="number"
              min={10}
              max={100}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomTickers"
                checked={useCustomTickers}
                onChange={(e) => setUseCustomTickers(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="useCustomTickers" className="text-xs font-semibold text-zinc-700">
                Custom Tickers (comma-separated)
              </label>
            </div>
            <input
              type="text"
              value={customTickers}
              onChange={(e) => setCustomTickers(e.target.value)}
              disabled={!useCustomTickers}
              placeholder="AAPL, MSFT, TSLA"
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm disabled:bg-zinc-50 disabled:text-zinc-400"
            />
          </div>
        </div>

        {!useCustomTickers && (
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
            Scanning {POPULAR_TICKERS.length} popular tickers by default. Enable custom tickers to scan your own watchlist.
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs text-zinc-600">Tickers Scanned</div>
            <div className="mt-1 text-2xl font-bold text-zinc-900">
              {results.tickersScanned}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs text-zinc-600">Anomalies Found</div>
            <div className="mt-1 text-2xl font-bold text-orange-600">
              {results.anomaliesFound}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs text-zinc-600">Min Z-Score</div>
            <div className="mt-1 text-2xl font-bold text-zinc-900">
              {results.minZScore.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="min-w-full w-full text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left">Rank</th>
                  <th className="px-3 py-2 text-left">Ticker</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Transactions</th>
                  <th className="px-3 py-2 text-right">Avg</th>
                  <th className="px-3 py-2 text-left">Anomaly</th>
                  <th className="px-3 py-2 text-right">Price Change</th>
                  <th className="px-3 py-2 text-right">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(results?.anomalies ?? []).map((a, i) => (
                  <tr
                    key={i}
                    className={`cursor-pointer hover:bg-zinc-50 ${
                      selectedAnomaly === a ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedAnomaly(a)}
                  >
                    <td className="px-3 py-2 text-zinc-600">#{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-zinc-900">{a.ticker}</div>
                      <div className="text-xs text-zinc-500">${a.close.toFixed(2)}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-600 text-xs">{a.date}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="font-semibold text-zinc-900">{fmtNum(a.transactions, 0)}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-600">
                      {fmtNum(a.avgTransactions, 0)}
                    </td>
                    <td className="px-3 py-2">
                      <AnomalyStrengthIndicator zScore={a.zScore} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`font-semibold ${
                          a.priceChangePct >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {fmtPct(a.priceChangePct, 2)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-zinc-600">
                      {fmtNum(a.volume, 0)}
                    </td>
                  </tr>
                ))}
                {!results?.anomalies?.length && !busy && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-zinc-600">
                      Run the screener to detect anomalies
                    </td>
                  </tr>
                )}
                {busy && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-zinc-600">
                      Scanning market for anomalies...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-4">
          {selectedAnomaly ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-zinc-900">
                    {selectedAnomaly.ticker}
                  </div>
                  <div className="text-sm text-zinc-600">{selectedAnomaly.date}</div>
                </div>
                <AnomalyStrengthIndicator zScore={selectedAnomaly.zScore} />
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-600">Z-Score Analysis</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Z-Score</span>
                      <span className="font-bold text-zinc-900">
                        {selectedAnomaly.zScore.toFixed(2)}σ
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Transactions</span>
                      <span className="font-semibold text-zinc-900">
                        {fmtNum(selectedAnomaly.transactions, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">5-Day Avg</span>
                      <span className="text-zinc-600">
                        {fmtNum(selectedAnomaly.avgTransactions, 0)}
                      </span>
                    </div>
                    {selectedAnomaly.stdTransactions && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Std Dev</span>
                        <span className="text-zinc-600">
                          {fmtNum(selectedAnomaly.stdTransactions, 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-600">Price Action</div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Close</span>
                      <span className="font-semibold text-zinc-900">
                        ${selectedAnomaly.close.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Change</span>
                      <span
                        className={`font-semibold ${
                          selectedAnomaly.priceChangePct >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {fmtPct(selectedAnomaly.priceChangePct, 2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Volume</span>
                      <span className="text-zinc-900">
                        {fmtNum(selectedAnomaly.volume, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 leading-relaxed">
                  <div className="font-semibold">What This Means</div>
                  <div className="mt-2">
                    {selectedAnomaly.zScore >= 10 && (
                      <>
                        Extreme anomaly detected. Transaction volume is {selectedAnomaly.zScore.toFixed(1)}x
                        standard deviations above normal. This level of activity is extremely rare and often
                        indicates major institutional positioning or unusual retail interest.
                      </>
                    )}
                    {selectedAnomaly.zScore >= 6 && selectedAnomaly.zScore < 10 && (
                      <>
                        High anomaly detected. Transaction volume significantly exceeds normal patterns.
                        Monitor for continued unusual activity and consider analyzing the options chain
                        for directional bias.
                      </>
                    )}
                    {selectedAnomaly.zScore < 6 && (
                      <>
                        Elevated trading activity detected. Volume is notably above average but not extreme.
                        This could indicate growing interest or early positioning before a larger move.
                      </>
                    )}
                  </div>
                </div>

                {selectedAnomaly.anomalyType && (
                  <div className={`rounded-xl border p-3 text-xs ${
                    selectedAnomaly.anomalyType === "extreme_volume"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-orange-200 bg-orange-50 text-orange-900"
                  }`}>
                    <div className="font-semibold">
                      {selectedAnomaly.anomalyType === "extreme_volume" ? "EXTREME" : "HIGH"} VOLUME
                    </div>
                    <div className="mt-1">
                      {selectedAnomaly.anomalyType === "extreme_volume"
                        ? "Institutional-level activity. Consider options flow analysis."
                        : "Notable increase in activity. Watch for continuation."}
                    </div>
                  </div>
                )}
              </div>

              {onAnalyzeChain && (
                <button
                  onClick={() => onAnalyzeChain(selectedAnomaly.ticker)}
                  className="mt-4 w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Analyze Options Chain
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">
                Click an anomaly to see detailed analysis
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Educational Info */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <div className="text-sm font-semibold text-zinc-900">About Anomaly Detection</div>
        <div className="mt-3 grid gap-3 text-xs text-zinc-700 sm:grid-cols-2">
          <div>
            <div className="font-semibold">Statistical Method</div>
            <div className="mt-1 leading-relaxed">
              Uses z-score analysis to detect transaction volumes that deviate significantly from
              historical norms. A z-score of 3+ means the activity is 3 standard deviations above
              the 5-day average.
            </div>
          </div>
          <div>
            <div className="font-semibold">Trading Application</div>
            <div className="mt-1 leading-relaxed">
              Unusual volume often precedes price moves. High z-scores can indicate institutional
              positioning, earnings anticipation, or major news. Use this to identify candidates for
              options strategies.
            </div>
          </div>
          <div>
            <div className="font-semibold">Data Source</div>
            <div className="mt-1 leading-relaxed">
              Powered by Polygon/Massive aggregated market data. Transaction counts represent the
              number of individual trades, not total volume.
            </div>
          </div>
          <div>
            <div className="font-semibold">Best Practices</div>
            <div className="mt-1 leading-relaxed">
              Combine with options flow analysis and fundamental catalysts. Higher z-scores are more
              significant. Watch for correlation with price movement direction.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
