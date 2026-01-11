// Mock position data for My Positions tab
// This simulates positions until we have live broker integration

export type PositionStatus = "profit" | "breakeven" | "loss";

export type OptionLeg = {
  type: "call" | "put";
  action: "buy" | "sell";
  strike: number;
  quantity: number;
  price: number; // Entry price per contract
};

export type Position = {
  id: string;
  symbol: string;
  strategyName: string;
  strategyType: "bull_call_spread" | "bear_put_spread" | "iron_condor" | "butterfly" | "long_call" | "long_put";
  legs: OptionLeg[];
  expiration: string; // YYYY-MM-DD
  entryDate: string; // ISO date
  entryPrice: number; // Total debit/credit
  currentPrice: number; // Current market value
  maxProfit: number;
  maxLoss: number;
  breakevens: number[]; // Can be 1 or 2 breakevens
  pop: number; // Probability of profit (0-1)
  delta: number;
  theta: number; // Per day
  vega: number;
  status: PositionStatus;
};

export type ClosedPosition = {
  id: string;
  symbol: string;
  strategyName: string;
  strategyType: string;
  expiration: string;
  entryDate: string;
  closeDate: string;
  entryPrice: number;
  closePrice: number;
  realizedPL: number;
  returnPct: number;
  dteAtEntry: number;
  dteAtClose: number;
};

export type PortfolioGreeks = {
  delta: number;
  theta: number;
  vega: number;
  gamma: number;
};

// Calculate current P/L for a position
export function calculatePL(position: Position) {
  const pl = position.currentPrice - position.entryPrice;
  const plPct = position.entryPrice !== 0 ? (pl / Math.abs(position.entryPrice)) : 0;
  return { pl, plPct };
}

