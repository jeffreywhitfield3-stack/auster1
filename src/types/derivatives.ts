// src/types/derivatives.ts
// Complete TypeScript types for Derivatives Lab

/**
 * OptionContract represents a single option (call or put) at a specific strike.
 * Used for displaying individual options in the chain and building strategies.
 */
export type OptionContract = {
  strike: number;
  bid: number | null;
  ask: number | null;
  last?: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null; // Decimal format (0.25 = 25% IV)

  // Greeks
  delta: number | null;
  gamma?: number | null;
  theta: number | null;
  vega?: number | null;
  rho?: number | null;

  // Metadata
  contractSymbol?: string;
  expirationDate?: string;
};

/**
 * OptionChain represents all options for a single expiration date.
 * Includes underlying price, expiration, and arrays of calls/puts.
 */
export type OptionChain = {
  symbol: string;
  underlying: number;
  expiration: string; // YYYY-MM-DD format
  calls: OptionContract[];
  puts: OptionContract[];
  asOf?: string | null;

  // Additional metadata
  ivRank?: number | null; // 0-100, where is current IV vs 52-week range
  ivPercentile?: number | null;
  historicalVolatility?: number | null;
};

/**
 * StrategyLeg represents one option position in a multi-leg strategy.
 * Action: 'BUY' means going long, 'SELL' means going short (opening credit).
 */
export type StrategyLeg = {
  id: string; // Unique ID for UI manipulation (drag/drop/delete)
  type: 'CALL' | 'PUT';
  action: 'BUY' | 'SELL';
  strike: number;
  expiration: string; // YYYY-MM-DD
  quantity: number; // Usually 1, but can be 2+ for ratios

  // Price data (copied from OptionContract at selection time)
  bid: number | null;
  ask: number | null;
  mid: number | null; // (bid + ask) / 2

  // Greeks (copied from OptionContract)
  delta: number | null;
  gamma?: number | null;
  theta: number | null;
  vega?: number | null;

  // Liquidity indicators
  volume: number | null;
  openInterest: number | null;
};

/**
 * Strategy represents a complete multi-leg options position.
 * Can be a simple vertical spread or complex like iron condor/butterfly.
 */
export type Strategy = {
  id: string;
  name?: string; // Optional user-defined name
  underlying: string; // Symbol (e.g., "SPY")
  underlyingPrice: number;
  legs: StrategyLeg[];

  // Calculated risk metrics (computed from legs)
  maxProfit: number | null;
  maxLoss: number | null;
  breakevens: number[];
  creditDebit: number; // Negative = debit, Positive = credit

  // Advanced metrics
  probabilityOfProfit?: number | null; // 0-100 estimate
  returnOnRisk?: number | null; // maxProfit / maxLoss ratio
  marginEstimate?: number | null;
  thetaPerDay?: number | null;
  vegaExposure?: number | null;

  // Metadata
  createdAt?: string;
  lastModified?: string;
};

/**
 * StrategyTemplate defines preset strategies for quick setup.
 * Used in Strategy Builder tab for one-click strategy creation.
 */
export type StrategyTemplate = {
  id: string;
  name: string;
  description: string;
  category: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILITY';
  riskLevel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

  // Number of legs required
  legCount: number;

  // Example: Vertical spread needs 2 legs (buy lower, sell higher)
  // Template config describes the structure
  structure: {
    leg1: { type: 'CALL' | 'PUT'; action: 'BUY' | 'SELL'; deltaTarget?: number };
    leg2?: { type: 'CALL' | 'PUT'; action: 'BUY' | 'SELL'; deltaTarget?: number };
    leg3?: { type: 'CALL' | 'PUT'; action: 'BUY' | 'SELL'; deltaTarget?: number };
    leg4?: { type: 'CALL' | 'PUT'; action: 'BUY' | 'SELL'; deltaTarget?: number };
  };

  // Educational content
  tips?: string[];
  idealConditions?: string;
};

/**
 * Position represents a live or paper-traded strategy.
 * Tracks entry, current P/L, and exit data.
 */
export type Position = {
  id: string;
  strategy: Strategy;

  // Entry data
  entryDate: string;
  entryPrice: number; // Total credit/debit at entry

  // Current status
  status: 'OPEN' | 'CLOSED';
  currentPrice: number; // Current market value
  unrealizedPnL: number; // currentPrice - entryPrice

  // Exit data (if closed)
  exitDate?: string;
  exitPrice?: number;
  realizedPnL?: number;

  // Risk management
  stopLoss?: number;
  profitTarget?: number;

  // Metadata
  notes?: string;
  tags?: string[];
};

