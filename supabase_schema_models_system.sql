-- ============================================
-- MODELS SYSTEM - DATABASE SCHEMA
-- Auster Analytics Platform
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. MODELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  lab_scope TEXT NOT NULL CHECK (lab_scope IN ('econ', 'derivatives', 'both')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'unlisted', 'public')),
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'basic' CHECK (difficulty IN ('basic', 'intermediate', 'advanced')),
  is_template BOOLEAN DEFAULT FALSE,

  -- Stats (denormalized for performance)
  total_runs INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_rating DECIMAL(3,2),
  total_ratings INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_models_lab_scope ON public.models(lab_scope);
CREATE INDEX IF NOT EXISTS idx_models_visibility ON public.models(visibility);
CREATE INDEX IF NOT EXISTS idx_models_tags ON public.models USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_models_created ON public.models(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_models_slug ON public.models(slug);
CREATE INDEX IF NOT EXISTS idx_models_owner ON public.models(owner_id);

-- RLS
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view public models
CREATE POLICY "Public models visible to all"
  ON public.models FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid());

-- Policy: Owners can manage their own models
CREATE POLICY "Owners can insert their models"
  ON public.models FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their models"
  ON public.models FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their models"
  ON public.models FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- 2. MODEL VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  runtime TEXT NOT NULL DEFAULT 'dsl' CHECK (runtime IN ('dsl', 'python', 'js')),

  -- DSL definition (Phase 1)
  dsl_json JSONB,

  -- Code for Phase 3
  code_bundle TEXT,
  dependencies TEXT[],

  -- Schemas
  input_schema JSONB NOT NULL,
  output_schema JSONB NOT NULL,

  -- Metadata
  changelog TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(model_id, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_versions_model ON public.model_versions(model_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_model_versions_runtime ON public.model_versions(runtime);

-- RLS
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view versions of public models
CREATE POLICY "Model versions visible if model visible"
  ON public.model_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = model_versions.model_id
      AND (models.visibility = 'public' OR models.owner_id = auth.uid())
    )
  );

-- Policy: Owners can manage versions
CREATE POLICY "Owners can insert model versions"
  ON public.model_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = model_versions.model_id
      AND models.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update model versions"
  ON public.model_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = model_versions.model_id
      AND models.owner_id = auth.uid()
    )
  );

-- ============================================
-- 3. MODEL RUNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES public.model_versions(id) ON DELETE CASCADE,

  -- Run data
  inputs_json JSONB NOT NULL,
  outputs_json JSONB,

  -- Execution metadata
  runtime_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT,

  -- Usage tracking
  ip_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_runs_user ON public.model_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_runs_version ON public.model_runs(model_version_id);
CREATE INDEX IF NOT EXISTS idx_model_runs_created ON public.model_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_runs_status ON public.model_runs(status);

-- RLS
ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own runs
CREATE POLICY "Users can view their own runs"
  ON public.model_runs FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert runs (via API only, but grant permission)
CREATE POLICY "Users can create runs"
  ON public.model_runs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. MODEL USAGE DAILY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  runs INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,

  UNIQUE(model_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_usage_model_date ON public.model_usage_daily(model_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_date ON public.model_usage_daily(date DESC);

-- RLS (read-only stats)
ALTER TABLE public.model_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view usage stats"
  ON public.model_usage_daily FOR SELECT
  USING (true);

-- ============================================
-- 5. MODEL SAVES TABLE (Bookmarks)
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, model_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_saves_user ON public.model_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_model_saves_model ON public.model_saves(model_id);

-- RLS
ALTER TABLE public.model_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saves"
  ON public.model_saves FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can save models"
  ON public.model_saves FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsave models"
  ON public.model_saves FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 6. MODEL RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, model_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_model_ratings_model ON public.model_ratings(model_id);
CREATE INDEX IF NOT EXISTS idx_model_ratings_user ON public.model_ratings(user_id);

-- RLS
ALTER TABLE public.model_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings for public models
CREATE POLICY "Ratings visible for public models"
  ON public.model_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = model_ratings.model_id
      AND models.visibility = 'public'
    )
  );