// Calculate days to expiration
export function calculateDTE(expiration: string): number {
  const exp = new Date(expiration);
  const now = new Date();
  const diff = exp.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Determine position status based on P/L and breakevens
export function determineStatus(position: Position, currentUnderlying: number): PositionStatus {
  const { pl } = calculatePL(position);

  // Check if breaching breakevens
  const [lowerBE, upperBE] = position.breakevens.length === 2
    ? [Math.min(...position.breakevens), Math.max(...position.breakevens)]
    : [position.breakevens[0], position.breakevens[0]];

  if (position.breakevens.length === 2) {
    // Iron condor or similar - want to stay between breakevens
    if (currentUnderlying < lowerBE || currentUnderlying > upperBE) {
      return "loss";
    }
  } else {
    // Single breakeven - directional trade
    const isAboveBE = currentUnderlying > position.breakevens[0];
    const isBullish = position.strategyType.includes("bull") || position.strategyType.includes("call");

    if ((isBullish && !isAboveBE) || (!isBullish && isAboveBE)) {
      return "loss";
    }
  }

  // Otherwise check P/L
  if (pl > 0) return "profit";
  if (pl < -50) return "loss"; // Arbitrary threshold
  return "breakeven";
}

// Mock current underlying prices
export const mockUnderlyingPrices: Record<string, number> = {
  AAPL: 181.20,
  TSLA: 247.50,
  SPY: 485.30,
};

// Mock active positions (2-3 positions)
export const mockActivePositions: Position[] = [
  {
    id: "pos-1",
    symbol: "AAPL",
    strategyName: "AAPL Jan19 Bull Call Spread",
    strategyType: "bull_call_spread",
    legs: [
      { type: "call", action: "buy", strike: 175, quantity: 1, price: 6.20 },
      { type: "call", action: "sell", strike: 180, quantity: 1, price: 2.10 },
    ],
    expiration: "2026-01-19",
    entryDate: "2026-01-04T14:30:00Z",
    entryPrice: -410, // Net debit (buy 620 - sell 210)
    currentPrice: -325, // Current value
    maxProfit: 90, // (180-175)*100 - 410
    maxLoss: -410,
    breakevens: [179.10], // 175 + 4.10
    pop: 0.62,
    delta: 0.35,
    theta: -3.20,
    vega: -8.50,
    status: "profit",
  },
  {
    id: "pos-2",
    symbol: "TSLA",
    strategyName: "TSLA Feb2 Iron Condor",
    strategyType: "iron_condor",
    legs: [
      { type: "put", action: "buy", strike: 200, quantity: 1, price: 2.50 },
      { type: "put", action: "sell", strike: 210, quantity: 1, price: 5.20 },
      { type: "call", action: "sell", strike: 250, quantity: 1, price: 4.80 },
      { type: "call", action: "buy", strike: 260, quantity: 1, price: 2.10 },
    ],
    expiration: "2026-02-02",
    entryDate: "2026-01-05T10:15:00Z",
    entryPrice: 540, // Net credit
    currentPrice: 505, // Current value (position losing value = good for credit spread)
    maxProfit: 540,
    maxLoss: -460, // Max loss on either side (1000 - 540)
    breakevens: [204.60, 255.40], // 210 - 5.40, 250 + 5.40
    pop: 0.70,
    delta: 0.02,
    theta: 12.50,
    vega: -25.00,
    status: "breakeven",
  },
  {
    id: "pos-3",
    symbol: "SPY",
    strategyName: "SPY Jan26 Bull Call Spread",
    strategyType: "bull_call_spread",
    legs: [
      { type: "call", action: "buy", strike: 480, quantity: 2, price: 7.50 },
      { type: "call", action: "sell", strike: 485, quantity: 2, price: 4.20 },
    ],
    expiration: "2026-01-26",
    entryDate: "2026-01-08T11:00:00Z",
    entryPrice: -660, // (7.50 - 4.20) * 100 * 2
    currentPrice: -520,
    maxProfit: 340, // (485-480)*100*2 - 660
    maxLoss: -660,
    breakevens: [483.30],
    pop: 0.58,
    delta: 0.42,
    theta: -5.80,
    vega: -12.40,
    status: "profit",
  },
];

// Mock closed positions (5-10 for history)
export const mockClosedPositions: ClosedPosition[] = [
  {
    id: "closed-1",
    symbol: "AAPL",
    strategyName: "AAPL Dec15 Iron Condor",
    strategyType: "iron_condor",
    expiration: "2025-12-15",
    entryDate: "2025-11-20",
    closeDate: "2025-12-10",
    entryPrice: 450,
    closePrice: 50,
    realizedPL: 400,
    returnPct: 0.89,
    dteAtEntry: 25,
    dteAtClose: 5,
  },
  {
    id: "closed-2",
    symbol: "MSFT",
    strategyName: "MSFT Dec22 Bull Call Spread",
    strategyType: "bull_call_spread",
    expiration: "2025-12-22",
    entryDate: "2025-12-05",
    closeDate: "2025-12-20",
    entryPrice: -320,
    closePrice: -120,
    realizedPL: 200,
    returnPct: 0.625,
    dteAtEntry: 17,
    dteAtClose: 2,
  },
  {
    id: "closed-3",
    symbol: "TSLA",
    strategyName: "TSLA Dec29 Bear Put Spread",
    strategyType: "bear_put_spread",
    expiration: "2025-12-29",
    entryDate: "2025-12-15",
    closeDate: "2025-12-28",
    entryPrice: -280,
    closePrice: -350,
    realizedPL: -70,
    returnPct: -0.25,
    dteAtEntry: 14,
    dteAtClose: 1,
  },
  {
    id: "closed-4",
    symbol: "SPY",
    strategyName: "SPY Jan5 Iron Condor",
    strategyType: "iron_condor",
    expiration: "2026-01-05",
    entryDate: "2025-12-10",
    closeDate: "2026-01-02",
    entryPrice: 380,
    closePrice: 80,
    realizedPL: 300,
    returnPct: 0.79,
    dteAtEntry: 26,
    dteAtClose: 3,
  },
  {
    id: "closed-5",
    symbol: "NVDA",
    strategyName: "NVDA Dec8 Bull Call Spread",
    strategyType: "bull_call_spread",
    expiration: "2025-12-08",
    entryDate: "2025-11-25",
    closeDate: "2025-12-08",
    entryPrice: -420,
    closePrice: 0,
    realizedPL: -420,
    returnPct: -1.0,
    dteAtEntry: 13,
    dteAtClose: 0,
  },
  {
    id: "closed-6",
    symbol: "AAPL",
    strategyName: "AAPL Nov24 Iron Condor",
    strategyType: "iron_condor",
    expiration: "2025-11-24",
    entryDate: "2025-11-01",
    closeDate: "2025-11-22",
    entryPrice: 520,
    closePrice: 100,
    realizedPL: 420,
    returnPct: 0.81,
    dteAtEntry: 23,
    dteAtClose: 2,
  },
  {
    id: "closed-7",
    symbol: "META",
    strategyName: "META Dec1 Bull Call Spread",
    strategyType: "bull_call_spread",
    expiration: "2025-12-01",
    entryDate: "2025-11-15",
    closeDate: "2025-11-29",
    entryPrice: -350,
    closePrice: -220,
    realizedPL: 130,
    returnPct: 0.37,
    dteAtEntry: 16,
    dteAtClose: 2,
  },
  {
    id: "closed-8",
    symbol: "GOOGL",
    strategyName: "GOOGL Dec15 Iron Condor",
    strategyType: "iron_condor",
    expiration: "2025-12-15",
    entryDate: "2025-11-28",
    closeDate: "2025-12-13",
    entryPrice: 410,
    closePrice: 120,
    realizedPL: 290,
    returnPct: 0.71,
    dteAtEntry: 17,
    dteAtClose: 2,
  },
];

// Calculate portfolio-wide Greeks
export function calculatePortfolioGreeks(positions: Position[]): PortfolioGreeks {
  return positions.reduce(
    (acc, pos) => ({
      delta: acc.delta + pos.delta,
      theta: acc.theta + pos.theta,
      vega: acc.vega + pos.vega,
      gamma: acc.gamma + (pos.delta * 0.1), // Simplified gamma approximation
    }),
    { delta: 0, theta: 0, vega: 0, gamma: 0 }
  );
}

// Calculate portfolio totals
export function calculatePortfolioTotals(positions: Position[]) {
  const totalPL = positions.reduce((sum, pos) => {
    const { pl } = calculatePL(pos);
    return sum + pl;
  }, 0);

  const totalCapitalAtRisk = positions.reduce((sum, pos) => {
    return sum + Math.abs(pos.maxLoss);
  }, 0);

  const totalCurrentValue = positions.reduce((sum, pos) => {
    return sum + pos.currentPrice;
  }, 0);

  const totalEntryValue = positions.reduce((sum, pos) => {
    return sum + pos.entryPrice;
  }, 0);

  const totalPLPct = totalEntryValue !== 0 ? (totalPL / Math.abs(totalEntryValue)) : 0;

  return {
    totalPL,
    totalPLPct,
    totalCapitalAtRisk,
    totalCurrentValue,
    totalEntryValue,
  };
}

// Calculate trade history stats
export function calculateTradeStats(closedPositions: ClosedPosition[]) {
  const totalRealized = closedPositions.reduce((sum, pos) => sum + pos.realizedPL, 0);
  const winners = closedPositions.filter(pos => pos.realizedPL > 0);
  const losers = closedPositions.filter(pos => pos.realizedPL < 0);
  const winRate = closedPositions.length > 0 ? winners.length / closedPositions.length : 0;
  const avgReturn = closedPositions.length > 0
    ? closedPositions.reduce((sum, pos) => sum + pos.returnPct, 0) / closedPositions.length
    : 0;

  const bestTrade = closedPositions.reduce((best, pos) =>
    pos.realizedPL > (best?.realizedPL || -Infinity) ? pos : best
  , closedPositions[0]);

  const worstTrade = closedPositions.reduce((worst, pos) =>
    pos.realizedPL < (worst?.realizedPL || Infinity) ? pos : worst
  , closedPositions[0]);

  return {
    totalRealized,
    winRate,
    avgReturn,
    totalTrades: closedPositions.length,
    winners: winners.length,
    losers: losers.length,
    bestTrade,
    worstTrade,
  };
}
