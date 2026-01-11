"use client";

import { useState } from "react";
import { ClosedPosition, calculateTradeStats } from "@/lib/derivatives/mock-positions";

type TradeHistoryProps = {
  closedPositions: ClosedPosition[];
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
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function exportToCSV(positions: ClosedPosition[]) {
  const headers = [
    "Symbol",
    "Strategy",
    "Entry Date",
    "Close Date",
    "DTE at Entry",
    "DTE at Close",
    "Entry Price",
    "Close Price",
    "P/L",
    "Return %",
  ];

  const rows = positions.map((pos) => [
    pos.symbol,
    pos.strategyName,
    pos.entryDate,
    pos.closeDate,
    pos.dteAtEntry,
    pos.dteAtClose,
    pos.entryPrice,
    pos.closePrice,
    pos.realizedPL,
    pos.returnPct,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trade-history-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function TradeHistory({ closedPositions }: TradeHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const stats = calculateTradeStats(closedPositions);

  const displayedPositions = showAll ? closedPositions : closedPositions.slice(0, 5);

  if (closedPositions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-base font-semibold text-zinc-900">Trade History</h3>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
          No closed positions yet. Your trade history will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Trade History</h3>
          <p className="mt-1 text-sm text-zinc-600">Last 30 days of closed positions</p>
        </div>
        <button
          onClick={() => exportToCSV(closedPositions)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Export for Taxes
        </button>
      </div>

      {/* Summary Stats */}
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs text-zinc-500">Total Realized P/L</div>
          <div
            className={`mt-1 text-xl font-bold ${
              stats.totalRealized >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatUSD(stats.totalRealized)}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {stats.totalTrades} {stats.totalTrades === 1 ? "trade" : "trades"}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs text-zinc-500">Win Rate</div>
          <div className="mt-1 text-xl font-bold text-zinc-900">
            {formatPercent(stats.winRate)}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {stats.winners}W / {stats.losers}L
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs text-zinc-500">Avg Return</div>
          <div
            className={`mt-1 text-xl font-bold ${
              stats.avgReturn >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatPercent(stats.avgReturn)}
          </div>
          <div className="mt-1 text-xs text-zinc-600">per trade</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="text-xs text-zinc-500">Best Trade</div>
          <div className="mt-1 text-xl font-bold text-green-600">
            {formatUSD(stats.bestTrade?.realizedPL || 0)}
          </div>
          <div className="mt-1 text-xs text-zinc-600">{stats.bestTrade?.symbol || "—"}</div>
        </div>
      </div>

      {/* Trade Table */}
      <div className="overflow-auto rounded-xl border border-zinc-200">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-700">
            <tr>
              <th className="px-3 py-2 text-left">Date Closed</th>
              <th className="px-3 py-2 text-left">Strategy</th>
              <th className="px-3 py-2 text-right">Entry</th>
              <th className="px-3 py-2 text-right">Close</th>
              <th className="px-3 py-2 text-right">P/L</th>
              <th className="px-3 py-2 text-right">Return %</th>
              <th className="px-3 py-2 text-right">DTE Entry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {displayedPositions.map((pos) => {
              const plColor = pos.realizedPL >= 0 ? "text-green-600" : "text-red-600";
              return (
                <tr key={pos.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-3 text-zinc-900">{formatDate(pos.closeDate)}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-zinc-900">{pos.symbol}</div>
                    <div className="text-xs text-zinc-600">{pos.strategyType.replace(/_/g, " ")}</div>
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-900">{formatUSD(pos.entryPrice)}</td>
                  <td className="px-3 py-3 text-right text-zinc-900">{formatUSD(pos.closePrice)}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${plColor}`}>
                    {formatUSD(pos.realizedPL)}
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold ${plColor}`}>
                    {formatPercent(pos.returnPct)}
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-600">{pos.dteAtEntry}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show More/Less Button */}
      {closedPositions.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            {showAll ? "Show Less" : `Show All (${closedPositions.length})`}
          </button>
        </div>
      )}

      {/* Performance Insights */}
      <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-sm font-semibold text-blue-900">Performance Insights</div>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>
            • Your best performer was {stats.bestTrade?.strategyName} (
            {formatUSD(stats.bestTrade?.realizedPL || 0)})
          </li>
          {stats.worstTrade && (
            <li>
              • Your worst performer was {stats.worstTrade.strategyName} (
              {formatUSD(stats.worstTrade.realizedPL)})
            </li>
          )}
          <li>
            • You're winning {formatPercent(stats.winRate)} of your trades -
            {stats.winRate >= 0.6 ? " great job!" : " consider refining your entry criteria"}
          </li>
          {stats.avgReturn > 0 && (
            <li>
              • Your average return of {formatPercent(stats.avgReturn)} per trade is
              {stats.avgReturn > 0.3 ? " excellent" : " solid"}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
