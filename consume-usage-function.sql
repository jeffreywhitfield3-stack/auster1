-- Create consume_usage RPC function to work with your existing schema
-- This uses daily-based limits that reset each day

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
  v_today DATE := CURRENT_DATE;

  -- Current usage
  v_product_count INTEGER := 0;
  v_total_count INTEGER := 0;
  v_ip_count INTEGER := 0;

  -- Limits
  v_product_limit INTEGER := 10;  -- default
  v_total_limit INTEGER := 50;    -- default
  v_ip_limit INTEGER := 100;      -- default

  -- Results
  v_allowed BOOLEAN := false;
  v_remaining_product INTEGER := 0;
  v_remaining_total INTEGER := 0;
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

  -- Check if user is paid (from stripe_subscriptions)
  SELECT EXISTS(
    SELECT 1
    FROM public.stripe_subscriptions
    WHERE user_id = v_user_id
      AND status IN ('active', 'trialing')
  ) INTO v_is_paid;

  -- PAID USERS: Unlimited access
  IF v_is_paid THEN
    -- Still track usage for analytics (optional)
    IF p_cost > 0 THEN
      -- Update daily product counter
      INSERT INTO public.usage_daily_product (user_id, day, product, count)
      VALUES (v_user_id, v_today, p_product, p_cost)
      ON CONFLICT (user_id, day, product)
      DO UPDATE SET
        count = usage_daily_product.count + p_cost,
        updated_at = now();

      -- Update daily total counter
      INSERT INTO public.usage_daily_total (user_id, day, count)
      VALUES (v_user_id, v_today, p_cost)
      ON CONFLICT (user_id, day)
      DO UPDATE SET
        count = usage_daily_total.count + p_cost,
        updated_at = now();
    END IF;

    RETURN json_build_object(
      'allowed', true,
      'reason', 'paid_unlimited',
      'remainingProduct', 999999,
      'remainingTotal', 999999,
      'paid', true
    );
  END IF;

  -- FREE USERS: Check limits

  -- Get configured limits for this product
  SELECT
    free_daily_product_limit,
    free_daily_total_limit,
    ip_daily_total_limit
  INTO
    v_product_limit,
    v_total_limit,
    v_ip_limit
  FROM public.usage_limits
  WHERE product = p_product;

  -- Use defaults if no limits configured
  v_product_limit := COALESCE(v_product_limit, 10);
  v_total_limit := COALESCE(v_total_limit, 50);
  v_ip_limit := COALESCE(v_ip_limit, 100);

  -- Get current usage for today
  SELECT COALESCE(count, 0)
  INTO v_product_count
  FROM public.usage_daily_product
  WHERE user_id = v_user_id
    AND day = v_today
    AND product = p_product;

  SELECT COALESCE(count, 0)
  INTO v_total_count
  FROM public.usage_daily_total
  WHERE user_id = v_user_id
    AND day = v_today;

  SELECT COALESCE(count, 0)
  INTO v_ip_count
  FROM public.usage_ip_daily
  WHERE ip_hash = p_ip_hash
    AND day = v_today;

  -- Calculate remaining
  v_remaining_product := GREATEST(0, v_product_limit - v_product_count);
  v_remaining_total := GREATEST(0, v_total_limit - v_total_count);

  -- Check all limits
  IF v_product_count + p_cost <= v_product_limit
     AND v_total_count + p_cost <= v_total_limit
     AND v_ip_count + p_cost <= v_ip_limit
  THEN
    v_allowed := true;

    -- Only consume if p_cost > 0 (peek = 0 cost)
    IF p_cost > 0 THEN
      -- Update product counter
      INSERT INTO public.usage_daily_product (user_id, day, product, count)
      VALUES (v_user_id, v_today, p_product, p_cost)
      ON CONFLICT (user_id, day, product)
      DO UPDATE SET
        count = usage_daily_product.count + p_cost,
        updated_at = now();

      -- Update total counter
      INSERT INTO public.usage_daily_total (user_id, day, count)
      VALUES (v_user_id, v_today, p_cost)
      ON CONFLICT (user_id, day)
      DO UPDATE SET
        count = usage_daily_total.count + p_cost,
        updated_at = now();

      -- Update IP counter
      INSERT INTO public.usage_ip_daily (ip_hash, day, count)
      VALUES (p_ip_hash, v_today, p_cost)
      ON CONFLICT (ip_hash, day)
      DO UPDATE SET
        count = usage_ip_daily.count + p_cost,
        updated_at = now();

      -- Recalculate remaining after consumption
      v_remaining_product := GREATEST(0, v_product_limit - (v_product_count + p_cost));
      v_remaining_total := GREATEST(0, v_total_limit - (v_total_count + p_cost));
    END IF;
  ELSE
    v_allowed := false;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'remainingProduct', v_remaining_product,
    'remainingTotal', v_remaining_total,
    'usedProduct', v_product_count + CASE WHEN v_allowed AND p_cost > 0 THEN p_cost ELSE 0 END,
    'usedTotal', v_total_count + CASE WHEN v_allowed AND p_cost > 0 THEN p_cost ELSE 0 END,
    'paid', false,
    'reason', CASE
      WHEN v_allowed THEN 'success'
      WHEN v_ip_count + p_cost > v_ip_limit THEN 'ip_limit_exceeded'
      WHEN v_total_count + p_cost > v_total_limit THEN 'total_limit_exceeded'
      WHEN v_product_count + p_cost > v_product_limit THEN 'product_limit_exceeded'
      ELSE 'limit_exceeded'
    END
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.consume_usage TO authenticated;

-- Insert default limits if they don't exist
INSERT INTO public.usage_limits (product, free_daily_product_limit, free_daily_total_limit, ip_daily_total_limit)
VALUES
  ('derivatives', 10, 50, 100),
  ('econ', 20, 50, 100),
  ('housing', 5, 50, 100)
ON CONFLICT (product) DO NOTHING;

-- Test the function
SELECT * FROM consume_usage('derivatives', 'test-hash-123', 0);
