// Hedge Suggestions Component
// AI-powered hedge recommendations for positions

"use client";

import { useState } from "react";
import { X, Shield, DollarSign, TrendingDown } from "lucide-react";

interface Position {
  type: "stock" | "call" | "put";
  quantity: number;
  strike?: number;
  premium?: number;
}

interface HedgeSuggestionsProps {
  symbol: string;
  currentPrice: number;
  position: Position;
  onClose: () => void;
}

interface HedgeOption {
  name: string;
  action: string;
  strike: number;
  cost: number;
  protectionLevel: string;
  newDelta: number;
  newGamma: number;
  pros: string[];
  cons: string[];
}

type HedgeGoal = "downside_protection" | "delta_neutral" | "minimize_cost";

export default function HedgeSuggestions({
  symbol,
  currentPrice,
  position,
  onClose,
}: HedgeSuggestionsProps) {
  const [goal, setGoal] = useState<HedgeGoal>("downside_protection");

  // Generate hedge suggestions based on goal
  const generateSuggestions = (): HedgeOption[] => {
    const quantity = position.quantity;

    switch (goal) {
      case "downside_protection":
        return [
          {
            name: "Protective Put",
            action: `Buy ${quantity} put contracts at ${(currentPrice * 0.95).toFixed(2)} strike`,
            strike: currentPrice * 0.95,
            cost: -(currentPrice * 0.05 * quantity), // Estimate 5% of stock value
            protectionLevel: "Maximum (95% of value protected)",
            newDelta: 0.8, // Stock delta (1.0) + Put delta (-0.2)
            newGamma: 0.05,
            pros: [
              "Full downside protection below strike",
              "Keep all upside potential",
              "Simple and effective",
            ],
            cons: [
              "Expensive (costs premium)",
              "Time decay if stock doesn't move",
              "Reduces overall return by premium cost",
            ],
          },
          {
            name: "Collar",
            action: `Buy ${quantity} put at ${(currentPrice * 0.95).toFixed(2)}, sell ${quantity} call at ${(currentPrice * 1.05).toFixed(2)}`,
            strike: currentPrice * 0.95,
            cost: 0, // Collar is typically zero-cost or small credit
            protectionLevel: "Good (95% protected, capped at 105%)",
            newDelta: 0.5,
            newGamma: 0.02,
            pros: [
              "Zero cost or small credit",
              "Downside protection below put strike",
              "Defined risk and reward",
            ],
            cons: [
              "Caps upside at call strike",
              "Locked in until expiration",
              "Requires two transactions",
            ],
          },
          {
            name: "Put Spread",
            action: `Buy ${quantity} put at ${(currentPrice * 0.95).toFixed(2)}, sell ${quantity} put at ${(currentPrice * 0.90).toFixed(2)}`,
            strike: currentPrice * 0.95,
            cost: -(currentPrice * 0.02 * quantity), // Cheaper than single put
            protectionLevel: "Moderate (5% range protected)",
            newDelta: 0.9,
            newGamma: 0.03,
            pros: [
              "Cheaper than protective put",
              "Defined maximum loss",
              "Keep most upside",
            ],
            cons: [
              "Limited protection (only 5% range)",
              "Still costs premium",
              "Gap risk below short put",
            ],
          },
        ];

      case "delta_neutral":
        return [
          {
            name: "Short Call",
            action: `Sell ${quantity} call at ${currentPrice.toFixed(2)} (ATM)`,
            strike: currentPrice,
            cost: currentPrice * 0.03 * quantity, // Collect premium
            protectionLevel: "None (income generation only)",
            newDelta: 0.5, // Stock delta (1.0) + Short Call delta (-0.5)
            newGamma: -0.05,
            pros: [
              "Collect premium income",
              "Reduces cost basis",
              "Delta neutral at current price",
            ],
            cons: [
              "Caps upside at strike",
              "Must buy back if assigned",
              "No downside protection",
            ],
          },
          {
            name: "Long Put (ATM)",
            action: `Buy ${quantity} put at ${currentPrice.toFixed(2)} (ATM)`,
            strike: currentPrice,
            cost: -(currentPrice * 0.04 * quantity),
            protectionLevel: "Full below strike",
            newDelta: 0.5, // Stock delta (1.0) + Put delta (-0.5)
            newGamma: 0.08,
            pros: [
              "Delta neutral position",
              "Profit if stock drops",
              "Keep stock position",
            ],
            cons: [
              "Expensive (ATM puts costly)",
              "Time decay hurts",
              "Need significant move to profit",
            ],
          },
          {
            name: "Combination (Straddle Hedge)",
            action: `Buy ${Math.floor(quantity / 2)} put + sell ${Math.floor(quantity / 2)} call at ${currentPrice.toFixed(2)}`,
            strike: currentPrice,
            cost: -(currentPrice * 0.01 * quantity),
            protectionLevel: "Balanced",
            newDelta: 0.25,
            newGamma: 0.03,
            pros: [
              "Near delta neutral",
              "Partial premium collection",
              "Some downside protection",
            ],
            cons: [
              "Complex position",
              "Half upside capped",
              "Still costs premium net",
            ],
          },
        ];

      case "minimize_cost":
        return [
          {
            name: "Far OTM Put",
            action: `Buy ${quantity} put at ${(currentPrice * 0.85).toFixed(2)} (15% OTM)`,
            strike: currentPrice * 0.85,
            cost: -(currentPrice * 0.01 * quantity), // Very cheap
            protectionLevel: "Catastrophic only (15% drop needed)",
            newDelta: 0.98,
            newGamma: 0.01,
            pros: [
              "Very inexpensive",
              "Protects against crashes",
              "Keep full upside",
            ],
            cons: [
              "Only protects against large moves",
              "Likely expires worthless",
              "No protection until 15% down",
            ],
          },
          {
            name: "Covered Call",
            action: `Sell ${quantity} call at ${(currentPrice * 1.10).toFixed(2)} (10% OTM)`,
            strike: currentPrice * 1.10,
            cost: currentPrice * 0.02 * quantity, // Collect premium
            protectionLevel: "None (income only)",
            newDelta: 0.8,
            newGamma: -0.03,
            pros: [
              "Generate income",
              "No cost (collect premium)",
              "Reduces cost basis",
            ],
            cons: [
              "Caps upside at strike",
              "No downside protection",
              "Stock can be called away",
            ],
          },
          {
            name: "Do Nothing",
            action: "Maintain current position without hedge",
            strike: 0,
            cost: 0,
            protectionLevel: "None",
            newDelta: 1.0,
            newGamma: 0,
            pros: [
              "No additional cost",
              "Full upside potential",
              "Simplest option",
            ],
            cons: [
              "Full downside risk",
              "No protection",
              "Vulnerable to crashes",
            ],
          },
        ];

      default:
        return [];
    }
  };

  const suggestions = generateSuggestions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Hedge Suggestions</h2>
            <p className="text-sm text-neutral-400">
              {symbol} · {position.quantity} shares @ ${currentPrice.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Goal Selection */}
        <div className="mb-6 rounded-lg border border-neutral-700 bg-neutral-800/50 p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            Hedging Goal
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setGoal("downside_protection")}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                goal === "downside_protection"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-neutral-600 hover:border-neutral-500"
              }`}
            >
              <Shield
                className={`h-6 w-6 ${
                  goal === "downside_protection"
                    ? "text-blue-400"
                    : "text-neutral-400"
                }`}
              />
              <div
                className={`text-sm font-medium ${
                  goal === "downside_protection"
                    ? "text-blue-300"
                    : "text-neutral-300"
                }`}
              >
                Downside Protection
              </div>
              <div className="text-xs text-neutral-500 text-center">
                Protect against losses
              </div>
            </button>

            <button
              onClick={() => setGoal("delta_neutral")}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                goal === "delta_neutral"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-neutral-600 hover:border-neutral-500"
              }`}
            >
              <TrendingDown
                className={`h-6 w-6 ${
                  goal === "delta_neutral"
                    ? "text-blue-400"
                    : "text-neutral-400"
                }`}
              />
              <div
                className={`text-sm font-medium ${
                  goal === "delta_neutral" ? "text-blue-300" : "text-neutral-300"
                }`}
              >
                Delta Neutral
              </div>
              <div className="text-xs text-neutral-500 text-center">
                Remove directional risk
              </div>
            </button>

            <button
              onClick={() => setGoal("minimize_cost")}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                goal === "minimize_cost"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-neutral-600 hover:border-neutral-500"
              }`}
            >
              <DollarSign
                className={`h-6 w-6 ${
                  goal === "minimize_cost"
                    ? "text-blue-400"
                    : "text-neutral-400"
                }`}
              />
              <div
                className={`text-sm font-medium ${
                  goal === "minimize_cost" ? "text-blue-300" : "text-neutral-300"
                }`}
              >
                Minimize Cost
              </div>
              <div className="text-xs text-neutral-500 text-center">
                Cheapest protection
              </div>
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-4"
            >
              {/* Suggestion Header */}
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {suggestion.name}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    {suggestion.action}
                  </p>
                </div>
                <div
                  className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                    suggestion.cost > 0
                      ? "bg-green-500/10 text-green-400"
                      : suggestion.cost < 0
                      ? "bg-red-500/10 text-red-400"
                      : "bg-neutral-700 text-neutral-300"
                  }`}
                >
                  {suggestion.cost > 0
                    ? `+$${suggestion.cost.toFixed(0)}`
                    : suggestion.cost < 0
                    ? `-$${Math.abs(suggestion.cost).toFixed(0)}`
                    : "$0"}
                </div>
              </div>

              {/* Metrics */}
              <div className="mb-3 grid grid-cols-3 gap-3">
                <div className="rounded bg-neutral-900 p-2">
                  <div className="text-xs text-neutral-400">Protection</div>
                  <div className="text-sm font-semibold text-white">
                    {suggestion.protectionLevel}
                  </div>
                </div>
                <div className="rounded bg-neutral-900 p-2">
                  <div className="text-xs text-neutral-400">New Delta</div>
                  <div className="text-sm font-semibold text-white">
                    {suggestion.newDelta.toFixed(2)}
                  </div>
                </div>
                <div className="rounded bg-neutral-900 p-2">
                  <div className="text-xs text-neutral-400">New Gamma</div>
                  <div className="text-sm font-semibold text-white">
                    {suggestion.newGamma.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Pros and Cons */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 text-xs font-semibold text-green-400">
                    ✓ Pros
                  </div>
                  <ul className="space-y-1 text-xs text-neutral-300">
                    {suggestion.pros.map((pro, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-400">•</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold text-red-400">
                    ✗ Cons
                  </div>
                  <ul className="space-y-1 text-xs text-neutral-300">
                    {suggestion.cons.map((con, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-red-400">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Educational Guide */}
        <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-neutral-300">
          <div className="mb-2 font-semibold text-blue-300">
            💡 Choosing the Right Hedge:
          </div>
          <ul className="ml-4 space-y-1 list-disc text-xs">
            <li>
              <strong>Downside Protection:</strong> Best when you're worried about
              a correction but want to keep your position
            </li>
            <li>
              <strong>Delta Neutral:</strong> Best when you want to eliminate
              directional risk during volatile periods
            </li>
            <li>
              <strong>Minimize Cost:</strong> Best when you want basic insurance
              against catastrophic moves only
            </li>
          </ul>
          <div className="mt-3 text-xs text-neutral-400">
            <strong>Reminder:</strong> All hedges reduce potential returns. Consider
            your risk tolerance and market outlook before hedging.
          </div>
        </div>
      </div>
    </div>
  );
}
