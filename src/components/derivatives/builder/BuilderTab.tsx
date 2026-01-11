"use client";

import { useState } from "react";
import StrategyTemplates from "./StrategyTemplates";
import StrategyWizard from "./StrategyWizard";
import LegsList from "./LegsList";
import StrategyAnalysis from "./StrategyAnalysis";
import PayoffChart from "../shared/PayoffChart";
import type { Strategy, StrategyLeg } from "@/types/derivatives";
import type { OptionLeg } from "@/lib/derivatives/calculations";
import { calculateStrategyMetrics } from "@/lib/derivatives/calculations";

interface BuilderTabProps {
  symbol: string;
  currentPrice: number;
  expiration: string;
}

export default function BuilderTab({ symbol, currentPrice, expiration }: BuilderTabProps) {
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);

  // Convert OptionLeg to StrategyLeg for type compatibility
  const convertToStrategyLegs = (optionLegs: OptionLeg[]): StrategyLeg[] => {
    return optionLegs.map(leg => ({
      id: leg.id,
      type: leg.type === "call" ? "CALL" : "PUT",
      action: leg.position === "buy" ? "BUY" : "SELL",
      strike: leg.strike,
      expiration: leg.expiration,
      quantity: leg.quantity,
      bid: leg.price * 0.95, // Approximate
      ask: leg.price * 1.05,
      mid: leg.price,
      delta: leg.delta ?? null,
      gamma: leg.gamma ?? null,
      theta: leg.theta ?? null,
      vega: leg.vega ?? null,
      volume: 1000, // Mock
      openInterest: 5000, // Mock
    }));
  };

  // Build strategy object for analysis
  const buildStrategy = (): Strategy | null => {
    if (legs.length === 0) return null;

    const strategyLegs = convertToStrategyLegs(legs);

    const strategy: Strategy = {
      id: crypto.randomUUID(),
      underlying: symbol,
      underlyingPrice: currentPrice,
      legs: strategyLegs,
      maxProfit: null,
      maxLoss: null,
      breakevens: [],
      creditDebit: 0,
    };

    // Calculate analysis metrics using the existing OptionLeg type functions
    const metrics = calculateStrategyMetrics(legs, currentPrice);

    return {
      ...strategy,
      maxProfit: metrics.maxProfit,
      maxLoss: metrics.maxLoss,
      breakevens: metrics.breakevens,
      creditDebit: metrics.netCredit,
      returnOnRisk: metrics.returnOnRisk,
      probabilityOfProfit: metrics.pop,
      marginEstimate: metrics.marginEstimate,
      thetaPerDay: metrics.totalTheta,
      vegaExposure: metrics.totalVega,
    };
  };

  const currentStrategy = buildStrategy();

  const handleApplyTemplate = (templateLegs: OptionLeg[]) => {
    setLegs(templateLegs);
    setShowTemplates(false);
  };

  const handleUpdateLeg = (id: string, updates: Partial<OptionLeg>) => {
    setLegs(legs.map(leg => leg.id === id ? { ...leg, ...updates } : leg));
  };

  const handleDeleteLeg = (id: string) => {
    setLegs(legs.filter(leg => leg.id !== id));
  };

  const handleReorderLegs = (newOrder: OptionLeg[]) => {
    setLegs(newOrder);
  };

  const handleClearAll = () => {
    setLegs([]);
    setShowTemplates(true);
  };

  const handleSaveStrategy = () => {
    // TODO: Implement save to database/local storage
    alert("Save functionality coming soon!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Strategy Builder</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Build and analyze multi-leg option strategies
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWizard(true)}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              🧙 Strategy Wizard
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              {showTemplates ? "Hide Templates" : "Show Templates"}
            </button>
          </div>
        </div>
      </div>

      {/* Strategy Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl">
            <StrategyWizard
              symbol={symbol}
              currentPrice={currentPrice}
              expiration={expiration}
              onComplete={(legs) => {
                setLegs(legs);
                setShowWizard(false);
                setShowTemplates(false);
              }}
              onClose={() => setShowWizard(false)}
            />
          </div>
        </div>
      )}

      {/* Templates */}
      {showTemplates && legs.length === 0 && (
        <StrategyTemplates
          symbol={symbol}
          currentPrice={currentPrice}
          expiration={expiration}
          onApplyTemplate={handleApplyTemplate}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Legs List */}
        <div className="lg:col-span-7">
          <LegsList
            legs={legs}
            onUpdateLeg={handleUpdateLeg}
            onDeleteLeg={handleDeleteLeg}
            onReorderLegs={handleReorderLegs}
          />

          {legs.length > 0 && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSaveStrategy}
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                💾 Save Strategy
              </button>
              <button
                onClick={handleClearAll}
                className="rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Analysis */}
        <div className="space-y-6 lg:col-span-5">
          {currentStrategy ? (
            <>
              <StrategyAnalysis strategy={currentStrategy} />
              <PayoffChart strategy={currentStrategy} currentPrice={currentPrice} />
            </>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center">
              <div className="text-4xl">📊</div>
              <div className="mt-3 font-semibold text-zinc-900">Build a strategy</div>
              <div className="mt-1 text-sm text-zinc-600">
                Use templates, the wizard, or add legs manually to see analysis
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
