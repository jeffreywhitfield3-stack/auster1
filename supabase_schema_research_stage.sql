-- ============================================================================
-- AUSTER RESEARCH STAGE DATABASE SCHEMA
-- ============================================================================
-- This schema supports the Research Stage: Auster's public research institution
-- where economic and financial analyses become permanent public artifacts.
--
-- Core entities:
-- 1. Research Objects - Published analytical work
-- 2. Researcher Profiles - Public contributor identities
-- 3. Discussions - Structured commentary on research
-- 4. Referrals & Attribution - Growth through contribution
-- 5. Collections & Topics - Discovery and organization
-- ============================================================================

-- ============================================================================
-- RESEARCHER PROFILES
-- ============================================================================
-- Public identities for contributors. Not all users have profiles—
-- profiles are earned through contribution.

CREATE TABLE IF NOT EXISTS researcher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  display_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly: /researchers/jane-doe
  bio TEXT,
  credentials TEXT, -- e.g., "PhD Economics, MIT"
  institution TEXT,
  location TEXT,
  website_url TEXT,

  -- Avatar
  avatar_url TEXT,

  -- Tier & Standing
  tier TEXT NOT NULL DEFAULT 'observer' CHECK (tier IN ('observer', 'contributor', 'researcher', 'institution')),
  attribution_score INTEGER NOT NULL DEFAULT 0,
  credibility_score INTEGER NOT NULL DEFAULT 0,

  -- Counts (denormalized for performance)
  published_objects_count INTEGER NOT NULL DEFAULT 0,
  discussions_count INTEGER NOT NULL DEFAULT 0,
  citations_received_count INTEGER NOT NULL DEFAULT 0,

  -- Settings
  public_profile BOOLEAN NOT NULL DEFAULT true,
  allow_collaboration BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(user_id)
);

CREATE INDEX idx_researcher_profiles_slug ON researcher_profiles(slug);
CREATE INDEX idx_researcher_profiles_user_id ON researcher_profiles(user_id);
CREATE INDEX idx_researcher_profiles_tier ON researcher_profiles(tier);
CREATE INDEX idx_researcher_profiles_attribution_score ON researcher_profiles(attribution_score DESC);

-- ============================================================================
-- RESEARCH OBJECTS
-- ============================================================================
-- Published analytical work. These are permanent URLs with full provenance.

CREATE TABLE IF NOT EXISTS research_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,

  -- Core Content
  title TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL: /research/inequality-trends-2025
  abstract TEXT NOT NULL,

  -- Research Type
  object_type TEXT NOT NULL CHECK (object_type IN (
    'economic_research',
    'econometric_analysis',
    'market_analysis',
    'data_exploration',
    'methodology',
    'replication'
  )),

  -- Content (stored as JSON for flexibility)
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example structure:
  -- {
  --   "sections": [
  --     {"type": "text", "content": "..."},
  --     {"type": "chart", "config": {...}},
  --     {"type": "table", "data": [...]}
  --   ],
  --   "findings": ["finding 1", "finding 2", ...],
  --   "visualizations": [...]
  -- }

  -- Methods & Reproducibility
  methods TEXT NOT NULL,
  assumptions TEXT NOT NULL,
  data_sources TEXT[],
  statistical_techniques TEXT[],

  -- Lab Connection (optional)
  lab_type TEXT CHECK (lab_type IN ('econ', 'derivatives', 'none')),
  lab_workspace_id UUID, -- Link to saved workspace state
  lab_state JSONB, -- Snapshot of lab state for reproducibility

  -- Metadata
  tags TEXT[],
  topics TEXT[],

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,

  -- Engagement Metrics (denormalized)
  views_count INTEGER NOT NULL DEFAULT 0,
  discussions_count INTEGER NOT NULL DEFAULT 0,
  citations_count INTEGER NOT NULL DEFAULT 0,
  extensions_count INTEGER NOT NULL DEFAULT 0,
  replications_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(author_id, slug)
);

CREATE INDEX idx_research_objects_slug ON research_objects(slug);
CREATE INDEX idx_research_objects_author_id ON research_objects(author_id);
CREATE INDEX idx_research_objects_status ON research_objects(status);
CREATE INDEX idx_research_objects_object_type ON research_objects(object_type);
CREATE INDEX idx_research_objects_published_at ON research_objects(published_at DESC);
CREATE INDEX idx_research_objects_tags ON research_objects USING GIN(tags);
CREATE INDEX idx_research_objects_topics ON research_objects USING GIN(topics);

-- ============================================================================
-- DISCUSSIONS
-- ============================================================================
-- Structured commentary on research objects.
-- Not "comments"—discussions are substantive, threaded, and categorized.

