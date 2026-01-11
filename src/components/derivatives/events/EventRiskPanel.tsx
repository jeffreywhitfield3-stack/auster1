"use client";

import { useState } from "react";
import { getEarningsForTicker, daysUntilEarnings } from "@/lib/derivatives/mock-earnings";
import Tip from "../Tip";

interface EventRiskPanelProps {
  ticker: string;
  compact?: boolean; // For use in Chain/Builder tabs
}

type RiskLevel = "high" | "medium" | "low";

function getRiskLevel(daysUntil: number): RiskLevel {
  if (daysUntil <= 3) return "high";
  if (daysUntil <= 7) return "medium";
  return "low";
}

export default function EventRiskPanel({
  ticker,
  compact = false,
}: EventRiskPanelProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const earningsEvent = getEarningsForTicker(ticker);

  // If no earnings event for this ticker, don't render anything
  if (!earningsEvent) {
    return null;
  }

  const daysUntil = daysUntilEarnings(earningsEvent.date);

  // Only show if earnings are within 14 days
  if (daysUntil > 14) {
    return null;
  }

  const riskLevel = getRiskLevel(daysUntil);
  const rangeLow = earningsEvent.currentPrice - earningsEvent.expectedMove;
  const rangeHigh = earningsEvent.currentPrice + earningsEvent.expectedMove;

  const riskStyles = {
    high: {
      bg: "bg-red-50",
      border: "border-red-300",
      text: "text-red-900",
      badge: "bg-red-100 text-red-800 border-red-200",
    },
    medium: {
      bg: "bg-yellow-50",
      border: "border-yellow-300",
      text: "text-yellow-900",
      badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    low: {
      bg: "bg-blue-50",
      border: "border-blue-300",
      text: "text-blue-900",
      badge: "bg-blue-100 text-blue-800 border-blue-200",
    },
  };

  const style = riskStyles[riskLevel];

  if (compact) {
    return (
      <div
        className={`rounded-lg border ${style.border} ${style.bg} p-3`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${style.text}`}>
                {ticker} has earnings in {daysUntil === 0 ? "today" : daysUntil === 1 ? "1 day" : `${daysUntil} days`}
              </p>
              <p className={`mt-1 font-mono text-xs ${style.text}`}>
                Expected move: ±${earningsEvent.(expectedMove ?? 0).toFixed(2)} (
                {earningsEvent.expectedMovePct.toFixed(1)}%)
              </p>
            </div>
          </div>
          <Tip
            label={
              <span className="text-xs font-semibold text-zinc-600">
                More Info
              </span>
            }
          >
            <p className="mb-2 font-semibold">Earnings Event Risk</p>
            <p className="mb-2 text-[11px]">
              <span className="font-semibold">Date:</span>{" "}
              {earningsEvent.date} ({earningsEvent.time})
            </p>
            <p className="mb-2 text-[11px]">
              <span className="font-semibold">Expected Range:</span> $
              {(rangeLow ?? 0).toFixed(2)} - ${(rangeHigh ?? 0).toFixed(2)}
            </p>
            <p className="text-[11px]">
              Options strategies should account for this potential volatility.
              Consider placing iron condor wings outside the expected move range.
            </p>
          </Tip>
        </div>

        {/* Mini Expected Move Visualization */}
        <div className="mt-2">
          <div className="relative h-6 rounded bg-gradient-to-r from-red-100 via-yellow-50 to-red-100">
            <div className="absolute left-0 top-0 h-full w-0.5 bg-red-400" />
            <div className="absolute right-0 top-0 h-full w-0.5 bg-red-400" />
            <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-zinc-900" />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-600">
            <span>${rangeLow.toFixed(0)}</span>
            <span className="font-semibold">${earningsEvent.currentPrice.toFixed(0)}</span>
            <span>${rangeHigh.toFixed(0)}</span>
          </div>
        </div>

        {/* Suggestions Toggle */}
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className={`mt-2 w-full rounded-md px-2 py-1 text-xs font-semibold ${
            showSuggestions
              ? "bg-zinc-900 text-white"
              : "bg-white text-zinc-900 hover:bg-zinc-50"
          }`}
        >
          {showSuggestions ? "Hide" : "Show"} Strategy Suggestions
        </button>

        {showSuggestions && (
          <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
            <p className="text-xs font-semibold text-zinc-900">
              Consider These Approaches:
            </p>
            <ul className="space-y-1 text-xs text-zinc-700">
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>Close existing positions before earnings to avoid risk</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>
                  Use iron condors with wings outside ${rangeLow.toFixed(0)} - $
                  {rangeHigh.toFixed(0)}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>
                  Sell premium after earnings to capture IV crush
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400">•</span>
                <span>
                  If holding through earnings, ensure adequate margin and risk management
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Full (non-compact) version
  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg} p-6`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className={`text-lg font-semibold ${style.text}`}>
              Earnings Event Detected
            </h3>
            <p className={`mt-1 text-sm ${style.text}`}>
              {ticker} reports earnings in{" "}
              {daysUntil === 0
                ? "today"
                : daysUntil === 1
                  ? "1 day"
                  : `${daysUntil} days`}{" "}
              ({earningsEvent.date} {earningsEvent.time})
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${style.badge}`}
        >
          {riskLevel.toUpperCase()} RISK
        </span>
      </div>

      {/* Expected Move Display */}
      <div className="mb-4 rounded-lg bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900">
            Expected Move
          </span>
          <span className="font-mono text-lg font-bold text-zinc-900">
            ±${earningsEvent.(expectedMove ?? 0).toFixed(2)} (
            {earningsEvent.expectedMovePct.toFixed(1)}%)
          </span>
        </div>

        {/* Range Visualization */}
        <div className="space-y-2">
          <div className="relative h-10 rounded-lg bg-gradient-to-r from-red-100 via-yellow-50 to-red-100">
            <div className="absolute left-0 top-0 h-full w-1 bg-red-400" />
            <div className="absolute right-0 top-0 h-full w-1 bg-red-400" />
            <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-zinc-900" />
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">
              Current
            </div>
          </div>
          <div className="flex items-center justify-between text-sm font-mono">
            <span className="text-zinc-600">${(rangeLow ?? 0).toFixed(2)}</span>
            <span className="font-semibold text-zinc-900">
              ${earningsEvent.(currentPrice ?? 0).toFixed(2)}
            </span>
            <span className="text-zinc-600">${(rangeHigh ?? 0).toFixed(2)}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Based on ATM straddle price of ${earningsEvent.(atmStraddle ?? 0).toFixed(2)} × 0.85.
          Represents ~68% probability range (1 standard deviation).
        </p>
      </div>

      {/* Strategy Suggestions */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-zinc-900">
          Strategy Suggestions:
        </p>
        <div className="space-y-2">
          <div className="rounded-lg bg-white p-3">
            <p className="mb-1 text-sm font-semibold text-zinc-900">
              Conservative: Close Before Earnings
            </p>
            <p className="text-xs text-zinc-600">
              Exit all positions before the announcement to avoid binary risk and
              IV crush.
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="mb-1 text-sm font-semibold text-zinc-900">
              Neutral: Iron Condor Outside Expected Move
            </p>
            <p className="text-xs text-zinc-600">
              Place short strikes outside ${rangeLow.toFixed(0)} - $
              {rangeHigh.toFixed(0)} range. Collect premium if stock stays within
              expected move.
            </p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="mb-1 text-sm font-semibold text-zinc-900">
              Post-Earnings: Sell IV Crush
            </p>
            <p className="text-xs text-zinc-600">
              Wait until after earnings announcement, then sell premium as IV
              normalizes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
