// src/lib/models/seeds/econ-templates.ts
// Seed templates for Econ Lab models

import type { DslModel, InputSchema } from '@/types/models';

export const econTemplates = [
  {
    slug: 'momentum-strategy',
    name: 'Momentum Strategy',
    description: 'Calculate momentum indicators and identify trending assets using rolling returns and moving averages.',
    lab_scope: 'econ' as const,
    tags: ['momentum', 'technical-analysis', 'returns'],
    difficulty: 'basic' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_prices',
          operation: 'fetch_market_data',
          params: {
            symbol: '$symbol',
            start_date: '$start_date',
            end_date: '$end_date',
          },
        },
        {
          id: 'close_prices',
          operation: 'extract_price_series',
          params: { field: 'close' },
          inputs: ['fetch_prices'],
        },
        {
          id: 'returns',
          operation: 'percent_change',
          params: { periods: 1 },
          inputs: ['close_prices'],
        },
        {
          id: 'momentum_20',
          operation: 'rolling_mean',
          params: { window: 20 },
          inputs: ['returns'],
        },
        {
          id: 'momentum_50',
          operation: 'rolling_mean',
          params: { window: 50 },
          inputs: ['returns'],
        },
        {
          id: 'sma_20',
          operation: 'rolling_mean',
          params: { window: 20 },
          inputs: ['close_prices'],
        },
        {
          id: 'sma_50',
          operation: 'rolling_mean',
          params: { window: 50 },
          inputs: ['close_prices'],
        },
      ],
      outputs: {
        series: [
          {
            id: 'price',
            source: 'close_prices',
            label: 'Price',
            color: '#2563eb',
            type: 'line',
          },
          {
            id: 'sma20',
            source: 'sma_20',
            label: '20-Day SMA',
            color: '#16a34a',
            type: 'line',
          },
          {
            id: 'sma50',
            source: 'sma_50',
            label: '50-Day SMA',
            color: '#dc2626',
            type: 'line',
          },
        ],
        scalars: [
          {
            id: 'momentum_20d',
            source: 'momentum_20',
            label: '20-Day Momentum',
          },
          {
            id: 'momentum_50d',
            source: 'momentum_50',
            label: '50-Day Momentum',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Stock Symbol',
          description: 'Ticker symbol (e.g., SPY, AAPL)',
          required: true,
          placeholder: 'SPY',
          default: 'SPY',
        },
        {
          name: 'start_date',
          type: 'date',
          label: 'Start Date',
          required: true,
          default: '2023-01-01',
        },
        {
          name: 'end_date',
          type: 'date',
          label: 'End Date',
          required: true,
          default: '2024-01-01',
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'mean-reversion',
    name: 'Mean Reversion Indicator',
    description: 'Identify potential mean reversion opportunities using z-scores and Bollinger Bands.',
    lab_scope: 'econ' as const,
    tags: ['mean-reversion', 'technical-analysis', 'volatility'],
    difficulty: 'intermediate' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_prices',
          operation: 'fetch_market_data',
          params: {
            symbol: '$symbol',
            start_date: '$start_date',
            end_date: '$end_date',
          },
        },
        {
          id: 'close_prices',
          operation: 'extract_price_series',
          params: { field: 'close' },
          inputs: ['fetch_prices'],
        },
        {
          id: 'sma',
          operation: 'rolling_mean',
          params: { window: '$window' },
          inputs: ['close_prices'],
        },
        {
          id: 'std',
          operation: 'rolling_std',
          params: { window: '$window' },
          inputs: ['close_prices'],
        },
        {
          id: 'zscore',
          operation: 'zscore',
          params: {},
          inputs: ['close_prices'],
        },
        {
          id: 'upper_band',
          operation: 'add',
          params: { scalar: 2 },
          inputs: ['sma', 'std'],
        },
        {
          id: 'lower_band',
          operation: 'subtract',
          params: { scalar: 2 },
          inputs: ['sma', 'std'],
        },
      ],
      outputs: {
        series: [
          {
            id: 'price',
            source: 'close_prices',
            label: 'Price',
            color: '#2563eb',
            type: 'line',
          },
          {
            id: 'middle',
            source: 'sma',
            label: 'Middle Band (SMA)',
            color: '#16a34a',
            type: 'line',
          },
          {
            id: 'upper',
            source: 'upper_band',
            label: 'Upper Band (+2σ)',
            color: '#dc2626',
            type: 'line',
          },
          {
            id: 'lower',
            source: 'lower_band',
            label: 'Lower Band (-2σ)',
            color: '#dc2626',
            type: 'line',
          },
          {
            id: 'z',
            source: 'zscore',
            label: 'Z-Score',
            color: '#9333ea',
            type: 'line',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Stock Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'window',
          type: 'number',
          label: 'Lookback Window',
          description: 'Number of days for rolling calculations',
          required: true,
          default: 20,
          min: 5,
          max: 100,
        },
        {
          name: 'start_date',
          type: 'date',
          label: 'Start Date',
          required: true,
          default: '2023-01-01',
        },
        {
          name: 'end_date',
          type: 'date',
          label: 'End Date',
          required: true,
          default: '2024-01-01',
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'correlation-analysis',
    name: 'Asset Correlation Analysis',
    description: 'Calculate rolling correlation between two assets to identify relationship changes over time.',
    lab_scope: 'econ' as const,
    tags: ['correlation', 'analysis', 'diversification'],
    difficulty: 'intermediate' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_asset1',
          operation: 'fetch_market_data',
          params: {
            symbol: '$symbol1',
            start_date: '$start_date',
            end_date: '$end_date',
          },
        },
        {
          id: 'fetch_asset2',
          operation: 'fetch_market_data',
          params: {
            symbol: '$symbol2',
            start_date: '$start_date',
            end_date: '$end_date',
          },
        },
        {
          id: 'prices1',
          operation: 'extract_price_series',
          params: { field: 'close' },
          inputs: ['fetch_asset1'],
        },
        {
          id: 'prices2',
          operation: 'extract_price_series',
          params: { field: 'close' },
          inputs: ['fetch_asset2'],
        },
        {
          id: 'returns1',
          operation: 'percent_change',
          params: { periods: 1 },
          inputs: ['prices1'],
        },
        {
          id: 'returns2',
          operation: 'percent_change',
          params: { periods: 1 },
          inputs: ['prices2'],
        },
        {
          id: 'rolling_corr',
          operation: 'rolling_correlation',
          params: { window: '$window' },
          inputs: ['returns1', 'returns2'],
        },
        {
          id: 'overall_corr',
          operation: 'correlation',
          params: {},
          inputs: ['returns1', 'returns2'],
        },
      ],
      outputs: {
        series: [
          {
            id: 'corr',
            source: 'rolling_corr',
            label: 'Rolling Correlation',
            color: '#2563eb',
            type: 'line',
          },
        ],
        scalars: [
          {
            id: 'correlation',
            source: 'overall_corr',
            label: 'Overall Correlation',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol1',
          type: 'string',
          label: 'First Asset',
          required: true,
          default: 'SPY',
        },
        {
          name: 'symbol2',
          type: 'string',
          label: 'Second Asset',
          required: true,
          default: 'TLT',
        },
        {
          name: 'window',
          type: 'number',
          label: 'Rolling Window (days)',
          required: true,
          default: 30,
          min: 10,
          max: 252,
        },
        {
          name: 'start_date',
          type: 'date',
          label: 'Start Date',
          required: true,
          default: '2023-01-01',
        },
        {
          name: 'end_date',
          type: 'date',
          label: 'End Date',
          required: true,
          default: '2024-01-01',
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'volatility-tracker',
    name: 'Volatility Tracker',
    description: 'Monitor historical and rolling volatility to assess market risk.',
    lab_scope: 'econ' as const,
    tags: ['volatility', 'risk-management', 'technical-analysis'],
    difficulty: 'basic' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_prices',
          operation: 'fetch_market_data',
          params: {
            symbol: '$symbol',
            start_date: '$start_date',
            end_date: '$end_date',
          },
        },
        {
          id: 'close_prices',
          operation: 'extract_price_series',
          params: { field: 'close' },
          inputs: ['fetch_prices'],
        },
        {
          id: 'returns',
          operation: 'log_return',
          params: { periods: 1 },
          inputs: ['close_prices'],
        },
        {
          id: 'vol_20',
          operation: 'rolling_std',
          params: { window: 20 },
          inputs: ['returns'],
        },
        {
          id: 'vol_60',
          operation: 'rolling_std',
          params: { window: 60 },
          inputs: ['returns'],
        },
        {
          id: 'annualized_vol',
          operation: 'multiply',
          params: { scalar: 15.87 }, // sqrt(252) for annualization
          inputs: ['vol_20'],
        },
      ],
      outputs: {
        series: [
          {
            id: 'vol20',
            source: 'vol_20',
            label: '20-Day Volatility',
            color: '#2563eb',
            type: 'line',
          },
          {
            id: 'vol60',
            source: 'vol_60',
            label: '60-Day Volatility',
            color: '#dc2626',
            type: 'line',
          },
        ],
        scalars: [
          {
            id: 'current_vol',
            source: 'annualized_vol',
            label: 'Current Annualized Vol',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Stock Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'start_date',
          type: 'date',
          label: 'Start Date',
          required: true,
          default: '2023-01-01',
        },
        {
          name: 'end_date',
          type: 'date',
          label: 'End Date',
          required: true,
          default: '2024-01-01',
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'drawdown-analysis',
    name: 'Drawdown Analysis',
    description: 'Analyze peak-to-trough declines to understand downside risk.',
    lab_scope: 'econ' as const,
    tags: ['risk-management', 'drawdown', 'analysis'],
    difficulty: 'basic' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_prices',
          operation: 'fetch_market_data',
          params: {
            symbol: '$symbol',
            start_date: '$start_date',
            end_date: '$end_date',
          },
        },
        {
          id: 'close_prices',
          operation: 'extract_price_series',
          params: { field: 'close' },
          inputs: ['fetch_prices'],
        },
        {
          id: 'drawdowns',
          operation: 'drawdown',
          params: {},
          inputs: ['close_prices'],
        },
        {
          id: 'max_dd',
          operation: 'min',
          params: {},
          inputs: ['drawdowns'],
        },
      ],
      outputs: {
        series: [
          {
            id: 'dd',
            source: 'drawdowns',
            label: 'Drawdown (%)',
            color: '#dc2626',
            type: 'area',
          },
        ],
        scalars: [
          {
            id: 'max_drawdown',
            source: 'max_dd',
            label: 'Maximum Drawdown (%)',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Stock Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'start_date',
          type: 'date',
          label: 'Start Date',
          required: true,
          default: '2023-01-01',
        },
        {
          name: 'end_date',
          type: 'date',
          label: 'End Date',
          required: true,
          default: '2024-01-01',
        },
      ],
    } as InputSchema,
  },
];
