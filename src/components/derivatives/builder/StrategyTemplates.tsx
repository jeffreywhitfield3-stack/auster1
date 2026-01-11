"use client";

import { useState } from "react";
import Tip from "../Tip";
import type { OptionLeg } from "@/lib/derivatives/calculations";

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  popular?: boolean;
  riskLevel: "low" | "medium" | "high";
  direction: "bullish" | "bearish" | "neutral";
  setupFn: (params: {
    symbol: string;
    currentPrice: number;
    expiration: string;
  }) => OptionLeg[];
}

interface StrategyTemplatesProps {
  symbol: string;
  currentPrice: number;
  expiration: string;
  onApplyTemplate: (legs: OptionLeg[]) => void;
}

const templates: StrategyTemplate[] = [
  {
    id: "bull-call-spread",
    name: "Bull Call Spread",
    description: "Moderately bullish, defined risk. Buy lower call, sell higher call.",
    icon: "📈",
    popular: true,
    riskLevel: "low",
    direction: "bullish",
    setupFn: ({ symbol, currentPrice, expiration }) => [
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "buy",
        strike: Math.round(currentPrice * 1.02), // Slightly OTM
        price: 2.5,
        quantity: 1,
        expiration,
        delta: 0.45,
        theta: -0.05,
        vega: 0.12,
      },
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "sell",
        strike: Math.round(currentPrice * 1.05), // Further OTM
        price: 1.0,
        quantity: 1,
        expiration,
        delta: 0.25,
        theta: -0.03,
        vega: 0.08,
      },
    ],
  },
  {
    id: "bear-put-spread",
    name: "Bear Put Spread",
    description: "Moderately bearish, defined risk. Buy higher put, sell lower put.",
    icon: "📉",
    popular: true,
    riskLevel: "low",
    direction: "bearish",
    setupFn: ({ symbol, currentPrice, expiration }) => [
      {
        id: crypto.randomUUID(),
        type: "put",
        position: "buy",
        strike: Math.round(currentPrice * 0.98), // Slightly OTM
        price: 2.5,
        quantity: 1,
        expiration,
        delta: -0.45,
        theta: -0.05,
        vega: 0.12,
      },
      {
        id: crypto.randomUUID(),
        type: "put",
        position: "sell",
        strike: Math.round(currentPrice * 0.95), // Further OTM
        price: 1.0,
        quantity: 1,
        expiration,
        delta: -0.25,
        theta: -0.03,
        vega: 0.08,
      },
    ],
  },
  {
    id: "iron-condor",
    name: "Iron Condor",
    description: "Neutral strategy, profit from low volatility. Four strikes forming wings.",
    icon: "🦅",
    popular: true,
    riskLevel: "medium",
    direction: "neutral",
    setupFn: ({ symbol, currentPrice, expiration }) => [
      {
        id: crypto.randomUUID(),
        type: "put",
        position: "buy",
        strike: Math.round(currentPrice * 0.90), // OTM put long
        price: 0.5,
        quantity: 1,
        expiration,
        delta: -0.15,
        theta: -0.02,
        vega: 0.05,
      },
      {
        id: crypto.randomUUID(),
        type: "put",
        position: "sell",
        strike: Math.round(currentPrice * 0.95), // OTM put short
        price: 1.2,
        quantity: 1,
        expiration,
        delta: -0.30,
        theta: 0.08,
        vega: 0.10,
      },
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "sell",
        strike: Math.round(currentPrice * 1.05), // OTM call short
        price: 1.2,
        quantity: 1,
        expiration,
        delta: 0.30,
        theta: 0.08,
        vega: 0.10,
      },
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "buy",
        strike: Math.round(currentPrice * 1.10), // OTM call long
        price: 0.5,
        quantity: 1,
        expiration,
        delta: 0.15,
        theta: -0.02,
        vega: 0.05,
      },
    ],
  },
  {
    id: "butterfly",
    name: "Butterfly Spread",
    description: "Profit from minimal movement. Three strikes: buy-sell-sell-buy.",
    icon: "🦋",
    riskLevel: "low",
    direction: "neutral",
    setupFn: ({ symbol, currentPrice, expiration }) => [
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "buy",
        strike: Math.round(currentPrice * 0.97),
        price: 4.0,
        quantity: 1,
        expiration,
        delta: 0.60,
        theta: -0.06,
        vega: 0.15,
      },
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "sell",
        strike: Math.round(currentPrice), // ATM
        price: 2.5,
        quantity: 2,
        expiration,
        delta: 0.50,
        theta: 0.10,
        vega: 0.20,
      },
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "buy",
        strike: Math.round(currentPrice * 1.03),
        price: 1.5,
        quantity: 1,
        expiration,
        delta: 0.40,
        theta: -0.06,
        vega: 0.15,
      },
    ],
  },
  {
    id: "long-straddle",
    name: "Long Straddle",
    description: "Bet on high volatility. Buy ATM call and put.",
    icon: "💥",
    riskLevel: "high",
    direction: "neutral",
    setupFn: ({ symbol, currentPrice, expiration }) => [
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "buy",
        strike: Math.round(currentPrice),
        price: 3.0,
        quantity: 1,
        expiration,
        delta: 0.50,
        theta: -0.08,
        vega: 0.20,
      },
      {
        id: crypto.randomUUID(),
        type: "put",
        position: "buy",
        strike: Math.round(currentPrice),
        price: 3.0,
        quantity: 1,
        expiration,
        delta: -0.50,
        theta: -0.08,
        vega: 0.20,
      },
    ],
  },
  {
    id: "long-strangle",
    name: "Long Strangle",
    description: "Cheaper volatility play. Buy OTM call and put.",
    icon: "🎯",
    riskLevel: "medium",
    direction: "neutral",
    setupFn: ({ symbol, currentPrice, expiration }) => [
      {
        id: crypto.randomUUID(),
        type: "call",
        position: "buy",
        strike: Math.round(currentPrice * 1.05),
        price: 2.0,
        quantity: 1,
        expiration,
        delta: 0.35,
        theta: -0.06,
        vega: 0.15,
      },
      {
        id: crypto.randomUUID(),
        type: "put",
        position: "buy",
        strike: Math.round(currentPrice * 0.95),
        price: 2.0,
        quantity: 1,
        expiration,
        delta: -0.35,
        theta: -0.06,
        vega: 0.15,
      },
    ],
  },
];

