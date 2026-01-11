"use client";

import { useMemo, useState } from "react";
import Tip from "../Tip";

interface ExpirationPickerProps {
  expirations: string[];
  selected: string | null;
  onSelect: (expiration: string) => void;
  autoSelectDTE?: number; // Auto-select nearest to this DTE (default: 35)
  showWeeklies?: boolean;
  showMonthlies?: boolean;
}

interface ExpirationOption {
  date: string;
  dte: number;
  isWeekly: boolean;
  label: string;
}

/**
 * Calculate days to expiration
 */
function calculateDTE(expiration: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expiration + "T00:00:00");
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine if expiration is a weekly (not 3rd Friday)
 * Monthly options typically expire on the 3rd Friday of the month
 */
function isWeekly(expiration: string): boolean {
  const date = new Date(expiration + "T00:00:00");
  const day = date.getDate();
  // 3rd Friday is typically between 15th and 21st
  // This is a simplified check - in reality, need to calculate exact 3rd Friday
  return day < 15 || day > 21;
}

/**
 * Format expiration for display
 */
function formatExpiration(expiration: string, dte: number): string {
  const date = new Date(expiration + "T00:00:00");
  const month = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();
  return `${month} ${day} (${dte}d)`;
}

export default function ExpirationPicker({
  expirations,
  selected,
  onSelect,
  autoSelectDTE = 35,
  showWeeklies = true,
  showMonthlies = true,
}: ExpirationPickerProps) {
  const [filterWeeklies, setFilterWeeklies] = useState(showWeeklies);
  const [filterMonthlies, setFilterMonthlies] = useState(showMonthlies);

  // Process expirations
  const options = useMemo(() => {
    return expirations
      .map((exp) => {
        const dte = calculateDTE(exp);
        const weekly = isWeekly(exp);
        return {
          date: exp,
          dte,
          isWeekly: weekly,
          label: formatExpiration(exp, dte),
        } as ExpirationOption;
      })
      .filter((opt) => opt.dte >= 0) // Only show future expirations
      .sort((a, b) => a.dte - b.dte);
  }, [expirations]);

  // Filter based on weekly/monthly toggles
  const filteredOptions = useMemo(() => {
    return options.filter((opt) => {
      if (opt.isWeekly && !filterWeeklies) return false;
      if (!opt.isWeekly && !filterMonthlies) return false;
      return true;
    });
  }, [options, filterWeeklies, filterMonthlies]);

  // Auto-select nearest to target DTE if nothing selected
  useMemo(() => {
    if (!selected && filteredOptions.length > 0) {
      const nearest = filteredOptions.reduce((prev, curr) =>
        Math.abs(curr.dte - autoSelectDTE) < Math.abs(prev.dte - autoSelectDTE)
          ? curr
          : prev
      );
      onSelect(nearest.date);
    }
  }, [selected, filteredOptions, autoSelectDTE, onSelect]);

  if (options.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
        <p className="text-sm text-zinc-600">
          No expirations available. Please select a symbol.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tip
          label={<span className="text-sm font-semibold">Select Expiration</span>}
        >
          <p className="mb-2">
            Choose an expiration date for the options chain. Each expiration
            represents when the options contracts expire and become worthless
            (if OTM) or are auto-exercised (if ITM).
          </p>
          <p className="text-[11px]">
            <strong>DTE</strong> = Days To Expiration. Most traders prefer
            30-45 DTE for spreads to balance theta decay and time for the trade
            to work.
          </p>
        </Tip>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterWeeklies}
              onChange={(e) => setFilterWeeklies(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Weeklies</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterMonthlies}
              onChange={(e) => setFilterMonthlies(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Monthlies</span>
          </label>
        </div>
      </div>

      {/* Expiration buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {filteredOptions.map((opt) => {
          const isSelected = selected === opt.date;
          const isRecommended =
            opt.dte >= autoSelectDTE - 5 && opt.dte <= autoSelectDTE + 10;

          return (
            <button
              key={opt.date}
              onClick={() => onSelect(opt.date)}
              className={`relative rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-semibold">{opt.label.split("(")[0]}</span>
                <span className="text-xs text-zinc-500">
                  {opt.dte} day{opt.dte !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Weekly badge */}
              {opt.isWeekly && (
                <span className="absolute right-1 top-1 rounded-md bg-purple-100 px-1 py-0.5 text-[9px] font-semibold text-purple-700">
                  W
                </span>
              )}

              {/* Recommended badge */}
              {isRecommended && !isSelected && (
                <span className="absolute left-1 top-1 rounded-md bg-green-100 px-1 py-0.5 text-[9px] font-semibold text-green-700">
                  ★
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* No results message */}
      {filteredOptions.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          No expirations match your filters. Try enabling weeklies or monthlies
          above.
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        <p>
          <strong>Tip:</strong> Options marked with{" "}
          <span className="rounded-md bg-purple-100 px-1 py-0.5 text-[9px] font-semibold text-purple-700">
            W
          </span>{" "}
          are weekly expirations. Monthlies typically offer better liquidity.
          Starred (★) expirations are recommended for {autoSelectDTE}-DTE
          strategies.
        </p>
      </div>
    </div>
  );
}
