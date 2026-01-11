"use client";

import { useState } from "react";
import IronCondorScreener from "./IronCondorScreener";
import AnomalyDetectionScreener from "./AnomalyDetectionScreener";
import DirectionalScreener from "./DirectionalScreener";
import VolatilityScreener from "./VolatilityScreener";
import ScreenerPresets from "./ScreenerPresets";

interface ScreenersTabProps {
  symbol: string;
  expiration?: string;
  expirations?: string[];
  onSymbolChange?: (symbol: string) => void;
  onSwitchToChain?: (symbol: string) => void;
}

type ScreenerType = "iron_condor" | "anomaly" | "directional" | "volatility" | "presets";

export default function ScreenersTab({ symbol, expiration = "", expirations = [], onSymbolChange, onSwitchToChain }: ScreenersTabProps) {
  const [activeScreener, setActiveScreener] = useState<ScreenerType>("iron_condor");
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});

  const screeners = [
    { id: "iron_condor" as const, name: "Iron Condor", icon: "🦅", description: "Credit spreads with defined risk" },
    { id: "anomaly" as const, name: "Unusual Activity", icon: "🔍", description: "Volume & OI spikes" },
    { id: "directional" as const, name: "Directional Spreads", icon: "📈", description: "Bull/bear call/put spreads" },
    { id: "volatility" as const, name: "Volatility", icon: "📊", description: "High/low IV opportunities" },
    { id: "presets" as const, name: "Presets", icon: "⭐", description: "Saved screeners" },
  ];

  const handleLoadPreset = (preset: any) => {
    setCurrentFilters(preset.filters);
    setActiveScreener(preset.type);
  };

  const handleAnalyzeSymbol = (targetSymbol: string) => {
    if (onSymbolChange) {
      onSymbolChange(targetSymbol);
    }
    if (onSwitchToChain) {
      onSwitchToChain(targetSymbol);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Option Screeners</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Find high-probability setups with institutional-grade filtering
          </p>
        </div>
      </div>

      {/* Screener Type Selector */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {screeners.map((screener) => (
          <button
            key={screener.id}
            onClick={() => setActiveScreener(screener.id)}
            className={`rounded-xl border p-4 text-left transition-all ${
              activeScreener === screener.id
                ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
                : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:shadow-md"
            }`}
          >
            <div className="text-2xl">{screener.icon}</div>
            <div className="mt-2 font-semibold">{screener.name}</div>
            <div className={`mt-1 text-xs ${activeScreener === screener.id ? "text-zinc-300" : "text-zinc-600"}`}>
              {screener.description}
            </div>
          </button>
        ))}
      </div>

      {/* Active Screener */}
      <div>
        {activeScreener === "iron_condor" && (
          <IronCondorScreener symbol={symbol} expiration={expiration} expirations={expirations} />
        )}

        {activeScreener === "anomaly" && (
          <AnomalyDetectionScreener onAnalyzeChain={handleAnalyzeSymbol} />
        )}

        {activeScreener === "directional" && (
          <DirectionalScreener symbol={symbol} expiration={expiration || ""} spot={null} />
        )}

        {activeScreener === "volatility" && (
          <VolatilityScreener onAnalyze={handleAnalyzeSymbol} />
        )}

        {activeScreener === "presets" && (
          <ScreenerPresets
            onLoadPreset={handleLoadPreset}
            currentFilters={currentFilters}
          />
        )}
      </div>

      {/* Educational Footer */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="text-sm font-semibold text-blue-900">Screener Tips</div>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>• <strong>Iron Condor:</strong> Look for IV Rank &gt; 50 and 30-45 DTE for best results</li>
          <li>• <strong>Unusual Activity:</strong> Large volume spikes may indicate informed trading</li>
          <li>• <strong>Directional:</strong> Use delta ~0.30-0.40 for balanced risk/reward</li>
          <li>• <strong>Volatility:</strong> High IV = sell premium, Low IV = buy premium</li>
        </ul>
      </div>
    </div>
  );
}
