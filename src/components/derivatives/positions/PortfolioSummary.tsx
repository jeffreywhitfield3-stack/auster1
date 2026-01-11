"use client";

import { Position, calculatePortfolioGreeks, calculatePortfolioTotals } from "@/lib/derivatives/mock-positions";

type PortfolioSummaryProps = {
  positions: Position[];
  buyingPower?: number;
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

function formatGreek(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

export default function PortfolioSummary({ positions, buyingPower = 2300 }: PortfolioSummaryProps) {
  const totals = calculatePortfolioTotals(positions);
  const greeks = calculatePortfolioGreeks(positions);

  const plColor = totals.totalPL >= 0 ? "text-green-600" : "text-red-600";
  const plBgColor = totals.totalPL >= 0 ? "bg-green-50" : "bg-red-50";
  const plBorderColor = totals.totalPL >= 0 ? "border-green-200" : "border-red-200";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-900">Portfolio Summary</h2>
        <p className="mt-1 text-sm text-zinc-600">Real-time overview of your options positions</p>
      </div>

      {/* Main metrics grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total P/L Today */}
        <div className={`rounded-xl border ${plBorderColor} ${plBgColor} p-4`}>
          <div className="text-xs font-medium text-zinc-600">Total P/L Today</div>
          <div className={`mt-2 text-2xl font-bold ${plColor}`}>
            {formatUSD(totals.totalPL)}
          </div>
          <div className={`mt-1 text-sm font-semibold ${plColor}`}>
            {totals.totalPL >= 0 ? "+" : ""}{formatPercent(totals.totalPLPct)}
            <span className="ml-2">{totals.totalPL >= 0 ? "📈" : "📉"}</span>
          </div>
        </div>

        {/* Total Capital at Risk */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs font-medium text-zinc-600">Total Capital at Risk</div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">
            {formatUSD(totals.totalCapitalAtRisk)}
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            {positions.length} active {positions.length === 1 ? "position" : "positions"}
          </div>
        </div>

        {/* Buying Power */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs font-medium text-zinc-600">Buying Power Remaining</div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">
            {formatUSD(buyingPower)}
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            Available for new trades
          </div>
        </div>
      </div>

      {/* Portfolio Greeks */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Portfolio Greeks</h3>
        <div className="space-y-3">
          {/* Delta */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600">
                Delta
                <button
                  className="ml-1 text-zinc-400 hover:text-zinc-600"
                  title="Delta measures directional exposure. Positive = bullish, negative = bearish"
                >
                  ⓘ
                </button>
              </span>
              <span className="font-semibold text-zinc-900">{formatGreek(greeks.delta)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full ${greeks.delta >= 0 ? "bg-green-500" : "bg-red-500"}`}
                style={{
                  width: `${Math.min(Math.abs(greeks.delta) * 50, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Theta */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600">
                Theta (per day)
                <button
                  className="ml-1 text-zinc-400 hover:text-zinc-600"
                  title="Theta measures time decay. Positive = earning time decay, negative = losing to time"
                >
                  ⓘ
                </button>
              </span>
              <span className="font-semibold text-zinc-900">{formatUSD(greeks.theta, 2)}/day</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full ${greeks.theta >= 0 ? "bg-green-500" : "bg-red-500"}`}
                style={{
                  width: `${Math.min(Math.abs(greeks.theta) * 2, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Vega */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600">
                Vega (per 1% IV)
                <button
                  className="ml-1 text-zinc-400 hover:text-zinc-600"
                  title="Vega measures volatility exposure. Positive = benefit from rising IV, negative = hurt by rising IV"
                >
                  ⓘ
                </button>
              </span>
              <span className="font-semibold text-zinc-900">{formatGreek(greeks.vega)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full ${greeks.vega >= 0 ? "bg-green-500" : "bg-red-500"}`}
                style={{
                  width: `${Math.min(Math.abs(greeks.vega) * 2, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Gamma */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600">
                Gamma
                <button
                  className="ml-1 text-zinc-400 hover:text-zinc-600"
                  title="Gamma measures delta acceleration. High gamma = delta changes rapidly with price moves"
                >
                  ⓘ
                </button>
              </span>
              <span className="font-semibold text-zinc-900">{formatGreek(greeks.gamma)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className={`h-full ${greeks.gamma >= 0 ? "bg-blue-500" : "bg-purple-500"}`}
                style={{
                  width: `${Math.min(Math.abs(greeks.gamma) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info note */}
      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        <span className="font-semibold">💡 Tip:</span> Greeks update in real-time as market prices change. Monitor
        theta decay daily and delta exposure before major market moves.
      </div>
    </div>
  );
}
