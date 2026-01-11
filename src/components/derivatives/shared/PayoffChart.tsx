"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import type { Strategy } from "@/types/derivatives";
import { generatePLData, type OptionLeg } from "@/lib/derivatives/calculations";
import { fmtUSD } from "@/lib/derivatives/formatting";

interface PayoffChartProps {
  strategy: Strategy;
  currentPrice?: number;
  height?: number;
}

export default function PayoffChart({ strategy, currentPrice, height = 300 }: PayoffChartProps) {
  const data = useMemo(() => {
    // Convert Strategy legs to OptionLeg format for generatePLData
    const optionLegs: OptionLeg[] = strategy.legs.map(leg => ({
      id: leg.id,
      type: leg.type === "CALL" ? "call" : "put",
      position: leg.action === "BUY" ? "buy" : "sell",
      strike: leg.strike,
      price: leg.mid ?? 0,
      quantity: leg.quantity,
      expiration: leg.expiration,
      delta: leg.delta ?? null,
      gamma: leg.gamma ?? null,
      theta: leg.theta ?? null,
      vega: leg.vega ?? null,
    }));

    // Calculate price range based on strikes
    const strikes = strategy.legs.map(leg => leg.strike);
    const minStrike = Math.min(...strikes);
    const maxStrike = Math.max(...strikes);
    const range = maxStrike - minStrike;
    const buffer = range > 0 ? range * 0.3 : strategy.underlyingPrice * 0.2;

    const priceRange = {
      min: Math.max(0, minStrike - buffer),
      max: maxStrike + buffer,
    };

    return generatePLData(optionLegs, priceRange);
  }, [strategy]);

  const breakevens = useMemo(() => strategy.breakevens || [], [strategy]);

  const maxProfit = strategy.maxProfit ?? 0;
  const maxLoss = strategy.maxLoss ?? 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-900">P&L at Expiration</div>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span className="text-zinc-600">Max Profit: {fmtUSD(maxProfit)}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span className="text-zinc-600">Max Loss: {fmtUSD(maxLoss)}</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
          <XAxis
            dataKey="price"
            stroke="#71717a"
            style={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value ?? 0).toFixed(0)}`}
          />
          <YAxis
            stroke="#71717a"
            style={{ fontSize: 12 }}
            tickFormatter={(value) => fmtUSD(value, 0)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e4e4e7",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value: number | undefined) => [fmtUSD(value ?? 0), "P&L"]}
            labelFormatter={(label) => `Price: $${Number(label ?? 0).toFixed(2)}`}
          />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="#71717a" strokeDasharray="3 3" />

          {/* Current price line */}
          {currentPrice && (
            <ReferenceLine
              x={currentPrice}
              stroke="#3b82f6"
              strokeDasharray="5 5"
              label={{ value: "Current", fill: "#3b82f6", fontSize: 11, position: "top" }}
            />
          )}

          {/* Breakeven lines */}
          {breakevens.map((be, idx) => (
            <ReferenceLine
              key={idx}
              x={be}
              stroke="#8b5cf6"
              strokeDasharray="3 3"
              label={{ value: "BE", fill: "#8b5cf6", fontSize: 11, position: "top" }}
            />
          ))}

          <Line
            type="monotone"
            dataKey="pl"
            stroke="#18181b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {breakevens.length > 0 && (
        <div className="mt-3 text-xs text-zinc-600">
          <span className="font-semibold">Breakevens:</span> {breakevens.map(be => `$${(be ?? 0).toFixed(2)}`).join(", ")}
        </div>
      )}
    </div>
  );
}
