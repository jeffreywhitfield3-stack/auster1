"use client";

import { useState } from "react";
import Tip from "../Tip";

interface GreeksDisplayProps {
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  rho?: number | null;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export default function GreeksDisplay({
  delta,
  gamma,
  theta,
  vega,
  rho,
  collapsible = true,
  defaultExpanded = false,
}: GreeksDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formatGreek = (value: number | null | undefined, decimals: number = 3): string => {
    if (value === null || value === undefined) return "--";
    return value.toFixed(decimals);
  };

  const greeks = [
    {
      name: "Delta",
      value: delta,
      decimals: 3,
      tooltip: "Rate of change of option price with respect to underlying price. Ranges from -1 to 1.",
      color: "text-blue-700",
    },
    {
      name: "Gamma",
      value: gamma,
      decimals: 4,
      tooltip: "Rate of change of delta. Higher gamma means delta changes faster.",
      color: "text-violet-700",
    },
    {
      name: "Theta",
      value: theta,
      decimals: 3,
      tooltip: "Time decay per day. Negative theta means the position loses value each day.",
      color: "text-emerald-700",
    },
    {
      name: "Vega",
      value: vega,
      decimals: 3,
      tooltip: "Sensitivity to volatility changes. How much the position gains/loses per 1% IV change.",
      color: "text-amber-700",
    },
  ];

  // Optionally add Rho if provided
  if (rho !== null && rho !== undefined) {
    greeks.push({
      name: "Rho",
      value: rho,
      decimals: 4,
      tooltip: "Sensitivity to interest rate changes. Usually less important for retail traders.",
      color: "text-zinc-700",
    });
  }

  const content = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {greeks.map((greek) => (
        <div key={greek.name} className="rounded-lg bg-zinc-50 p-2">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase">
            <Tip label={greek.name}>
              <p className="font-semibold mb-1">{greek.name}</p>
              <p className="text-xs">{greek.tooltip}</p>
            </Tip>
          </div>
          <div className={`text-sm font-bold ${greek.color}`}>
            {formatGreek(greek.value, greek.decimals)}
          </div>
        </div>
      ))}
    </div>
  );

  if (!collapsible) {
    return content;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-sm font-semibold text-zinc-900"
      >
        <span>Greeks</span>
        <span className="text-zinc-500">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && <div className="mt-3">{content}</div>}
    </div>
  );
}
