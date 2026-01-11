// src/lib/derivatives/calculations.ts
// Strategy calculations for options positions

export type OptionType = "call" | "put";
export type PositionType = "buy" | "sell";

export interface OptionLeg {
  id: string;
  type: OptionType;
  position: PositionType;
  strike: number;
  price: number;
  quantity: number;
  expiration: string;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  iv?: number | null;
}

export interface StrategyMetrics {
  maxProfit: number | null;
  maxLoss: number | null;
  breakevens: number[];
  returnOnRisk: number | null;
  pop: number | null; // Probability of profit
  netDebit: number;
  netCredit: number;
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  marginEstimate: number;
  netCost: number;
}

/**
 * Calculate P/L for a single leg at a given stock price
 */
export function calculateLegPL(
  leg: OptionLeg,
  stockPrice: number,
  atExpiration = true
): number {
  const multiplier = leg.position === "buy" ? 1 : -1;
  const costBasis = leg.price * leg.quantity * 100; // Premium paid/received

  if (atExpiration) {
    let intrinsic = 0;
    if (leg.type === "call") {
      intrinsic = Math.max(0, stockPrice - leg.strike);
    } else {
      intrinsic = Math.max(0, leg.strike - stockPrice);
    }
    const value = intrinsic * leg.quantity * 100;

    // Buy = paid premium, receive value
    // Sell = received premium, pay value
    if (leg.position === "buy") {
      return value - costBasis;
    } else {
      return costBasis - value;
    }
  }

  // Current P/L (simplified - would need real-time pricing)
  return multiplier * costBasis;
}

/**
 * Calculate total strategy P/L at a given stock price
 */
export function calculateStrategyPL(
  legs: OptionLeg[],
  stockPrice: number,
  atExpiration = true
): number {
  return legs.reduce(
    (total, leg) => total + calculateLegPL(leg, stockPrice, atExpiration),
    0
  );
}

/**
 * Calculate max profit for the strategy
 */
export function calculateMaxProfit(legs: OptionLeg[]): number | null {
  if (legs.length === 0) return null;

  // Sample P/L at various points
  const strikes = legs.map((l) => l.strike).sort((a, b) => a - b);
  const minStrike = strikes[0];
  const maxStrike = strikes[strikes.length - 1];
  const range = maxStrike - minStrike;

  const testPoints = [
    0,
    minStrike * 0.5,
    ...strikes,
    maxStrike * 1.5,
    maxStrike * 2,
  ];

  let maxProfit = -Infinity;
  for (const price of testPoints) {
    const pl = calculateStrategyPL(legs, price, true);
    maxProfit = Math.max(maxProfit, pl);
  }

  // Check if profit is unlimited (naked short puts/calls)
  const hasNakedShortCall = legs.some(
    (l) =>
      l.type === "call" &&
      l.position === "sell" &&
      !legs.some(
        (other) =>
          other.type === "call" &&
          other.position === "buy" &&
          other.strike > l.strike
      )
  );

  if (hasNakedShortCall) return null; // Unlimited loss potential

  return maxProfit === -Infinity ? null : maxProfit;
}

/**
 * Calculate max loss for the strategy
 */
export function calculateMaxLoss(legs: OptionLeg[]): number | null {
  if (legs.length === 0) return null;

  const strikes = legs.map((l) => l.strike).sort((a, b) => a - b);
  const minStrike = strikes[0];
  const maxStrike = strikes[strikes.length - 1];

  const testPoints = [
    0,
    minStrike * 0.5,
    ...strikes,
    maxStrike * 1.5,
    maxStrike * 2,
  ];

  let maxLoss = Infinity;
  for (const price of testPoints) {
    const pl = calculateStrategyPL(legs, price, true);
    maxLoss = Math.min(maxLoss, pl);
  }

  // Check if loss is unlimited
  const hasNakedShortPut = legs.some(
    (l) =>
      l.type === "put" &&
      l.position === "sell" &&
      !legs.some(
        (other) =>
          other.type === "put" &&
          other.position === "buy" &&
          other.strike < l.strike
      )
  );

  const hasNakedShortCall = legs.some(
    (l) =>
      l.type === "call" &&
      l.position === "sell" &&
      !legs.some(
        (other) =>
          other.type === "call" &&
          other.position === "buy" &&
          other.strike > l.strike
      )
  );

  if (hasNakedShortPut || hasNakedShortCall) return null; // Unlimited loss

  return maxLoss === Infinity ? null : Math.abs(maxLoss);
}

