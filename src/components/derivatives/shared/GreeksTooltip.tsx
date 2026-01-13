// Greeks Tooltip Component
// Displays comprehensive option data on hover with educational tooltips

"use client";

import { OptionContract } from "@/types/derivatives";

interface GreeksTooltipProps {
  contract: OptionContract;
  type: "call" | "put";
  underlyingPrice: number;
}

export default function GreeksTooltip({
  contract,
  type,
  underlyingPrice,
}: GreeksTooltipProps) {
  // Calculate mid price
  const midPrice = contract.bid && contract.ask
    ? (contract.bid + contract.ask) / 2
    : contract.last || 0;

  // Calculate break-even
  const breakEven = type === "call"
    ? contract.strike + midPrice
    : contract.strike - midPrice;

  // Calculate Vol/OI ratio
  const volOiRatio = contract.open_interest > 0
    ? contract.volume / contract.open_interest
    : 0;

  const isUnusualActivity = volOiRatio > 1;

  return (
    <div className="absolute z-50 w-80 rounded-lg border border-neutral-700 bg-neutral-900 p-4 shadow-2xl">
      {/* Header */}
      <div className="mb-3 border-b border-neutral-700 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            {contract.symbol} {type.toUpperCase()}
          </span>
          <span className="text-xs text-neutral-400">
            Strike: ${contract.strike}
          </span>
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Bid × Ask</span>
          <span className="text-white">
            ${contract.bid?.toFixed(2) || "—"} × ${contract.ask?.toFixed(2) || "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Mid Price</span>
          <span className="font-semibold text-white">${midPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Last</span>
          <span className="text-white">${contract.last?.toFixed(2) || "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-blue-400">Break-Even</span>
          <span className="font-semibold text-blue-400">${breakEven.toFixed(2)}</span>
        </div>
      </div>

      {/* Greeks */}
      <div className="mb-3 space-y-1 border-t border-neutral-700 pt-2">
        <div className="mb-1 text-xs font-semibold text-neutral-300">
          Greeks
        </div>

        {/* Delta */}
        <div className="group flex justify-between text-sm">
          <span className="flex items-center gap-1 text-neutral-400">
            Δ Delta
            <span className="hidden group-hover:inline-block text-xs text-neutral-500">
              (rate of change)
            </span>
          </span>
          <span className="font-mono text-white">
            {contract.delta?.toFixed(3) || "—"}
          </span>
        </div>

        {/* Gamma */}
        <div className="group flex justify-between text-sm">
          <span className="flex items-center gap-1 text-neutral-400">
            Γ Gamma
            <span className="hidden group-hover:inline-block text-xs text-neutral-500">
              (delta acceleration)
            </span>
          </span>
          <span className="font-mono text-white">
            {contract.gamma?.toFixed(4) || "—"}
          </span>
        </div>

        {/* Theta */}
        <div className="group flex justify-between text-sm">
          <span className="flex items-center gap-1 text-neutral-400">
            Θ Theta
            <span className="hidden group-hover:inline-block text-xs text-neutral-500">
              (time decay/day)
            </span>
          </span>
          <span className="font-mono text-red-400">
            {contract.theta?.toFixed(3) || "—"}
          </span>
        </div>

        {/* Vega */}
        <div className="group flex justify-between text-sm">
          <span className="flex items-center gap-1 text-neutral-400">
            ν Vega
            <span className="hidden group-hover:inline-block text-xs text-neutral-500">
              (IV sensitivity)
            </span>
          </span>
          <span className="font-mono text-white">
            {contract.vega?.toFixed(3) || "—"}
          </span>
        </div>

        {/* Rho */}
        <div className="group flex justify-between text-sm">
          <span className="flex items-center gap-1 text-neutral-400">
            ρ Rho
            <span className="hidden group-hover:inline-block text-xs text-neutral-500">
              (rate sensitivity)
            </span>
          </span>
          <span className="font-mono text-white">
            {contract.rho?.toFixed(3) || "—"}
          </span>
        </div>
      </div>

      {/* Implied Volatility */}
      <div className="mb-3 space-y-1 border-t border-neutral-700 pt-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Implied Vol</span>
          <span className="text-white">
            {contract.implied_volatility
              ? `${(contract.implied_volatility * 100).toFixed(1)}%`
              : "—"}
          </span>
        </div>
      </div>

      {/* Volume & Open Interest */}
      <div className="space-y-1 border-t border-neutral-700 pt-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Volume</span>
          <span className="text-white">{contract.volume?.toLocaleString() || "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Open Interest</span>
          <span className="text-white">
            {contract.open_interest?.toLocaleString() || "—"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className={isUnusualActivity ? "text-orange-400" : "text-neutral-400"}>
            Vol/OI Ratio
            {isUnusualActivity && <span className="ml-1">🔥</span>}
          </span>
          <span className={isUnusualActivity ? "text-orange-400 font-semibold" : "text-white"}>
            {volOiRatio.toFixed(2)}
          </span>
        </div>

        {isUnusualActivity && (
          <div className="mt-2 rounded bg-orange-500/10 border border-orange-500/20 p-2 text-xs text-orange-300">
            <strong>Unusual Activity!</strong> Today's volume exceeds total open interest.
          </div>
        )}
      </div>

      {/* Educational Hint */}
      <div className="mt-3 border-t border-neutral-700 pt-2 text-xs text-neutral-500">
        <strong>Tip:</strong> {type === "call" ? "Calls" : "Puts"} profit when stock moves{" "}
        {type === "call" ? "above" : "below"} break-even (${breakEven.toFixed(2)})
      </div>
    </div>
  );
}
