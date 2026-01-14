-- Add saved_models table to allow users to bookmark models
CREATE TABLE IF NOT EXISTS saved_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, model_id)
);

-- Add RLS policies
ALTER TABLE saved_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved models"
  ON saved_models
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save models"
  ON saved_models
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their saved models"
  ON saved_models
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved models"
  ON saved_models
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_saved_models_user_id ON saved_models(user_id);
CREATE INDEX idx_saved_models_model_id ON saved_models(model_id);
CREATE INDEX idx_saved_models_created_at ON saved_models(created_at DESC);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_saved_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_models_updated_at
  BEFORE UPDATE ON saved_models
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_models_updated_at();

-- Add saved_count to models table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'models'
                 AND column_name = 'saved_count') THEN
    ALTER TABLE models ADD COLUMN saved_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create function to increment saved_count
CREATE OR REPLACE FUNCTION increment_model_saved_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE models
  SET saved_count = saved_count + 1
  WHERE id = NEW.model_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement saved_count
CREATE OR REPLACE FUNCTION decrement_model_saved_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE models
  SET saved_count = GREATEST(0, saved_count - 1)
  WHERE id = OLD.model_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for saved_count
CREATE TRIGGER increment_saved_count_on_save
  AFTER INSERT ON saved_models
  FOR EACH ROW
  EXECUTE FUNCTION increment_model_saved_count();

CREATE TRIGGER decrement_saved_count_on_unsave
  AFTER DELETE ON saved_models
  FOR EACH ROW
  EXECUTE FUNCTION decrement_model_saved_count();