/**
 * Find breakeven points for the strategy
 */
export function calculateBreakevens(legs: OptionLeg[]): number[] {
  if (legs.length === 0) return [];

  const strikes = legs.map((l) => l.strike).sort((a, b) => a - b);
  const minStrike = strikes[0];
  const maxStrike = strikes[strikes.length - 1];
  const range = maxStrike - minStrike || minStrike;

  const breakevens: number[] = [];
  const step = Math.max(0.5, range / 200);

  // Scan from 0 to max strike * 2
  for (let price = 0; price <= maxStrike * 2; price += step) {
    const pl = calculateStrategyPL(legs, price, true);
    const plNext = calculateStrategyPL(legs, price + step, true);

    // Zero crossing
    if ((pl <= 0 && plNext > 0) || (pl > 0 && plNext <= 0)) {
      // Refine with binary search
      let low = price;
      let high = price + step;
      for (let i = 0; i < 10; i++) {
        const mid = (low + high) / 2;
        const plMid = calculateStrategyPL(legs, mid, true);
        if (Math.abs(plMid) < 0.01) {
          breakevens.push(mid);
          break;
        }
        if ((plMid > 0 && pl > 0) || (plMid < 0 && pl < 0)) {
          low = mid;
        } else {
          high = mid;
        }
      }
    }
  }

  // Deduplicate and sort
  return Array.from(new Set(breakevens.map((b) => Math.round(b * 100) / 100)))
    .sort((a, b) => a - b)
    .slice(0, 4); // Most strategies have at most 2-4 breakevens
}

/**
 * Calculate return on risk
 */
export function calculateReturnOnRisk(legs: OptionLeg[]): number | null {
  const maxProfit = calculateMaxProfit(legs);
  const maxLoss = calculateMaxLoss(legs);

  if (maxProfit === null || maxLoss === null) return null;
  if (maxLoss === 0) return null;

  return maxProfit / Math.abs(maxLoss);
}

/**
 * Estimate probability of profit (simplified)
 * Uses delta approximation: sum of deltas gives rough directional probability
 */
export function estimatePOP(
  legs: OptionLeg[],
  currentPrice: number
): number | null {
  const breakevens = calculateBreakevens(legs);
  if (breakevens.length === 0) return null;

  // For simple strategies, use delta approximation
  const totalDelta = legs.reduce((sum, leg) => {
    if (!leg.delta) return sum;
    const multiplier = leg.position === "buy" ? 1 : -1;
    return sum + leg.delta * multiplier * leg.quantity;
  }, 0);

  // Rough approximation: if delta is positive, bullish strategy
  // For iron condors and neutrals, calculate based on breakevens
  if (breakevens.length === 2) {
    const [lower, upper] = breakevens;
    const width = upper - lower;
    const buffer = Math.min(
      Math.abs(currentPrice - lower),
      Math.abs(upper - currentPrice)
    );

    // Rough POP based on how centered we are between breakevens
    const centeredness = buffer / (width / 2);
    return Math.min(0.95, 0.5 + centeredness * 0.3);
  }

  // For directional strategies
  if (Math.abs(totalDelta) > 0.1) {
    // Very rough approximation
    return 0.5 + Math.abs(totalDelta) * 0.15;
  }

  return 0.5; // Default 50% if we can't determine
}

/**
 * Calculate net debit/credit and total Greeks
 */
export function calculateStrategyMetrics(
  legs: OptionLeg[],
  currentPrice: number
): StrategyMetrics {
  let netDebit = 0;
  let netCredit = 0;
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;

  for (const leg of legs) {
    const cost = leg.price * leg.quantity * 100;
    const multiplier = leg.position === "buy" ? 1 : -1;

    if (leg.position === "buy") {
      netDebit += cost;
    } else {
      netCredit += cost;
    }

    // Sum Greeks
    if (leg.delta !== null && leg.delta !== undefined) {
      totalDelta += leg.delta * multiplier * leg.quantity;
    }
    if (leg.gamma !== null && leg.gamma !== undefined) {
      totalGamma += leg.gamma * multiplier * leg.quantity;
    }
    if (leg.theta !== null && leg.theta !== undefined) {
      totalTheta += leg.theta * multiplier * leg.quantity * 100; // Convert to dollars
    }
    if (leg.vega !== null && leg.vega !== undefined) {
      totalVega += leg.vega * multiplier * leg.quantity * 100; // Convert to dollars
    }
  }

  const netCost = netDebit - netCredit;
  const maxProfit = calculateMaxProfit(legs);
  const maxLoss = calculateMaxLoss(legs);
  const breakevens = calculateBreakevens(legs);
  const returnOnRisk = calculateReturnOnRisk(legs);
  const pop = estimatePOP(legs, currentPrice);

  // Margin estimate (simplified)
  let marginEstimate = 0;
  if (netCost > 0) {
    // Debit spread: margin is the debit
    marginEstimate = netCost;
  } else {
    // Credit spread: margin is max loss
    marginEstimate = Math.abs(maxLoss || 0);
  }

  return {
    maxProfit,
    maxLoss,
    breakevens,
    returnOnRisk,
    pop,
    netDebit,
    netCredit,
    totalDelta,
    totalGamma,
    totalTheta,
    totalVega,
    marginEstimate,
    netCost,
  };
}

