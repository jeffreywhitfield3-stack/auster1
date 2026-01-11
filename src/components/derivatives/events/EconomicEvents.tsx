"use client";

import { useState, useEffect } from "react";

interface EconomicEvent {
  id: string;
  name: string;
  date: string;
  time?: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  description?: string;
  impact?: string;
}

export default function EconomicEvents() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [selectedImportance, setSelectedImportance] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");

  useEffect(() => {
    // Mock economic events for the next 30 days
    const mockEvents: EconomicEvent[] = [
      {
        id: "1",
        name: "FOMC Meeting",
        date: "2026-02-01",
        time: "14:00",
        importance: "HIGH",
        description: "Federal Open Market Committee monetary policy decision",
        impact: "Major market-wide volatility expected. SPY, QQQ options IV likely to expand.",
      },
      {
        id: "2",
        name: "CPI Report",
        date: "2026-01-15",
        time: "08:30",
        importance: "HIGH",
        description: "Consumer Price Index - inflation data",
        impact: "High volatility in indices and bond markets. Consider protective positions.",
      },
      {
        id: "3",
        name: "Non-Farm Payrolls",
        date: "2026-01-10",
        time: "08:30",
        importance: "HIGH",
        description: "Employment situation report",
        impact: "Market-moving event. Expect sharp moves in first 30 minutes.",
      },
      {
        id: "4",
        name: "Retail Sales",
        date: "2026-01-17",
        time: "08:30",
        importance: "MEDIUM",
        description: "Monthly retail sales data",
        impact: "Moderate impact on consumer discretionary stocks.",
      },
      {
        id: "5",
        name: "Initial Jobless Claims",
        date: "2026-01-16",
        time: "08:30",
        importance: "MEDIUM",
        description: "Weekly unemployment insurance claims",
        impact: "Short-term volatility spike possible.",
      },
      {
        id: "6",
        name: "PMI Manufacturing",
        date: "2026-01-23",
        time: "09:45",
        importance: "MEDIUM",
        description: "Purchasing Managers' Index for manufacturing",
        impact: "Affects industrial and materials sectors.",
      },
    ];

    setEvents(mockEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  }, []);

  const filteredEvents = selectedImportance === "ALL"
    ? events
    : events.filter(e => e.importance === selectedImportance);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "HIGH": return "bg-red-100 text-red-800 border-red-200";
      case "MEDIUM": return "bg-amber-100 text-amber-800 border-amber-200";
      case "LOW": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-zinc-100 text-zinc-800 border-zinc-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 0) return "Past";
    return `${diffDays} days`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Economic Events</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Market-wide volatility events (FOMC, CPI, NFP, etc.)
            </p>
          </div>

          <select
            value={selectedImportance}
            onChange={(e) => setSelectedImportance(e.target.value as any)}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
          >
            <option value="ALL">All Events</option>
            <option value="HIGH">High Impact Only</option>
            <option value="MEDIUM">Medium Impact</option>
            <option value="LOW">Low Impact</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-zinc-900">{event.name}</h4>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getImportanceColor(event.importance)}`}>
                      {event.importance}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-600">
                    <span>📅 {formatDate(event.date)}</span>
                    {event.time && <span>🕐 {event.time} ET</span>}
                    <span className="font-semibold text-zinc-900">{getDaysUntil(event.date)}</span>
                  </div>

                  {event.description && (
                    <p className="mt-2 text-sm text-zinc-700">{event.description}</p>
                  )}

                  {event.impact && (
                    <div className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-900">
                      <span className="font-semibold">Impact:</span> {event.impact}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-600">
              No events match the selected filter
            </div>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <div className="font-semibold">Trading Tip:</div>
          <div className="mt-1">
            Before major economic events, consider reducing position sizes or using defined-risk strategies.
            IV typically expands before these events and crashes afterward (IV crush).
          </div>
        </div>
      </div>
    </div>
  );
}
