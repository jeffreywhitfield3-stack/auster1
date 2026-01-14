# Usage Limit Redirect Implementation

## Problem
When users run out of free uses, the raw error "usage_limit_exceeded" displays on screen, which looks unprofessional.

## Solution
Created `/usage-limit` page that explains the situation professionally and provides clear CTAs.

## Frontend Integration

Any component that makes API calls should check for 402 status and redirect to `/usage-limit`:

```typescript
try {
  const response = await fetch('/api/derivatives/quote?symbol=SPY');

  if (response.status === 402) {
    // Usage limit exceeded
    window.location.href = '/usage-limit';
    return;
  }

  if (!response.ok) {
    throw new Error('API request failed');
  }

  const data = await response.json();
  // ... handle data
} catch (error) {
  console.error('Error:', error);
  setError('Failed to fetch data');
}
```

## Files That Need Updates

Components that make API calls should handle 402 status:

1. **Derivatives Lab Components:**
   - src/app/(protected)/products/derivatives/DerivativesLabClient.tsx
   - Any component fetching quotes, chains, expirations

2. **Econ Lab Components:**
   - src/app/(protected)/products/econ/EconLabClient.tsx
   - Any component fetching FRED data, Census data, etc.

3. **General Pattern:**
   ```typescript
   // Add after fetch()
   if (!response.ok) {
     if (response.status === 402) {
       window.location.href = '/usage-limit';
       return;
     }
     throw new Error(`API error: ${response.status}`);
   }
   ```

## Page Created
- `/src/app/usage-limit/page.tsx` - Professional upgrade page with:
  - Clear explanation
  - Benefits list
  - CTA to pricing page
  - Link to support
  - Link back to home

## Next Steps
1. Search for all `fetch` calls in lab clients
2. Add 402 status check before error handling
3. Redirect to `/usage-limit` on 402
4. Test by temporarily lowering usage limits
