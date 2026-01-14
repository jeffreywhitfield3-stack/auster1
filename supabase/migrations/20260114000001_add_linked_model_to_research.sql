-- Add linked_model_id to research_objects to connect research with models
ALTER TABLE research_objects
ADD COLUMN IF NOT EXISTS linked_model_id UUID REFERENCES models(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_research_objects_linked_model_id
  ON research_objects(linked_model_id);

-- Add view_count to research_objects if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'research_objects'
                 AND column_name = 'view_count') THEN
    ALTER TABLE research_objects ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
