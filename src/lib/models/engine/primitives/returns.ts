// src/lib/models/engine/primitives/returns.ts
// Return calculation operations for DSL

import type { DslPrimitive } from '@/types/models';

/**
 * Calculate percentage change
 * percent_change(data, periods=1) = ((data[i] - data[i-periods]) / data[i-periods]) * 100
 */
export const percent_change: DslPrimitive = {
  name: 'percent_change',
  validate: (params) => {
    const errors: string[] = [];
    if (params.periods !== undefined) {
      if (typeof params.periods !== 'number' || params.periods < 1) {
        errors.push('periods must be a positive integer');
      }
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { periods = 1 } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < periods) {
        result.push(NaN); // Not enough data for calculation
      } else {
        const current = data[i];
        const previous = data[i - periods];

        if (previous === 0) {
          result.push(NaN); // Avoid division by zero
        } else {
          result.push(((current - previous) / previous) * 100);
        }
      }
    }

    return result;
  },
};

/**
 * Calculate logarithmic returns
 * log_return(data, periods=1) = ln(data[i] / data[i-periods])
 */
export const log_return: DslPrimitive = {
  name: 'log_return',
  validate: (params) => {
    const errors: string[] = [];
    if (params.periods !== undefined) {
      if (typeof params.periods !== 'number' || params.periods < 1) {
        errors.push('periods must be a positive integer');
      }
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { periods = 1 } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < periods) {
        result.push(NaN); // Not enough data for calculation
      } else {
        const current = data[i];
        const previous = data[i - periods];

        if (current <= 0 || previous <= 0) {
          result.push(NaN); // Log requires positive values
        } else {
          result.push(Math.log(current / previous));
        }
      }
    }

    return result;
  },
};

/**
 * Calculate cumulative return
 * cumulative_return(data) = (product of (1 + r_i)) - 1
 * where r_i are the returns (as decimals, not percentages)
 */
export const cumulative_return: DslPrimitive = {
  name: 'cumulative_return',
  validate: (params) => {
    const errors: string[] = [];
    if (params.as_percentage !== undefined && typeof params.as_percentage !== 'boolean') {
      errors.push('as_percentage must be a boolean');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [returns] = inputs; // Returns should be in decimal form (0.05 for 5%)
    const { as_percentage = false } = params;

    const result: number[] = [];
    let cumulativeProduct = 1;

    for (const r of returns) {
      if (isNaN(r)) {
        result.push(NaN);
      } else {
        cumulativeProduct *= (1 + r);
        const cumReturn = cumulativeProduct - 1;
        result.push(as_percentage ? cumReturn * 100 : cumReturn);
      }
    }

    return result;
  },
};

/**
 * Calculate first difference
 * diff(data, periods=1) = data[i] - data[i-periods]
 */
export const diff: DslPrimitive = {
  name: 'diff',
  validate: (params) => {
    const errors: string[] = [];
    if (params.periods !== undefined) {
      if (typeof params.periods !== 'number' || params.periods < 1) {
        errors.push('periods must be a positive integer');
      }
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { periods = 1 } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < periods) {
        result.push(NaN); // Not enough data for calculation
      } else {
        result.push(data[i] - data[i - periods]);
      }
    }

    return result;
  },
};

/**
 * Calculate simple moving average return
 * Useful for smoothing return series
 */
export const rolling_return: DslPrimitive = {
  name: 'rolling_return',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.window !== 'number' || params.window < 2) {
      errors.push('window must be at least 2');
    }
    if (params.method && !['arithmetic', 'geometric'].includes(params.method)) {
      errors.push('method must be either "arithmetic" or "geometric"');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { window, method = 'arithmetic' } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        result.push(NaN);
      } else {
        const startPrice = data[i - window + 1];
        const endPrice = data[i];

        if (method === 'geometric') {
          // Geometric return over window
          if (startPrice <= 0 || endPrice <= 0) {
            result.push(NaN);
          } else {
            result.push((endPrice / startPrice) - 1);
          }
        } else {
          // Arithmetic average of period-to-period returns
          let sumReturns = 0;
          let validReturns = 0;

          for (let j = i - window + 2; j <= i; j++) {
            const prev = data[j - 1];
            const curr = data[j];

            if (prev !== 0 && !isNaN(prev) && !isNaN(curr)) {
              sumReturns += (curr - prev) / prev;
              validReturns++;
            }
          }

          result.push(validReturns > 0 ? sumReturns / validReturns : NaN);
        }
      }
    }

    return result;
  },
};

/**
 * Normalize returns to a base value (e.g., 100)
 * Useful for comparing multiple series on same scale
 */
export const normalize_series: DslPrimitive = {
  name: 'normalize_series',
  validate: (params) => {
    const errors: string[] = [];
    if (params.base !== undefined && typeof params.base !== 'number') {
      errors.push('base must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { base = 100 } = params;

    if (!data || data.length === 0) return [];

    const firstValue = data[0];
    if (firstValue === 0 || isNaN(firstValue)) {
      return data.map(() => NaN);
    }

    return data.map((val: number) => (val / firstValue) * base);
  },
};

/**
 * Calculate annualized return
 * Useful for comparing returns over different time periods
 */
export const annualize_return: DslPrimitive = {
  name: 'annualize_return',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.periods_per_year !== 'number' || params.periods_per_year <= 0) {
      errors.push('periods_per_year must be a positive number (e.g., 252 for daily, 12 for monthly)');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [returns] = inputs; // Should be periodic returns in decimal form
    const { periods_per_year } = params;

    if (!returns || returns.length === 0) return NaN;

    // Calculate compound return
    let compoundReturn = 1;
    for (const r of returns) {
      if (isNaN(r)) continue;
      compoundReturn *= (1 + r);
    }

    // Annualize: (compound_return)^(periods_per_year / num_periods) - 1
    const numPeriods = returns.filter((r: number) => !isNaN(r)).length;
    if (numPeriods === 0) return NaN;

    const annualizedReturn = Math.pow(compoundReturn, periods_per_year / numPeriods) - 1;
    return annualizedReturn;
  },
};

/**
 * Calculate drawdown (peak-to-trough decline)
 * Returns the drawdown at each point as percentage from running maximum
 */
export const drawdown: DslPrimitive = {
  name: 'drawdown',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;

    const result: number[] = [];
    let runningMax = -Infinity;

    for (const val of data) {
      if (isNaN(val)) {
        result.push(NaN);
        continue;
      }

      runningMax = Math.max(runningMax, val);

      if (runningMax === 0) {
        result.push(0);
      } else {
        const dd = ((val - runningMax) / runningMax) * 100;
        result.push(dd); // Negative value representing drawdown
      }
    }

    return result;
  },
};