CREATE TABLE IF NOT EXISTS discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_object_id UUID NOT NULL REFERENCES research_objects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,

  -- Threading
  parent_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  thread_depth INTEGER NOT NULL DEFAULT 0,

  -- Content
  content TEXT NOT NULL,

  -- Discussion Type (structured categories)
  discussion_type TEXT NOT NULL CHECK (discussion_type IN (
    'methodology', -- Questions about methods
    'evidence',    -- Questions about data/sources
    'reasoning',   -- Questions about interpretation
    'implication', -- Questions about conclusions
    'extension',   -- Proposals to extend work
    'replication', -- Replication attempts
    'critique'     -- Evidence-based challenges
  )),

  -- Quality Signals
  quality_score INTEGER NOT NULL DEFAULT 0,
  endorsed_by_author BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discussions_research_object_id ON discussions(research_object_id);
CREATE INDEX idx_discussions_author_id ON discussions(author_id);
CREATE INDEX idx_discussions_parent_id ON discussions(parent_id);
CREATE INDEX idx_discussions_discussion_type ON discussions(discussion_type);
CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);

-- ============================================================================
-- REFERRALS & ATTRIBUTION
-- ============================================================================
-- Track attribution chains. Growth occurs through shared insight.

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution Chain
  referrer_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,

  -- Source (what was shared)
  source_type TEXT NOT NULL CHECK (source_type IN ('research_object', 'profile', 'collection')),
  source_object_id UUID, -- References research_objects(id) or collections(id)

  -- Referral Mechanism
  referral_code TEXT UNIQUE NOT NULL,
  referral_url TEXT NOT NULL,

  -- Attribution Points
  attribution_points DECIMAL NOT NULL DEFAULT 1.0,
  attribution_type TEXT NOT NULL CHECK (attribution_type IN (
    'direct_share',    -- 1.0 point
    'discussion',      -- 0.5 points
    'extension',       -- 1.0 point
    'citation',        -- 0.5 points
    'replication'      -- 1.0 point
  )),

  -- Conversion
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CHECK (referrer_id != referee_id)
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee_id ON referrals(referee_id);
CREATE INDEX idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX idx_referrals_source_object_id ON referrals(source_object_id);

-- ============================================================================
-- CITATIONS
-- ============================================================================
-- Track when one research object cites another.

CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Citation Link
  citing_object_id UUID NOT NULL REFERENCES research_objects(id) ON DELETE CASCADE,
  cited_object_id UUID NOT NULL REFERENCES research_objects(id) ON DELETE CASCADE,

  -- Citation Context
  citation_context TEXT, -- Where/how it was cited
  citation_type TEXT NOT NULL CHECK (citation_type IN (
    'builds_on',    -- Extends the work
    'replicates',   -- Attempts replication
    'challenges',   -- Critiques findings
    'uses_method',  -- Adopts methodology
    'references'    -- General reference
  )),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(citing_object_id, cited_object_id),
  CHECK (citing_object_id != cited_object_id)
);

CREATE INDEX idx_citations_citing_object_id ON citations(citing_object_id);
CREATE INDEX idx_citations_cited_object_id ON citations(cited_object_id);

-- ============================================================================
-- COLLECTIONS & TOPICS
-- ============================================================================
-- Organize research objects into curated collections and topic areas.

CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,

  -- Collection Info
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,

  -- Type
  collection_type TEXT NOT NULL CHECK (collection_type IN (
    'topic',        -- e.g., "Inequality Studies"
    'method',       -- e.g., "Regression Analysis"
    'institution',  -- e.g., "MIT Economics Research"
    'series'        -- e.g., "Monthly Labor Market Reports"
  )),

  -- Visibility
  public BOOLEAN NOT NULL DEFAULT true,

  -- Counts
  objects_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_slug ON collections(slug);
CREATE INDEX idx_collections_curator_id ON collections(curator_id);
CREATE INDEX idx_collections_collection_type ON collections(collection_type);

-- ============================================================================
-- COLLECTION MEMBERSHIPS
-- ============================================================================
-- Many-to-many relationship between research objects and collections.

CREATE TABLE IF NOT EXISTS collection_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  research_object_id UUID NOT NULL REFERENCES research_objects(id) ON DELETE CASCADE,

  -- Order within collection
  position INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(collection_id, research_object_id)
);

CREATE INDEX idx_collection_memberships_collection_id ON collection_memberships(collection_id);
CREATE INDEX idx_collection_memberships_research_object_id ON collection_memberships(research_object_id);

-- ============================================================================
-- RESEARCHER ACTIVITY LOG
-- ============================================================================
-- Track all researcher actions for attribution and credibility scoring.

CREATE TABLE IF NOT EXISTS researcher_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID NOT NULL REFERENCES researcher_profiles(id) ON DELETE CASCADE,

  -- Activity Type
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'published_object',
    'created_discussion',
    'received_citation',
    'extended_research',
    'replicated_study',
    'received_endorsement',
    'created_collection'
  )),

  -- Related Entity
  related_object_id UUID, -- Could be research_object_id, discussion_id, etc.

  -- Points Awarded
  attribution_points DECIMAL NOT NULL DEFAULT 0,
  credibility_points DECIMAL NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_researcher_activity_researcher_id ON researcher_activity(researcher_id);
