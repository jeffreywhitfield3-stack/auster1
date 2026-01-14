-- Create Jeffrey Whitfield's researcher profile and Black-Scholes model
-- Run this SQL in your Supabase SQL editor

BEGIN;

-- First, get or create user ID (you'll need to replace this with actual user_id from auth.users)
-- For now, we'll create a placeholder - you should update this with the actual user_id after signup

-- Create Jeffrey Whitfield's researcher profile
INSERT INTO researcher_profiles (
  user_id,
  display_name,
  slug,
  bio,
  affiliation,
  field_of_study,
  institution,
  tier,
  onboarding_completed,
  published_objects_count
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual user_id
  'Jeffrey Whitfield',
  'jeffrey-whitfield',
  'Economics student at St. Mary''s College of Maryland, focusing on financial markets and quantitative analysis.',
  'student',
  'Economics',
  'St. Mary''s College of Maryland',
  'contributor',
  true,
  0
) ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  slug = EXCLUDED.slug,
  bio = EXCLUDED.bio,
  affiliation = EXCLUDED.affiliation,
  field_of_study = EXCLUDED.field_of_study,
  institution = EXCLUDED.institution;

-- Get the researcher profile ID
DO $$
DECLARE
  researcher_id uuid;
  model_id uuid;
  version_id uuid;
BEGIN
  -- Get researcher ID
  SELECT id INTO researcher_id FROM researcher_profiles WHERE slug = 'jeffrey-whitfield';

  -- Create Black-Scholes Option Pricing Model
  INSERT INTO models (
    owner_id,
    name,
    slug,
    description,
    long_description,
    lab_scope,
    category,
    tags,
    difficulty,
    visibility,
    is_template,
    run_count
  ) VALUES (
    researcher_id,
    'Black-Scholes Option Pricing',
    'black-scholes-option-pricing',
    'Calculate theoretical option prices using the Black-Scholes model for European-style options.',
    E'# Black-Scholes Option Pricing Model\n\nThe Black-Scholes model is a mathematical model for pricing European-style options. It calculates the theoretical value of call and put options based on:\n\n## Inputs\n- **Stock Price (S)**: Current price of the underlying stock\n- **Strike Price (K)**: Exercise price of the option\n- **Time to Expiration (T)**: Time until option expiration in years\n- **Risk-Free Rate (r)**: Annual risk-free interest rate\n- **Volatility (σ)**: Annualized standard deviation of stock returns\n\n## Outputs\n- **Call Option Price**: Theoretical value of a call option\n- **Put Option Price**: Theoretical value of a put option\n- **Greeks**: Delta, Gamma, Theta, Vega, Rho for risk management\n\n## Assumptions\n- European-style options (can only be exercised at expiration)\n- No dividends\n- Constant volatility and risk-free rate\n- Lognormal stock price distribution\n- Efficient markets with no transaction costs',
    'derivatives',
    'pricing',
    ARRAY['options', 'black-scholes', 'derivatives', 'pricing', 'greeks'],
    'beginner',
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
    code,
    input_schema,
    output_schema,
    is_active
  ) VALUES (
    model_id,
    '1.0.0',
    'Initial release of Black-Scholes option pricing model',
    'dsl',
    E'// Black-Scholes Option Pricing Model\n// Calculates theoretical option prices and Greeks\n\n// Input validation\nvalidate stockPrice > 0 "Stock price must be positive"\nvalidate strikePrice > 0 "Strike price must be positive"\nvalidate timeToExpiration > 0 "Time to expiration must be positive"\nvalidate riskFreeRate >= 0 "Risk-free rate cannot be negative"\nvalidate volatility > 0 "Volatility must be positive"\n\n// Helper functions\nfunction normalCDF(x) {\n  // Approximation of cumulative normal distribution\n  const t = 1 / (1 + 0.2316419 * abs(x))\n  const d = 0.3989423 * exp(-x * x / 2)\n  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))\n  return x > 0 ? 1 - prob : prob\n}\n\n// Calculate d1 and d2\nconst d1 = (log(stockPrice / strikePrice) + (riskFreeRate + volatility^2 / 2) * timeToExpiration) / (volatility * sqrt(timeToExpiration))\nconst d2 = d1 - volatility * sqrt(timeToExpiration)\n\n// Calculate option prices\nconst callPrice = stockPrice * normalCDF(d1) - strikePrice * exp(-riskFreeRate * timeToExpiration) * normalCDF(d2)\nconst putPrice = strikePrice * exp(-riskFreeRate * timeToExpiration) * normalCDF(-d2) - stockPrice * normalCDF(-d1)\n\n// Calculate Greeks\nconst callDelta = normalCDF(d1)\nconst putDelta = callDelta - 1\n\nconst gamma = exp(-d1^2 / 2) / (stockPrice * volatility * sqrt(timeToExpiration) * sqrt(2 * pi))\n\nconst callTheta = -(stockPrice * exp(-d1^2 / 2) * volatility) / (2 * sqrt(timeToExpiration) * sqrt(2 * pi)) - riskFreeRate * strikePrice * exp(-riskFreeRate * timeToExpiration) * normalCDF(d2)\nconst putTheta = -(stockPrice * exp(-d1^2 / 2) * volatility) / (2 * sqrt(timeToExpiration) * sqrt(2 * pi)) + riskFreeRate * strikePrice * exp(-riskFreeRate * timeToExpiration) * normalCDF(-d2)\n\nconst vega = stockPrice * sqrt(timeToExpiration) * exp(-d1^2 / 2) / sqrt(2 * pi)\n\nconst callRho = strikePrice * timeToExpiration * exp(-riskFreeRate * timeToExpiration) * normalCDF(d2)\nconst putRho = -strikePrice * timeToExpiration * exp(-riskFreeRate * timeToExpiration) * normalCDF(-d2)\n\n// Return results\nreturn {\n  callPrice: round(callPrice, 4),\n  putPrice: round(putPrice, 4),\n  greeks: {\n    call: {\n      delta: round(callDelta, 4),\n      gamma: round(gamma, 4),\n      theta: round(callTheta, 4),\n      vega: round(vega, 4),\n      rho: round(callRho, 4)\n    },\n    put: {\n      delta: round(putDelta, 4),\n      gamma: round(gamma, 4),\n      theta: round(putTheta, 4),\n      vega: round(vega, 4),\n      rho: round(putRho, 4)\n    }\n  },\n  parameters: {\n    stockPrice,\n    strikePrice,\n    timeToExpiration,\n    riskFreeRate,\n    volatility,\n    d1: round(d1, 4),\n    d2: round(d2, 4)\n  }\n}',
    '{
      "type": "object",
      "properties": {
        "stockPrice": {
          "type": "number",
          "title": "Stock Price (S)",
          "description": "Current price of the underlying stock",
          "minimum": 0.01,
          "default": 100
        },
        "strikePrice": {
          "type": "number",
          "title": "Strike Price (K)",
          "description": "Exercise price of the option",
          "minimum": 0.01,
          "default": 100
        },
        "timeToExpiration": {
          "type": "number",
          "title": "Time to Expiration (T)",
          "description": "Time until option expiration in years",
          "minimum": 0.001,
          "default": 1
        },
        "riskFreeRate": {
          "type": "number",
          "title": "Risk-Free Rate (r)",
          "description": "Annual risk-free interest rate (as decimal, e.g., 0.05 for 5%)",
          "minimum": 0,
          "default": 0.05
        },
        "volatility": {
          "type": "number",
          "title": "Volatility (σ)",
          "description": "Annualized volatility (as decimal, e.g., 0.20 for 20%)",
          "minimum": 0.01,
          "default": 0.20
        }
      },
      "required": ["stockPrice", "strikePrice", "timeToExpiration", "riskFreeRate", "volatility"]
    }',
    '{
      "type": "object",
      "properties": {
        "callPrice": {"type": "number", "description": "Theoretical call option price"},
        "putPrice": {"type": "number", "description": "Theoretical put option price"},
        "greeks": {
          "type": "object",
          "properties": {
            "call": {
              "type": "object",
              "properties": {
                "delta": {"type": "number"},
                "gamma": {"type": "number"},
                "theta": {"type": "number"},
                "vega": {"type": "number"},
                "rho": {"type": "number"}
              }
            },
            "put": {
              "type": "object",
              "properties": {
                "delta": {"type": "number"},
                "gamma": {"type": "number"},
                "theta": {"type": "number"},
                "vega": {"type": "number"},
                "rho": {"type": "number"}
              }
            }
          }
        },
        "parameters": {"type": "object"}
      }
    }',
    true
  );

  -- Increment published objects count for Jeffrey
  UPDATE researcher_profiles
  SET published_objects_count = published_objects_count + 1
  WHERE id = researcher_id;

  RAISE NOTICE 'Model created successfully with ID: %', model_id;
END $$;

COMMIT;
