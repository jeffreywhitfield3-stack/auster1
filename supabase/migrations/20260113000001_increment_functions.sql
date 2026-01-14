-- Helper functions for incrementing counters atomically

-- Increment published_objects_count for a researcher
CREATE OR REPLACE FUNCTION increment_published_count(researcher_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE researcher_profiles
  SET published_objects_count = published_objects_count + 1
  WHERE id = researcher_id;
END;
$$ LANGUAGE plpgsql;

-- Increment discussions_count for a research object
CREATE OR REPLACE FUNCTION increment_discussion_count(research_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE research_objects
  SET discussions_count = discussions_count + 1
  WHERE id = research_id;
END;
$$ LANGUAGE plpgsql;

-- Increment discussions_count for a researcher
CREATE OR REPLACE FUNCTION increment_researcher_discussion_count(researcher_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE researcher_profiles
  SET discussions_count = discussions_count + 1
  WHERE id = researcher_id;
END;
$$ LANGUAGE plpgsql;
