-- Run these queries in Supabase SQL Editor and paste the results back

-- 1. List all tables
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. List all functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 3. Get user_usage table structure (if exists)
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_usage'
ORDER BY ordinal_position;

-- 4. Get usage_logs table structure (if exists)
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'usage_logs'
ORDER BY ordinal_position;

-- 5. Test consume_usage function
SELECT * FROM consume_usage('derivatives', 'test-hash', 0);
