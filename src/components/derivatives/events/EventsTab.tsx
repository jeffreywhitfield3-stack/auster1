"use client";

import { useState } from "react";
import EarningsCalendar from "./EarningsCalendar";
import EarningsStrategies from "./EarningsStrategies";
import EconomicEvents from "./EconomicEvents";
import EventRiskPanel from "./EventRiskPanel";

interface EventsTabProps {
  symbol?: string;
  onSymbolSelect?: (symbol: string) => void;
}

type EventView = "earnings" | "strategies" | "economic";

export default function EventsTab({ symbol, onSymbolSelect }: EventsTabProps) {
  const [activeView, setActiveView] = useState<EventView>("earnings");
  const [selectedEarningsSymbol, setSelectedEarningsSymbol] = useState<string | null>(null);

  const views = [
    { id: "earnings" as const, name: "Earnings Calendar", icon: "📅", description: "Upcoming earnings events" },
    { id: "strategies" as const, name: "Earnings Plays", icon: "💡", description: "Pre/post earnings strategies" },
    { id: "economic" as const, name: "Economic Events", icon: "🏛️", description: "FOMC, CPI, NFP, etc." },
  ];

  const handleEarningsSymbolClick = (earningsSymbol: string) => {
    setSelectedEarningsSymbol(earningsSymbol);
    setActiveView("strategies");
    if (onSymbolSelect) {
      onSymbolSelect(earningsSymbol);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Event-Driven Trading</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Navigate earnings and macro events with defined-risk strategies
          </p>
        </div>
      </div>

      {/* View Selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`rounded-xl border p-4 text-left transition-all ${
              activeView === view.id
                ? "border-zinc-900 bg-zinc-900 text-white shadow-lg"
                : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:shadow-md"
            }`}
          >
            <div className="text-2xl">{view.icon}</div>
            <div className="mt-2 font-semibold">{view.name}</div>
            <div className={`mt-1 text-xs ${activeView === view.id ? "text-zinc-300" : "text-zinc-600"}`}>
              {view.description}
            </div>
          </button>
        ))}
      </div>

      {/* Event Risk Warning for Current Symbol */}
      {symbol && activeView !== "economic" && (
        <EventRiskPanel ticker={symbol} />
      )}

      {/* Active View */}
      <div>
        {activeView === "earnings" && (
          <EarningsCalendar />
        )}

        {activeView === "strategies" && (
          <EarningsStrategies />
        )}

        {activeView === "economic" && (
          <EconomicEvents />
        )}
      </div>

      {/* Educational Content */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
        <div className="text-sm font-semibold text-violet-900">Event Trading Guide</div>
        <div className="mt-2 space-y-2 text-sm text-violet-800">
          <div>
            <strong>Before Earnings:</strong>
            <ul className="ml-4 mt-1 list-disc space-y-0.5">
              <li>IV typically expands 1-2 weeks before the event</li>
              <li>Consider iron condors outside the expected move</li>
              <li>Long straddles/strangles if expecting big move</li>
            </ul>
          </div>

          <div>
            <strong>After Earnings:</strong>
            <ul className="ml-4 mt-1 list-disc space-y-0.5">
              <li>IV crush: volatility drops sharply after announcement</li>
              <li>Short options profit from IV collapse</li>
              <li>Directional spreads if move was insufficient</li>
            </ul>
          </div>

          <div>
            <strong>Economic Events (FOMC, CPI, NFP):</strong>
            <ul className="ml-4 mt-1 list-disc space-y-0.5">
              <li>Market-wide volatility spikes</li>
              <li>Consider reducing position sizes 1-2 days before</li>
              <li>SPY/QQQ iron condors can be risky during these events</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
