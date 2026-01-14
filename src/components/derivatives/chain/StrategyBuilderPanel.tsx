"use client";

import { useState } from "react";
import type { MassiveOptionLeg } from "@/lib/derivatives/massive";

interface SelectedContract {
  contract: MassiveOptionLeg;
  type: "call" | "put";
}

interface StrategyBuilderPanelProps {
  selectedContracts: SelectedContract[];
  underlying: number;
  onClearAll: () => void;
  onRemove: (contract: MassiveOptionLeg, type: "call" | "put") => void;
}

type StrategyType = "custom" | "vertical" | "iron_condor" | "butterfly" | "straddle" | "strangle";

export default function StrategyBuilderPanel({
  selectedContracts,
  underlying,
  onClearAll,
  onRemove,
}: StrategyBuilderPanelProps) {
  const [strategyType, setStrategyType] = useState<StrategyType>("custom");

  if (selectedContracts.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-zinc-200 flex items-center justify-center">
          <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-700">Build Your Strategy</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Select contracts from the chain above to start building a custom options strategy
        </p>
      </div>
    );
  }

  // Calculate strategy metrics
  const totalCredit = selectedContracts.reduce((sum, { contract, type }) => {
    const mid = contract.bid && contract.ask ? (contract.bid + contract.ask) / 2 : 0;
    return sum + mid;
  }, 0);

  const strikes = selectedContracts.map(s => s.contract.strike);
  const minStrike = Math.min(...strikes);
  const maxStrike = Math.max(...strikes);

  // Strategy type suggestions
  const getSuggestedStrategy = (): string => {
    if (selectedContracts.length === 2) {
      const [first, second] = selectedContracts;
      if (first.type === second.type) return "Vertical Spread";
      if (first.contract.strike === second.contract.strike) return "Straddle";
      return "Strangle";
    }
    if (selectedContracts.length === 4) {
      const calls = selectedContracts.filter(s => s.type === "call");
      const puts = selectedContracts.filter(s => s.type === "put");
      if (calls.length === 2 && puts.length === 2) return "Iron Condor";
      if (calls.length === 3 || puts.length === 3) return "Butterfly";
    }
    return "Custom Strategy";
  };

  const suggestedStrategy = getSuggestedStrategy();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">Strategy Builder</h3>
          <p className="text-sm text-zinc-600">{selectedContracts.length} contract{selectedContracts.length !== 1 ? "s" : ""} selected</p>
        </div>
        <button
          onClick={onClearAll}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Clear All
        </button>
      </div>

      {/* Strategy Type Detection */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-900">Detected: {suggestedStrategy}</p>
            <p className="mt-1 text-xs text-blue-700">
              {suggestedStrategy === "Custom Strategy"
                ? "This is a custom multi-leg strategy. Review the risk profile carefully."
                : `This appears to be a ${suggestedStrategy.toLowerCase()}. Verify all legs before trading.`}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Contracts */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-700">Selected Legs</h4>
        {selectedContracts.map(({ contract, type }, idx) => {
          const mid = contract.bid && contract.ask ? (contract.bid + contract.ask) / 2 : 0;
          const isCall = type === "call";

          return (
            <div
              key={`${contract.strike}-${type}-${idx}`}
              className={`flex items-center justify-between rounded-md border p-3 ${
                isCall ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                    isCall ? "bg-green-200 text-green-900" : "bg-red-200 text-red-900"
                  }`}>
                    {type.toUpperCase()}
                  </span>
                  <span className="font-mono text-sm font-semibold text-zinc-900">
                    ${contract.strike.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-600">
                  <span>Mid: ${mid.toFixed(2)}</span>
                  <span>Vol: {contract.volume?.toLocaleString() ?? "-"}</span>
                  <span>OI: {contract.open_interest?.toLocaleString() ?? "-"}</span>
                </div>
              </div>
              <button
                onClick={() => onRemove(contract, type)}
                className="ml-3 rounded-full p-1 text-zinc-400 hover:bg-white hover:text-zinc-600"
                title="Remove"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <p className="text-xs text-zinc-600">Strike Range</p>
          <p className="mt-1 font-mono text-sm font-semibold text-zinc-900">
            ${minStrike.toFixed(2)} - ${maxStrike.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <p className="text-xs text-zinc-600">Current Price</p>
          <p className="mt-1 font-mono text-sm font-semibold text-zinc-900">
            ${underlying.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-3">
          <p className="text-xs text-zinc-600">Est. Credit</p>
          <p className="mt-1 font-mono text-sm font-semibold text-zinc-900">
            ${totalCredit.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Strategy Actions */}
      <div className="space-y-2">
        <button className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Analyze Full Strategy
        </button>
        <button className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
          View Risk Graph
        </button>
      </div>

      {/* Disclaimer */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Risk Warning:</strong> Multi-leg strategies involve substantial risk. Ensure you understand the maximum loss and all legs execute at favorable prices. Not financial advice.
      </div>
    </div>
  );
}
