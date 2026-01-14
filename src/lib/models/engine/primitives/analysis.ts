// src/lib/models/engine/primitives/analysis.ts
// Statistical analysis operations for DSL

import type { DslPrimitive } from '@/types/models';

/**
 * Calculate Pearson correlation coefficient between two series
 * Returns a single number between -1 and 1
 */
export const correlation: DslPrimitive = {
  name: 'correlation',
  validate: () => [],
  execute: async (params, inputs) => {
    const [x, y] = inputs;

    if (!x || !y || x.length !== y.length || x.length === 0) {
      return NaN;
    }

    // Filter out any pairs where either value is NaN
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < x.length; i++) {
      if (!isNaN(x[i]) && !isNaN(y[i])) {
        pairs.push([x[i], y[i]]);
      }
    }

    if (pairs.length < 2) {
      return NaN;
    }

    const n = pairs.length;

    // Calculate means
    const meanX = pairs.reduce((sum, [xi]) => sum + xi, 0) / n;
    const meanY = pairs.reduce((sum, [, yi]) => sum + yi, 0) / n;

    // Calculate correlation
    let numerator = 0;
    let sumXSquared = 0;
    let sumYSquared = 0;

    for (const [xi, yi] of pairs) {
      const dx = xi - meanX;
      const dy = yi - meanY;
      numerator += dx * dy;
      sumXSquared += dx * dx;
      sumYSquared += dy * dy;
    }

    const denominator = Math.sqrt(sumXSquared * sumYSquared);

    if (denominator === 0) {
      return NaN;
    }

    return numerator / denominator;
  },
};

/**
 * Calculate rolling correlation between two series
 * Returns an array of correlation values
 */
export const rolling_correlation: DslPrimitive = {
  name: 'rolling_correlation',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.window !== 'number' || params.window < 2) {
      errors.push('window must be at least 2');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [x, y] = inputs;
    const { window } = params;

    if (!x || !y || x.length !== y.length) {
      throw new Error('Both series must have the same length');
    }

    const result: number[] = [];

    for (let i = 0; i < x.length; i++) {
      if (i < window - 1) {
        result.push(NaN);
        continue;
      }

      const start = i - window + 1;
      const xSlice = x.slice(start, i + 1);
      const ySlice = y.slice(start, i + 1);

      // Filter out NaN pairs
      const pairs: Array<[number, number]> = [];
      for (let j = 0; j < xSlice.length; j++) {
        if (!isNaN(xSlice[j]) && !isNaN(ySlice[j])) {
          pairs.push([xSlice[j], ySlice[j]]);
        }
      }

      if (pairs.length < 2) {
        result.push(NaN);
        continue;
      }

      const n = pairs.length;
      const meanX = pairs.reduce((sum, [xi]) => sum + xi, 0) / n;
      const meanY = pairs.reduce((sum, [, yi]) => sum + yi, 0) / n;

      let numerator = 0;
      let sumXSquared = 0;
      let sumYSquared = 0;

      for (const [xi, yi] of pairs) {
        const dx = xi - meanX;
        const dy = yi - meanY;
        numerator += dx * dy;
        sumXSquared += dx * dx;
        sumYSquared += dy * dy;
      }

      const denominator = Math.sqrt(sumXSquared * sumYSquared);
      result.push(denominator === 0 ? NaN : numerator / denominator);
    }

    return result;
  },
};

/**
 * Simple linear regression (OLS)
 * Returns an object with slope, intercept, r_squared, and predicted values
 */
export const linear_regression: DslPrimitive = {
  name: 'linear_regression',
  validate: () => [],
  execute: async (params, inputs) => {
    const [x, y] = inputs;

    if (!x || !y || x.length !== y.length || x.length === 0) {
      throw new Error('Both series must have the same non-zero length');
    }

    // Filter out NaN pairs
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < x.length; i++) {
      if (!isNaN(x[i]) && !isNaN(y[i])) {
        pairs.push([x[i], y[i]]);
      }
    }

    if (pairs.length < 2) {
      throw new Error('Need at least 2 valid data points for regression');
    }

    const n = pairs.length;

    // Calculate means
    const meanX = pairs.reduce((sum, [xi]) => sum + xi, 0) / n;
    const meanY = pairs.reduce((sum, [, yi]) => sum + yi, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;

    for (const [xi, yi] of pairs) {
      const dx = xi - meanX;
      numerator += dx * (yi - meanY);
      denominator += dx * dx;
    }

    if (denominator === 0) {
      throw new Error('Cannot perform regression: x values have no variance');
    }

    const slope = numerator / denominator;
    const intercept = meanY - slope * meanX;

    // Calculate R-squared
    let ssRes = 0; // Sum of squared residuals
    let ssTot = 0; // Total sum of squares

    for (const [xi, yi] of pairs) {
      const predicted = slope * xi + intercept;
      ssRes += Math.pow(yi - predicted, 2);
      ssTot += Math.pow(yi - meanY, 2);
    }

    const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

    // Generate predicted values for the entire input series
    const predicted = x.map((xi: number) =>
      isNaN(xi) ? NaN : slope * xi + intercept
    );

    return {
      slope,
      intercept,
      r_squared: rSquared,
      predicted,
    };
  },
};

/**
 * Calculate covariance between two series
 */
