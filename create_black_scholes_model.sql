-- Create Black-Scholes Option Pricing Model
-- Run this SQL in your Supabase SQL editor
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with the actual user_id from auth.users table

BEGIN;

-- Create Jeffrey Whitfield's researcher profile (if it doesn't exist)
INSERT INTO researcher_profiles (
  user_id,
  display_name,
  slug,
  bio,
  institution,
  tier,
  published_objects_count
) VALUES (
  'YOUR_USER_ID_HERE'::uuid, -- REPLACE THIS with actual user_id from auth.users
  'Jeffrey Whitfield',
  'jeffrey-whitfield',
  'Economics student at St. Mary''s College of Maryland, focusing on financial markets and quantitative analysis.',
  'St. Mary''s College of Maryland',
  'contributor',
  0
) ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug = EXCLUDED.slug,
  bio = EXCLUDED.bio,
  institution = EXCLUDED.institution;

-- Get the user ID and create the model
DO $$
DECLARE
  user_uuid uuid := 'YOUR_USER_ID_HERE'::uuid; -- REPLACE THIS too
  model_id uuid;
  version_num integer := 1;
BEGIN
  -- Create Black-Scholes Option Pricing Model
  INSERT INTO models (
    owner_id,
    name,
    slug,
    description,
    lab_scope,
    tags,
    difficulty,
    visibility,
    is_template,
    total_runs
  ) VALUES (
    user_uuid,
    'Black-Scholes Option Pricing',
    'black-scholes-option-pricing',
    'Calculate theoretical option prices using the Black-Scholes model for European-style options. Includes call/put prices and all Greeks (Delta, Gamma, Theta, Vega, Rho) for risk management.',
    'derivatives',
    ARRAY['options', 'black-scholes', 'derivatives', 'pricing', 'greeks'],
    'basic',
    'public',
    true,
    0
  ) RETURNING id INTO model_id;

  -- Create the model version with DSL code
  INSERT INTO model_versions (
    model_id,
    version,
    changelog,
    runtime,
    code_bundle,
    input_schema,
    output_schema,
    is_active
  ) VALUES (
    model_id,
    version_num,
    'Initial release of Black-Scholes option pricing model with full Greeks calculations',
    'dsl',
    E'// Black-Scholes Option Pricing Model\n// Calculates theoretical option prices and Greeks\n// Created by Jeffrey Whitfield\n\n// Input validation\nvalidate stockPrice > 0 "Stock price must be positive"\nvalidate strikePrice > 0 "Strike price must be positive"\nvalidate timeToExpiration > 0 "Time to expiration must be positive"\nvalidate riskFreeRate >= 0 "Risk-free rate cannot be negative"\nvalidate volatility > 0 "Volatility must be positive"\n\n// Constants\nconst pi = 3.14159265359\n\n// Helper function: Cumulative normal distribution\nfunction normalCDF(x) {\n  const absX = abs(x)\n  const t = 1 / (1 + 0.2316419 * absX)\n  const d = 0.3989423 * exp(-x * x / 2)\n  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))\n  return x > 0 ? 1 - prob : prob\n}\n\n// Calculate d1 and d2\nconst sqrtT = sqrt(timeToExpiration)\nconst d1 = (log(stockPrice / strikePrice) + (riskFreeRate + (volatility * volatility) / 2) * timeToExpiration) / (volatility * sqrtT)\nconst d2 = d1 - volatility * sqrtT\n\n// Calculate N(d1) and N(d2)\nconst Nd1 = normalCDF(d1)\nconst Nd2 = normalCDF(d2)\nconst NegNd1 = normalCDF(-d1)\nconst NegNd2 = normalCDF(-d2)\n\n// Discount factor\nconst discountFactor = exp(-riskFreeRate * timeToExpiration)\n\n// Calculate option prices\nconst callPrice = stockPrice * Nd1 - strikePrice * discountFactor * Nd2\nconst putPrice = strikePrice * discountFactor * NegNd2 - stockPrice * NegNd1\n\n// Calculate Greeks\n// Delta: Rate of change of option price with respect to stock price\nconst callDelta = Nd1\nconst putDelta = Nd1 - 1\n\n// Gamma: Rate of change of delta with respect to stock price\nconst nPrimeD1 = exp(-d1 * d1 / 2) / sqrt(2 * pi)\nconst gamma = nPrimeD1 / (stockPrice * volatility * sqrtT)\n\n// Theta: Rate of change of option price with respect to time (daily)\nconst term1 = -(stockPrice * nPrimeD1 * volatility) / (2 * sqrtT)\nconst callTheta = (term1 - riskFreeRate * strikePrice * discountFactor * Nd2) / 365\nconst putTheta = (term1 + riskFreeRate * strikePrice * discountFactor * NegNd2) / 365\n\n// Vega: Rate of change of option price with respect to volatility (1% change)\nconst vega = (stockPrice * sqrtT * nPrimeD1) / 100\n\n// Rho: Rate of change of option price with respect to risk-free rate (1% change)\nconst callRho = (strikePrice * timeToExpiration * discountFactor * Nd2) / 100\nconst putRho = -(strikePrice * timeToExpiration * discountFactor * NegNd2) / 100\n\n// Return results\nreturn {\n  prices: {\n    call: round(callPrice, 4),\n    put: round(putPrice, 4)\n  },\n  greeks: {\n    call: {\n      delta: round(callDelta, 4),\n      gamma: round(gamma, 6),\n      theta: round(callTheta, 4),\n      vega: round(vega, 4),\n      rho: round(callRho, 4)\n    },\n    put: {\n      delta: round(putDelta, 4),\n      gamma: round(gamma, 6),\n      theta: round(putTheta, 4),\n      vega: round(vega, 4),\n      rho: round(putRho, 4)\n    }\n  },\n  calculations: {\n    d1: round(d1, 6),\n    d2: round(d2, 6),\n    Nd1: round(Nd1, 6),\n    Nd2: round(Nd2, 6)\n  },\n  metadata: {\n    model: "Black-Scholes",\n    optionStyle: "European",\n    assumptions: "No dividends, constant volatility and risk-free rate"\n  }\n}',
    '{
      "type": "object",
      "title": "Black-Scholes Inputs",
      "description": "Parameters for calculating European option prices",
      "properties": {
        "stockPrice": {
          "type": "number",
          "title": "Stock Price (S)",
          "description": "Current price of the underlying stock",
          "minimum": 0.01,
          "default": 100,
          "examples": [100, 150, 50]
        },
        "strikePrice": {
          "type": "number",
          "title": "Strike Price (K)",
          "description": "Exercise price of the option",
          "minimum": 0.01,
          "default": 100,
          "examples": [100, 105, 95]
        },
        "timeToExpiration": {
          "type": "number",
          "title": "Time to Expiration (T)",
          "description": "Time until option expiration in years (e.g., 0.25 for 3 months, 1 for 1 year)",
          "minimum": 0.001,
          "maximum": 10,
          "default": 1,
          "examples": [0.25, 0.5, 1, 2]
        },
        "riskFreeRate": {
          "type": "number",
          "title": "Risk-Free Rate (r)",
          "description": "Annual risk-free interest rate as a decimal (e.g., 0.05 for 5%)",
          "minimum": 0,
          "maximum": 1,
          "default": 0.05,
          "examples": [0.03, 0.05, 0.07]
        },
        "volatility": {
          "type": "number",
          "title": "Volatility (σ)",
          "description": "Annualized volatility as a decimal (e.g., 0.20 for 20%)",
          "minimum": 0.01,
          "maximum": 5,
          "default": 0.20,
          "examples": [0.15, 0.20, 0.30, 0.50]
        }
      },
      "required": ["stockPrice", "strikePrice", "timeToExpiration", "riskFreeRate", "volatility"]
    }',
    '{
      "type": "object",
      "properties": {
        "prices": {
          "type": "object",
          "description": "Theoretical option prices",
          "properties": {
            "call": {"type": "number", "description": "Call option price"},
            "put": {"type": "number", "description": "Put option price"}
          }
        },
        "greeks": {
          "type": "object",
          "description": "Option Greeks for risk management",
          "properties": {
            "call": {
              "type": "object",
              "properties": {
                "delta": {"type": "number", "description": "Change in price per $1 move in stock (0 to 1)"},
                "gamma": {"type": "number", "description": "Change in delta per $1 move in stock"},
                "theta": {"type": "number", "description": "Change in price per day (time decay)"},
                "vega": {"type": "number", "description": "Change in price per 1% change in volatility"},
                "rho": {"type": "number", "description": "Change in price per 1% change in risk-free rate"}
              }
            },
            "put": {
              "type": "object",
              "properties": {
                "delta": {"type": "number", "description": "Change in price per $1 move in stock (-1 to 0)"},
                "gamma": {"type": "number", "description": "Change in delta per $1 move in stock"},
                "theta": {"type": "number", "description": "Change in price per day (time decay)"},
                "vega": {"type": "number", "description": "Change in price per 1% change in volatility"},
                "rho": {"type": "number", "description": "Change in price per 1% change in risk-free rate"}
              }
            }
          }
        },
        "calculations": {
          "type": "object",
          "description": "Intermediate calculation values"
        },
        "metadata": {
          "type": "object",
          "description": "Model information and assumptions"
        }
      }
    }',
    true
  );

  -- Increment published objects count for the researcher
  UPDATE researcher_profiles
  SET published_objects_count = published_objects_count + 1
  WHERE user_id = user_uuid;

  RAISE NOTICE 'Success! Black-Scholes model created';
  RAISE NOTICE 'Model ID: %', model_id;
  RAISE NOTICE 'View it at: /models/black-scholes-option-pricing';
END $$;

COMMIT;

-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. Sign in as Jeffrey Whitfield
-- 2. Get your user_id by running:
--    SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
-- 3. Replace BOTH instances of 'YOUR_USER_ID_HERE' in this script
-- 4. Run this entire script in Supabase SQL Editor
-- 5. The model will be available at /models
--
-- Example test values:
-- Stock Price: $100
-- Strike Price: $100
-- Time: 1 year
-- Rate: 5% (0.05)
-- Volatility: 20% (0.20)
--
-- Expected results:
-- Call Price: ~$10.45
-- Put Price: ~$5.57
-- Call Delta: ~0.64
