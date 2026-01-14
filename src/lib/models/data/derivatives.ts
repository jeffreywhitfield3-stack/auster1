// src/lib/models/data/derivatives.ts
// Derivatives/options data gateway for DSL primitives

import {
  getCached,
  setCached,
  derivativesQuoteKey,
  derivativesChainKey,
  CACHE_TTL,
} from './cache';

export interface OptionQuote {
  symbol: string;
  underlying: string;
  expiration: string;
  strike: number;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
}

export interface OptionsChain {
  underlying: string;
  expiration: string;
  underlyingPrice: number;
  calls: OptionQuote[];
  puts: OptionQuote[];
}

/**
 * Fetch options chain for a symbol
 */
export async function fetchOptionsChain(
  symbol: string,
  expiration?: string
): Promise<OptionsChain[]> {
  // Check cache
  const cacheKey = derivativesChainKey(symbol, expiration);
  const cached = await getCached<OptionsChain[]>(cacheKey);

  if (cached) {
    return cached;
  }

  // Fetch from Polygon Options API
  const data = await fetchChainFromPolygon(symbol, expiration);

  // Cache result
  await setCached(cacheKey, data, CACHE_TTL.DERIVATIVES_CHAIN);

  return data;
}

/**
 * Fetch single option quote
 */
export async function fetchOptionQuote(
  symbol: string,
  expiration: string,
  strike: number,
  optionType: 'call' | 'put'
): Promise<OptionQuote> {
  // Check cache
  const cacheKey = derivativesQuoteKey(symbol, expiration, strike, optionType);
  const cached = await getCached<OptionQuote>(cacheKey);

  if (cached) {
    return cached;
  }

  // Build option ticker (e.g., O:SPY250117C00550000)
  const optionTicker = buildOptionTicker(symbol, expiration, strike, optionType);

  const quote = await fetchQuoteFromPolygon(optionTicker);

  // Cache result
  await setCached(cacheKey, quote, CACHE_TTL.DERIVATIVES_QUOTE);

  return quote;
}

/**
 * Fetch options chain from Polygon
 */
async function fetchChainFromPolygon(
  underlying: string,
  expiration?: string
): Promise<OptionsChain[]> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  // Get available expirations if not specified
  let expirations: string[];

  if (expiration) {
    expirations = [expiration];
  } else {
    expirations = await fetchExpirations(underlying);
  }

  // Fetch chains for each expiration
  const chains: OptionsChain[] = [];

  for (const exp of expirations) {
    const chain = await fetchSingleChain(underlying, exp, apiKey);
    chains.push(chain);
  }

  return chains;
}

/**
 * Fetch available expirations for a symbol
 */
async function fetchExpirations(symbol: string): Promise<string[]> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  // Use the contract endpoint to get available expirations
  const url = `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${symbol}&limit=1000&apiKey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch expirations for ${symbol}`);
  }

  const json = await response.json();

  if (!json.results || json.results.length === 0) {
    throw new Error(`No options data available for ${symbol}`);
  }

  // Extract unique expirations
  const expirationSet = new Set<string>();

  for (const contract of json.results) {
    if (contract.expiration_date) {
      expirationSet.add(contract.expiration_date);
    }
  }

  // Sort and return (nearest expirations first)
  return Array.from(expirationSet).sort();
}

/**
 * Fetch chain for a single expiration
 */
async function fetchSingleChain(
  underlying: string,
  expiration: string,
  apiKey: string
): Promise<OptionsChain> {
  // Fetch contracts
  const url = `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${underlying}&expiration_date=${expiration}&limit=1000&apiKey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch chain for ${underlying} ${expiration}`);
  }

  const json = await response.json();

  if (!json.results || json.results.length === 0) {
    return {
      underlying,
      expiration,
      underlyingPrice: 0,
      calls: [],
      puts: [],
    };
  }

  // Get underlying price (could cache this separately)
  const underlyingPrice = await getUnderlyingPrice(underlying);

  // Transform to our format
  const calls: OptionQuote[] = [];
  const puts: OptionQuote[] = [];

  for (const contract of json.results) {
    const quote: OptionQuote = {
      symbol: contract.ticker,
      underlying: contract.underlying_ticker,
      expiration: contract.expiration_date,
      strike: contract.strike_price,
      type: contract.contract_type === 'call' ? 'call' : 'put',
      bid: 0,
      ask: 0,
      last: 0,
      volume: 0,
      openInterest: 0,
    };

    if (contract.contract_type === 'call') {
      calls.push(quote);
    } else {
      puts.push(quote);
    }
  }

  // Sort by strike
  calls.sort((a, b) => a.strike - b.strike);
  puts.sort((a, b) => a.strike - b.strike);

  return {
    underlying,
    expiration,
    underlyingPrice,
    calls,
    puts,
  };
}

/**
 * Fetch quote for specific option ticker
 */
async function fetchQuoteFromPolygon(optionTicker: string): Promise<OptionQuote> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  // Get quote data
  const url = `https://api.polygon.io/v3/quotes/${optionTicker}?apiKey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch quote for ${optionTicker}`);
  }

  const json = await response.json();

  if (!json.results || json.results.length === 0) {
    throw new Error(`No quote data available for ${optionTicker}`);
  }

  const result = json.results[0];

  // Parse option ticker to extract details
  const parsed = parseOptionTicker(optionTicker);

  return {
    symbol: optionTicker,
    underlying: parsed.underlying,
    expiration: parsed.expiration,
    strike: parsed.strike,
    type: parsed.type,
    bid: result.bid_price || 0,
    ask: result.ask_price || 0,
    last: result.last_price || 0,
    volume: result.volume || 0,
    openInterest: result.open_interest || 0,
  };
}