/**
 * Generate P/L data points for charting
 */
export function generatePLData(
  legs: OptionLeg[],
  priceRange: { min: number; max: number },
  points = 100
): Array<{ price: number; pl: number }> {
  const { min, max } = priceRange;
  const step = (max - min) / points;
  const data: Array<{ price: number; pl: number }> = [];

  for (let price = min; price <= max; price += step) {
    data.push({
      price,
      pl: calculateStrategyPL(legs, price, true),
    });
  }

  return data;
}

/**
 * Identify strategy type based on legs
 */
export function identifyStrategy(legs: OptionLeg[]): string {
  if (legs.length === 0) return "Empty";
  if (legs.length === 1) {
    const leg = legs[0];
    if (leg.position === "buy" && leg.type === "call") return "Long Call";
    if (leg.position === "buy" && leg.type === "put") return "Long Put";
    if (leg.position === "sell" && leg.type === "call") return "Short Call";
    if (leg.position === "sell" && leg.type === "put") return "Short Put";
  }

  if (legs.length === 2) {
    const sorted = [...legs].sort((a, b) => a.strike - b.strike);
    const [lower, upper] = sorted;

    // Both calls
    if (lower.type === "call" && upper.type === "call") {
      if (lower.position === "buy" && upper.position === "sell") {
        return "Bull Call Spread";
      }
      if (lower.position === "sell" && upper.position === "buy") {
        return "Bear Call Spread";
      }
    }

    // Both puts
    if (lower.type === "put" && upper.type === "put") {
      if (lower.position === "buy" && upper.position === "sell") {
        return "Bear Put Spread";
      }
      if (lower.position === "sell" && upper.position === "buy") {
        return "Bull Put Spread";
      }
    }

    // Same strike
    if (lower.strike === upper.strike) {
      if (lower.type === "call" && upper.type === "put") {
        if (lower.position === "buy" && upper.position === "buy") {
          return "Long Straddle";
        }
        if (lower.position === "sell" && upper.position === "sell") {
          return "Short Straddle";
        }
      }
    }

    // Different strikes, same expiration
    if (
      lower.type !== upper.type &&
      lower.position === upper.position &&
      lower.strike !== upper.strike
    ) {
      if (lower.position === "buy") return "Long Strangle";
      if (lower.position === "sell") return "Short Strangle";
    }
  }

  if (legs.length === 4) {
    const sorted = [...legs].sort((a, b) => a.strike - b.strike);
    const allSameExpiration = legs.every((l) => l.expiration === legs[0].expiration);

    if (allSameExpiration) {
      // Check for Iron Condor
      const [leg1, leg2, leg3, leg4] = sorted;
      if (
        leg1.type === "put" &&
        leg2.type === "put" &&
        leg3.type === "call" &&
        leg4.type === "call" &&
        leg1.position === "buy" &&
        leg2.position === "sell" &&
        leg3.position === "sell" &&
        leg4.position === "buy"
      ) {
        return "Iron Condor";
      }

      // Check for Iron Butterfly
      if (
        leg2.strike === leg3.strike &&
        leg1.type === "put" &&
        leg4.type === "call"
      ) {
        return "Iron Butterfly";
      }
    }
  }

  if (legs.length === 3) {
    const sorted = [...legs].sort((a, b) => a.strike - b.strike);
    const [lower, middle, upper] = sorted;

    // Butterfly
    if (
      lower.type === middle.type &&
      middle.type === upper.type &&
      middle.quantity === 2 * lower.quantity
    ) {
      if (lower.type === "call") return "Call Butterfly";
      if (lower.type === "put") return "Put Butterfly";
    }
  }

  return "Custom Strategy";
}
