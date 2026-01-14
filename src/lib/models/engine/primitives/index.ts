// src/lib/models/engine/primitives/index.ts
// Central registry of all DSL primitives

import type { DslPrimitive } from '@/types/models';

// Import all primitive modules
import * as mathOps from './math';
import * as statsOps from './stats';
import * as returnsOps from './returns';
import * as analysisOps from './analysis';
import * as filterOps from './filters';
import * as dataOps from './data';

/**
 * Central registry of all available DSL primitives
 * Maps operation name to its implementation
 */
export const PRIMITIVES: Record<string, DslPrimitive> = {
  // Math operations
  add: mathOps.add,
  subtract: mathOps.subtract,
  multiply: mathOps.multiply,
  divide: mathOps.divide,
  power: mathOps.power,
  abs: mathOps.abs,
  log: mathOps.log,
  log10: mathOps.log10,
  exp: mathOps.exp,
  sqrt: mathOps.sqrt,
  round: mathOps.round,
  floor: mathOps.floor,
  ceil: mathOps.ceil,
  clamp: mathOps.clamp,

  // Statistical operations
  mean: statsOps.mean,
  rolling_mean: statsOps.rolling_mean,
  std: statsOps.std,
  rolling_std: statsOps.rolling_std,
  zscore: statsOps.zscore,
  min: statsOps.min,
  max: statsOps.max,
  rolling_min: statsOps.rolling_min,
  rolling_max: statsOps.rolling_max,
  sum: statsOps.sum,
  cumsum: statsOps.cumsum,
  percentile: statsOps.percentile,
  median: statsOps.median,
  count: statsOps.count,

  // Return calculations
  percent_change: returnsOps.percent_change,
  log_return: returnsOps.log_return,
  cumulative_return: returnsOps.cumulative_return,
  diff: returnsOps.diff,
  rolling_return: returnsOps.rolling_return,
  normalize_series: returnsOps.normalize_series,
  annualize_return: returnsOps.annualize_return,
  drawdown: returnsOps.drawdown,

  // Analysis operations
  correlation: analysisOps.correlation,
  rolling_correlation: analysisOps.rolling_correlation,
  linear_regression: analysisOps.linear_regression,
  covariance: analysisOps.covariance,
  beta: analysisOps.beta,
  sharpe_ratio: analysisOps.sharpe_ratio,
  autocorrelation: analysisOps.autocorrelation,

  // Filter operations
  where: filterOps.where,
  select: filterOps.select,
  slice: filterOps.slice,
  head: filterOps.head,
  tail: filterOps.tail,
  dropna: filterOps.dropna,
  fillna: filterOps.fillna,
  replace: filterOps.replace,
  reverse: filterOps.reverse,
  sort: filterOps.sort,
  unique: filterOps.unique,

  // Data operations
  fetch_market_data: dataOps.fetch_market_data,
  extract_price_series: dataOps.extract_price_series,
  extract_volume_series: dataOps.extract_volume_series,
  extract_date_labels: dataOps.extract_date_labels,
  get_current_price: dataOps.get_current_price,
  fetch_macro_data: dataOps.fetch_macro_data,
  extract_macro_values: dataOps.extract_macro_values,
  extract_macro_dates: dataOps.extract_macro_dates,
  fetch_options_chain: dataOps.fetch_options_chain,
  fetch_option_quote: dataOps.fetch_option_quote,
  find_atm_strike: dataOps.find_atm_strike,
  find_atm_straddle: dataOps.find_atm_straddle,
  calculate_expected_move: dataOps.calculate_expected_move,
  extract_implied_volatilities: dataOps.extract_implied_volatilities,
  sum_call_volume: dataOps.sum_call_volume,
  sum_put_volume: dataOps.sum_put_volume,
  sum_call_open_interest: dataOps.sum_call_open_interest,
  sum_put_open_interest: dataOps.sum_put_open_interest,
};

/**
 * Get a primitive by name
 * @throws Error if primitive not found
 */
export function getPrimitive(name: string): DslPrimitive {
  const primitive = PRIMITIVES[name];
  if (!primitive) {
    const available = Object.keys(PRIMITIVES).sort().join(', ');
    throw new Error(
      `Unknown primitive operation: "${name}". Available operations: ${available}`
    );
  }
  return primitive;
}

/**
 * Check if a primitive exists
 */
export function hasPrimitive(name: string): boolean {
  return name in PRIMITIVES;
}

/**
 * Get all primitive names (for documentation/autocomplete)
 */
export function listPrimitives(): string[] {
  return Object.keys(PRIMITIVES).sort();
}

/**
 * Get primitives by category
 */
export function getPrimitivesByCategory() {
  return {
    math: Object.keys(mathOps),
    stats: Object.keys(statsOps),
    returns: Object.keys(returnsOps),
    analysis: Object.keys(analysisOps),
    filters: Object.keys(filterOps),
    data: Object.keys(dataOps),
  };
}

// Re-export primitive modules for direct access if needed
export { mathOps, statsOps, returnsOps, analysisOps, filterOps, dataOps };
