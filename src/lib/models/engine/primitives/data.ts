// src/lib/models/engine/primitives/data.ts
// Data fetching operations for DSL

import type { DslPrimitive } from '@/types/models';
import {
  fetchMarketData,
  extractPriceSeries,
  extractVolumeSeries,
  extractDateLabels,
  getCurrentPrice,
} from '@/lib/models/data/market';
import {
  fetchMacroData,
  extractMacroValues,
  extractMacroDates,
} from '@/lib/models/data/macro';
import {
  fetchOptionsChain,
  fetchOptionQuote,
  findATMStrike,
  findATMStraddle,
  calculateExpectedMove,
  extractImpliedVolatilities,
} from '@/lib/models/data/derivatives';

/**
 * Fetch historical market data
 */
export const fetch_market_data: DslPrimitive = {
  name: 'fetch_market_data',
  validate: (params) => {
    const errors: string[] = [];
    if (!params.symbol || typeof params.symbol !== 'string') {
      errors.push('symbol must be a string');
    }
    if (!params.start_date || typeof params.start_date !== 'string') {
      errors.push('start_date must be a string (YYYY-MM-DD)');
    }
    if (!params.end_date || typeof params.end_date !== 'string') {
      errors.push('end_date must be a string (YYYY-MM-DD)');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const { symbol, start_date, end_date, interval = 'day' } = params;
    const data = await fetchMarketData(symbol, start_date, end_date, interval);
    return data;
  },
};

/**
 * Extract price series from market data
 */
export const extract_price_series: DslPrimitive = {
  name: 'extract_price_series',
  validate: (params) => {
    const errors: string[] = [];
    if (params.field && !['open', 'high', 'low', 'close'].includes(params.field)) {
      errors.push('field must be one of: open, high, low, close');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const [marketData] = inputs;
    const { field = 'close' } = params;

    if (!marketData || !marketData.data) {
      throw new Error('Invalid market data input');
    }

    return extractPriceSeries(marketData, field);
  },
};

/**
 * Extract volume series from market data
 */
export const extract_volume_series: DslPrimitive = {
  name: 'extract_volume_series',
  validate: () => [],
  execute: async (params, inputs) => {
    const [marketData] = inputs;

    if (!marketData || !marketData.data) {
      throw new Error('Invalid market data input');
    }

    return extractVolumeSeries(marketData);
  },
};

/**
 * Extract date labels from market data
 */
export const extract_date_labels: DslPrimitive = {
  name: 'extract_date_labels',
  validate: () => [],
  execute: async (params, inputs) => {
    const [marketData] = inputs;

    if (!marketData || !marketData.data) {
      throw new Error('Invalid market data input');
    }

    return extractDateLabels(marketData);
  },
};

/**
 * Get current price for a symbol
 */
export const get_current_price: DslPrimitive = {
  name: 'get_current_price',
  validate: (params) => {
    const errors: string[] = [];
    if (!params.symbol || typeof params.symbol !== 'string') {
      errors.push('symbol must be a string');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const { symbol } = params;
    return await getCurrentPrice(symbol);
  },
};

/**
 * Fetch macro/economic data
 */
export const fetch_macro_data: DslPrimitive = {
  name: 'fetch_macro_data',
  validate: (params) => {
    const errors: string[] = [];
    if (!params.indicator || typeof params.indicator !== 'string') {
      errors.push('indicator must be a string');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const { indicator, start_date, end_date, frequency } = params;
    const data = await fetchMacroData(indicator, {
      startDate: start_date,
      endDate: end_date,
      frequency,
    });
    return data;
  },
};

/**
 * Extract values from macro data
 */
export const extract_macro_values: DslPrimitive = {
  name: 'extract_macro_values',
  validate: () => [],
  execute: async (params, inputs) => {
    const [macroData] = inputs;

    if (!macroData || !macroData.data) {
      throw new Error('Invalid macro data input');
    }

    return extractMacroValues(macroData);
  },
};

/**
 * Extract dates from macro data
 */
export const extract_macro_dates: DslPrimitive = {
  name: 'extract_macro_dates',
  validate: () => [],
  execute: async (params, inputs) => {
    const [macroData] = inputs;

    if (!macroData || !macroData.data) {
      throw new Error('Invalid macro data input');
    }

    return extractMacroDates(macroData);
  },
};

/**
 * Fetch options chain
 */
export const fetch_options_chain: DslPrimitive = {
  name: 'fetch_options_chain',
  validate: (params) => {
    const errors: string[] = [];
    if (!params.symbol || typeof params.symbol !== 'string') {
      errors.push('symbol must be a string');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const { symbol, expiration } = params;
    const chains = await fetchOptionsChain(symbol, expiration);

    // If expiration specified, return single chain, otherwise return array
    if (expiration && chains.length > 0) {
      return chains[0];
    }

    return chains;
  },
};

/**
 * Fetch single option quote
 */
export const fetch_option_quote: DslPrimitive = {
  name: 'fetch_option_quote',
  validate: (params) => {
    const errors: string[] = [];
    if (!params.symbol || typeof params.symbol !== 'string') {
      errors.push('symbol must be a string');
    }
    if (!params.expiration || typeof params.expiration !== 'string') {
      errors.push('expiration must be a string');
    }
    if (typeof params.strike !== 'number') {
      errors.push('strike must be a number');
    }
    if (!params.type || !['call', 'put'].includes(params.type)) {
      errors.push('type must be "call" or "put"');
    }
    return errors;
  },
  execute: async (params, inputs) => {
    const { symbol, expiration, strike, type } = params;
    return await fetchOptionQuote(symbol, expiration, strike, type);
  },
};

/**
 * Find ATM strike from options chain
 */
export const find_atm_strike: DslPrimitive = {
  name: 'find_atm_strike',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.calls || !chain.underlyingPrice) {
      throw new Error('Invalid options chain input');
    }

    return findATMStrike(chain);
  },
};

/**
 * Find ATM straddle
 */
export const find_atm_straddle: DslPrimitive = {
  name: 'find_atm_straddle',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.calls || !chain.puts) {
      throw new Error('Invalid options chain input');
    }

    return findATMStraddle(chain);
  },
};

/**
 * Calculate expected move from ATM straddle
 */
export const calculate_expected_move: DslPrimitive = {
  name: 'calculate_expected_move',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.calls || !chain.puts) {
      throw new Error('Invalid options chain input');
    }

    return calculateExpectedMove(chain);
  },
};

