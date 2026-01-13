"use client";

import { useState } from "react";
import LiquidityBadge from "../shared/LiquidityBadge";
import Tip from "../Tip";
import GreeksTooltip from "../shared/GreeksTooltip";
import type { MassiveOptionLeg } from "@/lib/derivatives/massive";

interface ChainTableProps {
  calls: MassiveOptionLeg[];
  puts: MassiveOptionLeg[];
  underlying: number;
  onContractClick?: (contract: MassiveOptionLeg, type: "call" | "put") => void;
  deltaMin?: number;
  deltaMax?: number;
  showWeeklies?: boolean;
  showMonthlies?: boolean;
  liquidOnly?: boolean;
}

/**
 * Calculate bid-ask spread percentage
 */
function calculateSpread(bid: number | null, ask: number | null): number | null {
  if (!bid || !ask || bid <= 0) return null;
  return ((ask - bid) / bid) * 100;
}

/**
 * Determine if contract is liquid
 */
function isLiquid(leg: MassiveOptionLeg): boolean {
  const oi = leg.open_interest ?? 0;
  const vol = leg.volume ?? 0;
  const spread = calculateSpread(leg.bid, leg.ask) ?? 100;
  return oi > 500 && vol > 50 && spread < 10;
}

/**
 * Check if delta is in range
 */
function isDeltaInRange(
  delta: number | null | undefined,
  min: number,
  max: number
): boolean {
  if (delta === null || delta === undefined) return true; // Show if no delta
  const absDelta = Math.abs(delta);
  return absDelta >= min && absDelta <= max;
}

