// src/lib/models/engine/primitives/stats.ts
// Statistical operations for DSL

import type { DslPrimitive } from '@/types/models';

/**
 * Calculate mean of array
 */
export const mean: DslPrimitive = {
  name: 'mean',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    if (!data || data.length === 0) return NaN;

    const sum = data.reduce((acc: number, val: number) => acc + val, 0);
    return sum / data.length;
  },
};

/**
 * Calculate rolling/moving average
 */
export const rolling_mean: DslPrimitive = {
  name: 'rolling_mean',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.window !== 'number' || params.window < 1) {
      errors.push('window must be a positive integer');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { window, min_periods = window } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);

      if (slice.length >= min_periods) {
        const sum = slice.reduce((acc: number, val: number) => acc + val, 0);
        result.push(sum / slice.length);
      } else {
        result.push(NaN);
      }
    }

    return result;
  },
};

/**
 * Calculate standard deviation
 */
export const std: DslPrimitive = {
  name: 'std',
  validate: (params) => {
    const errors: string[] = [];
    if (params.ddof !== undefined && typeof params.ddof !== 'number') {
      errors.push('ddof must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { ddof = 1 } = params; // Delta degrees of freedom (1 for sample, 0 for population)

    if (!data || data.length === 0) return NaN;

    const n = data.length;
    const meanVal = data.reduce((acc: number, val: number) => acc + val, 0) / n;
    const variance = data.reduce((acc: number, val: number) => acc + Math.pow(val - meanVal, 2), 0) / (n - ddof);

    return Math.sqrt(variance);
  },
};

/**
 * Calculate rolling standard deviation
 */
export const rolling_std: DslPrimitive = {
  name: 'rolling_std',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.window !== 'number' || params.window < 1) {
      errors.push('window must be a positive integer');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { window, min_periods = window, ddof = 1 } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);

      if (slice.length >= min_periods) {
        const n = slice.length;
        const meanVal = slice.reduce((acc: number, val: number) => acc + val, 0) / n;
        const variance = slice.reduce((acc: number, val: number) => acc + Math.pow(val - meanVal, 2), 0) / (n - ddof);
        result.push(Math.sqrt(variance));
      } else {
        result.push(NaN);
      }
    }

    return result;
  },
};

/**
 * Calculate z-score (standardized values)
 */
export const zscore: DslPrimitive = {
  name: 'zscore',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;

    if (!data || data.length === 0) return [];

    // Calculate mean
    const meanVal = data.reduce((acc: number, val: number) => acc + val, 0) / data.length;

    // Calculate standard deviation
    const variance = data.reduce((acc: number, val: number) => acc + Math.pow(val - meanVal, 2), 0) / data.length;
    const stdVal = Math.sqrt(variance);

    if (stdVal === 0) {
      return data.map(() => 0); // All values are the same
    }

    // Calculate z-scores
    return data.map((val: number) => (val - meanVal) / stdVal);
  },
};

/**
 * Calculate min value
 */
export const min: DslPrimitive = {
  name: 'min',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    if (!data || data.length === 0) return NaN;
    return Math.min(...data);
  },
};

/**
 * Calculate max value
 */
export const max: DslPrimitive = {
  name: 'max',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    if (!data || data.length === 0) return NaN;
    return Math.max(...data);
  },
};

/**
 * Calculate rolling min
 */
export const rolling_min: DslPrimitive = {
  name: 'rolling_min',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.window !== 'number' || params.window < 1) {
      errors.push('window must be a positive integer');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { window } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      result.push(Math.min(...slice));
    }

    return result;
  },
};

/**
 * Calculate rolling max
 */
export const rolling_max: DslPrimitive = {
  name: 'rolling_max',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.window !== 'number' || params.window < 1) {
      errors.push('window must be a positive integer');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { window } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      result.push(Math.max(...slice));
    }

    return result;
  },
};

/**
 * Calculate sum
 */
export const sum: DslPrimitive = {
  name: 'sum',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    if (!data || data.length === 0) return 0;
    return data.reduce((acc: number, val: number) => acc + val, 0);
  },
};

/**
 * Calculate cumulative sum
 */
export const cumsum: DslPrimitive = {
  name: 'cumsum',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    const result: number[] = [];
    let sum = 0;

    for (const val of data) {
      sum += val;
      result.push(sum);
    }

    return result;
  },
};

/**
 * Calculate percentile/quantile
 */
export const percentile: DslPrimitive = {
  name: 'percentile',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.q !== 'number' || params.q < 0 || params.q > 100) {
      errors.push('q must be a number between 0 and 100');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { q } = params;

    if (!data || data.length === 0) return NaN;

    const sorted = [...data].sort((a, b) => a - b);
    const index = (q / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  },
};

/**
 * Calculate median (50th percentile)
 */
export const median: DslPrimitive = {
  name: 'median',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;

    if (!data || data.length === 0) return NaN;

    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  },
};

/**
 * Count non-null values
 */
export const count: DslPrimitive = {
  name: 'count',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    return data.filter((val: any) => val !== null && val !== undefined && !isNaN(val)).length;
  },
};
