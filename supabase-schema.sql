-- Auster Analytics Platform - Complete Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. USAGE TRACKING TABLES
-- ============================================

-- Table: user_usage
-- Tracks current usage limits and consumption per product per user
CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL CHECK (length(product) BETWEEN 1 AND 64),

  -- Limits
  limit_product INTEGER NOT NULL DEFAULT 10,  -- Free tier limit per product
  limit_total INTEGER NOT NULL DEFAULT 50,    -- Free tier total limit across all products

  -- Current usage
  used_product INTEGER NOT NULL DEFAULT 0,
  used_total INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reset_at TIMESTAMPTZ,  -- When usage was last reset (for monthly cycles)

  UNIQUE(user_id, product)
);

-- Enable RLS
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own usage
CREATE POLICY "Users can read own usage"
  ON public.user_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_usage_user_product
  ON public.user_usage(user_id, product);

-- ============================================
-- Table: usage_logs
-- Audit log of all usage consumption events
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  cost INTEGER NOT NULL DEFAULT 1,
  ip_hash TEXT,  -- Hashed IP for multi-user account tracking
  allowed BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own logs
CREATE POLICY "Users can read own logs"
  ON public.usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
  ON public.usage_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_product
  ON public.usage_logs(product, created_at DESC);

-- ============================================
-- 2. STRIPE BILLING TABLES
-- ============================================

-- Table: stripe_customers
-- Maps Supabase users to Stripe customer IDs
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can read own stripe customer"
  ON public.stripe_customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user
  ON public.stripe_customers(user_id);

-- ============================================
-- Table: stripe_subscriptions
-- Stores active Stripe subscriptions (SOURCE OF TRUTH for paid status)
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,

  -- Subscription details
  status TEXT NOT NULL,  -- active, trialing, canceled, past_due, etc.
  price_id TEXT,  -- STRIPE_PRICE_PRO_MONTHLY or STRIPE_PRICE_PRO_ANNUAL

  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can read own subscriptions"
  ON public.stripe_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user
  ON public.stripe_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status
  ON public.stripe_subscriptions(status);

-- ============================================
-- Table: user_entitlements (FALLBACK)
-- Legacy/manual entitlements table
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'paid', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can read own entitlements"
  ON public.user_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_entitlements_user
  ON public.user_entitlements(user_id);

-- ============================================
-- View: entitlements
-- Computed view for easy paid status checking
CREATE OR REPLACE VIEW public.entitlements AS
SELECT
  ss.user_id,
  CASE
    WHEN ss.status IN ('active', 'trialing') THEN true
    ELSE false
  END AS is_paid,
  ss.status,
  ss.price_id,
  ss.current_period_end,
  ss.cancel_at_period_end,
  CASE
    WHEN ss.status IN ('active', 'trialing') THEN 'pro'
    ELSE 'free'
  END AS plan
FROM public.stripe_subscriptions ss
WHERE ss.status IN ('active', 'trialing', 'past_due');

-- ============================================
-- 3. RPC FUNCTION: consume_usage
-- ============================================

CREATE OR REPLACE FUNCTION public.consume_usage(
  p_product TEXT,
  p_ip_hash TEXT,
  p_cost INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_paid BOOLEAN := false;
  v_usage RECORD;
  v_allowed BOOLEAN := false;
  v_remaining_product INTEGER := 0;
  v_remaining_total INTEGER := 0;
  v_used_product INTEGER := 0;
  v_used_total INTEGER := 0;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'not_authenticated',
      'remainingProduct', 0,
      'remainingTotal', 0,
      'paid', false
    );
  END IF;

  -- Check if user is paid (from stripe_subscriptions - SOURCE OF TRUTH)
  SELECT EXISTS(
    SELECT 1
    FROM public.stripe_subscriptions
    WHERE user_id = v_user_id
      AND status IN ('active', 'trialing')
  ) INTO v_is_paid;

  -- If paid, always allow unlimited usage
  IF v_is_paid THEN
    -- Log the usage even for paid users (for analytics)
    IF p_cost > 0 THEN
      INSERT INTO public.usage_logs (user_id, product, cost, ip_hash, allowed)
      VALUES (v_user_id, p_product, p_cost, p_ip_hash, true);
    END IF;

    RETURN json_build_object(
      'allowed', true,
      'reason', 'paid_unlimited',
      'remainingProduct', 999999,
      'remainingTotal', 999999,
      'paid', true
    );
  END IF;

  -- FREE USER: Check/create usage record
  SELECT * INTO v_usage
  FROM public.user_usage
  WHERE user_id = v_user_id AND product = p_product;

  -- Create usage record if doesn't exist (first time using this product)
  IF NOT FOUND THEN
    INSERT INTO public.user_usage (user_id, product, used_product, used_total)
    VALUES (v_user_id, p_product, 0, 0)
    RETURNING * INTO v_usage;
  END IF;

  v_used_product := v_usage.used_product;
  v_used_total := v_usage.used_total;

  -- Calculate remaining
  v_remaining_product := GREATEST(0, v_usage.limit_product - v_used_product);
  v_remaining_total := GREATEST(0, v_usage.limit_total - v_used_total);

  -- Check if usage allowed
  IF v_remaining_product >= p_cost AND v_remaining_total >= p_cost THEN
    v_allowed := true;

    -- Only consume if p_cost > 0 (cost=0 means peek/check only)
    IF p_cost > 0 THEN
      UPDATE public.user_usage
      SET
        used_product = used_product + p_cost,
        used_total = used_total + p_cost,
        updated_at = now()
      WHERE user_id = v_user_id AND product = p_product;

      -- Update local variables for response
      v_used_product := v_used_product + p_cost;
      v_used_total := v_used_total + p_cost;
      v_remaining_product := GREATEST(0, v_usage.limit_product - v_used_product);
      v_remaining_total := GREATEST(0, v_usage.limit_total - v_used_total);
    END IF;
  ELSE
    v_allowed := false;
  END IF;

  -- Log the attempt (always, even if denied)
  IF p_cost > 0 THEN
    INSERT INTO public.usage_logs (user_id, product, cost, ip_hash, allowed)
    VALUES (v_user_id, p_product, p_cost, p_ip_hash, v_allowed);
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'remainingProduct', v_remaining_product,
    'remainingTotal', v_remaining_total,
    'usedProduct', v_used_product,
    'usedTotal', v_used_total,
    'paid', false,
    'reason', CASE
      WHEN v_allowed THEN 'success'
      ELSE 'limit_exceeded'
    END
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.consume_usage TO authenticated;

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function to reset usage (for testing or monthly resets)
CREATE OR REPLACE FUNCTION public.reset_user_usage(p_user_id UUID, p_product TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_product IS NULL THEN
    -- Reset all products for user
    UPDATE public.user_usage
    SET
      used_product = 0,
      used_total = 0,
      reset_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    -- Reset specific product
    UPDATE public.user_usage
    SET
      used_product = 0,
      used_total = 0,
      reset_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id AND product = p_product;
  END IF;
END;
$$;

-- Grant execute to service role only (admin function)
GRANT EXECUTE ON FUNCTION public.reset_user_usage TO service_role;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON public.user_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_stripe_customers_updated_at
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- DONE! Schema created successfully.
-- ============================================

-- Quick test query to verify tables exist:
SELECT
  table_name
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