export default function StrategyTemplates({
  symbol,
  currentPrice,
  expiration,
  onApplyTemplate,
}: StrategyTemplatesProps) {
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "bullish" | "bearish" | "neutral"
  >("all");

  const filteredTemplates =
    selectedFilter === "all"
      ? templates
      : templates.filter((t) => t.direction === selectedFilter);

  const handleApplyTemplate = (template: StrategyTemplate) => {
    const legs = template.setupFn({ symbol, currentPrice, expiration });
    onApplyTemplate(legs);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">
            Strategy Templates
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            One-click setup for popular strategies
          </p>
        </div>

        <div className="flex gap-2">
          {(["all", "bullish", "bearish", "neutral"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                selectedFilter === filter
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="group relative rounded-2xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md"
          >
            {template.popular && (
              <div className="absolute -right-2 -top-2 rounded-full bg-purple-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                Popular
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-2xl">
                {template.icon}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-zinc-900">
                    {template.name}
                  </h4>
                  <Tip label="">
                    <div>
                      <p className="mb-2 font-semibold">{template.name}</p>
                      <p className="mb-2">{template.description}</p>
                      <p className="text-[11px]">
                        <strong>Direction:</strong>{" "}
                        <span className="capitalize">{template.direction}</span>
                      </p>
                      <p className="text-[11px]">
                        <strong>Risk Level:</strong>{" "}
                        <span className="capitalize">{template.riskLevel}</span>
                      </p>
                    </div>
                  </Tip>
                </div>

                <p className="mt-1 text-xs text-zinc-600 line-clamp-2">
                  {template.description}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      template.direction === "bullish"
                        ? "bg-green-100 text-green-800"
                        : template.direction === "bearish"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {template.direction}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      template.riskLevel === "low"
                        ? "bg-zinc-100 text-zinc-700"
                        : template.riskLevel === "medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {template.riskLevel} risk
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleApplyTemplate(template)}
              className="mt-4 w-full rounded-xl bg-zinc-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              Use Template
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-xl">💡</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Templates auto-fill with smart defaults</p>
            <p className="mt-1">
              Based on {symbol} at ${(currentPrice ?? 0).toFixed(2)} expiring {expiration}.
              Adjust strikes and quantities after applying.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
