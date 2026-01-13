# MarketData Gateway Implementation Plan

## Problem
- Currently using Polygon/Massive Starter plan but getting "NOT_AUTHORIZED" errors
- Options Starter plan has different endpoint access than what's currently implemented
- Need production-grade architecture for scale

## Solution: MarketData Gateway Architecture

### Phase 1: Core Gateway (In Progress)
- ✅ Create normalized types (`types.ts`)
- ✅ Create cache interface (`cache/interface.ts`)
- ✅ Implement memory cache (`cache/memory-cache.ts`)
- ✅ Implement Redis cache (`cache/redis-cache.ts`)
- ✅ Create cache factory (`cache/index.ts`)
- ⏳ Create Massive.com provider (`providers/massive-provider.ts`)
- ⏳ Create Yahoo Finance fallback provider (`providers/yahoo-provider.ts`)
- ⏳ Create Gateway class with request coalescing (`gateway.ts`)

### Phase 2: API Routes
- Update `/api/derivatives/quote` to use gateway
- Update `/api/derivatives/expirations` to use gateway
- Update `/api/derivatives/chain` with windowing support
- Update `/api/derivatives/iron-condor` to use gateway

### Phase 3: SSE Streaming
- Create `/api/derivatives/stream` SSE endpoint
- Implement `useDerivativesStream` React hook
- Add heartbeat mechanism

### Phase 4: Rate Limiting & Safety
- Add per-IP rate limiting middleware
- Add request timeouts
- Add error boundaries

## Massive.com API Endpoints (Options Starter)

Based on the NOT_AUTHORIZED error, we need to identify which endpoints are available:

**Available (likely):**
- Options snapshot: `/v3/snapshot/options/{underlying}`
- Options contracts: `/v3/reference/options/contracts`
- Previous close: `/v2/aggs/ticker/{ticker}/prev`

**Not Available (got 401):**
- Last trade: `/v2/last/trade/{ticker}` ❌

## Next Steps

1. Test Massive.com endpoints to confirm what's available
2. Implement Massive provider with correct endpoints
3. Build gateway with coalescing
4. Wire up existing routes
5. Add SSE streaming
6. Add rate limiting

## Environment Variables Needed

```bash
# Cache
CACHE_DRIVER=memory  # or redis
REDIS_URL=          # Required if CACHE_DRIVER=redis

# Provider
MARKET_DATA_PROVIDER=massive  # or yahoo (fallback)
MASSIVE_BASE_URL=https://api.polygon.io
MASSIVE_API_KEY=your_key

# Rate Limiting (optional, Redis-based)
RATE_LIMIT_ENABLED=false
```

## File Structure

```
src/lib/market-data/
├── types.ts                    # Normalized types
├── gateway.ts                  # Main gateway class
├── cache/
│   ├── index.ts               # Factory
│   ├── interface.ts           # Interface
│   ├── memory-cache.ts        # Memory impl
│   └── redis-cache.ts         # Redis impl
└── providers/
    ├── massive-provider.ts    # Massive.com
    └── yahoo-provider.ts      # Yahoo fallback

src/app/api/derivatives/
├── quote/route.ts             # Updated to use gateway
├── expirations/route.ts       # Updated to use gateway
├── chain/route.ts             # Updated with windowing
└── stream/route.ts            # NEW: SSE endpoint

src/hooks/
└── useDerivativesStream.ts    # NEW: SSE React hook
```
