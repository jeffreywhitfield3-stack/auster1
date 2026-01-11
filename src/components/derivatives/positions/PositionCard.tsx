"use client";

import { Position, calculatePL, calculateDTE, mockUnderlyingPrices } from "@/lib/derivatives/mock-positions";

type PositionCardProps = {
  position: Position;
  onViewChart?: (position: Position) => void;
  onAdjust?: (position: Position) => void;
  onClose?: (position: Position) => void;
  onRoll?: (position: Position) => void;
};

function formatUSD(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function getStatusColor(position: Position, currentPrice: number): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  const { pl } = calculatePL(position);
  const [lowerBE, upperBE] = position.breakevens.length === 2
    ? [Math.min(...position.breakevens), Math.max(...position.breakevens)]
    : [position.breakevens[0], position.breakevens[0]];

  // Check breakeven breach for iron condor
  if (position.breakevens.length === 2) {
    const margin = (upperBE - lowerBE) * 0.1; // 10% margin
    if (currentPrice < lowerBE || currentPrice > upperBE) {
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-600",
        badge: "Breached BE",
      };
    }
    if (currentPrice < lowerBE + margin || currentPrice > upperBE - margin) {
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        badge: "Near BE",
      };
    }
  } else {
    // Single breakeven - directional trade
    const isBullish = position.strategyType.includes("bull") || position.strategyType.includes("call");
    const margin = position.breakevens[0] * 0.05; // 5% margin

    if ((isBullish && currentPrice < position.breakevens[0]) ||
        (!isBullish && currentPrice > position.breakevens[0])) {
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-600",
        badge: "Below BE",
      };
    }

    if ((isBullish && currentPrice < position.breakevens[0] + margin) ||
        (!isBullish && currentPrice > position.breakevens[0] - margin)) {
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        badge: "Near BE",
      };
    }
  }

  // Check P/L
  if (pl > 0) {
    return {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-600",
      badge: "Profitable",
    };
  }

  return {
    bg: "bg-zinc-50",
    border: "border-zinc-200",
    text: "text-zinc-600",
    badge: "At Entry",
  };
}

export default function PositionCard({
  position,
  onViewChart,
  onAdjust,
  onClose,
  onRoll,
}: PositionCardProps) {
  const { pl, plPct } = calculatePL(position);
  const dte = calculateDTE(position.expiration);
  const currentUnderlying = mockUnderlyingPrices[position.symbol] || 0;
  const statusColors = getStatusColor(position, currentUnderlying);

  const plColor = pl >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className={`rounded-2xl border ${statusColors.border} ${statusColors.bg} p-5 transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{position.strategyName}</h3>
          <p className="mt-1 text-sm text-zinc-600">
            {position.legs.map((leg, i) => (
              <span key={i}>
                {i > 0 && " / "}
                {leg.action === "buy" ? "+" : "-"}
                {leg.quantity} {position.symbol} ${leg.strike}
                {leg.type === "call" ? "C" : "P"}
              </span>
            ))}
          </p>
        </div>
        <div className={`rounded-full border ${statusColors.border} bg-white px-3 py-1 text-xs font-semibold ${statusColors.text}`}>
          {statusColors.badge}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">P/L</div>
          <div className={`mt-1 text-lg font-bold ${plColor}`}>
            {formatUSD(pl)}
          </div>
          <div className={`text-xs font-semibold ${plColor}`}>
            {pl >= 0 ? "+" : ""}{formatPercent(plPct)}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Days Left</div>
          <div className="mt-1 text-lg font-bold text-zinc-900">
            {dte}
          </div>
          <div className="text-xs text-zinc-600">
            {dte <= 3 ? "⚠️ Expiring soon" : "to expiration"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Max Profit</div>
          <div className="mt-1 text-lg font-bold text-green-600">
            {formatUSD(position.maxProfit)}
          </div>
          <div className="text-xs text-zinc-600">
            {position.maxProfit > 0 && pl > 0
              ? `${formatPercent(pl / position.maxProfit)} to max`
              : "potential"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">Max Loss</div>
          <div className="mt-1 text-lg font-bold text-red-600">
            {formatUSD(position.maxLoss)}
          </div>
          <div className="text-xs text-zinc-600">
            at risk
          </div>
        </div>
      </div>

      {/* Current Price & Breakevens */}
      <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <div className="text-xs text-zinc-500">Current Price</div>
            <div className="mt-1 text-base font-semibold text-zinc-900">
              ${currentUnderlying.toFixed(2)}
            </div>
          </div>
          {position.breakevens.map((be, i) => (
            <div key={i}>
              <div className="text-xs text-zinc-500">
                {position.breakevens.length === 2
                  ? i === 0 ? "Lower BE" : "Upper BE"
                  : "Breakeven"}
              </div>
              <div className="mt-1 text-base font-semibold text-zinc-900">
                ${be.toFixed(2)}
              </div>
            </div>
          ))}
          <div>
            <div className="text-xs text-zinc-500">POP</div>
            <div className="mt-1 text-base font-semibold text-zinc-900">
              {formatPercent(position.pop)}
            </div>
          </div>
        </div>

        {/* Status message */}
        {position.breakevens.length === 2 ? (
          <div className="mt-3 text-sm text-zinc-600">
            {currentUnderlying >= Math.min(...position.breakevens) &&
             currentUnderlying <= Math.max(...position.breakevens)
              ? `✓ Price is between breakevens (${Math.min(...position.breakevens).toFixed(2)} - ${Math.max(...position.breakevens).toFixed(2)})`
              : `⚠️ Price outside breakeven range`}
          </div>
        ) : (
          <div className="mt-3 text-sm text-zinc-600">
            {((position.strategyType.includes("bull") || position.strategyType.includes("call")) &&
              currentUnderlying >= position.breakevens[0]) ||
             ((position.strategyType.includes("bear") || position.strategyType.includes("put")) &&
              currentUnderlying <= position.breakevens[0])
              ? `✓ Above breakeven (${position.breakevens[0].toFixed(2)})`
              : `⚠️ Below breakeven (${position.breakevens[0].toFixed(2)})`}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          onClick={() => onViewChart?.(position)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          View Chart
        </button>
        <button
          onClick={() => onAdjust?.(position)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Adjust
        </button>
        <button
          onClick={() => onClose?.(position)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Close
        </button>
        <button
          onClick={() => onRoll?.(position)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Roll
        </button>
      </div>

      {/* Expiration warning */}
      {dte <= 7 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">⚠️ {dte} days to expiration</span> - Consider closing or rolling this
          position soon.
        </div>
      )}

      {/* Profit target reached */}
      {pl > 0 && position.maxProfit > 0 && (pl / position.maxProfit) >= 0.5 && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <span className="font-semibold">🎯 {formatPercent(pl / position.maxProfit)} of max profit reached</span> -
          Many traders close at 50% profit target.
        </div>
      )}
    </div>
  );
}
