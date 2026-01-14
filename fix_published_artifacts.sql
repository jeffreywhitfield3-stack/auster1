-- Fix published_artifacts table to match API expectations
-- Run this after running the main schema file

-- Drop the old table if it exists
DROP TABLE IF EXISTS public.published_artifacts CASCADE;

-- Create the correct version
CREATE TABLE public.published_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES public.model_versions(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES public.model_runs(id) ON DELETE CASCADE,

  -- Slug for URL
  slug TEXT NOT NULL UNIQUE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,

  -- Snapshot of inputs/outputs
  inputs_json JSONB NOT NULL,
  outputs_json JSONB NOT NULL,

  -- Visibility
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'unlisted', 'public')),

  -- Stats
  views INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_published_artifacts_slug ON public.published_artifacts(slug);
CREATE INDEX idx_published_artifacts_user ON public.published_artifacts(user_id);
CREATE INDEX idx_published_artifacts_model ON public.published_artifacts(model_id);
CREATE INDEX idx_published_artifacts_created ON public.published_artifacts(created_at DESC);

-- RLS Policies
ALTER TABLE public.published_artifacts ENABLE ROW LEVEL SECURITY;

-- Anyone can view public artifacts
CREATE POLICY "Public artifacts are viewable by everyone"
  ON public.published_artifacts
  FOR SELECT
  USING (visibility = 'public');

-- Users can view their own artifacts regardless of visibility
CREATE POLICY "Users can view their own artifacts"
  ON public.published_artifacts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create artifacts
CREATE POLICY "Users can create artifacts"
  ON public.published_artifacts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own artifacts
CREATE POLICY "Users can update their own artifacts"
  ON public.published_artifacts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own artifacts
CREATE POLICY "Users can delete their own artifacts"
  ON public.published_artifacts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_published_artifacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_published_artifacts_updated_at
  BEFORE UPDATE ON public.published_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_published_artifacts_updated_at();