export const covariance: DslPrimitive = {
  name: 'covariance',
  validate: (params) => {
    const errors: string[] = [];
    if (params.ddof !== undefined && typeof params.ddof !== 'number') {
      errors.push('ddof must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [x, y] = inputs;
    const { ddof = 1 } = params;

    if (!x || !y || x.length !== y.length || x.length === 0) {
      return NaN;
    }

    // Filter out NaN pairs
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < x.length; i++) {
      if (!isNaN(x[i]) && !isNaN(y[i])) {
        pairs.push([x[i], y[i]]);
      }
    }

    if (pairs.length < 2) {
      return NaN;
    }

    const n = pairs.length;
    const meanX = pairs.reduce((sum, [xi]) => sum + xi, 0) / n;
    const meanY = pairs.reduce((sum, [, yi]) => sum + yi, 0) / n;

    const covar = pairs.reduce((sum, [xi, yi]) => {
      return sum + (xi - meanX) * (yi - meanY);
    }, 0) / (n - ddof);

    return covar;
  },
};

/**
 * Calculate beta (systematic risk) relative to a benchmark
 * beta = covariance(asset, benchmark) / variance(benchmark)
 */
export const beta: DslPrimitive = {
  name: 'beta',
  validate: () => [],
  execute: async (params, inputs) => {
    const [asset, benchmark] = inputs;

    if (!asset || !benchmark || asset.length !== benchmark.length || asset.length === 0) {
      return NaN;
    }

    // Filter out NaN pairs
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < asset.length; i++) {
      if (!isNaN(asset[i]) && !isNaN(benchmark[i])) {
        pairs.push([asset[i], benchmark[i]]);
      }
    }

    if (pairs.length < 2) {
      return NaN;
    }

    const n = pairs.length;
    const meanAsset = pairs.reduce((sum, [a]) => sum + a, 0) / n;
    const meanBenchmark = pairs.reduce((sum, [, b]) => sum + b, 0) / n;

    // Calculate covariance
    let covar = 0;
    let variance = 0;

    for (const [a, b] of pairs) {
      const dAsset = a - meanAsset;
      const dBenchmark = b - meanBenchmark;
      covar += dAsset * dBenchmark;
      variance += dBenchmark * dBenchmark;
    }

    if (variance === 0) {
      return NaN;
    }

    return covar / variance;
  },
};

/**
 * Calculate Sharpe ratio (risk-adjusted return)
 * sharpe = (mean_return - risk_free_rate) / std_return
 */
export const sharpe_ratio: DslPrimitive = {
  name: 'sharpe_ratio',
  validate: (params) => {
    const errors: string[] = [];
    if (params.risk_free_rate !== undefined && typeof params.risk_free_rate !== 'number') {
      errors.push('risk_free_rate must be a number');
    }
    if (params.periods_per_year !== undefined && typeof params.periods_per_year !== 'number') {
      errors.push('periods_per_year must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [returns] = inputs;
    const { risk_free_rate = 0, periods_per_year = 252 } = params;

    if (!returns || returns.length === 0) {
      return NaN;
    }

    // Filter out NaN values
    const validReturns = returns.filter((r: number) => !isNaN(r));

    if (validReturns.length < 2) {
      return NaN;
    }

    // Calculate mean return
    const meanReturn = validReturns.reduce((sum: number, r: number) => sum + r, 0) / validReturns.length;

    // Calculate standard deviation
    const variance = validReturns.reduce((sum: number, r: number) => {
      return sum + Math.pow(r - meanReturn, 2);
    }, 0) / (validReturns.length - 1);

    const stdReturn = Math.sqrt(variance);

    if (stdReturn === 0) {
      return NaN;
    }

    // Annualize
    const annualizedReturn = meanReturn * periods_per_year;
    const annualizedStd = stdReturn * Math.sqrt(periods_per_year);

    return (annualizedReturn - risk_free_rate) / annualizedStd;
  },
};

/**
 * Calculate autocorrelation (correlation with lagged self)
 */
export const autocorrelation: DslPrimitive = {
  name: 'autocorrelation',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.lag !== 'number' || params.lag < 1) {
      errors.push('lag must be a positive integer');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { lag } = params;

    if (!data || data.length <= lag) {
      return NaN;
    }

    // Create lagged series
    const original = data.slice(lag);
    const lagged = data.slice(0, -lag);

    // Calculate correlation
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < original.length; i++) {
      if (!isNaN(original[i]) && !isNaN(lagged[i])) {
        pairs.push([original[i], lagged[i]]);
      }
    }

    if (pairs.length < 2) {
      return NaN;
    }

    const n = pairs.length;
    const meanOriginal = pairs.reduce((sum, [o]) => sum + o, 0) / n;
    const meanLagged = pairs.reduce((sum, [, l]) => sum + l, 0) / n;

    let numerator = 0;
    let sumOriginalSquared = 0;
    let sumLaggedSquared = 0;

    for (const [o, l] of pairs) {
      const dOriginal = o - meanOriginal;
      const dLagged = l - meanLagged;
      numerator += dOriginal * dLagged;
      sumOriginalSquared += dOriginal * dOriginal;
      sumLaggedSquared += dLagged * dLagged;
    }

    const denominator = Math.sqrt(sumOriginalSquared * sumLaggedSquared);

    if (denominator === 0) {
      return NaN;
    }

    return numerator / denominator;
  },
};
