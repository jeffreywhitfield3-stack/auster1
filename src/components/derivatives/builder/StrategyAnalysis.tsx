"use client";

import type { Strategy } from "@/types/derivatives";
import { fmtUSD, fmtPct } from "@/lib/derivatives/formatting";
import Tip from "../Tip";

interface StrategyAnalysisProps {
  strategy: Strategy;
}

export default function StrategyAnalysis({ strategy }: StrategyAnalysisProps) {
  const maxProfit = strategy.maxProfit ?? 0;
  const maxLoss = strategy.maxLoss ?? 0;
  const creditDebit = strategy.creditDebit ?? 0;
  const breakevens = strategy.breakevens || [];
  const returnOnRisk = strategy.returnOnRisk ?? 0;
  const probabilityOfProfit = strategy.probabilityOfProfit ?? 0;
  const marginEstimate = strategy.marginEstimate ?? 0;
  const thetaPerDay = strategy.thetaPerDay ?? 0;
  const vegaExposure = strategy.vegaExposure ?? 0;

  const metrics = [
    {
      label: "Max Profit",
      value: fmtUSD(maxProfit),
      tooltip: "Maximum potential profit at expiration. Limited for spreads, unlimited for naked calls.",
      color: maxProfit > 0 ? "text-emerald-700" : "text-zinc-700",
    },
    {
      label: "Max Loss",
      value: fmtUSD(Math.abs(maxLoss)),
      tooltip: "Maximum potential loss at expiration. This is your worst-case scenario.",
      color: maxLoss < 0 ? "text-red-700" : "text-zinc-700",
    },
    {
      label: "Net Credit/Debit",
      value: fmtUSD(creditDebit),
      tooltip: creditDebit > 0 ? "Credit received when opening the position." : "Debit paid when opening the position.",
      color: creditDebit > 0 ? "text-emerald-700" : creditDebit < 0 ? "text-red-700" : "text-zinc-700",
    },
    {
      label: "Return on Risk",
      value: fmtPct(returnOnRisk / 100),
      tooltip: "Max profit divided by max loss. Higher is better for credit strategies.",
      color: returnOnRisk > 50 ? "text-emerald-700" : returnOnRisk > 25 ? "text-amber-700" : "text-zinc-700",
    },
    {
      label: "Probability of Profit",
      value: fmtPct(probabilityOfProfit / 100),
      tooltip: "Estimated probability of profit based on delta. This is an approximation.",
      color: probabilityOfProfit > 60 ? "text-emerald-700" : probabilityOfProfit > 40 ? "text-amber-700" : "text-red-700",
    },
    {
      label: "Margin Est.",
      value: fmtUSD(marginEstimate),
      tooltip: "Estimated buying power reduction (collateral required). Actual margin may vary by broker.",
      color: "text-zinc-700",
    },
    {
      label: "Theta/Day",
      value: fmtUSD(thetaPerDay),
      tooltip: "Time decay per day. Positive means you earn money as time passes (good for sellers).",
      color: thetaPerDay > 0 ? "text-emerald-700" : thetaPerDay < 0 ? "text-red-700" : "text-zinc-700",
    },
    {
      label: "Vega Exposure",
      value: fmtUSD(vegaExposure),
      tooltip: "Sensitivity to volatility changes. Positive vega profits from IV increase.",
      color: vegaExposure > 0 ? "text-blue-700" : vegaExposure < 0 ? "text-violet-700" : "text-zinc-700",
    },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">Strategy Analysis</h3>
        {breakevens.length > 0 && (
          <div className="text-xs text-zinc-600">
            <Tip label="Breakevens">
              <p className="mb-1 font-semibold">Breakeven Points</p>
              <p className="text-xs">
                The stock prices where you neither profit nor lose at expiration.
              </p>
            </Tip>
            : {breakevens.map(be => `$${(be ?? 0).toFixed(2)}`).join(", ")}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
          >
            <div className="text-xs font-semibold text-zinc-500 uppercase">
              <Tip label={metric.label}>
                <p className="mb-1 font-semibold">{metric.label}</p>
                <p className="text-xs">{metric.tooltip}</p>
              </Tip>
            </div>
            <div className={`mt-1 text-lg font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Risk Assessment */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
        <div className="font-semibold text-blue-900">Quick Assessment</div>
        <ul className="mt-2 space-y-1 text-blue-800">
          {creditDebit > 0 && <li>✓ Credit strategy: you collect premium upfront</li>}
          {creditDebit < 0 && <li>• Debit strategy: you pay premium upfront</li>}
          {probabilityOfProfit > 60 && <li>✓ High probability of profit ({(probabilityOfProfit ?? 0).toFixed(0)}%)</li>}
          {probabilityOfProfit < 40 && <li>⚠️ Lower probability of profit ({(probabilityOfProfit ?? 0).toFixed(0)}%)</li>}
          {thetaPerDay > 0 && <li>✓ Positive theta: time decay works in your favor</li>}
          {thetaPerDay < 0 && <li>• Negative theta: time decay works against you</li>}
          {Math.abs(maxLoss) > Math.abs(maxProfit) * 2 && (
            <li>⚠️ Max loss is significantly higher than max profit</li>
          )}
        </ul>
      </div>
    </div>
  );
}
