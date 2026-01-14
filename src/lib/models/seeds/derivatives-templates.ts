// src/lib/models/seeds/derivatives-templates.ts
// Seed templates for Derivatives Lab models

import type { DslModel, InputSchema } from '@/types/models';

export const derivativesTemplates = [
  {
    slug: 'implied-volatility-smile',
    name: 'Implied Volatility Smile',
    description: 'Analyze the IV smile/skew across strikes to identify market sentiment and potential mispricing.',
    lab_scope: 'derivatives' as const,
    tags: ['volatility', 'options', 'skew'],
    difficulty: 'intermediate' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_chain',
          operation: 'fetch_options_chain',
          params: {
            symbol: '$symbol',
            expiration: '$expiration',
          },
        },
        {
          id: 'extract_ivs',
          operation: 'extract_implied_volatilities',
          params: {},
          inputs: ['fetch_chain'],
        },
      ],
      outputs: {
        tables: [
          {
            id: 'iv_data',
            source: 'extract_ivs',
            label: 'IV by Strike',
            columns: ['strike', 'call_iv', 'put_iv'],
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Underlying Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'expiration',
          type: 'date',
          label: 'Expiration Date',
          description: 'Options expiration date (YYYY-MM-DD)',
          required: true,
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'atm-straddle-expected-move',
    name: 'ATM Straddle Expected Move',
    description: 'Calculate the expected move implied by ATM straddle pricing.',
    lab_scope: 'derivatives' as const,
    tags: ['options', 'straddle', 'volatility', 'expected-move'],
    difficulty: 'basic' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_chain',
          operation: 'fetch_options_chain',
          params: {
            symbol: '$symbol',
            expiration: '$expiration',
          },
        },
        {
          id: 'find_straddle',
          operation: 'find_atm_straddle',
          params: {},
          inputs: ['fetch_chain'],
        },
        {
          id: 'calc_move',
          operation: 'calculate_expected_move',
          params: {},
          inputs: ['fetch_chain'],
        },
      ],
      outputs: {
        scalars: [
          {
            id: 'premium',
            source: 'find_straddle.totalPremium',
            label: 'Straddle Premium',
          },
          {
            id: 'dollar_move',
            source: 'calc_move.dollarMove',
            label: 'Expected $ Move',
          },
          {
            id: 'percent_move',
            source: 'calc_move.percentMove',
            label: 'Expected % Move',
          },
          {
            id: 'upper',
            source: 'calc_move.upperBound',
            label: 'Upper Bound',
          },
          {
            id: 'lower',
            source: 'calc_move.lowerBound',
            label: 'Lower Bound',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Underlying Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'expiration',
          type: 'date',
          label: 'Expiration Date',
          required: true,
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'put-call-ratio',
    name: 'Put/Call Ratio Analysis',
    description: 'Calculate put/call ratio by volume and open interest to gauge market sentiment.',
    lab_scope: 'derivatives' as const,
    tags: ['options', 'sentiment', 'analysis'],
    difficulty: 'basic' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_chain',
          operation: 'fetch_options_chain',
          params: {
            symbol: '$symbol',
            expiration: '$expiration',
          },
        },
        {
          id: 'call_volume',
          operation: 'sum_call_volume',
          params: {},
          inputs: ['fetch_chain'],
        },
        {
          id: 'put_volume',
          operation: 'sum_put_volume',
          params: {},
          inputs: ['fetch_chain'],
        },
        {
          id: 'call_oi',
          operation: 'sum_call_open_interest',
          params: {},
          inputs: ['fetch_chain'],
        },
        {
          id: 'put_oi',
          operation: 'sum_put_open_interest',
          params: {},
          inputs: ['fetch_chain'],
        },
        {
          id: 'pc_volume',
          operation: 'divide',
          params: {},
          inputs: ['put_volume', 'call_volume'],
        },
        {
          id: 'pc_oi',
          operation: 'divide',
          params: {},
          inputs: ['put_oi', 'call_oi'],
        },
      ],
      outputs: {
        scalars: [
          {
            id: 'pc_vol_ratio',
            source: 'pc_volume',
            label: 'P/C Volume Ratio',
          },
          {
            id: 'pc_oi_ratio',
            source: 'pc_oi',
            label: 'P/C OI Ratio',
          },
          {
            id: 'total_volume',
            source: 'call_volume',
            label: 'Total Call Volume',
          },
          {
            id: 'total_oi',
            source: 'call_oi',
            label: 'Total Call OI',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Underlying Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'expiration',
          type: 'date',
          label: 'Expiration Date',
          required: true,
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'vertical-spread-analyzer',
    name: 'Vertical Spread Analyzer',
    description: 'Analyze potential vertical spread strategies with risk/reward calculations.',
    lab_scope: 'derivatives' as const,
    tags: ['spreads', 'options', 'strategy'],
    difficulty: 'intermediate' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_chain',
          operation: 'fetch_options_chain',
          params: {
            symbol: '$symbol',
            expiration: '$expiration',
          },
        },
        {
          id: 'long_option',
          operation: 'fetch_option_quote',
          params: {
            symbol: '$symbol',
            expiration: '$expiration',
            strike: '$long_strike',
            type: '$option_type',
          },
        },
        {
          id: 'short_option',
          operation: 'fetch_option_quote',
          params: {
            symbol: '$symbol',
            expiration: '$expiration',
            strike: '$short_strike',
            type: '$option_type',
          },
        },
        {
          id: 'net_debit',
          operation: 'subtract',
          params: {},
          inputs: ['long_option.ask', 'short_option.bid'],
        },
        {
          id: 'max_profit',
          operation: 'subtract',
          params: {},
          inputs: ['$long_strike', '$short_strike', 'net_debit'],
        },
        {
          id: 'risk_reward',
          operation: 'divide',
          params: {},
          inputs: ['max_profit', 'net_debit'],
        },
      ],
      outputs: {
        scalars: [
          {
            id: 'cost',
            source: 'net_debit',
            label: 'Net Debit (Max Loss)',
          },
          {
            id: 'profit',
            source: 'max_profit',
            label: 'Max Profit',
          },
          {
            id: 'rr',
            source: 'risk_reward',
            label: 'Risk/Reward Ratio',
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Underlying Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'expiration',
          type: 'date',
          label: 'Expiration Date',
          required: true,
        },
        {
          name: 'option_type',
          type: 'select',
          label: 'Option Type',
          required: true,
          options: [
            { value: 'call', label: 'Call' },
            { value: 'put', label: 'Put' },
          ],
          default: 'call',
        },
        {
          name: 'long_strike',
          type: 'number',
          label: 'Long Strike',
          required: true,
        },
        {
          name: 'short_strike',
          type: 'number',
          label: 'Short Strike',
          required: true,
        },
      ],
    } as InputSchema,
  },
  {
    slug: 'iron-condor-finder',
    name: 'Iron Condor Finder',
    description: 'Find optimal iron condor setups based on probability and premium collected.',
    lab_scope: 'derivatives' as const,
    tags: ['iron-condor', 'spreads', 'options', 'income'],
    difficulty: 'advanced' as const,
    dsl_json: {
      version: '1.0',
      steps: [
        {
          id: 'fetch_chain',
          operation: 'fetch_options_chain',
          params: {
            symbol: '$symbol',
            expiration: '$expiration',
          },
        },
        {
          id: 'find_condors',
          operation: 'find_iron_condors',
          params: {
            width: '$width',
            min_premium: '$min_premium',
            max_delta: '$max_delta',
          },
          inputs: ['fetch_chain'],
        },
      ],
      outputs: {
        tables: [
          {
            id: 'condors',
            source: 'find_condors',
            label: 'Iron Condor Candidates',
            columns: ['put_short_strike', 'put_long_strike', 'call_short_strike', 'call_long_strike', 'premium', 'max_loss', 'pop'],
          },
        ],
      },
    } as DslModel,
    input_schema: {
      fields: [
        {
          name: 'symbol',
          type: 'string',
          label: 'Underlying Symbol',
          required: true,
          default: 'SPY',
        },
        {
          name: 'expiration',
          type: 'date',
          label: 'Expiration Date',
          required: true,
        },
        {
          name: 'width',
          type: 'number',
          label: 'Spread Width ($)',
          description: 'Width of each vertical spread',
          required: true,
          default: 5,
          min: 1,
          max: 50,
        },
        {
          name: 'min_premium',
          type: 'number',
          label: 'Minimum Premium ($)',
          description: 'Minimum credit to collect',
          required: true,
          default: 0.5,
          min: 0.1,
        },
        {
          name: 'max_delta',
          type: 'number',
          label: 'Max Delta',
          description: 'Maximum delta for short options',
          required: true,
          default: 0.2,
          min: 0.05,
          max: 0.5,
        },
      ],
    } as InputSchema,
  },
];
