#!/bin/bash

# Script to apply usage tracking to all remaining econ/housing/market endpoints

ENDPOINTS=(
  "src/app/api/econ/fred/series/route.ts"
  "src/app/api/econ/fred/search/route.ts"
  "src/app/api/econ/fred/state/route.ts"
  "src/app/api/econ/fred/overlay-map/route.ts"
  "src/app/api/econ/census/state/route.ts"
  "src/app/api/econ/census/county/route.ts"
  "src/app/api/econ/census/metro/route.ts"
  "src/app/api/econ/worldbank/indicator/route.ts"
  "src/app/api/econ/dashboard/us/route.ts"
  "src/app/api/econ/dashboard/state/route.ts"
  "src/app/api/econ/map/route.ts"
  "src/app/api/econ/map/state/route.ts"
  "src/app/api/housing/market/screener/route.ts"
  "src/app/api/market/quote/route.ts"
  "src/app/api/market/volatility/route.ts"
  "src/app/api/market/fundamentals/route.ts"
)

echo "Will apply usage tracking to ${#ENDPOINTS[@]} endpoints"
for file in "${ENDPOINTS[@]}"; do
  echo "  - $file"
done
