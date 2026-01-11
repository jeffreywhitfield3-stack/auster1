"use client";

import { useMemo } from "react";
import Tip from "../Tip";
import type { MassiveOptionLeg } from "@/lib/derivatives/massive";

interface IVSmileChartProps {
  calls: MassiveOptionLeg[];
  puts: MassiveOptionLeg[];
  underlying: number;
  height?: number;
}

interface DataPoint {
  strike: number;
  iv: number;
  type: "call" | "put";
}

export default function IVSmileChart({
  calls,
  puts,
  underlying,
  height = 300,
}: IVSmileChartProps) {
  // Prepare data points with IV
  const dataPoints = useMemo(() => {
    const points: DataPoint[] = [];

    calls.forEach((call) => {
      if (call.implied_volatility !== null && call.implied_volatility !== undefined) {
        points.push({
          strike: call.strike,
          iv: call.implied_volatility * 100, // Convert to percentage
          type: "call",
        });
      }
    });

    puts.forEach((put) => {
      if (put.implied_volatility !== null && put.implied_volatility !== undefined) {
        points.push({
          strike: put.strike,
          iv: put.implied_volatility * 100,
          type: "put",
        });
      }
    });

    // Sort by strike
    points.sort((a, b) => a.strike - b.strike);

    return points;
  }, [calls, puts]);

  if (dataPoints.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-600">
          No implied volatility data available for this expiration.
        </p>
      </div>
    );
  }

  // Calculate chart dimensions
  const strikes = dataPoints.map((d) => d.strike);
  const ivs = dataPoints.map((d) => d.iv);
  const minStrike = Math.min(...strikes);
  const maxStrike = Math.max(...strikes);
  const minIV = Math.min(...ivs);
  const maxIV = Math.max(...ivs);

  const padding = { top: 20, right: 40, bottom: 40, left: 60 };
  const chartWidth = 800;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Scale functions
  const xScale = (strike: number) => {
    return ((strike - minStrike) / (maxStrike - minStrike)) * innerWidth;
  };

  const yScale = (iv: number) => {
    return innerHeight - ((iv - minIV) / (maxIV - minIV)) * innerHeight;
  };

  // Generate path for calls and puts
  const callPoints = dataPoints.filter((d) => d.type === "call");
  const putPoints = dataPoints.filter((d) => d.type === "put");

  const generatePath = (points: DataPoint[]) => {
    if (points.length === 0) return "";
    return points
      .map((point, i) => {
        const x = xScale(point.strike);
        const y = yScale(point.iv);
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(" ");
  };

  const callPath = generatePath(callPoints);
  const putPath = generatePath(putPoints);

  // Find ATM strike
  const atmStrike = dataPoints.reduce((prev, curr) =>
    Math.abs(curr.strike - underlying) < Math.abs(prev.strike - underlying)
      ? curr
      : prev
  );

  // Generate Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => {
    return minIV + (i * (maxIV - minIV)) / (yTicks - 1);
  });

  // Generate X-axis ticks
  const xTicks = 7;
  const xTickValues = Array.from({ length: xTicks }, (_, i) => {
    return minStrike + (i * (maxStrike - minStrike)) / (xTicks - 1);
  });

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-4">
        <Tip label={<span className="text-lg font-semibold">IV Smile / Skew</span>}>
          <p className="mb-2">
            Implied volatility (IV) often varies across strikes, creating a
            &quot;smile&quot; or &quot;skew&quot; pattern.
          </p>
          <p className="mb-2">
            <strong>Higher IV</strong> = more expensive options (more premium).
          </p>
          <p className="mb-2">
            <strong>Smile:</strong> IV increases for both OTM calls and OTM
            puts (U-shape).
          </p>
          <p>
            <strong>Skew:</strong> IV is higher for OTM puts than OTM calls
            (common in equity markets due to crash risk).
          </p>
        </Tip>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="mx-auto"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={chartHeight - padding.bottom}
            stroke="#d4d4d8"
            strokeWidth="2"
          />
          {/* X-axis */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#d4d4d8"
            strokeWidth="2"
          />

          {/* Y-axis ticks and labels */}
          {yTickValues.map((tickValue, i) => {
            const y = padding.top + yScale(tickValue);
            return (
              <g key={i}>
                <line
                  x1={padding.left - 5}
                  y1={y}
                  x2={padding.left}
                  y2={y}
                  stroke="#d4d4d8"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="fill-zinc-600 text-xs"
                >
                  {tickValue.toFixed(1)}%
                </text>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#f4f4f5"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* X-axis ticks and labels */}
          {xTickValues.map((tickValue, i) => {
            const x = padding.left + xScale(tickValue);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={chartHeight - padding.bottom}
                  x2={x}
                  y2={chartHeight - padding.bottom + 5}
                  stroke="#d4d4d8"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={chartHeight - padding.bottom + 20}
                  textAnchor="middle"
                  className="fill-zinc-600 text-xs"
                >
                  ${tickValue.toFixed(0)}
                </text>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={chartHeight - padding.bottom}
                  stroke="#f4f4f5"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* ATM strike vertical line */}
          <line
            x1={padding.left + xScale(atmStrike.strike)}
            y1={padding.top}
            x2={padding.left + xScale(atmStrike.strike)}
            y2={chartHeight - padding.bottom}
            stroke="#fbbf24"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* Call IV line */}
          {callPath && (
            <path
              d={callPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              transform={`translate(${padding.left}, ${padding.top})`}
            />
          )}

          {/* Put IV line */}
          {putPath && (
            <path
              d={putPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              transform={`translate(${padding.left}, ${padding.top})`}
            />
          )}

          {/* Data points */}
          {dataPoints.map((point, i) => (
            <circle
              key={i}
              cx={padding.left + xScale(point.strike)}
              cy={padding.top + yScale(point.iv)}
              r="4"
              fill={point.type === "call" ? "#10b981" : "#ef4444"}
              className="hover:r-6"
            >
              <title>
                {point.type.toUpperCase()} ${point.strike} - IV:{" "}
                {(point.iv ?? 0).toFixed(2)}%
              </title>
            </circle>
          ))}

          {/* ATM label */}
          <text
            x={padding.left + xScale(atmStrike.strike)}
            y={padding.top - 5}
            textAnchor="middle"
            className="fill-yellow-600 text-xs font-semibold"
          >
            ATM (${(underlying ?? 0).toFixed(2)})
          </text>

          {/* Axis labels */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            className="fill-zinc-700 text-sm font-semibold"
          >
            Strike Price
          </text>
          <text
            x={15}
            y={chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${chartHeight / 2})`}
            className="fill-zinc-700 text-sm font-semibold"
          >
            Implied Volatility (%)
          </text>
        </svg>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span>Calls</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <span>Puts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-8 border-t-2 border-dashed border-yellow-500"></div>
            <span>ATM Strike</span>
          </div>
        </div>
      </div>
    </div>
  );
}
