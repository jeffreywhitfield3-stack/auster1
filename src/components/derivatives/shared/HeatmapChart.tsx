"use client";

import { useMemo } from "react";

interface HeatmapChartProps {
  strategy: any; // Strategy type
  width?: number;
  height?: number;
}

/**
 * Price vs Time P&L Heatmap
 * Shows how the position P&L changes as price and time to expiration change
 * Color gradient: red (loss) to green (profit)
 */
export default function HeatmapChart({ strategy, width = 600, height = 400 }: HeatmapChartProps) {
  // For now, display a placeholder
  // Full implementation would require complex calculations for each price/time combination

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-zinc-900">Price vs Time P&L</div>

      <div
        className="flex items-center justify-center rounded-lg bg-zinc-50"
        style={{ width: '100%', height: height }}
      >
        <div className="text-center text-zinc-500">
          <div className="text-sm font-semibold">Heatmap Visualization</div>
          <div className="mt-2 text-xs">
            Price vs Time P&L analysis
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            (Advanced feature - coming soon)
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-12 rounded bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
          <span className="text-zinc-600">Loss → Profit</span>
        </div>
        <span className="text-zinc-500">X-axis: Price | Y-axis: Time</span>
      </div>
    </div>
  );
}