/**
 * Get underlying stock price
 */
async function getUnderlyingPrice(symbol: string): Promise<number> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    return 0;
  }

  const json = await response.json();

  if (json.status === 'OK' && json.results && json.results.length > 0) {
    return json.results[0].c;
  }

  return 0;
}

/**
 * Build option ticker in Polygon format
 * Format: O:SPY251219C00600000
 * O: prefix for options
 * SPY: underlying
 * 251219: expiration (YYMMDD)
 * C/P: call or put
 * 00600000: strike price (8 digits, 3 decimals)
 */
function buildOptionTicker(
  underlying: string,
  expiration: string,
  strike: number,
  type: 'call' | 'put'
): string {
  // Convert expiration from YYYY-MM-DD to YYMMDD
  const [year, month, day] = expiration.split('-');
  const yymmdd = `${year.slice(2)}${month}${day}`;

  // Format strike (8 digits, multiply by 1000)
  const strikeStr = String(Math.round(strike * 1000)).padStart(8, '0');

  return `O:${underlying}${yymmdd}${type === 'call' ? 'C' : 'P'}${strikeStr}`;
}

/**
 * Parse option ticker
 */
function parseOptionTicker(ticker: string): {
  underlying: string;
  expiration: string;
  strike: number;
  type: 'call' | 'put';
} {
  // Remove O: prefix
  const cleaned = ticker.startsWith('O:') ? ticker.slice(2) : ticker;

  // Extract components using regex
  const match = cleaned.match(/^([A-Z]+)(\d{6})([CP])(\d{8})$/);

  if (!match) {
    throw new Error(`Invalid option ticker format: ${ticker}`);
  }

  const [, underlying, yymmdd, typeChar, strikeStr] = match;

  // Parse expiration
  const yy = yymmdd.slice(0, 2);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  const expiration = `20${yy}-${mm}-${dd}`;

  // Parse strike
  const strike = parseInt(strikeStr, 10) / 1000;

  // Parse type
  const type = typeChar === 'C' ? 'call' : 'put';

  return { underlying, expiration, strike, type };
}

/**
 * Find ATM (at-the-money) strike
 */
export function findATMStrike(chain: OptionsChain): number {
  if (chain.calls.length === 0) {
    throw new Error('No calls in options chain');
  }

  // Find strike closest to underlying price
  let closestStrike = chain.calls[0].strike;
  let minDiff = Math.abs(chain.calls[0].strike - chain.underlyingPrice);

  for (const call of chain.calls) {
    const diff = Math.abs(call.strike - chain.underlyingPrice);
    if (diff < minDiff) {
      minDiff = diff;
      closestStrike = call.strike;
    }
  }

  return closestStrike;
}

/**
 * Find ATM straddle (call + put at ATM strike)
 */
export function findATMStraddle(chain: OptionsChain): {
  call: OptionQuote;
  put: OptionQuote;
  totalPremium: number;
} {
  const atmStrike = findATMStrike(chain);

  const call = chain.calls.find((c) => c.strike === atmStrike);
  const put = chain.puts.find((p) => p.strike === atmStrike);

  if (!call || !put) {
    throw new Error(`No straddle found at strike ${atmStrike}`);
  }

  return {
    call,
    put,
    totalPremium: (call.bid + call.ask) / 2 + (put.bid + put.ask) / 2,
  };
}

/**
 * Calculate expected move from ATM straddle
 */
export function calculateExpectedMove(chain: OptionsChain): {
  dollarMove: number;
  percentMove: number;
  upperBound: number;
  lowerBound: number;
} {
  const straddle = findATMStraddle(chain);
  const dollarMove = straddle.totalPremium;
  const percentMove = (dollarMove / chain.underlyingPrice) * 100;

  return {
    dollarMove,
    percentMove,
    upperBound: chain.underlyingPrice + dollarMove,
    lowerBound: chain.underlyingPrice - dollarMove,
  };
}

/**
 * Extract implied volatilities from chain
 */
export function extractImpliedVolatilities(
  chain: OptionsChain
): { strikes: number[]; callIVs: number[]; putIVs: number[] } {
  const strikes: number[] = [];
  const callIVs: number[] = [];
  const putIVs: number[] = [];

  // Combine all unique strikes
  const strikeSet = new Set<number>();
  chain.calls.forEach((c) => strikeSet.add(c.strike));
  chain.puts.forEach((p) => strikeSet.add(p.strike));

  const sortedStrikes = Array.from(strikeSet).sort((a, b) => a - b);

  for (const strike of sortedStrikes) {
    strikes.push(strike);

    const call = chain.calls.find((c) => c.strike === strike);
    const put = chain.puts.find((p) => p.strike === strike);

    callIVs.push(call?.impliedVolatility || NaN);
    putIVs.push(put?.impliedVolatility || NaN);
  }

  return { strikes, callIVs, putIVs };
}