CREATE POLICY "Users can rate models"
  ON public.model_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their ratings"
  ON public.model_ratings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their ratings"
  ON public.model_ratings FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 7. PUBLISHED ARTIFACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.published_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('model_run', 'research_object')),

  -- References
  model_run_id UUID REFERENCES public.model_runs(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  summary TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('unlisted', 'public')),

  -- Stats
  views INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_published_artifacts_slug ON public.published_artifacts(slug);
CREATE INDEX IF NOT EXISTS idx_published_artifacts_owner ON public.published_artifacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_published_artifacts_type ON public.published_artifacts(type);
CREATE INDEX IF NOT EXISTS idx_published_artifacts_created ON public.published_artifacts(created_at DESC);

-- RLS
ALTER TABLE public.published_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public artifacts visible to all"
  ON public.published_artifacts FOR SELECT
  USING (visibility = 'public' OR owner_id = auth.uid());

CREATE POLICY "Owners can publish artifacts"
  ON public.published_artifacts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their artifacts"
  ON public.published_artifacts FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their artifacts"
  ON public.published_artifacts FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function: Update model stats after new run
CREATE OR REPLACE FUNCTION update_model_stats_after_run()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total runs
  UPDATE public.models
  SET total_runs = total_runs + 1,
      updated_at = NOW()
  WHERE id = (
    SELECT model_id FROM public.model_versions
    WHERE id = NEW.model_version_id
  );

  -- Update daily stats
  INSERT INTO public.model_usage_daily (model_id, date, runs, unique_users)
  VALUES (
    (SELECT model_id FROM public.model_versions WHERE id = NEW.model_version_id),
    CURRENT_DATE,
    1,
    1
  )
  ON CONFLICT (model_id, date)
  DO UPDATE SET
    runs = model_usage_daily.runs + 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After model run insert
DROP TRIGGER IF EXISTS trigger_update_model_stats ON public.model_runs;
CREATE TRIGGER trigger_update_model_stats
  AFTER INSERT ON public.model_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_model_stats_after_run();

-- Function: Update average rating after rating insert/update/delete
CREATE OR REPLACE FUNCTION update_model_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.models
  SET
    avg_rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.model_ratings
      WHERE model_id = COALESCE(NEW.model_id, OLD.model_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.model_ratings
      WHERE model_id = COALESCE(NEW.model_id, OLD.model_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.model_id, OLD.model_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: After rating insert/update/delete
DROP TRIGGER IF EXISTS trigger_update_rating_stats_insert ON public.model_ratings;
CREATE TRIGGER trigger_update_rating_stats_insert
  AFTER INSERT OR UPDATE OR DELETE ON public.model_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_model_rating_stats();

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function: Get trending models (last 7 days)
CREATE OR REPLACE FUNCTION get_trending_models(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  model_id UUID,
  recent_runs INTEGER,
  trend_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as model_id,
    COALESCE(SUM(usage.runs), 0)::INTEGER as recent_runs,
    (COALESCE(SUM(usage.runs), 0) *
     (1 + COALESCE(m.avg_rating, 3) / 5.0))::DECIMAL as trend_score
  FROM public.models m
  LEFT JOIN public.model_usage_daily usage
    ON m.id = usage.model_id
    AND usage.date >= CURRENT_DATE - days_back
  WHERE m.visibility = 'public'
  GROUP BY m.id
  ORDER BY trend_score DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'model%'
ORDER BY table_name;

-- Verify indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_model%'
ORDER BY tablename, indexname;

-- Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'model%';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Models System schema installed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - models (core model registry)';
  RAISE NOTICE '  - model_versions (version history)';
  RAISE NOTICE '  - model_runs (execution audit log)';
  RAISE NOTICE '  - model_usage_daily (aggregated stats)';
  RAISE NOTICE '  - model_saves (user bookmarks)';
  RAISE NOTICE '  - model_ratings (reviews)';
  RAISE NOTICE '  - published_artifacts (shareable outputs)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run seed models script: npm run seed:models';
  RAISE NOTICE '  2. Deploy API routes';
  RAISE NOTICE '  3. Add Models tabs to Econ & Derivatives labs';
END $$;
