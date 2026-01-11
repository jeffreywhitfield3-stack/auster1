"use client";

import { useState } from "react";
import PortfolioSummary from "./PortfolioSummary";
import PositionCard from "./PositionCard";
import PositionAlerts from "./PositionAlerts";
import TradeHistory from "./TradeHistory";
import {
  Position,
} from "@/lib/derivatives/mock-positions";

export default function MyPositions() {
  const [positions, setPositions] = useState<Position[]>([]);

  // Placeholder handlers for position actions
  const handleViewChart = (position: Position) => {
    console.log("View chart for:", position.strategyName);
    // TODO: Implement chart modal or navigation
  };

  const handleAdjust = (position: Position) => {
    console.log("Adjust position:", position.strategyName);
    // TODO: Implement position adjustment flow
  };

  const handleClose = (position: Position) => {
    console.log("Close position:", position.strategyName);
    // TODO: Implement position closing flow
  };

  const handleRoll = (position: Position) => {
    console.log("Roll position:", position.strategyName);
    // TODO: Implement position rolling flow
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <PortfolioSummary positions={positions} buyingPower={2300} />

      {/* Position Alerts */}
      {positions.length > 0 && <PositionAlerts positions={positions} />}

      {/* Active Positions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Active Positions ({positions.length})
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Monitor and manage your open options positions
            </p>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
            <div className="text-6xl">📊</div>
            <h3 className="mt-4 text-lg font-semibold text-zinc-900">No positions yet</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Use the Chain or Builder tabs to analyze and create new positions.
            </p>
            <button className="mt-6 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
              Explore Strategies
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onViewChart={handleViewChart}
                onAdjust={handleAdjust}
                onClose={handleClose}
                onRoll={handleRoll}
              />
            ))}
          </div>
        )}
      </div>

      {/* Trade History */}
      <TradeHistory closedPositions={[]} />

      {/* Educational Note */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <div className="font-semibold text-purple-900">Position Management Tips</div>
            <ul className="mt-2 space-y-1 text-sm text-purple-800">
              <li>• Close winners at 50% of max profit to reduce risk and improve win rate</li>
              <li>• Roll positions with 7-14 DTE to extend duration and collect more premium</li>
              <li>• Monitor portfolio Greeks daily - large delta swings indicate directional risk</li>
              <li>• Set stop losses at 2x the credit received on credit spreads</li>
              <li>• Adjust iron condors when price approaches within 25% of breakeven</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
