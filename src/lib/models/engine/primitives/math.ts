// src/lib/models/engine/primitives/math.ts
// Basic mathematical operations for DSL

import type { DslPrimitive } from '@/types/models';

/**
 * Add two arrays element-wise or add scalar to array
 */
export const add: DslPrimitive = {
  name: 'add',
  validate: (params) => {
    const errors: string[] = [];
    if (params.scalar !== undefined && typeof params.scalar !== 'number') {
      errors.push('scalar must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [a, b] = inputs;

    if (params.scalar !== undefined) {
      // Add scalar to array
      return a.map((val: number) => val + params.scalar);
    }

    if (!b) {
      throw new Error('add requires two inputs or one input with scalar param');
    }

    // Element-wise addition
    if (a.length !== b.length) {
      throw new Error('Arrays must have same length for addition');
    }

    return a.map((val: number, i: number) => val + b[i]);
  },
};

/**
 * Subtract two arrays element-wise or subtract scalar from array
 */
export const subtract: DslPrimitive = {
  name: 'subtract',
  validate: (params) => {
    const errors: string[] = [];
    if (params.scalar !== undefined && typeof params.scalar !== 'number') {
      errors.push('scalar must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [a, b] = inputs;

    if (params.scalar !== undefined) {
      return a.map((val: number) => val - params.scalar);
    }

    if (!b) {
      throw new Error('subtract requires two inputs or one input with scalar param');
    }

    if (a.length !== b.length) {
      throw new Error('Arrays must have same length for subtraction');
    }

    return a.map((val: number, i: number) => val - b[i]);
  },
};

/**
 * Multiply two arrays element-wise or multiply array by scalar
 */
export const multiply: DslPrimitive = {
  name: 'multiply',
  validate: (params) => {
    const errors: string[] = [];
    if (params.scalar !== undefined && typeof params.scalar !== 'number') {
      errors.push('scalar must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [a, b] = inputs;

    if (params.scalar !== undefined) {
      return a.map((val: number) => val * params.scalar);
    }

    if (!b) {
      throw new Error('multiply requires two inputs or one input with scalar param');
    }

    if (a.length !== b.length) {
      throw new Error('Arrays must have same length for multiplication');
    }

    return a.map((val: number, i: number) => val * b[i]);
  },
};

/**
 * Divide two arrays element-wise or divide array by scalar
 */
export const divide: DslPrimitive = {
  name: 'divide',
  validate: (params) => {
    const errors: string[] = [];
    if (params.scalar !== undefined && typeof params.scalar !== 'number') {
      errors.push('scalar must be a number');
    }
    if (params.scalar === 0) {
      errors.push('cannot divide by zero');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [a, b] = inputs;

    if (params.scalar !== undefined) {
      if (params.scalar === 0) {
        throw new Error('Division by zero');
      }
      return a.map((val: number) => val / params.scalar);
    }

    if (!b) {
      throw new Error('divide requires two inputs or one input with scalar param');
    }

    if (a.length !== b.length) {
      throw new Error('Arrays must have same length for division');
    }

    return a.map((val: number, i: number) => {
      if (b[i] === 0) {
        return NaN; // Handle division by zero gracefully
      }
      return val / b[i];
    });
  },
};

/**
 * Raise array to power (element-wise)
 */
export const power: DslPrimitive = {
  name: 'power',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.exponent !== 'number') {
      errors.push('exponent must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [a] = inputs;
    const { exponent } = params;

    return a.map((val: number) => Math.pow(val, exponent));
  },
};

/**
 * Take absolute value
 */
export const abs: DslPrimitive = {
  name: 'abs',
  validate: () => [],
  execute: async (params, inputs) => {
    const [a] = inputs;
    return a.map((val: number) => Math.abs(val));
  },
};

/**
 * Take natural logarithm
 */
export const log: DslPrimitive = {
  name: 'log',
  validate: () => [],
  execute: async (params, inputs) => {
    const [a] = inputs;
    return a.map((val: number) => {
      if (val <= 0) return NaN;
      return Math.log(val);
    });
  },
};

/**
 * Take base-10 logarithm
 */
export const log10: DslPrimitive = {
  name: 'log10',
  validate: () => [],
  execute: async (params, inputs) => {
    const [a] = inputs;
    return a.map((val: number) => {
      if (val <= 0) return NaN;
      return Math.log10(val);
    });
  },
};

/**
 * Take exponential (e^x)
 */
export const exp: DslPrimitive = {
  name: 'exp',
  validate: () => [],
  execute: async (params, inputs) => {
    const [a] = inputs;
    return a.map((val: number) => Math.exp(val));
  },
};

/**
 * Take square root
 */
export const sqrt: DslPrimitive = {
  name: 'sqrt',
  validate: () => [],
  execute: async (params, inputs) => {
    const [a] = inputs;
    return a.map((val: number) => {
      if (val < 0) return NaN;
      return Math.sqrt(val);
    });
  },
};

/**
 * Round to nearest integer
 */
export const round: DslPrimitive = {
  name: 'round',
  validate: (params) => {
    const errors: string[] = [];
    if (params.decimals !== undefined && typeof params.decimals !== 'number') {
      errors.push('decimals must be a number');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [a] = inputs;
    const { decimals = 0 } = params;
    const multiplier = Math.pow(10, decimals);

    return a.map((val: number) => Math.round(val * multiplier) / multiplier);
  },
};

/**
 * Floor (round down)
 */
export const floor: DslPrimitive = {
  name: 'floor',
  validate: () => [],
  execute: async (params, inputs) => {
    const [a] = inputs;
    return a.map((val: number) => Math.floor(val));
  },
};

/**
 * Ceiling (round up)
 */
export const ceil: DslPrimitive = {
  name: 'ceil',
  validate: () => [],
  execute: async (params, inputs) => {
    const [a] = inputs;
    return a.map((val: number) => Math.ceil(val));
  },
};

/**
 * Clamp values between min and max
 */
export const clamp: DslPrimitive = {
  name: 'clamp',
  validate: (params) => {
    const errors: string[] = [];
    if (typeof params.min !== 'number') {
      errors.push('min must be a number');
    }
    if (typeof params.max !== 'number') {
      errors.push('max must be a number');
    }
    if (params.min >= params.max) {
      errors.push('min must be less than max');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [a] = inputs;
    const { min, max } = params;

    return a.map((val: number) => Math.max(min, Math.min(max, val)));
  },
};