export default function ChainTable({
  calls,
  puts,
  underlying,
  onContractClick,
  deltaMin = 0,
  deltaMax = 1,
  liquidOnly = false,
}: ChainTableProps) {
  const [hoveredStrike, setHoveredStrike] = useState<number | null>(null);
  const [hoveredContract, setHoveredContract] = useState<{
    contract: MassiveOptionLeg;
    type: "call" | "put";
    x: number;
    y: number;
  } | null>(null);

  // Filter calls and puts based on criteria
  const filteredCalls = calls.filter((call) => {
    if (liquidOnly && !isLiquid(call)) return false;
    if (!isDeltaInRange(call.delta, deltaMin, deltaMax)) return false;
    return true;
  });

  const filteredPuts = puts.filter((put) => {
    if (liquidOnly && !isLiquid(put)) return false;
    if (!isDeltaInRange(put.delta, deltaMin, deltaMax)) return false;
    return true;
  });

  // Get unique strikes (union of calls and puts)
  const strikeSet = new Set<number>();
  filteredCalls.forEach((c) => strikeSet.add(c.strike));
  filteredPuts.forEach((p) => strikeSet.add(p.strike));
  const strikes = Array.from(strikeSet).sort((a, b) => a - b);

  // Create maps for quick lookup
  const callMap = new Map(filteredCalls.map((c) => [c.strike, c]));
  const putMap = new Map(filteredPuts.map((p) => [p.strike, p]));

  return (
    <div className="w-full overflow-x-auto">
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tip label={<span className="text-sm font-medium">Delta Range</span>}>
          Filter contracts by their delta (probability of finishing ITM). Use
          this to focus on ATM strikes (0.4-0.6) or further OTM (0.1-0.3).
        </Tip>
        <span className="text-xs text-zinc-600">
          {(deltaMin * 100).toFixed(0)}% - {(deltaMax * 100).toFixed(0)}%
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-300 bg-zinc-50">
              <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-700">
                Strike
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-700">
                <Tip label="Bid">
                  The highest price a buyer is willing to pay. You receive this
                  when selling.
                </Tip>
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-700">
                <Tip label="Ask">
                  The lowest price a seller is willing to accept. You pay this
                  when buying.
                </Tip>
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-700">
                <Tip label="Vol">Today&apos;s trading volume</Tip>
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-700">
                <Tip label="OI">
                  Open Interest - total number of outstanding contracts
                </Tip>
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-green-700">
                CALLS
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-red-700">
                PUTS
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-700">
                <Tip label="OI">
                  Open Interest - total number of outstanding contracts
                </Tip>
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-700">
                <Tip label="Vol">Today&apos;s trading volume</Tip>
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-700">
                <Tip label="Ask">
                  The lowest price a seller is willing to accept. You pay this
                  when buying.
                </Tip>
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-700">
                <Tip label="Bid">
                  The highest price a buyer is willing to pay. You receive this
                  when selling.
                </Tip>
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-700">
                Strike
              </th>
            </tr>
          </thead>
          <tbody>
            {strikes.map((strike) => {
              const call = callMap.get(strike);
              const put = putMap.get(strike);
              const isATM = Math.abs(strike - underlying) < underlying * 0.02;
              const isHovered = hoveredStrike === strike;

              return (
                <tr
                  key={strike}
                  className={`border-b border-zinc-200 transition-colors ${
                    isHovered ? "bg-blue-50" : ""
                  } ${isATM ? "bg-yellow-50 font-semibold" : ""}`}
                  onMouseEnter={() => setHoveredStrike(strike)}
                  onMouseLeave={() => setHoveredStrike(null)}
                >
                  {/* Call side */}
                  <td className="px-3 py-2 text-right font-mono text-zinc-900">
                    {(strike ?? 0).toFixed(2)}
                  </td>
                  <td
                    className={`cursor-pointer px-3 py-2 text-right font-mono transition-colors ${
                      call ? "hover:bg-green-100" : ""
                    }`}
                    onClick={() => call && onContractClick?.(call, "call")}
                    onMouseEnter={(e) => {
                      if (call) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredContract({
                          contract: call,
                          type: "call",
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredContract(null)}
                  >
                    {call?.bid?.toFixed(2) ?? "-"}
                  </td>
                  <td
                    className={`cursor-pointer px-3 py-2 text-right font-mono transition-colors ${
                      call ? "hover:bg-green-100" : ""
                    }`}
                    onClick={() => call && onContractClick?.(call, "call")}
                    onMouseEnter={(e) => {
                      if (call) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredContract({
                          contract: call,
                          type: "call",
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredContract(null)}
                  >
                    {call?.ask?.toFixed(2) ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-600">
                    {call?.volume?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-600">
                    {call?.open_interest?.toLocaleString() ?? "-"}
                  </td>

                  {/* Liquidity badges */}
                  <td className="px-3 py-2 text-center">
                    {call && (
                      <LiquidityBadge
                        openInterest={call.open_interest}
                        volume={call.volume}
                        bidAskSpread={calculateSpread(call.bid, call.ask)}
                        showTooltip={false}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {put && (
                      <LiquidityBadge
                        openInterest={put.open_interest}
                        volume={put.volume}
                        bidAskSpread={calculateSpread(put.bid, put.ask)}
                        showTooltip={false}
                      />
                    )}
                  </td>

                  {/* Put side */}
                  <td className="px-3 py-2 text-left font-mono text-xs text-zinc-600">
                    {put?.open_interest?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-left font-mono text-xs text-zinc-600">
                    {put?.volume?.toLocaleString() ?? "-"}
                  </td>
                  <td
                    className={`cursor-pointer px-3 py-2 text-left font-mono transition-colors ${
                      put ? "hover:bg-red-100" : ""
                    }`}
                    onClick={() => put && onContractClick?.(put, "put")}
                    onMouseEnter={(e) => {
                      if (put) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredContract({
                          contract: put,
                          type: "put",
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredContract(null)}
                  >
                    {put?.ask?.toFixed(2) ?? "-"}
                  </td>
                  <td
                    className={`cursor-pointer px-3 py-2 text-left font-mono transition-colors ${
                      put ? "hover:bg-red-100" : ""
                    }`}
                    onClick={() => put && onContractClick?.(put, "put")}
                    onMouseEnter={(e) => {
                      if (put) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredContract({
                          contract: put,
                          type: "put",
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredContract(null)}
                  >
                    {put?.bid?.toFixed(2) ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-left font-mono text-zinc-900">
                    {(strike ?? 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {strikes.map((strike) => {
          const call = callMap.get(strike);
          const put = putMap.get(strike);
          const isATM = Math.abs(strike - underlying) < underlying * 0.02;

          return (
            <div
              key={strike}
              className={`rounded-lg border p-3 ${
                isATM
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="mb-2 text-center text-lg font-bold text-zinc-900">
                ${(strike ?? 0).toFixed(2)}
                {isATM && (
                  <span className="ml-2 text-xs font-normal text-yellow-700">
                    (ATM)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Call Card */}
                <div
                  className="cursor-pointer rounded-md border border-green-200 bg-green-50 p-2"
                  onClick={() => call && onContractClick?.(call, "call")}
                >
                  <div className="mb-1 text-xs font-semibold text-green-800">
                    CALL
                  </div>
                  {call ? (
                    <>
                      <div className="mb-1 text-sm font-mono">
                        ${call.ask?.toFixed(2) ?? "-"}
                      </div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-green-700">
                        <span>Vol: {call.volume?.toLocaleString() ?? "-"}</span>
                        <span>OI: {call.open_interest?.toLocaleString() ?? "-"}</span>
                      </div>
                      <LiquidityBadge
                        openInterest={call.open_interest}
                        volume={call.volume}
                        bidAskSpread={calculateSpread(call.bid, call.ask)}
                        showTooltip={false}
                      />
                    </>
                  ) : (
                    <div className="text-xs text-green-600">No data</div>
                  )}
                </div>

                {/* Put Card */}
                <div
                  className="cursor-pointer rounded-md border border-red-200 bg-red-50 p-2"
                  onClick={() => put && onContractClick?.(put, "put")}
                >
                  <div className="mb-1 text-xs font-semibold text-red-800">
                    PUT
                  </div>
                  {put ? (
                    <>
                      <div className="mb-1 text-sm font-mono">
                        ${put.ask?.toFixed(2) ?? "-"}
                      </div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-red-700">
                        <span>Vol: {put.volume?.toLocaleString() ?? "-"}</span>
                        <span>OI: {put.open_interest?.toLocaleString() ?? "-"}</span>
                      </div>
                      <LiquidityBadge
                        openInterest={put.open_interest}
                        volume={put.volume}
                        bidAskSpread={calculateSpread(put.bid, put.ask)}
                        showTooltip={false}
                      />
                    </>
                  ) : (
                    <div className="text-xs text-red-600">No data</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Educational tip */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <span className="font-semibold">Tip:</span> Click any contract to add
        it to your Strategy Builder. ATM strikes (near ${(underlying ?? 0).toFixed(2)})
        are highlighted in yellow.
      </div>

      {/* Spread warnings */}
      {strikes.some((strike) => {
        const call = callMap.get(strike);
        const put = putMap.get(strike);
        const callSpread = call ? calculateSpread(call.bid, call.ask) : null;
        const putSpread = put ? calculateSpread(put.bid, put.ask) : null;
        return (
          (callSpread && callSpread > 20) || (putSpread && putSpread > 20)
        );
      }) && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <span className="font-semibold">Warning:</span> Some contracts have
          very wide spreads (&gt;20%). These are illiquid and risky to trade. Use
          limit orders or consider different strikes.
        </div>
      )}

      {/* Greeks Tooltip */}
      {hoveredContract && (
        <GreeksTooltip
          contract={hoveredContract.contract}
          type={hoveredContract.type}
          underlying={underlying}
          x={hoveredContract.x}
          y={hoveredContract.y}
        />
      )}
    </div>
  );
}
