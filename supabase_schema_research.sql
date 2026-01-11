-- =====================================================
-- RESEARCH WORKSPACE & NOTES SYSTEM
-- =====================================================

-- Research workspaces (saved analyses)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lab_type TEXT NOT NULL CHECK (lab_type IN ('econ', 'derivatives', 'housing', 'portfolio', 'valuation')),
  is_public BOOLEAN DEFAULT false,
  slug TEXT UNIQUE, -- For public URLs: /research/{username}/{slug}

  -- Saved state (JSON blob of the analysis configuration)
  state JSONB NOT NULL,

  -- Metadata
  view_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,
  forked_from UUID REFERENCES workspaces(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Search
  tsv tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED
);

CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_workspaces_public ON workspaces(is_public, published_at) WHERE is_public = true;
CREATE INDEX idx_workspaces_lab_type ON workspaces(lab_type);
CREATE INDEX idx_workspaces_search ON workspaces USING gin(tsv);

-- Research notes (annotations on workspaces)
CREATE TABLE workspace_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'finding', 'question', 'methodology')),

  -- Optional: attach note to specific section
  section_id TEXT, -- e.g., "regression-results", "chart-1"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspace_notes_workspace ON workspace_notes(workspace_id);
CREATE INDEX idx_workspace_notes_user ON workspace_notes(user_id);

-- Workspace versions (for version control)
CREATE TABLE workspace_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  state JSONB NOT NULL,
  change_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  UNIQUE(workspace_id, version_number)
);

CREATE INDEX idx_workspace_versions_workspace ON workspace_versions(workspace_id, version_number DESC);

-- Workspace tags
CREATE TABLE workspace_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,

  UNIQUE(workspace_id, tag)
);

CREATE INDEX idx_workspace_tags_workspace ON workspace_tags(workspace_id);
CREATE INDEX idx_workspace_tags_tag ON workspace_tags(tag);

-- Workspace comments (for public research pages)
CREATE TABLE workspace_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  parent_id UUID REFERENCES workspace_comments(id) ON DELETE CASCADE, -- For threading

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workspace_comments_workspace ON workspace_comments(workspace_id, created_at);
CREATE INDEX idx_workspace_comments_parent ON workspace_comments(parent_id);

-- Workspace stars/likes
CREATE TABLE workspace_stars (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_stars_workspace ON workspace_stars(workspace_id);
CREATE INDEX idx_workspace_stars_user ON workspace_stars(user_id);

-- =====================================================
-- DERIVATIVES LAB: POSITIONS & GREEKS TRACKING
-- =====================================================

CREATE TABLE derivatives_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  symbol TEXT NOT NULL,
  strategy_type TEXT NOT NULL, -- 'long_call', 'iron_condor', 'synthetic_long', etc.

  -- Position legs
  legs JSONB NOT NULL, -- Array of {type, strike, expiry, quantity, entry_price}

  -- Entry data
  entry_date DATE NOT NULL,
  entry_underlying_price DECIMAL(10, 2),
  entry_iv DECIMAL(5, 2),

  -- Current data (updated periodically)
  current_underlying_price DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  current_greeks JSONB, -- {delta, gamma, theta, vega}

  -- P&L
  realized_pnl DECIMAL(10, 2) DEFAULT 0,
  unrealized_pnl DECIMAL(10, 2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
  closed_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_derivatives_positions_user ON derivatives_positions(user_id, status);
CREATE INDEX idx_derivatives_positions_symbol ON derivatives_positions(symbol, status);

-- Historical Greeks snapshots (for tracking over time)
CREATE TABLE derivatives_greeks_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES derivatives_positions(id) ON DELETE CASCADE,

  snapshot_date DATE NOT NULL,
  underlying_price DECIMAL(10, 2),

  delta DECIMAL(8, 4),
  gamma DECIMAL(8, 4),
  theta DECIMAL(8, 4),
  vega DECIMAL(8, 4),

  position_value DECIMAL(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_greeks_history_position ON derivatives_greeks_history(position_id, snapshot_date DESC);

-- =====================================================
-- EARNINGS TRACKING
-- =====================================================

CREATE TABLE earnings_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  earnings_date DATE NOT NULL,

  -- Pre-earnings data
  pre_implied_move DECIMAL(5, 2), -- IV-based expected move %
  pre_stock_price DECIMAL(10, 2),
  pre_iv DECIMAL(5, 2),

  -- Post-earnings data
  actual_move DECIMAL(5, 2), -- Actual % move
  post_stock_price DECIMAL(10, 2),
  post_iv DECIMAL(5, 2),

  -- Earnings results
  eps_actual DECIMAL(10, 4),
  eps_estimate DECIMAL(10, 4),
  revenue_actual BIGINT,
  revenue_estimate BIGINT,
  beat_eps BOOLEAN,
  beat_revenue BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(symbol, earnings_date)
);

CREATE INDEX idx_earnings_events_symbol ON earnings_events(symbol, earnings_date DESC);
CREATE INDEX idx_earnings_events_date ON earnings_events(earnings_date DESC);

-- =====================================================
-- OPEN INTEREST & VOLUME TRACKING
-- =====================================================

CREATE TABLE options_oi_volume (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  option_type TEXT NOT NULL CHECK (option_type IN ('call', 'put')),
  strike DECIMAL(10, 2) NOT NULL,
  expiry DATE NOT NULL,

  snapshot_date DATE NOT NULL,

  open_interest INTEGER,
  volume INTEGER,
  implied_volatility DECIMAL(5, 2),

  -- Greeks at snapshot time
  delta DECIMAL(8, 4),
  gamma DECIMAL(8, 4),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(symbol, option_type, strike, expiry, snapshot_date)
);

CREATE INDEX idx_oi_volume_symbol_date ON options_oi_volume(symbol, snapshot_date DESC);
CREATE INDEX idx_oi_volume_expiry ON options_oi_volume(expiry, snapshot_date);

-- Aggregated gamma exposure by strike
CREATE MATERIALIZED VIEW gamma_exposure_by_strike AS
SELECT
  symbol,
  snapshot_date,
  strike,
  SUM(CASE WHEN option_type = 'call' THEN open_interest * gamma ELSE 0 END) as call_gamma_oi,
  SUM(CASE WHEN option_type = 'put' THEN open_interest * gamma ELSE 0 END) as put_gamma_oi,
  SUM(open_interest * gamma) as net_gamma_oi
FROM options_oi_volume
GROUP BY symbol, snapshot_date, strike;

CREATE INDEX idx_gamma_exposure_symbol ON gamma_exposure_by_strike(symbol, snapshot_date DESC);

-- =====================================================
-- USER PROFILES (for public research pages)
-- =====================================================

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,

  -- Stats
  total_workspaces INTEGER DEFAULT 0,
  public_workspaces INTEGER DEFAULT 0,
  total_stars_received INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Workspaces: users can CRUD their own, read public ones
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspaces_select_own ON workspaces
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY workspaces_select_public ON workspaces
  FOR SELECT USING (is_public = true);

CREATE POLICY workspaces_insert_own ON workspaces
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY workspaces_update_own ON workspaces
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY workspaces_delete_own ON workspaces
  FOR DELETE USING (user_id = auth.uid());

-- Workspace notes: users can CRUD their own notes
ALTER TABLE workspace_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_notes_select ON workspace_notes
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_notes.workspace_id AND is_public = true)
  );

