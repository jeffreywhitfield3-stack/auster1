"use client";

import { useState } from "react";
import type { OptionLeg } from "@/lib/derivatives/calculations";

type Direction = "bullish" | "bearish" | "neutral";
type RiskTolerance = "conservative" | "moderate" | "aggressive";
type TimeHorizon = "short" | "medium" | "long";

interface WizardStep {
  direction: Direction | null;
  riskTolerance: RiskTolerance | null;
  timeHorizon: TimeHorizon | null;
}

interface StrategyRecommendation {
  name: string;
  description: string;
  whyThisStrategy: string;
  icon: string;
  setupFn: (params: {
    symbol: string;
    currentPrice: number;
    expiration: string;
  }) => OptionLeg[];
}

interface StrategyWizardProps {
  symbol: string;
  currentPrice: number;
  expiration: string;
  onComplete: (legs: OptionLeg[]) => void;
  onClose: () => void;
}

export default function StrategyWizard({
  symbol,
  currentPrice,
  expiration,
  onComplete,
  onClose,
}: StrategyWizardProps) {
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardStep>({
    direction: null,
    riskTolerance: null,
    timeHorizon: null,
  });

  const getRecommendations = (): StrategyRecommendation[] => {
    const { direction, riskTolerance, timeHorizon } = wizardData;
    const recommendations: StrategyRecommendation[] = [];

    // Bullish strategies
    if (direction === "bullish") {
      if (riskTolerance === "conservative") {
        recommendations.push({
          name: "Bull Call Spread",
          description: "Buy lower call, sell higher call for defined risk.",
          whyThisStrategy:
            "Defined risk with moderate upside. Good for beginners who expect modest gains.",
          icon: "📈",
          setupFn: ({ symbol, currentPrice, expiration }) => [
            {
              id: crypto.randomUUID(),
              type: "call",
              position: "buy",
              strike: Math.round(currentPrice * 1.02),
              price: 2.5,
              quantity: 1,
              expiration,
              delta: 0.45,
            },
            {
              id: crypto.randomUUID(),
              type: "call",
              position: "sell",
              strike: Math.round(currentPrice * 1.05),
              price: 1.0,
              quantity: 1,
              expiration,
              delta: 0.25,
            },
          ],
        });
      }

      if (riskTolerance === "moderate" || riskTolerance === "aggressive") {
        recommendations.push({
          name: "Long Call",
          description: "Simple directional bet with unlimited upside.",
          whyThisStrategy:
            "Maximum profit potential if stock rallies. Risk is limited to premium paid.",
          icon: "🚀",
          setupFn: ({ symbol, currentPrice, expiration }) => [
            {
              id: crypto.randomUUID(),
              type: "call",
              position: "buy",
              strike: Math.round(currentPrice * 1.03),
              price: 3.0,
              quantity: 1,
              expiration,
              delta: 0.40,
            },
          ],
        });
      }

      recommendations.push({
        name: "Bull Put Spread",
        description: "Sell higher put, buy lower put to collect premium.",
        whyThisStrategy:
          "Credit strategy that profits if stock stays above your short strike. Income-focused.",
        icon: "💰",
        setupFn: ({ symbol, currentPrice, expiration }) => [
          {
            id: crypto.randomUUID(),
            type: "put",
            position: "sell",
            strike: Math.round(currentPrice * 0.97),
            price: 2.0,
            quantity: 1,
            expiration,
            delta: -0.40,
          },
          {
            id: crypto.randomUUID(),
            type: "put",
            position: "buy",
            strike: Math.round(currentPrice * 0.93),
            price: 0.8,
            quantity: 1,
            expiration,
            delta: -0.20,
          },
        ],
      });
    }

    // Bearish strategies
    if (direction === "bearish") {
      if (riskTolerance === "conservative") {
        recommendations.push({
          name: "Bear Put Spread",
          description: "Buy higher put, sell lower put for defined risk.",
          whyThisStrategy:
            "Defined risk with moderate downside profit. Good for controlled bearish bets.",
          icon: "📉",
          setupFn: ({ symbol, currentPrice, expiration }) => [
            {
              id: crypto.randomUUID(),
              type: "put",
              position: "buy",
              strike: Math.round(currentPrice * 0.98),
              price: 2.5,
              quantity: 1,
              expiration,
              delta: -0.45,
            },
            {
              id: crypto.randomUUID(),
              type: "put",
              position: "sell",
              strike: Math.round(currentPrice * 0.95),
              price: 1.0,
              quantity: 1,
              expiration,
              delta: -0.25,
            },
          ],
        });
      }

      if (riskTolerance === "moderate" || riskTolerance === "aggressive") {
        recommendations.push({
          name: "Long Put",
          description: "Simple bearish bet with defined risk.",
          whyThisStrategy:
            "Profits from downside moves. Risk is limited to premium paid.",
          icon: "⬇️",
          setupFn: ({ symbol, currentPrice, expiration }) => [
            {
              id: crypto.randomUUID(),
              type: "put",
              position: "buy",
              strike: Math.round(currentPrice * 0.97),
              price: 3.0,
              quantity: 1,
              expiration,
              delta: -0.40,
            },
          ],
        });
      }

      recommendations.push({
        name: "Bear Call Spread",
        description: "Sell lower call, buy higher call to collect premium.",
        whyThisStrategy:
          "Credit strategy that profits if stock stays below your short strike.",
        icon: "💸",
        setupFn: ({ symbol, currentPrice, expiration }) => [
          {
            id: crypto.randomUUID(),
            type: "call",
            position: "sell",
            strike: Math.round(currentPrice * 1.03),
            price: 2.0,
            quantity: 1,
            expiration,
            delta: 0.40,
          },
          {
            id: crypto.randomUUID(),
            type: "call",
            position: "buy",
            strike: Math.round(currentPrice * 1.07),
            price: 0.8,
            quantity: 1,
            expiration,
            delta: 0.20,
          },
        ],
      });
    }

    // Neutral strategies
    if (direction === "neutral") {
      if (riskTolerance === "conservative") {
        recommendations.push({
          name: "Iron Condor",
          description: "Profit from low volatility with four strikes.",
          whyThisStrategy:
            "Collects premium when stock stays within a range. Popular income strategy.",
          icon: "🦅",
          setupFn: ({ symbol, currentPrice, expiration }) => [
            {
              id: crypto.randomUUID(),
              type: "put",
              position: "buy",
              strike: Math.round(currentPrice * 0.90),
              price: 0.5,
              quantity: 1,
              expiration,
              delta: -0.15,
            },
            {
              id: crypto.randomUUID(),
              type: "put",
              position: "sell",
              strike: Math.round(currentPrice * 0.95),
              price: 1.2,
              quantity: 1,
              expiration,
              delta: -0.30,
            },
            {
              id: crypto.randomUUID(),
              type: "call",
              position: "sell",
              strike: Math.round(currentPrice * 1.05),
              price: 1.2,
              quantity: 1,
              expiration,
              delta: 0.30,
            },
            {
              id: crypto.randomUUID(),
              type: "call",
              position: "buy",
              strike: Math.round(currentPrice * 1.10),
              price: 0.5,
              quantity: 1,
              expiration,
              delta: 0.15,
            },
          ],
        });
      }

      if (riskTolerance === "moderate") {
        recommendations.push({
          name: "Iron Butterfly",
          description: "Tighter profit zone than iron condor.",
          whyThisStrategy:
            "Higher premium but requires stock to stay very close to current price.",
          icon: "🦋",
          setupFn: ({ symbol, currentPrice, expiration }) => [
            {
              id: crypto.randomUUID(),
              type: "put",
              position: "buy",
              strike: Math.round(currentPrice * 0.95),
              price: 1.0,
              quantity: 1,
              expiration,
              delta: -0.25,
            },
            {
              id: crypto.randomUUID(),
              type: "put",
              position: "sell",
              strike: Math.round(currentPrice),
              price: 3.0,
              quantity: 1,
              expiration,
              delta: -0.50,
            },
            {
              id: crypto.randomUUID(),
              type: "call",
              position: "sell",
              strike: Math.round(currentPrice),
              price: 3.0,
              quantity: 1,
              expiration,
              delta: 0.50,
            },
            {
              id: crypto.randomUUID(),
              type: "call",
              position: "buy",
              strike: Math.round(currentPrice * 1.05),
              price: 1.0,
              quantity: 1,
              expiration,
              delta: 0.25,
            },
          ],
        });
      }

      if (riskTolerance === "aggressive") {
        recommendations.push({
          name: "Long Straddle",
          description: "Bet on big move in either direction.",
          whyThisStrategy:
            "Profits from volatility regardless of direction. Best before earnings or events.",
          icon: "💥",
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
            },
          ],
        });
      }
    }

    return recommendations.slice(0, 3); // Return top 3
  };

  const handleApplyStrategy = (recommendation: StrategyRecommendation) => {
    const legs = recommendation.setupFn({ symbol, currentPrice, expiration });
    onComplete(legs);
    onClose();
  };

  const canProceed = () => {
    if (step === 1) return wizardData.direction !== null;
    if (step === 2) return wizardData.riskTolerance !== null;
    if (step === 3) return wizardData.timeHorizon !== null;
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-zinc-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">
                Strategy Wizard
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Answer 3 questions to find your ideal strategy
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
            >
              ✕
            </button>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step >= s ? "bg-zinc-900" : "bg-zinc-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Direction */}
        {step === 1 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900">
              What's your market outlook?
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Choose the direction you expect {symbol} to move
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {(
                [
                  {
                    value: "bullish",
                    icon: "📈",
                    label: "Bullish",
                    description: "Expecting price to rise",
                  },
                  {
                    value: "bearish",
                    icon: "📉",
                    label: "Bearish",
                    description: "Expecting price to fall",
                  },
                  {
                    value: "neutral",
                    icon: "↔️",
                    label: "Neutral",
                    description: "Expecting low movement",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setWizardData({ ...wizardData, direction: option.value })
                  }
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    wizardData.direction === option.value
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="text-3xl">{option.icon}</div>
                  <div className="mt-2 font-semibold text-zinc-900">
                    {option.label}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Risk Tolerance */}
        {step === 2 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900">
              What's your risk tolerance?
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              How much risk are you comfortable taking?
            </p>

            <div className="mt-6 space-y-3">
              {(
                [
                  {
                    value: "conservative",
                    icon: "🛡️",
                    label: "Conservative",
                    description: "Defined risk, lower returns. Best for beginners.",
                  },
                  {
                    value: "moderate",
                    icon: "⚖️",
                    label: "Moderate",
                    description: "Balanced risk/reward. Standard strategies.",
                  },
                  {
                    value: "aggressive",
                    icon: "🎲",
                    label: "Aggressive",
                    description: "Higher risk, higher potential returns.",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setWizardData({
                      ...wizardData,
                      riskTolerance: option.value,
                    })
                  }
                  className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    wizardData.riskTolerance === option.value
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="text-2xl">{option.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-zinc-900">
                      {option.label}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Time Horizon */}
        {step === 3 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900">
              What's your time horizon?
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              How long do you want to hold this position?
            </p>

            <div className="mt-6 space-y-3">
              {(
                [
                  {
                    value: "short",
                    icon: "⚡",
                    label: "Short-term (7-14 days)",
                    description: "Quick trades, higher theta decay.",
                  },
                  {
                    value: "medium",
                    icon: "📅",
                    label: "Medium-term (30-45 days)",
                    description: "Sweet spot for most options strategies.",
                  },
                  {
                    value: "long",
                    icon: "🗓️",
                    label: "Long-term (60+ days)",
                    description: "More time for thesis to play out, less decay.",
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    setWizardData({
                      ...wizardData,
                      timeHorizon: option.value,
                    })
                  }
                  className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    wizardData.timeHorizon === option.value
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="text-2xl">{option.icon}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-zinc-900">
                      {option.label}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Recommendations */}
        {step === 4 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-zinc-900">
              Recommended Strategies
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Based on your answers, here are the top 3 strategies for you
            </p>

            <div className="mt-6 space-y-4">
              {getRecommendations().map((rec, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-2xl">
                      {rec.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-zinc-900">
                          {rec.name}
                        </h4>
                        {index === 0 && (
                          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                            Best Match
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">
                        {rec.description}
                      </p>
                      <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                        <div className="font-semibold">Why this strategy?</div>
                        <div className="mt-1">{rec.whyThisStrategy}</div>
                      </div>
                      <button
                        onClick={() => handleApplyStrategy(rec)}
                        className="mt-3 w-full rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                      >
                        Apply {rec.name}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-200 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (step > 1) setStep(step - 1);
              }}
              disabled={step === 1}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              Back
            </button>

            {step < 4 ? (
              <button
                onClick={() => {
                  if (canProceed()) setStep(step + 1);
                }}
                disabled={!canProceed()}
                className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {step === 3 ? "See Recommendations" : "Next"}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="rounded-lg border border-zinc-300 px-6 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