CREATE INDEX idx_researcher_activity_activity_type ON researcher_activity(activity_type);
CREATE INDEX idx_researcher_activity_created_at ON researcher_activity(created_at DESC);

-- ============================================================================
-- VIEWS FOR QUERIES
-- ============================================================================

-- Top researchers by attribution score
CREATE OR REPLACE VIEW top_researchers AS
SELECT
  rp.*,
  COUNT(DISTINCT ro.id) as published_count,
  COUNT(DISTINCT d.id) as discussion_count,
  COUNT(DISTINCT c.id) as citations_count
FROM researcher_profiles rp
LEFT JOIN research_objects ro ON rp.id = ro.author_id AND ro.status = 'published'
LEFT JOIN discussions d ON rp.id = d.author_id
LEFT JOIN citations c ON EXISTS (
  SELECT 1 FROM research_objects ro2 WHERE ro2.author_id = rp.id AND c.cited_object_id = ro2.id
)
WHERE rp.public_profile = true
GROUP BY rp.id
ORDER BY rp.attribution_score DESC, rp.credibility_score DESC;

-- Recently published research
CREATE OR REPLACE VIEW recent_research AS
SELECT
  ro.*,
  rp.display_name as author_name,
  rp.slug as author_slug,
  rp.avatar_url as author_avatar
FROM research_objects ro
JOIN researcher_profiles rp ON ro.author_id = rp.id
WHERE ro.status = 'published'
ORDER BY ro.published_at DESC;

-- Active discussions
CREATE OR REPLACE VIEW active_discussions AS
SELECT
  d.*,
  ro.title as research_title,
  ro.slug as research_slug,
  rp.display_name as author_name,
  rp.slug as author_slug
FROM discussions d
JOIN research_objects ro ON d.research_object_id = ro.id
JOIN researcher_profiles rp ON d.author_id = rp.id
WHERE d.status = 'active'
ORDER BY d.created_at DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update researcher tier based on activity
CREATE OR REPLACE FUNCTION update_researcher_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Tier 2: Contributor (2 published OR 5 quality discussions)
  IF NEW.published_objects_count >= 2 OR NEW.discussions_count >= 5 THEN
    IF NEW.tier = 'observer' THEN
      NEW.tier := 'contributor';
    END IF;
  END IF;

  -- Tier 3: Researcher (5 published OR 10 attributions)
  IF NEW.published_objects_count >= 5 OR NEW.attribution_score >= 10 THEN
    IF NEW.tier IN ('observer', 'contributor') THEN
      NEW.tier := 'researcher';
    END IF;
  END IF;

  -- Tier 4: Institution (25 published OR 100 attributions)
  IF NEW.published_objects_count >= 25 OR NEW.attribution_score >= 100 THEN
    IF NEW.tier IN ('observer', 'contributor', 'researcher') THEN
      NEW.tier := 'institution';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_researcher_tier
  BEFORE UPDATE OF published_objects_count, discussions_count, attribution_score
  ON researcher_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_researcher_tier();

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code(researcher_slug TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN researcher_slug || '-' || substr(md5(random()::text), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE researcher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE researcher_activity ENABLE ROW LEVEL SECURITY;

-- Researcher Profiles: Public profiles are readable by all
CREATE POLICY "Public profiles are viewable by everyone"
  ON researcher_profiles FOR SELECT
  USING (public_profile = true OR user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON researcher_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Research Objects: Published objects are public
CREATE POLICY "Published research is viewable by everyone"
  ON research_objects FOR SELECT
  USING (status = 'published' OR author_id IN (
    SELECT id FROM researcher_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authors can manage their own research"
  ON research_objects FOR ALL
  USING (author_id IN (
    SELECT id FROM researcher_profiles WHERE user_id = auth.uid()
  ));

-- Discussions: Public on published research
CREATE POLICY "Discussions are viewable on published research"
  ON discussions FOR SELECT
  USING (research_object_id IN (
    SELECT id FROM research_objects WHERE status = 'published'
  ));

CREATE POLICY "Contributors can create discussions"
  ON discussions FOR INSERT
  WITH CHECK (author_id IN (
    SELECT id FROM researcher_profiles WHERE user_id = auth.uid() AND tier != 'observer'
  ));

-- Collections: Public collections are readable
CREATE POLICY "Public collections are viewable by everyone"
  ON collections FOR SELECT
  USING (public = true OR curator_id IN (
    SELECT id FROM researcher_profiles WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Example topics for collections
-- INSERT INTO collections (curator_id, title, slug, description, collection_type, public)
-- VALUES (...);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
