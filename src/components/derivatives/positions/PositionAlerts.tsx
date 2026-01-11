"use client";

import { useState } from "react";
import { Position, calculatePL, calculateDTE, mockUnderlyingPrices } from "@/lib/derivatives/mock-positions";

type Alert = {
  id: string;
  type: "expiration" | "profit_target" | "breakeven_breach" | "loss_threshold";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  position: Position;
};

type PositionAlertsProps = {
  positions: Position[];
};

function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function generateAlerts(positions: Position[]): Alert[] {
  const alerts: Alert[] = [];

  positions.forEach((position) => {
    const { pl, plPct } = calculatePL(position);
    const dte = calculateDTE(position.expiration);
    const currentUnderlying = mockUnderlyingPrices[position.symbol] || 0;

    // Expiration alerts
    if (dte <= 3) {
      alerts.push({
        id: `exp-${position.id}`,
        type: "expiration",
        severity: "critical",
        title: `${dte} ${dte === 1 ? "day" : "days"} to expiration`,
        message: `${position.strategyName} expires soon. Close or roll this position to avoid assignment risk.`,
        position,
      });
    } else if (dte <= 7) {
      alerts.push({
        id: `exp-${position.id}`,
        type: "expiration",
        severity: "warning",
        title: `${dte} days to expiration`,
        message: `${position.strategyName} is approaching expiration. Consider your exit strategy.`,
        position,
      });
    }

    // Profit target alerts (50% of max profit)
    if (pl > 0 && position.maxProfit > 0) {
      const profitPct = pl / position.maxProfit;
      if (profitPct >= 0.5) {
        alerts.push({
          id: `profit-${position.id}`,
          type: "profit_target",
          severity: "info",
          title: `${formatPercent(profitPct)} profit target reached`,
          message: `${position.strategyName} has reached ${formatPercent(profitPct)} of max profit. Many traders close at 50% target.`,
          position,
        });
      }
    }

    // Breakeven breach alerts
    if (position.breakevens.length === 2) {
      const [lowerBE, upperBE] = [Math.min(...position.breakevens), Math.max(...position.breakevens)];
      const margin = (upperBE - lowerBE) * 0.1;

      if (currentUnderlying < lowerBE) {
        alerts.push({
          id: `be-${position.id}`,
          type: "breakeven_breach",
          severity: "critical",
          title: "Stock breached lower breakeven",
          message: `${position.symbol} at $${currentUnderlying.toFixed(2)} is below lower breakeven ($${lowerBE.toFixed(2)}). Position is at risk.`,
          position,
        });
      } else if (currentUnderlying > upperBE) {
        alerts.push({
          id: `be-${position.id}`,
          type: "breakeven_breach",
          severity: "critical",
          title: "Stock breached upper breakeven",
          message: `${position.symbol} at $${currentUnderlying.toFixed(2)} is above upper breakeven ($${upperBE.toFixed(2)}). Position is at risk.`,
          position,
        });
      } else if (currentUnderlying < lowerBE + margin) {
        alerts.push({
          id: `be-${position.id}`,
          type: "breakeven_breach",
          severity: "warning",
          title: "Approaching lower breakeven",
          message: `${position.symbol} is near lower breakeven ($${lowerBE.toFixed(2)}). Monitor closely.`,
          position,
        });
      } else if (currentUnderlying > upperBE - margin) {
        alerts.push({
          id: `be-${position.id}`,
          type: "breakeven_breach",
          severity: "warning",
          title: "Approaching upper breakeven",
          message: `${position.symbol} is near upper breakeven ($${upperBE.toFixed(2)}). Monitor closely.`,
          position,
        });
      }
    } else {
      // Single breakeven
      const be = position.breakevens[0];
      const isBullish = position.strategyType.includes("bull") || position.strategyType.includes("call");
      const margin = be * 0.05;

      if ((isBullish && currentUnderlying < be) || (!isBullish && currentUnderlying > be)) {
        alerts.push({
          id: `be-${position.id}`,
          type: "breakeven_breach",
          severity: "critical",
          title: "Below breakeven",
          message: `${position.symbol} at $${currentUnderlying.toFixed(2)} is below breakeven ($${be.toFixed(2)}).`,
          position,
        });
      } else if ((isBullish && currentUnderlying < be + margin) || (!isBullish && currentUnderlying > be - margin)) {
        alerts.push({
          id: `be-${position.id}`,
          type: "breakeven_breach",
          severity: "warning",
          title: "Approaching breakeven",
          message: `${position.symbol} is near breakeven ($${be.toFixed(2)}). Monitor closely.`,
          position,
        });
      }
    }

    // Loss threshold alerts (-25% or more)
    if (plPct <= -0.25) {
      alerts.push({
        id: `loss-${position.id}`,
        type: "loss_threshold",
        severity: "critical",
        title: `Position down ${formatPercent(Math.abs(plPct))}`,
        message: `${position.strategyName} has lost ${formatPercent(Math.abs(plPct))}. Consider closing to limit further losses.`,
        position,
      });
    }
  });

  // Sort by severity: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export default function PositionAlerts({ positions }: PositionAlertsProps) {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const alerts = generateAlerts(positions).filter((alert) => !dismissedAlerts.has(alert.id));

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="mb-3 text-base font-semibold text-zinc-900">Position Alerts</h3>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="font-semibold">✓ All clear</div>
          <div className="mt-1 text-green-800">No alerts at this time. All positions are healthy.</div>
        </div>
      </div>
    );
  }

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(new Set([...dismissedAlerts, alertId]));
    if (expandedAlert === alertId) {
      setExpandedAlert(null);
    }
  };

  const handleToggle = (alertId: string) => {
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900">
          Position Alerts
          <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
            {alerts.length}
          </span>
        </h3>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => {
          const isExpanded = expandedAlert === alert.id;
          const severityStyles = {
            critical: {
              bg: "bg-red-50",
              border: "border-red-200",
              text: "text-red-900",
              icon: "🚨",
            },
            warning: {
              bg: "bg-yellow-50",
              border: "border-yellow-200",
              text: "text-yellow-900",
              icon: "⚠️",
            },
            info: {
              bg: "bg-blue-50",
              border: "border-blue-200",
              text: "text-blue-900",
              icon: "🎯",
            },
          };

          const style = severityStyles[alert.severity];

          return (
            <div
              key={alert.id}
              className={`rounded-xl border ${style.border} ${style.bg} transition-all`}
            >
              <div
                className="flex cursor-pointer items-start justify-between p-3"
                onClick={() => handleToggle(alert.id)}
              >
                <div className="flex-1">
                  <div className={`flex items-center gap-2 text-sm font-semibold ${style.text}`}>
                    <span>{style.icon}</span>
                    <span>{alert.title}</span>
                  </div>
                  <div className={`mt-1 text-xs ${style.text} opacity-80`}>
                    {alert.position.strategyName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(alert.id);
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-white"
                  >
                    Dismiss
                  </button>
                  <span className="text-zinc-400">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className={`border-t ${style.border} p-3 text-sm ${style.text}`}>
                  <p>{alert.message}</p>
                  <div className="mt-3 flex gap-2">
                    <button className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                      View Position
                    </button>
                    {alert.type === "expiration" && (
                      <button className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                        Roll Forward
                      </button>
                    )}
                    {(alert.type === "profit_target" || alert.type === "loss_threshold") && (
                      <button className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                        Close Position
                      </button>
                    )}
                    {alert.type === "breakeven_breach" && (
                      <button className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-50">
                        Adjust Wings
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 text-xs text-zinc-600">
          Click an alert to see details and actions. Dismiss alerts you've already addressed.
        </div>
      )}
    </div>
  );
}
