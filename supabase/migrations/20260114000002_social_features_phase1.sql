-- =====================================================
-- PHASE 1: SOCIAL FEATURES MIGRATION
-- User profiles, comments, notifications, follows
-- =====================================================

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  website_url TEXT,
  twitter_handle TEXT,
  linkedin_url TEXT,
  github_handle TEXT,
  location TEXT,
  is_public BOOLEAN DEFAULT true,
  show_activity BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$'),
  CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);

-- Index for username lookups
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view public profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON user_profiles FOR SELECT
  USING (is_public = true);

-- Users can view their own profile even if private
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 2. MODEL COMMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS model_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES model_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT content_not_empty CHECK (char_length(trim(content)) > 0),
  CONSTRAINT content_length CHECK (char_length(content) <= 2000)
);

-- Indexes for comment queries
CREATE INDEX idx_model_comments_model_id ON model_comments(model_id);
CREATE INDEX idx_model_comments_user_id ON model_comments(user_id);
CREATE INDEX idx_model_comments_parent_id ON model_comments(parent_comment_id);
CREATE INDEX idx_model_comments_created_at ON model_comments(created_at DESC);

-- RLS for model_comments
ALTER TABLE model_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on public models
CREATE POLICY "Comments viewable on public models"
  ON model_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM models
      WHERE models.id = model_comments.model_id
      AND models.visibility = 'public'
    )
  );

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON model_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON model_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments OR model owner can delete
CREATE POLICY "Users can delete own comments or model owner can delete"
  ON model_comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM models
      WHERE models.id = model_comments.model_id
      AND models.owner_id = auth.uid()
    )
  );

-- =====================================================
-- 3. COMMENT LIKES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS comment_likes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES model_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, comment_id)
);

-- Index for like queries
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);

-- RLS for comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
CREATE POLICY "Likes are viewable by everyone"
  ON comment_likes FOR SELECT
  USING (true);

-- Authenticated users can like
CREATE POLICY "Authenticated users can like comments"
  ON comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can remove own likes"
  ON comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. ADD COMMENT COUNT TO MODELS
-- =====================================================

ALTER TABLE models
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_models_comment_count ON models(comment_count DESC);

-- =====================================================
-- 5. NOTIFICATION TYPE ENUM UPDATE
-- =====================================================

-- Add new notification types if they don't exist
DO $$
BEGIN
  -- Check if the type exists and alter it
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    -- Add new enum values if they don't exist
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'model_comment';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_reply';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_like';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_follower';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'follower_published_model';
  END IF;
END $$;

-- =====================================================
-- 6. FUNCTIONS FOR AUTOMATIC NOTIFICATIONS
-- =====================================================

-- Function: Create notification on new comment
CREATE OR REPLACE FUNCTION notify_on_model_comment()
RETURNS TRIGGER AS $$
DECLARE
  model_owner_id UUID;
  model_name TEXT;
  commenter_name TEXT;
BEGIN
  -- Get model owner and name
  SELECT owner_id, name INTO model_owner_id, model_name
  FROM models
  WHERE id = NEW.model_id;

  -- Get commenter name
  SELECT display_name INTO commenter_name
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Don't notify if commenting on own model
  IF model_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, read)
    VALUES (
      model_owner_id,
      'model_comment',
      'New comment on your model',
      commenter_name || ' commented on ' || model_name,
      '/models/' || (SELECT slug FROM models WHERE id = NEW.model_id),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for model comments
DROP TRIGGER IF EXISTS trigger_notify_model_comment ON model_comments;
CREATE TRIGGER trigger_notify_model_comment
  AFTER INSERT ON model_comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NULL)
  EXECUTE FUNCTION notify_on_model_comment();

-- Function: Create notification on comment reply
CREATE OR REPLACE FUNCTION notify_on_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_user_id UUID;
  replier_name TEXT;
  model_slug TEXT;