/**
 * Event types for earnings and economic events.
 * Used in Events tab to identify high-volatility periods.
 */
export type EarningsEvent = {
  symbol: string;
  date: string; // YYYY-MM-DD
  time: 'BMO' | 'AMC' | 'DURING'; // Before market open, after close, or during
  confirmed: boolean;

  // Derived from ATM straddle
  expectedMove?: number | null; // Dollar amount
  expectedMovePercent?: number | null; // Percentage

  // IV metrics
  ivRank?: number | null;
  ivExpansion?: number | null; // How much IV has risen pre-earnings
};

export type EconomicEvent = {
  id: string;
  name: string; // "FOMC Meeting", "CPI Report", "NFP"
  date: string;
  time?: string; // HH:MM format
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  description?: string;
};

/**
 * Anomaly types for unusual options activity detection.
 * Used in Screeners tab to find volume/OI spikes.
 */
export type OptionAnomaly = {
  symbol: string;
  contract: string; // Full option symbol
  type: 'CALL' | 'PUT';
  strike: number;
  expiration: string;

  // Anomaly metrics
  volumeZScore: number; // How many standard deviations above normal
  oiZScore?: number;
  volumeToOIRatio?: number;

  // Context
  volume: number;
  openInterest: number;
  avgVolume?: number;

  // Price action
  underlyingPrice: number;
  underlyingChange?: number;
  moneyness: 'ITM' | 'ATM' | 'OTM';

  // Sentiment
  sentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';

  // Metadata
  detectedAt: string;
};

/**
 * Screener result types for iron condor and directional screeners.
 */
export type IronCondorResult = {
  symbol: string;
  expiration: string;
  dte: number; // Days to expiration

  // Strategy details
  shortCallStrike: number;
  shortPutStrike: number;
  longCallStrike: number;
  longPutStrike: number;

  // Risk/Reward
  maxProfit: number;
  maxLoss: number;
  creditReceived: number;
  returnOnRisk: number;

  // Safety metrics
  probabilityOfProfit: number;
  safetyScore: number; // 1-5 stars based on liquidity, IV, distance

  // Liquidity
  avgBidAskSpread: number;
  totalOpenInterest: number;
  totalVolume: number;

  // IV metrics
  ivRank: number | null;
  ivPercentile: number | null;
};

export type VerticalSpreadResult = {
  symbol: string;
  expiration: string;
  dte: number;
  direction: 'BULLISH' | 'BEARISH';

  // Strategy details
  longStrike: number;
  shortStrike: number;
  type: 'CALL' | 'PUT';

  // Risk/Reward
  maxProfit: number;
  maxLoss: number;
  debitPaid: number;
  returnOnRisk: number;
  probabilityOfProfit: number;

  // Price targets
  breakeven: number;
  underlyingPrice: number;
  distanceToBreakeven: number;

  // Liquidity
  avgBidAskSpread: number;
  totalOpenInterest: number;
};

/**
 * Liquidity assessment helper type.
 * Used for color-coding in LiquidityBadge component.
 */
export type LiquidityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type LiquidityMetrics = {
  level: LiquidityLevel;
  openInterest: number | null;
  volume: number | null;
  bidAskSpread: number | null;
  spreadPercent: number | null; // Spread as % of mid price
};

/**
 * Greeks aggregation for portfolio-level risk.
 * Used in Positions tab to show total portfolio exposure.
 */
export type PortfolioGreeks = {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  totalRho?: number;

  // Position count
  openPositions: number;
  totalCapitalAtRisk: number;
  totalUnrealizedPnL: number;
};

/**
 * User preferences for screener presets.
 */
export type ScreenerPreset = {
  id: string;
  name: string;
  type: 'IRON_CONDOR' | 'VERTICAL' | 'VOLATILITY' | 'ANOMALY';
  filters: Record<string, unknown>; // Flexible filter object
  createdAt: string;
};

/**
 * UI state types for Strategy Builder tray.
 */
export type BuilderState = {
  currentStrategy: Strategy | null;
  selectedLegId: string | null;
  isTemplateWizardOpen: boolean;
  isTrayExpanded: boolean;
};

/**
 * Filter types for Chain table.
 */
export type ChainFilters = {
  deltaMin?: number;
  deltaMax?: number;
  strikeMin?: number;
  strikeMax?: number;
  volumeMin?: number;
  openInterestMin?: number;
  showWeeklies?: boolean;
  showMonthlies?: boolean;
};
