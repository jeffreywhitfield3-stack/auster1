-- ============================================================================
-- WORKSPACES, FOLLOWING, AND NOTIFICATIONS
-- ============================================================================
-- Extends the Research Stage schema with:
-- 1. Lab Workspaces - Saved analysis states
-- 2. Following - Researcher follow system
-- 3. Notifications - Activity notifications
-- ============================================================================

-- ============================================================================
-- LAB WORKSPACES
-- ============================================================================
-- Saved analysis states from Derivatives and Econ Labs

CREATE TABLE IF NOT EXISTS lab_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Workspace Info
  name TEXT NOT NULL,
  description TEXT,

  -- Lab Type
  product TEXT NOT NULL CHECK (product IN ('derivatives', 'econ', 'housing', 'portfolio', 'valuation')),

  -- State (JSON snapshot of lab configuration)
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example for derivatives:
  -- {
  --   "symbol": "SPY",
  --   "selectedExpiration": "2024-01-19",
  --   "deltaMin": 0.25,
  --   "deltaMax": 0.75,
  --   "liquidOnly": false,
  --   "activeTab": "chain",
  --   "selectedContract": {...}
  -- }

  -- Example for econ:
  -- {
  --   "subProduct": "macro",
  --   "selectedIndicators": ["GDP", "UNEMPLOYMENT"],
  --   "dateRange": {"start": "2020-01-01", "end": "2024-12-31"},
  --   "chartType": "line"
  -- }

  -- Metadata
  thumbnail_url TEXT, -- Screenshot or preview
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_workspaces_user_id ON lab_workspaces(user_id);
CREATE INDEX idx_lab_workspaces_product ON lab_workspaces(product);
CREATE INDEX idx_lab_workspaces_updated_at ON lab_workspaces(updated_at DESC);

-- ============================================================================
-- FOLLOWING SYSTEM
-- ============================================================================
-- Researchers can follow other researchers

CREATE TABLE IF NOT EXISTS researcher_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Follow relationship
  follower_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,

  -- Notification preferences for this follow
  notify_on_publish BOOLEAN NOT NULL DEFAULT true,
  notify_on_discussion BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_researcher_follows_follower_id ON researcher_follows(follower_id);
CREATE INDEX idx_researcher_follows_following_id ON researcher_follows(following_id);

-- Add follower counts to researcher_profiles
ALTER TABLE researcher_profiles
  ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
-- User notifications for research activity

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification Type
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'new_research_from_followed', -- Someone you follow published
    'discussion_on_your_research', -- Discussion on your work
    'citation_of_your_research',  -- Your work was cited
    'reply_to_your_discussion',   -- Reply to your discussion
    'new_follower',               -- Someone followed you
    'research_milestone',         -- 100 views, 10 citations, etc.
    'tier_advancement'            -- Advanced to new tier
  )),

  -- Related Entities
  related_researcher_id UUID REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  related_research_id UUID REFERENCES research_objects(id) ON DELETE CASCADE,
  related_discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- Where to go when clicked

  -- Status
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);

-- ============================================================================
-- NOTIFICATION SETTINGS
-- ============================================================================
-- Per-user notification preferences

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Email Preferences
  email_on_new_research BOOLEAN NOT NULL DEFAULT true,
  email_on_discussion BOOLEAN NOT NULL DEFAULT true,
  email_on_citation BOOLEAN NOT NULL DEFAULT true,
  email_on_reply BOOLEAN NOT NULL DEFAULT true,
  email_on_follower BOOLEAN NOT NULL DEFAULT true,
  email_on_milestone BOOLEAN NOT NULL DEFAULT true,

  -- Email Digest
  email_digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (email_digest_frequency IN ('instant', 'daily', 'weekly', 'never')),

  -- In-App Preferences
  app_on_new_research BOOLEAN NOT NULL DEFAULT true,
  app_on_discussion BOOLEAN NOT NULL DEFAULT true,
  app_on_citation BOOLEAN NOT NULL DEFAULT true,
  app_on_reply BOOLEAN NOT NULL DEFAULT true,
  app_on_follower BOOLEAN NOT NULL DEFAULT true,
  app_on_milestone BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following_count for follower
    UPDATE researcher_profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

    -- Increment followers_count for following
    UPDATE researcher_profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;

    -- Create notification for new follower
    INSERT INTO notifications (user_id, notification_type, related_researcher_id, title, message, action_url)
    SELECT
      rp.user_id,
      'new_follower',
      NEW.follower_id,
      follower.display_name || ' followed you',
      follower.display_name || ' is now following your research.',
      '/researchers/' || follower.slug
    FROM researcher_profiles rp
    JOIN researcher_profiles follower ON follower.id = NEW.follower_id
    WHERE rp.id = NEW.following_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following_count for follower
    UPDATE researcher_profiles
    SET following_count = following_count - 1
    WHERE id = OLD.follower_id;

    -- Decrement followers_count for following
    UPDATE researcher_profiles
    SET followers_count = followers_count - 1
    WHERE id = OLD.following_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_follower_counts
  AFTER INSERT OR DELETE ON researcher_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- Function: Create notification on new research from followed researchers