BEGIN
  -- Get parent comment user
  SELECT user_id INTO parent_comment_user_id
  FROM model_comments
  WHERE id = NEW.parent_comment_id;

  -- Get replier name
  SELECT display_name INTO replier_name
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- Get model slug
  SELECT slug INTO model_slug
  FROM models
  WHERE id = NEW.model_id;

  -- Don't notify if replying to own comment
  IF parent_comment_user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, read)
    VALUES (
      parent_comment_user_id,
      'comment_reply',
      'New reply to your comment',
      replier_name || ' replied to your comment',
      '/models/' || model_slug,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment replies
DROP TRIGGER IF EXISTS trigger_notify_comment_reply ON model_comments;
CREATE TRIGGER trigger_notify_comment_reply
  AFTER INSERT ON model_comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION notify_on_comment_reply();

-- Function: Create notification on new follower
CREATE OR REPLACE FUNCTION notify_on_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_name TEXT;
  follower_username TEXT;
BEGIN
  -- Get follower name
  SELECT display_name, username INTO follower_name, follower_username
  FROM user_profiles
  WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, type, title, message, link, read)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New follower',
    follower_name || ' started following you',
    '/@' || follower_username,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new followers
DROP TRIGGER IF EXISTS trigger_notify_new_follower ON follows;
CREATE TRIGGER trigger_notify_new_follower
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_follower();

-- =====================================================
-- 7. FUNCTIONS FOR STATS UPDATES
-- =====================================================

-- Function: Update model comment count
CREATE OR REPLACE FUNCTION update_model_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE models
    SET comment_count = comment_count + 1
    WHERE id = NEW.model_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE models
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.model_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment count
DROP TRIGGER IF EXISTS trigger_update_model_comment_count ON model_comments;
CREATE TRIGGER trigger_update_model_comment_count
  AFTER INSERT OR DELETE ON model_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_model_comment_count();

-- =====================================================
-- 8. HELPER FUNCTIONS FOR STATS
-- =====================================================

-- Function: Get follower count
CREATE OR REPLACE FUNCTION get_follower_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM follows
  WHERE following_id = user_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Get following count
CREATE OR REPLACE FUNCTION get_following_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM follows
  WHERE follower_id = user_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(follower_uuid UUID, following_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1
    FROM follows
    WHERE follower_id = follower_uuid
    AND following_id = following_uuid
  );
$$ LANGUAGE SQL STABLE;

-- =====================================================
-- 9. FUNCTION TO AUTO-CREATE USER PROFILE
-- =====================================================

-- Function: Create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
  base_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract base username from email (before @)
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '', 'g'));

  -- Ensure minimum length
  IF length(base_username) < 3 THEN
    base_username := 'user' || substr(md5(NEW.email), 1, 6);
  END IF;

  -- Find unique username
  generated_username := base_username;
  WHILE EXISTS(SELECT 1 FROM user_profiles WHERE username = generated_username) LOOP
    counter := counter + 1;
    generated_username := base_username || counter;
  END LOOP;

  -- Create profile
  INSERT INTO user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    generated_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- =====================================================
-- 10. BACKFILL EXISTING USERS WITH PROFILES
-- =====================================================

-- Create profiles for existing users who don't have one
INSERT INTO user_profiles (id, username, display_name)
SELECT
  u.id,
  lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9]', '', 'g')) ||
    CASE
      WHEN COUNT(*) OVER (PARTITION BY lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9]', '', 'g'))) > 1
      THEN ROW_NUMBER() OVER (PARTITION BY lower(regexp_replace(split_part(u.email, '@', 1), '[^a-z0-9]', '', 'g')) ORDER BY u.created_at)::TEXT
      ELSE ''
    END,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 11. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON user_profiles TO authenticated, anon;
GRANT INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON model_comments TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON model_comments TO authenticated;
GRANT SELECT ON comment_likes TO authenticated, anon;
GRANT INSERT, DELETE ON comment_likes TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
