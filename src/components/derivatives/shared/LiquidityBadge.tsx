"use client";

import Tip from "../Tip";

type LiquidityLevel = "high" | "moderate" | "low";

interface LiquidityBadgeProps {
  openInterest?: number | null;
  volume?: number | null;
  bidAskSpread?: number | null;
  showTooltip?: boolean;
}

/**
 * Determines liquidity level based on:
 * - High: OI > 1K, Vol > 100, Spread < 5%
 * - Moderate: OI > 500, Vol > 50, Spread < 10%
 * - Low: Below thresholds
 */
function getLiquidityLevel(
  openInterest?: number | null,
  volume?: number | null,
  spread?: number | null
): LiquidityLevel {
  const oi = openInterest ?? 0;
  const vol = volume ?? 0;
  const spreadPct = spread ?? 100;

  if (oi > 1000 && vol > 100 && spreadPct < 5) {
    return "high";
  }
  if (oi > 500 && vol > 50 && spreadPct < 10) {
    return "moderate";
  }
  return "low";
}

export default function LiquidityBadge({
  openInterest,
  volume,
  bidAskSpread,
  showTooltip = true,
}: LiquidityBadgeProps) {
  const level = getLiquidityLevel(openInterest, volume, bidAskSpread);

  const styles = {
    high: "bg-green-100 text-green-800 border-green-200",
    moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-red-100 text-red-800 border-red-200",
  };

  const labels = {
    high: "High",
    moderate: "Moderate",
    low: "Low",
  };

  const tooltips = {
    high: "High liquidity - tight spreads, good fill probability. Safe to trade.",
    moderate: "Moderate liquidity - acceptable spreads. Use limit orders.",
    low: "Low liquidity - wide spreads, risky fills. You may not get filled at these prices. Consider avoiding or use very conservative limit orders.",
  };

  const badge = (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );

  if (showTooltip) {
    return (
      <Tip label={badge}>
        <p className="mb-2 font-semibold">{labels[level]} Liquidity</p>
        <p>{tooltips[level]}</p>
        {openInterest !== null && openInterest !== undefined && (
          <p className="mt-2 text-[11px]">
            Open Interest: {openInterest.toLocaleString()}
          </p>
        )}
        {volume !== null && volume !== undefined && (
          <p className="text-[11px]">Volume: {volume.toLocaleString()}</p>
        )}
        {bidAskSpread !== null && bidAskSpread !== undefined && (
          <p className="text-[11px]">
            Spread: {bidAskSpread.toFixed(2)}%
          </p>
        )}
      </Tip>
    );
  }

  return badge;
}
