"use client";

/**
 * EXAMPLE USAGE: Events Tab for Derivatives Lab
 *
 * This file demonstrates how to integrate all Events tab components
 * into a complete Events tab experience.
 *
 * You can use this as a reference when building the main Derivatives Lab page.
 */

import { useState } from "react";
import EarningsCalendar from "./EarningsCalendar";
import ExpectedMoveCalculator from "./ExpectedMoveCalculator";
import EarningsStrategies from "./EarningsStrategies";
import EventRiskPanel from "./EventRiskPanel";
import { getEarningsForTicker } from "@/lib/derivatives/mock-earnings";

export default function EventsTabExample() {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const handleAnalyze = (ticker: string) => {
    setSelectedTicker(ticker);
    // Scroll to the analysis section
    const analysisSection = document.getElementById("analysis-section");
    if (analysisSection) {
      analysisSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBuildStrategy = (strategyName: string) => {
    // This would integrate with your Strategy Builder tab
    console.log(`Building strategy: ${strategyName} for ${selectedTicker}`);
    // Example: router.push(`/derivatives?tab=builder&strategy=${strategyName}&ticker=${selectedTicker}`);
  };

  const selectedEvent = selectedTicker
    ? getEarningsForTicker(selectedTicker)
    : null;

  return (
    <div className="space-y-8 p-6">
      {/* Main Earnings Calendar */}
      <section>
        <EarningsCalendar onAnalyze={handleAnalyze} />
      </section>

      {/* Analysis Section (shown when ticker is selected) */}
      {selectedTicker && selectedEvent && (
        <section id="analysis-section" className="space-y-6">
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-6">
            <h2 className="mb-4 text-2xl font-bold text-zinc-900">
              Analysis: {selectedTicker}
            </h2>

            {/* Event Risk Panel - Full Version */}
            <div className="mb-6">
              <EventRiskPanel ticker={selectedTicker} compact={false} />
            </div>

            {/* Expected Move Calculator */}
            <div className="mb-6">
              <ExpectedMoveCalculator
                ticker={selectedTicker}
                currentPrice={selectedEvent.currentPrice}
                expectedMove={selectedEvent.expectedMove}
                expectedMovePct={selectedEvent.expectedMovePct}
                atmStraddle={selectedEvent.atmStraddle}
              />
            </div>

            {/* Strategy Suggestions */}
            <div>
              <EarningsStrategies onBuild={handleBuildStrategy} />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setSelectedTicker(null)}
              className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-300"
            >
              Back to Calendar
            </button>
          </div>
        </section>
      )}

      {/* Example: Compact Event Risk Panel (for use in Chain/Builder tabs) */}
      {!selectedTicker && (
        <section className="rounded-lg border border-zinc-300 bg-zinc-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900">
            Example: Compact Event Risk Panel
          </h3>
          <p className="mb-4 text-sm text-zinc-600">
            This is how the event risk panel would appear in the Chain or
            Builder tabs:
          </p>
          <EventRiskPanel ticker="AAPL" compact={true} />
        </section>
      )}
    </div>
  );
}
