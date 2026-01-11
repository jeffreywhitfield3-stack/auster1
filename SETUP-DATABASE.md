# Auster Database Setup Guide

## Problem Identified

Your usage tracking code is in place, but the **database schema doesn't exist yet**. That's why:
- Step 2 returned data without authentication (no usage check happened)
- Step 6 failed with "relation 'usage_logs' does not exist"

## Solution: Install the Database Schema

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: **vnivhesouldxmfetbelw** (from your cookie)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the Schema

1. Open the file: `supabase-schema.sql` (in this directory)
2. Copy **ALL** the SQL code
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

**Expected output:**
```
Success. 5 rows returned.

table_name
------------------
stripe_customers
stripe_subscriptions
usage_logs
user_entitlements
user_usage
```

### Step 3: Verify Tables Were Created

Run this query in SQL Editor:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_usage',
    'usage_logs',
    'stripe_customers',
    'stripe_subscriptions',
    'user_entitlements'
  )
ORDER BY table_name;
```

You should see all 5 tables listed.

### Step 4: Test the RPC Function

Run this to test the `consume_usage` function:

```sql
-- Test peek (cost=0, just checks usage)
SELECT * FROM consume_usage('derivatives', 'test-ip-hash', 0);
```

**Expected output (for new user):**
```json
{
  "allowed": true,
  "reason": "success",
  "remainingProduct": 10,
  "remainingTotal": 50,
  "usedProduct": 0,
  "usedTotal": 0,
  "paid": false
}
```

### Step 5: Test Usage Consumption

```sql
-- Consume 1 credit
SELECT * FROM consume_usage('derivatives', 'test-ip-hash', 1);

-- Check usage was recorded
SELECT * FROM user_usage WHERE user_id = auth.uid();

-- Check logs
SELECT * FROM usage_logs WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 5;
```

---

## What This Schema Includes

### 📊 **Tables Created:**

1. **`user_usage`** - Tracks current usage per product
   - Free tier: 10 calls per product, 50 total
   - Tracks: `used_product`, `used_total`, limits

2. **`usage_logs`** - Audit log of all API calls
   - Records every usage attempt (allowed or denied)
   - Includes: `product`, `cost`, `ip_hash`, `allowed`, timestamp

3. **`stripe_customers`** - Maps users to Stripe customer IDs

4. **`stripe_subscriptions`** - Active subscriptions (SOURCE OF TRUTH)
   - Status: active, trialing, canceled, past_due, etc.
   - Billing cycle info

5. **`user_entitlements`** - Legacy/manual entitlements (fallback)

### 🔒 **Security (RLS Policies):**

- ✅ Users can only read their own data
- ✅ All tables have Row Level Security enabled
- ✅ RPC function uses `auth.uid()` to enforce user isolation

### ⚡ **Functions Created:**

1. **`consume_usage(product, ip_hash, cost)`**
   - Returns: `{ allowed, remainingProduct, remainingTotal, paid }`
   - Paid users: unlimited (always returns `allowed: true`)
   - Free users: enforces limits, logs usage

2. **`reset_user_usage(user_id, product)`**
   - Admin function to reset usage (for testing)

### 📈 **Views Created:**

1. **`entitlements`** - Easy paid status checking
   - Computed from `stripe_subscriptions`
   - Returns: `is_paid`, `plan`, `status`

---

## After Installing Schema

### ✅ **Re-run Your Tests:**

```bash
# Start dev server if not running
npm run dev

# Test unauthenticated (should return 401)
curl http://localhost:3000/api/derivatives/quote?symbol=SPY

# Test authenticated (should return data + consume usage)
export AUTH_COOKIE="sb-vnivhesouldxmfetbelw-auth-token=YOUR_TOKEN_HERE"
curl "http://localhost:3000/api/derivatives/quote?symbol=SPY" -H "Cookie: $AUTH_COOKIE"

# Check remaining usage
curl "http://localhost:3000/api/usage/peek?product=derivatives" -H "Cookie: $AUTH_COOKIE"
```

### 📊 **Check Database:**

In Supabase SQL Editor:

```sql
-- See your current usage
SELECT * FROM user_usage WHERE user_id = auth.uid();

-- See usage logs
SELECT
  product,
  cost,
  allowed,
  created_at
FROM usage_logs
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Check if you're a paid user
SELECT * FROM entitlements WHERE user_id = auth.uid();
```

---

## Default Limits (Free Tier)

| Limit Type | Default Value | Can Override? |
|------------|---------------|---------------|
| Per Product | 10 calls | ✅ Yes (in `user_usage` table) |
| Total (all products) | 50 calls | ✅ Yes (in `user_usage` table) |
| Paid Users | Unlimited | Automatic via Stripe subscription |

---

## Testing Paid User Flow

To test unlimited access:

1. **Option A: Mock a subscription** (fastest for testing)

```sql
-- Insert fake Stripe subscription for your user
INSERT INTO stripe_subscriptions (
  user_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  price_id,
  current_period_end
)
VALUES (
  auth.uid(),
  'sub_test_123',
  'cus_test_123',
  'active',
  'price_test_pro_monthly',
  now() + interval '30 days'
);

-- Verify you're now "paid"
SELECT * FROM entitlements WHERE user_id = auth.uid();
```

2. **Option B: Use real Stripe checkout**
   - Go to `/pricing` on your app
   - Complete checkout (use Stripe test mode)
   - Webhook will auto-sync subscription

---

## Troubleshooting

### ❌ "permission denied for function consume_usage"

**Fix:** Run this in SQL Editor:
```sql
GRANT EXECUTE ON FUNCTION public.consume_usage TO authenticated;
```

### ❌ "relation does not exist"

**Fix:** Make sure you ran the entire `supabase-schema.sql` file

### ❌ Usage not being consumed

**Check:**
```sql
-- Is the function working?
SELECT * FROM consume_usage('test', 'test-hash', 1);

-- Are logs being created?
SELECT count(*) FROM usage_logs WHERE user_id = auth.uid();
```

### 🔄 Reset Usage (for testing)

```sql
-- Reset all products
UPDATE user_usage SET used_product = 0, used_total = 0 WHERE user_id = auth.uid();

-- Reset specific product
UPDATE user_usage SET used_product = 0, used_total = 0
WHERE user_id = auth.uid() AND product = 'derivatives';
```

---

## Next Steps After Schema is Installed

1. ✅ Verify the schema works with test queries above
2. ✅ Test the `/api/derivatives/quote` endpoint again
3. ✅ Confirm usage is being tracked in `usage_logs`
4. ✅ Test hitting the free tier limit (10 calls)
5. ✅ Test paid user flow (unlimited access)
6. 🚀 Apply usage tracking to remaining 20 endpoints

---

**Ready?** Go run `supabase-schema.sql` in your Supabase SQL Editor now! 🚀