CREATE OR REPLACE FUNCTION notify_followers_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Create notifications for all followers who want them
    INSERT INTO notifications (user_id, notification_type, related_researcher_id, related_research_id, title, message, action_url)
    SELECT
      rp.user_id,
      'new_research_from_followed',
      NEW.author_id,
      NEW.id,
      author.display_name || ' published new research',
      'New: "' || NEW.title || '"',
      '/research/' || NEW.slug
    FROM researcher_follows rf
    JOIN researcher_profiles rp ON rp.id = rf.follower_id
    JOIN researcher_profiles author ON author.id = NEW.author_id
    WHERE rf.following_id = NEW.author_id
      AND rf.notify_on_publish = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_followers_on_publish
  AFTER INSERT OR UPDATE OF status ON research_objects
  FOR EACH ROW
  EXECUTE FUNCTION notify_followers_on_publish();

-- Function: Create notification on discussion
CREATE OR REPLACE FUNCTION notify_on_discussion()
RETURNS TRIGGER AS $$
DECLARE
  research_author_user_id UUID;
  research_title TEXT;
  research_slug TEXT;
  discussion_author_name TEXT;
BEGIN
  -- Get research author and info
  SELECT rp.user_id, ro.title, ro.slug, author.display_name
  INTO research_author_user_id, research_title, research_slug, discussion_author_name
  FROM research_objects ro
  JOIN researcher_profiles rp ON rp.id = ro.author_id
  JOIN researcher_profiles author ON author.id = NEW.author_id
  WHERE ro.id = NEW.research_object_id;

  -- Notify research author about discussion
  IF research_author_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, related_researcher_id, related_research_id, related_discussion_id, title, message, action_url)
    VALUES (
      research_author_user_id,
      'discussion_on_your_research',
      NEW.author_id,
      NEW.research_object_id,
      NEW.id,
      'New discussion on "' || research_title || '"',
      discussion_author_name || ' started a ' || NEW.discussion_type || ' discussion',
      '/research/' || research_slug || '#discussion-' || NEW.id
    );
  END IF;

  -- If this is a reply, notify parent discussion author
  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, related_researcher_id, related_research_id, related_discussion_id, title, message, action_url)
    SELECT
      rp.user_id,
      'reply_to_your_discussion',
      NEW.author_id,
      NEW.research_object_id,
      NEW.id,
      discussion_author_name || ' replied to your discussion',
      'Reply on "' || research_title || '"',
      '/research/' || research_slug || '#discussion-' || NEW.id
    FROM discussions parent
    JOIN researcher_profiles rp ON rp.id = parent.author_id
    WHERE parent.id = NEW.parent_id
      AND rp.user_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_discussion
  AFTER INSERT ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_discussion();

-- Function: Create notification on citation
CREATE OR REPLACE FUNCTION notify_on_citation()
RETURNS TRIGGER AS $$
DECLARE
  cited_author_user_id UUID;
  cited_title TEXT;
  cited_slug TEXT;
  citing_author_name TEXT;
  citing_title TEXT;
BEGIN
  -- Get cited research info and citing author
  SELECT
    rp.user_id,
    cited_ro.title,
    cited_ro.slug,
    citing_author.display_name,
    citing_ro.title
  INTO cited_author_user_id, cited_title, cited_slug, citing_author_name, citing_title
  FROM research_objects cited_ro
  JOIN researcher_profiles rp ON rp.id = cited_ro.author_id
  JOIN research_objects citing_ro ON citing_ro.id = NEW.citing_object_id
  JOIN researcher_profiles citing_author ON citing_author.id = citing_ro.author_id
  WHERE cited_ro.id = NEW.cited_object_id;

  -- Notify cited author
  IF cited_author_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, related_researcher_id, related_research_id, title, message, action_url)
    VALUES (
      cited_author_user_id,
      'citation_of_your_research',
      (SELECT author_id FROM research_objects WHERE id = NEW.citing_object_id),
      NEW.cited_object_id,
      'Your research was cited',
      citing_author_name || ' cited "' || cited_title || '" in "' || citing_title || '"',
      '/research/' || cited_slug
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_citation
  AFTER INSERT ON citations
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_citation();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Lab Workspaces
ALTER TABLE lab_workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workspaces"
  ON lab_workspaces FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can manage their own workspaces"
  ON lab_workspaces FOR ALL
  USING (user_id = auth.uid());

-- Researcher Follows
ALTER TABLE researcher_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follows"
  ON researcher_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own follows"
  ON researcher_follows FOR ALL
  USING (follower_id IN (
    SELECT id FROM researcher_profiles WHERE user_id = auth.uid()
  ));

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Notification Settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON notification_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own settings"
  ON notification_settings FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
