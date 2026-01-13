// Open Interest Heatmap Component
// Visual representation of OI concentration across strikes

"use client";

import type { MassiveOptionLeg } from "@/lib/derivatives/massive";
import { useMemo } from "react";

interface OIHeatmapProps {
  calls: MassiveOptionLeg[];
  puts: MassiveOptionLeg[];
  underlying: number;
}

export default function OIHeatmap({ calls, puts, underlying }: OIHeatmapProps) {
  // Find max OI for scaling
  const maxCallOI = useMemo(() => {
    return Math.max(...calls.map((c) => c.open_interest || 0), 1);
  }, [calls]);

  const maxPutOI = useMemo(() => {
    return Math.max(...puts.map((p) => p.open_interest || 0), 1);
  }, [puts]);

  // Combine and sort by strike
  const combinedData = useMemo(() => {
    const strikes = new Set([
      ...calls.map((c) => c.strike),
      ...puts.map((p) => p.strike),
    ]);

    return Array.from(strikes)
      .sort((a, b) => a - b)
      .map((strike) => {
        const call = calls.find((c) => c.strike === strike);
        const put = puts.find((p) => p.strike === strike);

        const callOI = call?.open_interest || 0;
        const putOI = put?.open_interest || 0;

        // Check for unusual activity
        const callVolOI = call && call.open_interest && call.open_interest > 0 && call.volume
          ? call.volume / call.open_interest
          : 0;
        const putVolOI = put && put.open_interest && put.open_interest > 0 && put.volume
          ? put.volume / put.open_interest
          : 0;

        const isATM = Math.abs(strike - underlying) < underlying * 0.02; // Within 2%

        return {
          strike,
          callOI,
          putOI,
          callWidth: (callOI / maxCallOI) * 100,
          putWidth: (putOI / maxPutOI) * 100,
          callUnusual: callVolOI > 1,
          putUnusual: putVolOI > 1,
          isATM,
        };
      });
  }, [calls, puts, underlying, maxCallOI, maxPutOI]);

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Open Interest Heatmap
        </h3>
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-green-500/50" />
            <span>Calls</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded bg-red-500/50" />
            <span>Puts</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🔥</span>
            <span>Unusual</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="space-y-1">
        {combinedData.map((data) => (
          <div
            key={data.strike}
            className={`flex items-center gap-2 ${
              data.isATM ? "rounded bg-yellow-500/10" : ""
            }`}
          >
            {/* Calls (left side) */}
            <div className="flex w-1/2 justify-end">
              <div
                className="relative h-6 rounded-l bg-green-500/50 transition-all hover:bg-green-500/70"
                style={{ width: `${data.callWidth}%` }}
              >
                {data.callOI > 0 && data.callWidth > 30 && (
                  <span className="absolute right-2 top-0.5 text-xs font-medium text-white">
                    {data.callOI.toLocaleString()}
                    {data.callUnusual && " 🔥"}
                  </span>
                )}
              </div>
            </div>

            {/* Strike price (center) */}
            <div
              className={`w-16 text-center text-xs font-medium ${
                data.isATM
                  ? "text-yellow-400"
                  : "text-neutral-300"
              }`}
            >
              ${data.strike}
            </div>

            {/* Puts (right side) */}
            <div className="flex w-1/2 justify-start">
              <div
                className="relative h-6 rounded-r bg-red-500/50 transition-all hover:bg-red-500/70"
                style={{ width: `${data.putWidth}%` }}
              >
                {data.putOI > 0 && data.putWidth > 30 && (
                  <span className="absolute left-2 top-0.5 text-xs font-medium text-white">
                    {data.putOI.toLocaleString()}
                    {data.putUnusual && " 🔥"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend / Insights */}
      <div className="mt-4 space-y-2 border-t border-neutral-700 pt-3 text-xs text-neutral-400">
        <div>
          <strong className="text-neutral-300">How to read:</strong>
        </div>
        <ul className="ml-4 space-y-1 list-disc">
          <li>
            <strong>Long bars:</strong> High institutional interest at that strike
          </li>
          <li>
            <strong>Yellow highlight:</strong> At-the-money strikes
          </li>
          <li>
            <strong>🔥 Fire icons:</strong> Unusual activity today (Vol/OI &gt; 1)
          </li>
          <li>
            <strong>Concentrated areas:</strong> Potential support/resistance levels
          </li>
        </ul>

        {/* Analysis */}
        {(() => {
          const totalCallOI = combinedData.reduce((sum, d) => sum + d.callOI, 0);
          const totalPutOI = combinedData.reduce((sum, d) => sum + d.putOI, 0);
          const ratio = totalCallOI / (totalPutOI || 1);

          return (
            <div className="mt-3 rounded bg-blue-500/10 border border-blue-500/20 p-2">
              <div className="font-semibold text-blue-300">
                Put/Call OI Ratio: {ratio.toFixed(2)}
              </div>
              <div className="mt-1 text-neutral-300">
                {ratio > 1.5 ? (
                  <>
                    <strong>Bullish bias</strong> - More call open interest suggests
                    upside positioning
                  </>
                ) : ratio < 0.67 ? (
                  <>
                    <strong>Bearish bias</strong> - More put open interest suggests
                    downside protection
                  </>
                ) : (
                  <>
                    <strong>Balanced</strong> - Roughly equal call/put interest
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
