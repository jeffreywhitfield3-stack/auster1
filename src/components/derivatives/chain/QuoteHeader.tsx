"use client";

import Tip from "../Tip";

interface QuoteHeaderProps {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  ivRank?: number;
  nextEarnings?: string | null;
  daysToEarnings?: number | null;
}

/**
 * Calculate IV Rank level
 * - Low: 0-33
 * - Moderate: 34-66
 * - High: 67-100
 */
function getIVRankLevel(ivRank?: number): {
  label: string;
  color: string;
  description: string;
} {
  if (ivRank === undefined || ivRank === null) {
    return {
      label: "N/A",
      color: "text-zinc-500 bg-zinc-100",
      description: "IV Rank data not available",
    };
  }

  if (ivRank < 34) {
    return {
      label: "Low",
      color: "text-blue-700 bg-blue-100",
      description:
        "IV is low relative to 52-week range. Options are cheap. Good for buying options.",
    };
  }
  if (ivRank < 67) {
    return {
      label: "Moderate",
      color: "text-yellow-700 bg-yellow-100",
      description:
        "IV is moderate. Options are fairly priced. Neutral conditions.",
    };
  }
  return {
    label: "High",
    color: "text-red-700 bg-red-100",
    description:
      "IV is high relative to 52-week range. Options are expensive. Good for selling premium.",
  };
}

export default function QuoteHeader({
  symbol,
  price,
  change = 0,
  changePercent = 0,
  ivRank,
  nextEarnings,
  daysToEarnings,
}: QuoteHeaderProps) {
  const isPositive = change >= 0;
  const ivRankInfo = getIVRankLevel(ivRank);

  // Determine earnings risk level
  const hasEarningsRisk = daysToEarnings != null && daysToEarnings < 14;
  const isImminentEarnings = daysToEarnings != null && daysToEarnings < 7;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Price Section */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-bold text-zinc-900">{symbol}</h2>
            <span className="text-2xl font-semibold text-zinc-900">
              ${price.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {change.toFixed(2)}
            </span>
            <span
              className={`text-sm font-semibold ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              ({isPositive ? "+" : ""}
              {changePercent.toFixed(2)}%)
            </span>
            <span className="text-xs text-zinc-500">Today</span>
          </div>
        </div>

        {/* IV Rank Section */}
        <div className="flex flex-col gap-2">
          <Tip
            label={
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700">
                  IV Rank
                </span>
                <span
                  className={`rounded-md px-2 py-1 text-sm font-semibold ${ivRankInfo.color}`}
                >
                  {ivRank !== undefined && ivRank !== null
                    ? `${ivRank} - ${ivRankInfo.label}`
                    : ivRankInfo.label}
                </span>
              </div>
            }
          >
            <p className="mb-2 font-semibold">IV Rank (0-100)</p>
            <p className="mb-2">{ivRankInfo.description}</p>
            <p className="text-[11px]">
              IV Rank shows where current IV sits in the 52-week range. 0 =
              lowest IV of year, 100 = highest IV of year.
            </p>
          </Tip>
        </div>

        {/* Earnings Section */}
        <div className="flex flex-col gap-2">
          {nextEarnings && daysToEarnings !== null ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700">
                  Next Earnings
                </span>
                <Tip
                  label={
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${
                        isImminentEarnings
                          ? "bg-red-100 text-red-800"
                          : hasEarningsRisk
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {nextEarnings} ({daysToEarnings}d)
                    </span>
                  }
                >
                  <p className="mb-2 font-semibold">Earnings Risk</p>
                  <p className="mb-2">
                    Earnings are in {daysToEarnings} days. Options prices often
                    spike before earnings due to uncertainty.
                  </p>
                  <p className="text-[11px]">
                    <strong>Consider:</strong> Stocks often move 5-10% on
                    earnings. IV usually drops sharply after earnings
                    (&quot;IV crush&quot;).
                  </p>
                </Tip>
              </div>

              {/* Event risk warning */}
              {isImminentEarnings && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
                  <span className="font-semibold">High Risk:</span> Earnings in{" "}
                  {daysToEarnings} days. Expect high volatility.
                </div>
              )}
              {hasEarningsRisk && !isImminentEarnings && (
                <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                  <span className="font-semibold">Caution:</span> Earnings
                  approaching. IV may be elevated.
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700">
                Next Earnings
              </span>
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                N/A
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Additional context for options trading */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-blue-600">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-xs text-blue-900">
            <p className="font-semibold">Trading Context</p>
            <p className="mt-1">
              {ivRank !== undefined && ivRank >= 67
                ? "High IV suggests selling strategies like iron condors or credit spreads may be favorable."
                : ivRank !== undefined && ivRank < 34
                  ? "Low IV suggests buying strategies like debit spreads or long options may be favorable."
                  : "Moderate IV provides flexibility for both buying and selling strategies."}
              {hasEarningsRisk &&
                " Be cautious with earnings approaching - consider wider strikes or post-earnings strategies."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
