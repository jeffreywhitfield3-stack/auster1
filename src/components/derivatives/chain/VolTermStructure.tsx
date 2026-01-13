// Volatility Term Structure Component
// Shows IV across all expirations to identify contango/backwardation

"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface VolTermStructureProps {
  symbol: string;
}

interface ExpirationData {
  expiration: string;
  daysToExpiration: number;
  avgCallIV: number;
  avgPutIV: number;
  avgIV: number;
  skew: number; // Put IV - Call IV
}

export default function VolTermStructure({ symbol }: VolTermStructureProps) {
  const [data, setData] = useState<ExpirationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVolTermStructure() {
      try {
        setLoading(true);
        setError(null);

        // Fetch expirations list
        const expResp = await fetch(`/api/derivatives/expirations?symbol=${symbol}`);
        if (!expResp.ok) throw new Error("Failed to fetch expirations");

        const expData = await expResp.json();
        const expirations = expData.expirations.slice(0, 10); // Limit to 10 expirations

        // Fetch chain for each expiration
        const chainPromises = expirations.map(async (exp: string) => {
          const chainResp = await fetch(
            `/api/derivatives/chain?symbol=${symbol}&expiration=${exp}`
          );
          if (!chainResp.ok) return null;

          const chainData = await chainResp.json();
          const calls = chainData.calls || [];
          const puts = chainData.puts || [];

          // Calculate average IV
          const callIVs = calls
            .map((c: any) => c.implied_volatility)
            .filter((iv: number) => iv > 0);
          const putIVs = puts
            .map((p: any) => p.implied_volatility)
            .filter((iv: number) => iv > 0);

          const avgCallIV =
            callIVs.length > 0
              ? callIVs.reduce((a: number, b: number) => a + b, 0) / callIVs.length
              : 0;

          const avgPutIV =
            putIVs.length > 0
              ? putIVs.reduce((a: number, b: number) => a + b, 0) / putIVs.length
              : 0;

          const avgIV = (avgCallIV + avgPutIV) / 2;

          // Calculate days to expiration
          const expDate = new Date(exp);
          const now = new Date();
          const daysToExpiration = Math.ceil(
            (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            expiration: exp,
            daysToExpiration,
            avgCallIV: avgCallIV * 100, // Convert to percentage
            avgPutIV: avgPutIV * 100,
            avgIV: avgIV * 100,
            skew: (avgPutIV - avgCallIV) * 100,
          };
        });

        const results = await Promise.all(chainPromises);
        const validResults = results
          .filter((r): r is ExpirationData => r !== null && r.avgIV > 0)
          .sort((a, b) => a.daysToExpiration - b.daysToExpiration);

        setData(validResults);
      } catch (err) {
        console.error("Error fetching vol term structure:", err);
        setError("Failed to load volatility term structure");
      } finally {
        setLoading(false);
      }
    }

    if (symbol) {
      fetchVolTermStructure();
    }
  }, [symbol]);

  // Analyze term structure
  const analysis = () => {
    if (data.length < 2) return null;

    const frontMonth = data[0];
    const backMonth = data[data.length - 1];

    const isContango = backMonth.avgIV > frontMonth.avgIV;
    const ivDiff = ((backMonth.avgIV - frontMonth.avgIV) / frontMonth.avgIV) * 100;

    const avgSkew =
      data.reduce((sum, d) => sum + Math.abs(d.skew), 0) / data.length;

    return {
      structure: isContango ? "Contango" : "Backwardation",
      ivDiff: Math.abs(ivDiff).toFixed(1),
      isNormal: isContango,
      avgSkew: avgSkew.toFixed(1),
      highSkew: avgSkew > 3,
    };
  };

  const insights = analysis();

  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Volatility Term Structure
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-neutral-400">Loading IV data across expirations...</div>
        </div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Volatility Term Structure
        </h3>
        <div className="text-sm text-neutral-400">
          {error || "Insufficient data to display term structure"}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6">
      {/* Header */}
      <h3 className="mb-4 text-sm font-semibold text-white">
        Volatility Term Structure
      </h3>

      {/* Chart */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
            <XAxis
              dataKey="daysToExpiration"
              stroke="#a3a3a3"
              label={{ value: "Days to Expiration", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              stroke="#a3a3a3"
              label={{ value: "Implied Volatility (%)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #404040",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#ffffff" }}
              formatter={(value?: number) => value ? `${value.toFixed(2)}%` : ''}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgIV"
              stroke="#3b82f6"
              name="Avg IV"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="avgCallIV"
              stroke="#22c55e"
              name="Call IV"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="avgPutIV"
              stroke="#ef4444"
              name="Put IV"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Analysis */}
      {insights && (
        <div className="space-y-3">
          {/* Term Structure */}
          <div
            className={`rounded-lg border p-3 ${
              insights.isNormal
                ? "border-blue-500/30 bg-blue-500/5"
                : "border-orange-500/30 bg-orange-500/5"
            }`}
          >
            <div className="mb-1 text-xs font-semibold text-neutral-300">
              Term Structure
            </div>
            <div
              className={`text-lg font-bold ${
                insights.isNormal ? "text-blue-400" : "text-orange-400"
              }`}
            >
              {insights.structure}
            </div>
            <div className="mt-1 text-xs text-neutral-300">
              {insights.isNormal ? (
                <>
                  <strong>Normal market:</strong> Back-month IV is {insights.ivDiff}%
                  higher than front-month. Typical for stable markets.
                </>
              ) : (
                <>
                  <strong>Event expected:</strong> Front-month IV is {insights.ivDiff}%
                  higher. Usually signals near-term uncertainty (earnings, Fed
                  announcement, etc).
                </>
              )}
            </div>
          </div>

          {/* Put/Call Skew */}
          <div
            className={`rounded-lg border p-3 ${
              insights.highSkew
                ? "border-red-500/30 bg-red-500/5"
                : "border-green-500/30 bg-green-500/5"
            }`}
          >
            <div className="mb-1 text-xs font-semibold text-neutral-300">
              Put/Call Skew
            </div>
            <div
              className={`text-lg font-bold ${
                insights.highSkew ? "text-red-400" : "text-green-400"
              }`}
            >
              {insights.avgSkew}% avg difference
            </div>
            <div className="mt-1 text-xs text-neutral-300">
              {insights.highSkew ? (
                <>
                  <strong>High skew:</strong> Puts are significantly more expensive than
                  calls. Market is pricing in downside risk (fear).
                </>
              ) : (
                <>
                  <strong>Normal skew:</strong> Puts and calls have similar IV.
                  Balanced market sentiment.
                </>
              )}
            </div>
          </div>

          {/* Trading Opportunities */}
          <div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3">
            <div className="mb-2 text-xs font-semibold text-neutral-300">
              💡 Trading Ideas
            </div>
            <ul className="ml-4 space-y-1 text-xs text-neutral-300 list-disc">
              {insights.isNormal ? (
                <>
                  <li>
                    <strong>Calendar spreads:</strong> Sell front-month, buy back-month
                    to profit from time decay differences
                  </li>
                  <li>
                    <strong>Sell premium:</strong> Higher back-month IV makes long-term
                    credit spreads attractive
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>Event play:</strong> Consider buying front-month options if
                    you expect volatility to expand further
                  </li>
                  <li>
                    <strong>Reverse calendar:</strong> Sell back-month, buy front-month
                    to profit if term structure normalizes
                  </li>
                </>
              )}
              {insights.highSkew && (
                <li>
                  <strong>Skew play:</strong> Sell expensive puts, buy cheaper calls
                  (risk reversal) if you're bullish
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-neutral-700">
            <tr className="text-neutral-400">
              <th className="pb-2 text-left">Expiration</th>
              <th className="pb-2 text-right">DTE</th>
              <th className="pb-2 text-right">Avg IV</th>
              <th className="pb-2 text-right">Call IV</th>
              <th className="pb-2 text-right">Put IV</th>
              <th className="pb-2 text-right">Skew</th>
            </tr>
          </thead>
          <tbody className="text-neutral-300">
            {data.map((row) => (
              <tr key={row.expiration} className="border-b border-neutral-800">
                <td className="py-2">{row.expiration}</td>
                <td className="text-right">{row.daysToExpiration}</td>
                <td className="text-right font-mono">{row.avgIV.toFixed(1)}%</td>
                <td className="text-right font-mono text-green-400">
                  {row.avgCallIV.toFixed(1)}%
                </td>
                <td className="text-right font-mono text-red-400">
                  {row.avgPutIV.toFixed(1)}%
                </td>
                <td className="text-right font-mono">
                  {row.skew > 0 ? "+" : ""}
                  {row.skew.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
