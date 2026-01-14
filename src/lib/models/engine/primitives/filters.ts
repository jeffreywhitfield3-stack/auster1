// src/lib/models/engine/primitives/filters.ts
// Data filtering and selection operations for DSL

import type { DslPrimitive } from '@/types/models';

/**
 * Filter array based on condition
 * Returns indices where condition is true
 */
export const where: DslPrimitive = {
  name: 'where',
  validate: (params) => {
    const errors: string[] = [];
    if (!params.condition || typeof params.condition !== 'string') {
      errors.push('condition must be a string (">", "<", ">=", "<=", "==", "!=")');
    }
    if (params.value === undefined) {
      errors.push('value parameter is required');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { condition, value } = params;

    const result: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      let matches = false;

      if (isNaN(val)) {
        continue;
      }

      switch (condition) {
        case '>':
          matches = val > value;
          break;
        case '<':
          matches = val < value;
          break;
        case '>=':
          matches = val >= value;
          break;
        case '<=':
          matches = val <= value;
          break;
        case '==':
          matches = val === value;
          break;
        case '!=':
          matches = val !== value;
          break;
        default:
          throw new Error(`Unknown condition: ${condition}`);
      }

      if (matches) {
        result.push(i);
      }
    }

    return result;
  },
};

/**
 * Select elements at specific indices
 */
export const select: DslPrimitive = {
  name: 'select',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data, indices] = inputs;

    if (!indices || !Array.isArray(indices)) {
      throw new Error('select requires indices array as second input');
    }

    const result: number[] = [];

    for (const idx of indices) {
      if (idx >= 0 && idx < data.length) {
        result.push(data[idx]);
      }
    }

    return result;
  },
};

/**
 * Slice array (similar to Python/NumPy slicing)
 */
export const slice: DslPrimitive = {
  name: 'slice',
  validate: (params) => {
    const errors: string[] = [];
    if (params.start !== undefined && typeof params.start !== 'number') {
      errors.push('start must be a number');
    }
    if (params.end !== undefined && typeof params.end !== 'number') {
      errors.push('end must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { start = 0, end = data.length } = params;

    return data.slice(start, end);
  },
};

/**
 * Take first N elements
 */
export const head: DslPrimitive = {
  name: 'head',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.n !== 'number' || params.n < 0) {
      errors.push('n must be a non-negative number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { n } = params;

    return data.slice(0, n);
  },
};

/**
 * Take last N elements
 */
export const tail: DslPrimitive = {
  name: 'tail',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.n !== 'number' || params.n < 0) {
      errors.push('n must be a non-negative number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { n } = params;

    return data.slice(-n);
  },
};

/**
 * Filter out NaN values
 */
export const dropna: DslPrimitive = {
  name: 'dropna',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    return data.filter((val: number) => !isNaN(val));
  },
};

/**
 * Fill NaN values with a specified value or method
 */
export const fillna: DslPrimitive = {
  name: 'fillna',
  validate: (params) => {
    const errors: string[] = [];
    if (params.value === undefined && params.method === undefined) {
      errors.push('Either value or method must be specified');
    }
    if (params.method && !['forward', 'backward', 'mean', 'median'].includes(params.method)) {
      errors.push('method must be one of: "forward", "backward", "mean", "median"');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { value, method } = params;

    if (value !== undefined) {
      // Fill with constant value
      return data.map((val: number) => (isNaN(val) ? value : val));
    }

    if (method === 'forward') {
      // Forward fill
      const result = [...data];
      let lastValid = NaN;

      for (let i = 0; i < result.length; i++) {
        if (!isNaN(result[i])) {
          lastValid = result[i];
        } else if (!isNaN(lastValid)) {
          result[i] = lastValid;
        }
      }

      return result;
    }

    if (method === 'backward') {
      // Backward fill
      const result = [...data];
      let nextValid = NaN;

      for (let i = result.length - 1; i >= 0; i--) {
        if (!isNaN(result[i])) {
          nextValid = result[i];
        } else if (!isNaN(nextValid)) {
          result[i] = nextValid;
        }
      }

      return result;
    }

    if (method === 'mean') {
      // Fill with mean of valid values
      const validValues = data.filter((val: number) => !isNaN(val));
      if (validValues.length === 0) {
        return data;
      }

      const mean = validValues.reduce((sum: number, val: number) => sum + val, 0) / validValues.length;
      return data.map((val: number) => (isNaN(val) ? mean : val));
    }

    if (method === 'median') {
      // Fill with median of valid values
      const validValues = data.filter((val: number) => !isNaN(val));
      if (validValues.length === 0) {
        return data;
      }

      const sorted = [...validValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

      return data.map((val: number) => (isNaN(val) ? median : val));
    }

    return data;
  },
};

/**
 * Replace values matching a condition
 */
export const replace: DslPrimitive = {
  name: 'replace',
  validate: (params) => {
    const errors: string[] = [];
    if (params.old_value === undefined) {
      errors.push('old_value parameter is required');
    }
    if (params.new_value === undefined) {
      errors.push('new_value parameter is required');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { old_value, new_value } = params;

    return data.map((val: number) => (val === old_value ? new_value : val));
  },
};

/**
 * Reverse array order
 */
export const reverse: DslPrimitive = {
  name: 'reverse',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    return [...data].reverse();
  },
};

/**
 * Sort array
 */
export const sort: DslPrimitive = {
  name: 'sort',
  validate: (params) => {
    const errors: string[] = [];
    if (params.ascending !== undefined && typeof params.ascending !== 'boolean') {
      errors.push('ascending must be a boolean');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [data] = inputs;
    const { ascending = true } = params;

    const sorted = [...data].sort((a, b) => {
      if (isNaN(a)) return 1;
      if (isNaN(b)) return -1;
      return ascending ? a - b : b - a;
    });

    return sorted;
  },
};

/**
 * Get unique values
 */
export const unique: DslPrimitive = {
  name: 'unique',
  validate: () => [],
  execute: async (params, inputs) => {
    const [data] = inputs;
    const seen = new Set<number>();
    const result: number[] = [];

    for (const val of data) {
      if (!seen.has(val)) {
        seen.add(val);
        result.push(val);
      }
    }

    return result;
  },
};
