# Remaining Endpoints to Add Usage Tracking

Apply the following usage tracking pattern to each endpoint:

## Pattern to Apply

```typescript
// Add imports at top
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

// Add AFTER parameter validation, BEFORE external API calls
// Usage tracking
const supabase = await supabaseServer();
const { data: auth } = await supabase.auth.getUser();
if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

const ipHash = hashIp(getClientIp(req));
const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
  p_product: "PRODUCT_NAME",  // "econ", "housing", or "econ"
  p_ip_hash: ipHash,
  p_cost: COST_NUMBER,  // 1-5 depending on endpoint
});

if (usageError) return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
if (!usage?.allowed) {
  return NextResponse.json({ error: "usage_limit_exceeded", remainingProduct: usage?.remainingProduct ?? 0, paid: usage?.paid ?? false }, { status: 402 });
}
```

## Endpoints Remaining

### FRED (3 more)
- [ ] `src/app/api/econ/fred/search/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/econ/fred/state/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/econ/fred/overlay-map/route.ts` - product: "econ", cost: 1

### Census (3)
- [ ] `src/app/api/econ/census/state/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/econ/census/county/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/econ/census/metro/route.ts` - product: "econ", cost: 1

### Other Econ (5)
- [ ] `src/app/api/econ/worldbank/indicator/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/econ/dashboard/us/route.ts` - product: "econ", cost: 2
- [ ] `src/app/api/econ/dashboard/state/route.ts` - product: "econ", cost: 2
- [ ] `src/app/api/econ/map/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/econ/map/state/route.ts` - product: "econ", cost: 1

### Housing (1)
- [ ] `src/app/api/housing/market/screener/route.ts` - product: "housing", cost: 5

### Market (3)
- [ ] `src/app/api/market/quote/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/market/volatility/route.ts` - product: "econ", cost: 1
- [ ] `src/app/api/market/fundamentals/route.ts` - product: "econ", cost: 1

## Total: 15 endpoints

## Cost Guidelines
- Simple data fetches: 1 credit
- Dashboards (multiple API calls): 2 credits
- Options chain: 3 credits
- Iron condor analysis: 5 credits
- Housing screener (200+ API calls): 5 credits
