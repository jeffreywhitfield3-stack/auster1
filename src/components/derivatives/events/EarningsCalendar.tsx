"use client";

import { useState } from "react";
import {
  getUpcomingEarnings,
  formatEarningsDate,
  daysUntilEarnings,
  type EarningsEvent,
} from "@/lib/derivatives/mock-earnings";
import Tip from "../Tip";

interface EarningsCalendarProps {
  onAnalyze?: (ticker: string) => void;
}

export default function EarningsCalendar({
  onAnalyze,
}: EarningsCalendarProps) {
  const [searchTicker, setSearchTicker] = useState("");
  const upcomingEarnings = getUpcomingEarnings(30);

  // Filter by search
  const filteredEarnings = searchTicker
    ? upcomingEarnings.filter((e) =>
        e.ticker.toLowerCase().includes(searchTicker.toLowerCase())
      )
    : upcomingEarnings;

  const handleAnalyze = (ticker: string) => {
    if (onAnalyze) {
      onAnalyze(ticker);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">
          Earnings Calendar
        </h2>
        <Tip label={<span className="text-sm text-zinc-600">What is this?</span>}>
          <p className="mb-2 font-semibold">Expected Move</p>
          <p className="mb-2">
            The expected move is calculated from the ATM (at-the-money) straddle price × 0.85.
          </p>
          <p className="mb-2">
            This represents approximately one standard deviation (1σ), meaning there&apos;s roughly a 68% probability the stock will stay within this range through earnings.
          </p>
          <p className="text-[11px] text-zinc-600">
            Use this to size iron condor wings or assess breakeven risk.
          </p>
        </Tip>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search ticker..."
          value={searchTicker}
          onChange={(e) => setSearchTicker(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {searchTicker && (
          <button
            onClick={() => setSearchTicker("")}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Clear
          </button>
        )}
      </div>

      {/* Earnings Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Ticker
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Current Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Expected Move
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Days Until
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {filteredEarnings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    {searchTicker
                      ? `No earnings found for "${searchTicker}"`
                      : "No upcoming earnings in the next 30 days"}
                  </td>
                </tr>
              ) : (
                filteredEarnings.map((event) => {
                  const daysUntil = daysUntilEarnings(event.date);
                  const isUrgent = daysUntil <= 7;
                  const rangeHigh = event.currentPrice + event.expectedMove;
                  const rangeLow = event.currentPrice - event.expectedMove;

                  return (
                    <tr
                      key={`${event.ticker}-${event.date}`}
                      className={`hover:bg-zinc-50 ${
                        isUrgent ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-zinc-900">
                        {formatEarningsDate(event.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-zinc-900">
                          {event.ticker}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {event.companyName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          {event.time}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-900">
                        ${event.currentPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Tip
                          label={
                            <span className="font-mono text-sm text-zinc-900">
                              ±${event.expectedMove.toFixed(2)} (
                              {event.expectedMovePct.toFixed(1)}%)
                            </span>
                          }
                        >
                          <p className="mb-2 font-semibold">
                            Expected Move Range
                          </p>
                          <p className="mb-2">
                            ${rangeLow.toFixed(2)} - ${rangeHigh.toFixed(2)}
                          </p>
                          <p className="text-[11px] text-zinc-600">
                            Based on ATM straddle: $
                            {event.atmStraddle.toFixed(2)} × 0.85 = $
                            {event.expectedMove.toFixed(2)}
                          </p>
                        </Tip>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            isUrgent
                              ? "bg-red-100 text-red-800"
                              : "bg-zinc-100 text-zinc-800"
                          }`}
                        >
                          {daysUntil === 0
                            ? "Today"
                            : daysUntil === 1
                              ? "Tomorrow"
                              : `${daysUntil} days`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleAnalyze(event.ticker)}
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helpful Tip */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Tip:</span> Options prices typically
          spike before earnings due to increased implied volatility. After
          earnings, IV often &quot;crushes&quot; rapidly. Consider selling
          premium before earnings or buying premium after the IV crush.
        </p>
      </div>
    </div>
  );
}