/**
 * Extract implied volatilities from chain
 */
export const extract_implied_volatilities: DslPrimitive = {
  name: 'extract_implied_volatilities',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.calls || !chain.puts) {
      throw new Error('Invalid options chain input');
    }

    return extractImpliedVolatilities(chain);
  },
};

/**
 * Sum option volumes from chain
 */
export const sum_call_volume: DslPrimitive = {
  name: 'sum_call_volume',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.calls) {
      throw new Error('Invalid options chain input');
    }

    return chain.calls.reduce((sum: number, call: any) => sum + (call.volume || 0), 0);
  },
};

export const sum_put_volume: DslPrimitive = {
  name: 'sum_put_volume',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.puts) {
      throw new Error('Invalid options chain input');
    }

    return chain.puts.reduce((sum: number, put: any) => sum + (put.volume || 0), 0);
  },
};

export const sum_call_open_interest: DslPrimitive = {
  name: 'sum_call_open_interest',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.calls) {
      throw new Error('Invalid options chain input');
    }

    return chain.calls.reduce((sum: number, call: any) => sum + (call.openInterest || 0), 0);
  },
};

export const sum_put_open_interest: DslPrimitive = {
  name: 'sum_put_open_interest',
  validate: () => [],
  execute: async (params, inputs) => {
    const [chain] = inputs;

    if (!chain || !chain.puts) {
      throw new Error('Invalid options chain input');
    }

    return chain.puts.reduce((sum: number, put: any) => sum + (put.openInterest || 0), 0);
  },
};
