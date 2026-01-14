// src/lib/models/data/macro.ts
// Macro/economic data gateway for DSL primitives

import {
  getCached,
  setCached,
  macroDataKey,
  CACHE_TTL,
} from './cache';

export interface MacroDataPoint {
  date: string;
  value: number;
}

export interface MacroDataSeries {
  indicator: string;
  data: MacroDataPoint[];
  metadata?: {
    units?: string;
    frequency?: string;
    notes?: string;
  };
}

/**
 * Fetch macro/economic indicator data
 */
export async function fetchMacroData(
  indicator: string,
  params: {
    startDate?: string;
    endDate?: string;
    frequency?: string;
  } = {}
): Promise<MacroDataSeries> {
  // Check cache
  const cacheKey = macroDataKey(indicator, params);
  const cached = await getCached<MacroDataSeries>(cacheKey);

  if (cached) {
    return cached;
  }

  // Fetch from FRED API
  const data = await fetchFromFRED(indicator, params);

  // Cache result
  await setCached(cacheKey, data, CACHE_TTL.MACRO_DATA);

  return data;
}

/**
 * Fetch from FRED (Federal Reserve Economic Data) API
 */
async function fetchFromFRED(
  seriesId: string,
  params: {
    startDate?: string;
    endDate?: string;
    frequency?: string;
  }
): Promise<MacroDataSeries> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    throw new Error('FRED_API_KEY not configured');
  }

  // Build URL
  const url = new URL(
    `https://api.stlouisfed.org/fred/series/observations`
  );

  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');

  if (params.startDate) {
    url.searchParams.set('observation_start', params.startDate);
  }

  if (params.endDate) {
    url.searchParams.set('observation_end', params.endDate);
  }

  if (params.frequency) {
    url.searchParams.set('frequency', params.frequency);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `FRED API error (${response.status}): ${errorText}`
    );
  }

  const json = await response.json();

  if (json.error_code) {
    throw new Error(
      `FRED API error: ${json.error_message || json.error_code}`
    );
  }

  if (!json.observations || json.observations.length === 0) {
    throw new Error(`No data available for indicator ${seriesId}`);
  }

  // Transform to our format
  const data: MacroDataPoint[] = json.observations
    .filter((obs: any) => obs.value !== '.')
    .map((obs: any) => ({
      date: obs.date,
      value: parseFloat(obs.value),
    }));

  // Fetch metadata
  const metadata = await fetchSeriesMetadata(seriesId, apiKey);

  return {
    indicator: seriesId,
    data,
    metadata,
  };
}

/**
 * Fetch series metadata from FRED
 */
async function fetchSeriesMetadata(
  seriesId: string,
  apiKey: string
): Promise<MacroDataSeries['metadata']> {
  const url = `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return undefined;
    }

    const json = await response.json();

    if (json.seriess && json.seriess.length > 0) {
      const series = json.seriess[0];
      return {
        units: series.units,
        frequency: series.frequency,
        notes: series.notes,
      };
    }
  } catch (error) {
    console.error('[Macro] Failed to fetch metadata:', error);
  }

  return undefined;
}

/**
 * Extract values from macro data series
 */
export function extractMacroValues(macroData: MacroDataSeries): number[] {
  return macroData.data.map((point) => point.value);
}

/**
 * Extract dates from macro data series
 */
export function extractMacroDates(macroData: MacroDataSeries): string[] {
  return macroData.data.map((point) => point.date);
}

/**
 * Common FRED series IDs (for convenience)
 */
export const FRED_SERIES = {
  // Interest Rates
  FED_FUNDS_RATE: 'DFF', // Federal Funds Effective Rate
  TREASURY_10Y: 'DGS10', // 10-Year Treasury Constant Maturity Rate
  TREASURY_2Y: 'DGS2', // 2-Year Treasury Constant Maturity Rate

  // Inflation
  CPI: 'CPIAUCSL', // Consumer Price Index
  CORE_CPI: 'CPILFESL', // Core CPI (ex food & energy)
  PCE: 'PCEPI', // Personal Consumption Expenditures Price Index
  CORE_PCE: 'PCEPILFE', // Core PCE

  // Economic Activity
  GDP: 'GDP', // Gross Domestic Product
  UNEMPLOYMENT: 'UNRATE', // Unemployment Rate
  PAYROLLS: 'PAYEMS', // Total Nonfarm Payrolls
  RETAIL_SALES: 'RSXFS', // Retail Sales

  // Market Indicators
  VIX: 'VIXCLS', // CBOE Volatility Index
  SP500: 'SP500', // S&P 500 Index

  // Money Supply
  M2: 'M2SL', // M2 Money Stock
  M1: 'M1SL', // M1 Money Stock
} as const;

/**
 * Get latest value from a macro series
 */
export async function getLatestMacroValue(
  indicator: string
): Promise<number> {
  const data = await fetchMacroData(indicator);

  if (data.data.length === 0) {
    throw new Error(`No data available for ${indicator}`);
  }

  return data.data[data.data.length - 1].value;
}

/**
 * Calculate year-over-year change
 */
export function calculateYoYChange(
  data: MacroDataPoint[],
  periodsPerYear: number = 12
): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < periodsPerYear) {
      result.push(NaN);
    } else {
      const current = data[i].value;
      const yearAgo = data[i - periodsPerYear].value;

      if (yearAgo === 0) {
        result.push(NaN);
      } else {
        result.push(((current - yearAgo) / yearAgo) * 100);
      }
    }
  }

  return result;
}

/**
 * Align macro data series to dates
 * Forward-fills missing dates
 */
export function alignToDate(
  macroData: MacroDataSeries,
  targetDates: string[]
): number[] {
  const dataMap = new Map<string, number>();

  for (const point of macroData.data) {
    dataMap.set(point.date, point.value);
  }

  const result: number[] = [];
  let lastValue = NaN;

  for (const date of targetDates) {
    if (dataMap.has(date)) {
      lastValue = dataMap.get(date)!;
      result.push(lastValue);
    } else {
      // Forward fill
      result.push(lastValue);
    }
  }

  return result;
}

/**
 * Resample macro data to different frequency
 * Simple implementation using last value in period
 */
export function resampleMacroData(
  macroData: MacroDataSeries,
  targetFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
): MacroDataSeries {
  // This is a simplified implementation
  // In production, you might want to use a more sophisticated resampling algorithm

  if (macroData.data.length === 0) {
    return macroData;
  }

  const groupedData = new Map<string, MacroDataPoint[]>();

  for (const point of macroData.data) {
    const date = new Date(point.date);
    let key: string;

    switch (targetFrequency) {
      case 'daily':
        key = point.date;
        break;
      case 'weekly':
        // ISO week start (Monday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1);
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3);
        const quarterMonth = quarter * 3;
        key = `${date.getFullYear()}-${String(quarterMonth + 1).padStart(2, '0')}-01`;
        break;
    }

    if (!groupedData.has(key)) {
      groupedData.set(key, []);
    }
    groupedData.get(key)!.push(point);
  }

  // Take last value in each period
  const resampledData: MacroDataPoint[] = [];

  for (const [date, points] of Array.from(groupedData.entries()).sort()) {
    const lastPoint = points[points.length - 1];
    resampledData.push({
      date,
      value: lastPoint.value,
    });
  }

  return {
    ...macroData,
    data: resampledData,
    metadata: {
      ...macroData.metadata,
      frequency: targetFrequency,
    },
  };
}