CREATE POLICY workspace_notes_insert ON workspace_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY workspace_notes_update ON workspace_notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY workspace_notes_delete ON workspace_notes
  FOR DELETE USING (user_id = auth.uid());

-- Derivatives positions: users can CRUD their own
ALTER TABLE derivatives_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY derivatives_positions_all ON derivatives_positions
  FOR ALL USING (user_id = auth.uid());

-- Public data tables: read-only for authenticated users
ALTER TABLE earnings_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY earnings_events_select ON earnings_events
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE options_oi_volume ENABLE ROW LEVEL SECURITY;
CREATE POLICY options_oi_volume_select ON options_oi_volume
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- User profiles: public read, own write
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER workspace_notes_updated_at BEFORE UPDATE ON workspace_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER derivatives_positions_updated_at BEFORE UPDATE ON derivatives_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER earnings_events_updated_at BEFORE UPDATE ON earnings_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate slug from title
CREATE OR REPLACE FUNCTION generate_workspace_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public = true AND NEW.slug IS NULL THEN
    NEW.slug = lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = trim(both '-' from NEW.slug);

    -- Ensure uniqueness
    IF EXISTS (SELECT 1 FROM workspaces WHERE slug = NEW.slug AND id != NEW.id) THEN
      NEW.slug = NEW.slug || '-' || substr(NEW.id::text, 1, 8);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspaces_generate_slug BEFORE INSERT OR UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION generate_workspace_slug();

-- Update workspace view count
CREATE OR REPLACE FUNCTION increment_workspace_views(workspace_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE workspaces SET view_count = view_count + 1 WHERE id = workspace_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get public workspaces with user info
CREATE OR REPLACE FUNCTION get_public_workspaces(
  lab_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  workspace_id UUID,
  title TEXT,
  description TEXT,
  lab_type TEXT,
  slug TEXT,
  username TEXT,
  display_name TEXT,
  view_count INTEGER,
  star_count BIGINT,
  published_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.title,
    w.description,
    w.lab_type,
    w.slug,
    u.username,
    u.display_name,
    w.view_count,
    COUNT(DISTINCT s.user_id) as star_count,
    w.published_at
  FROM workspaces w
  JOIN user_profiles u ON w.user_id = u.user_id
  LEFT JOIN workspace_stars s ON w.id = s.workspace_id
  WHERE w.is_public = true
    AND (lab_filter IS NULL OR w.lab_type = lab_filter)
  GROUP BY w.id, u.username, u.display_name
  ORDER BY w.published_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
