"use client";

import Tip from "../Tip";

interface EarningsStrategy {
  name: string;
  timing: "pre-earnings" | "post-earnings";
  whenToUse: string;
  riskReward: string;
  example: string;
  suitableFor: string;
}

const STRATEGIES: EarningsStrategy[] = [
  // Pre-earnings strategies
  {
    name: "Long Straddle",
    timing: "pre-earnings",
    whenToUse: "When IV is low relative to expected move, or you expect a large move in either direction",
    riskReward: "Risk: Premium paid | Reward: Unlimited (both directions)",
    example: "Buy ATM call + Buy ATM put. Profit if stock moves beyond breakevens.",
    suitableFor: "High conviction that earnings will cause significant price movement",
  },
  {
    name: "Iron Condor (Outside Expected Move)",
    timing: "pre-earnings",
    whenToUse: "When IV is high and you expect stock to stay within expected move range",
    riskReward: "Risk: Width of wings - Credit | Reward: Credit received",
    example: "Sell put spread below expected range + Sell call spread above expected range",
    suitableFor: "Conservative traders who believe earnings won't cause extreme moves",
  },
  {
    name: "Calendar Spread",
    timing: "pre-earnings",
    whenToUse: "When you expect IV to increase before earnings then crush afterward",
    riskReward: "Risk: Net debit | Reward: Difference in IV between expirations",
    example: "Sell front-month ATM option + Buy back-month ATM option through earnings",
    suitableFor: "Advanced traders comfortable with vega exposure",
  },
  {
    name: "Long Strangle",
    timing: "pre-earnings",
    whenToUse: "Similar to straddle but cheaper - when you expect a large move",
    riskReward: "Risk: Premium paid (less than straddle) | Reward: Unlimited",
    example: "Buy OTM call + Buy OTM put. Lower cost but needs bigger move to profit.",
    suitableFor: "Moderate conviction of large move, wanting to reduce upfront cost",
  },
  // Post-earnings strategies
  {
    name: "Short Straddle/Strangle (IV Crush)",
    timing: "post-earnings",
    whenToUse: "Immediately after earnings when IV has crushed and stock stabilizes",
    riskReward: "Risk: Unlimited | Reward: Premium collected",
    example: "Sell ATM or OTM options after IV crush to collect premium as volatility normalizes",
    suitableFor: "Experienced traders with margin and risk management discipline",
  },
  {
    name: "Bull/Bear Spread (Post-Reaction)",
    timing: "post-earnings",
    whenToUse: "After earnings when direction is clear and IV has dropped",
    riskReward: "Risk: Net debit or width - credit | Reward: Width of spread",
    example: "If stock gapped up on earnings, buy call spread. If down, buy put spread.",
    suitableFor: "Traders who want defined risk directional exposure post-earnings",
  },
  {
    name: "Sell Naked Premium (Advanced)",
    timing: "post-earnings",
    whenToUse: "When IV crushed but is still elevated relative to historical levels",
    riskReward: "Risk: Unlimited (if naked) | Reward: Premium collected",
    example: "Sell cash-secured puts or covered calls after IV crush",
    suitableFor: "Advanced traders comfortable with assignment and margin requirements",
  },
];

interface EarningsStrategiesProps {
  onBuild?: (strategyName: string) => void;
}

export default function EarningsStrategies({
  onBuild,
}: EarningsStrategiesProps) {
  const preEarnings = STRATEGIES.filter((s) => s.timing === "pre-earnings");
  const postEarnings = STRATEGIES.filter((s) => s.timing === "post-earnings");

  const handleBuild = (strategyName: string) => {
    if (onBuild) {
      onBuild(strategyName);
    }
  };

  const StrategyCard = ({ strategy }: { strategy: EarningsStrategy }) => (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <h4 className="text-base font-semibold text-zinc-900">
          {strategy.name}
        </h4>
        <Tip
          label={
            <span className="text-xs font-semibold text-zinc-600">Details</span>
          }
        >
          <p className="mb-2 font-semibold">{strategy.name}</p>
          <p className="mb-2 text-[11px]">
            <span className="font-semibold">Timing:</span>{" "}
            {strategy.timing === "pre-earnings"
              ? "Before Earnings"
              : "After Earnings"}
          </p>
          <p className="mb-2 text-[11px]">
            <span className="font-semibold">When to use:</span>{" "}
            {strategy.whenToUse}
          </p>
          <p className="mb-2 text-[11px]">
            <span className="font-semibold">Risk/Reward:</span>{" "}
            {strategy.riskReward}
          </p>
          <p className="mb-2 text-[11px]">
            <span className="font-semibold">Example:</span> {strategy.example}
          </p>
          <p className="text-[11px]">
            <span className="font-semibold">Suitable for:</span>{" "}
            {strategy.suitableFor}
          </p>
        </Tip>
      </div>

      <div className="mb-3 space-y-2 text-sm text-zinc-700">
        <div>
          <span className="font-semibold text-zinc-900">When:</span>{" "}
          {strategy.whenToUse}
        </div>
        <div>
          <span className="font-semibold text-zinc-900">Risk/Reward:</span>{" "}
          {strategy.riskReward}
        </div>
      </div>

      <button
        onClick={() => handleBuild(strategy.name)}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        Build Strategy
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Earnings Trading Strategies
        </h2>
        <p className="text-sm text-zinc-600">
          Choose strategies based on your timing relative to the earnings
          announcement and your market outlook.
        </p>
      </div>

      {/* Pre-Earnings Strategies */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-zinc-900">
            Pre-Earnings Strategies
          </h3>
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
            Before Announcement
          </span>
        </div>
        <p className="text-sm text-zinc-600">
          Deploy these strategies before the earnings announcement when IV is
          typically elevated.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {preEarnings.map((strategy) => (
            <StrategyCard key={strategy.name} strategy={strategy} />
          ))}
        </div>
      </div>

      {/* Post-Earnings Strategies */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-zinc-900">
            Post-Earnings Strategies
          </h3>
          <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
            After Announcement
          </span>
        </div>
        <p className="text-sm text-zinc-600">
          Use these strategies after earnings when IV typically crushes and
          direction becomes clearer.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {postEarnings.map((strategy) => (
            <StrategyCard key={strategy.name} strategy={strategy} />
          ))}
        </div>
      </div>

      {/* Educational Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="mb-2 text-sm font-semibold text-blue-900">
          Key Concepts for Earnings Trading
        </p>
        <ul className="space-y-1 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-400">•</span>
            <span>
              <span className="font-semibold">IV Expansion:</span> Implied
              volatility typically rises leading up to earnings as uncertainty
              increases
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">•</span>
            <span>
              <span className="font-semibold">IV Crush:</span> After earnings
              are announced, IV often drops sharply as uncertainty resolves
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">•</span>
            <span>
              <span className="font-semibold">Expected Move:</span> The market
              prices in a specific expected move; moves beyond this can create
              outsized profits
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400">•</span>
            <span>
              <span className="font-semibold">Timing:</span> Consider entering
              pre-earnings positions 3-7 days before announcement for optimal
              IV capture
            </span>
          </li>
        </ul>
      </div>

      {/* Risk Warning */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="mb-2 text-sm font-semibold text-red-900">
          Risk Warning
        </p>
        <p className="text-sm text-red-800">
          Earnings trades carry significant risk. Stocks can move dramatically
          in unexpected directions. Always use position sizing appropriate to
          your risk tolerance, and consider using defined-risk strategies until
          you have experience with earnings volatility.
        </p>
      </div>
    </div>
  );
}
