-- Weekly Economic Briefs Schema
-- Run this in your Supabase SQL Editor to add newsletter functionality

-- ============================================================================
-- Email Subscriptions
-- ============================================================================

-- Newsletter subscription preferences
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Preferences
    weekly_briefs BOOLEAN NOT NULL DEFAULT true,
    trade_alerts BOOLEAN NOT NULL DEFAULT true,
    research_updates BOOLEAN NOT NULL DEFAULT true,
    market_events BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    subscription_source TEXT, -- 'signup', 'research_page', 'settings'
    utm_source TEXT,
    utm_campaign TEXT,

    -- Tracking
    email_opens INTEGER NOT NULL DEFAULT 0,
    email_clicks INTEGER NOT NULL DEFAULT 0,
    last_email_opened_at TIMESTAMPTZ,
    last_email_clicked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id),
    UNIQUE(email)
);

-- Index for active subscriber queries
CREATE INDEX IF NOT EXISTS idx_newsletter_active_subscribers
    ON newsletter_subscriptions(is_active, weekly_briefs)
    WHERE is_active = true;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email
    ON newsletter_subscriptions(email);

-- ============================================================================
-- Weekly Briefs
-- ============================================================================

-- Published weekly economic briefs
CREATE TABLE IF NOT EXISTS weekly_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- For URL: /research/briefs/{slug}
    summary TEXT NOT NULL, -- Short preview for email (max 300 chars)
    content JSONB NOT NULL, -- Full content sections (same as research_objects)

    -- Metadata
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    published_at TIMESTAMPTZ,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_sent BOOLEAN NOT NULL DEFAULT false, -- Email sent flag
    sent_at TIMESTAMPTZ,

    -- Authorship
    created_by UUID REFERENCES auth.users(id),
    author_name TEXT NOT NULL DEFAULT 'Austerian Research Team',

    -- AI-generated or manual
    generation_method TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'ai', 'hybrid'
    ai_prompt TEXT, -- If AI-generated, store the prompt

    -- Trade ideas included
    trade_ideas JSONB, -- Array of trade recommendations
    economic_events JSONB, -- Array of upcoming events

    -- SEO
    meta_description TEXT,
    meta_keywords TEXT[],

    -- Analytics
    email_sent_count INTEGER NOT NULL DEFAULT 0,
    email_open_rate NUMERIC(5,2),
    email_click_rate NUMERIC(5,2),
    page_views INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for weekly brief queries
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_published
    ON weekly_briefs(is_published, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_briefs_week
    ON weekly_briefs(week_start_date DESC);

-- ============================================================================
-- Email Logs
-- ============================================================================

-- Track all sent emails for debugging and analytics
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Email details
    recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    email_type TEXT NOT NULL, -- 'weekly_brief', 'trade_alert', 'research_update'

    -- Content reference
    brief_id UUID REFERENCES weekly_briefs(id) ON DELETE SET NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
    error_message TEXT,

    -- External IDs (from email provider)
    resend_id TEXT, -- Resend email ID
    sendgrid_id TEXT, -- SendGrid message ID

    -- Tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,

    -- Metadata
    user_agent TEXT,
    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email log queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient
    ON email_logs(recipient_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_status
    ON email_logs(status, email_type);

CREATE INDEX IF NOT EXISTS idx_email_logs_brief
    ON email_logs(brief_id, status);

-- ============================================================================
-- Trade Ideas (for weekly briefs)
-- ============================================================================

-- Structured trade recommendations
CREATE TABLE IF NOT EXISTS trade_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    brief_id UUID REFERENCES weekly_briefs(id) ON DELETE CASCADE,

    -- Trade details
    symbol TEXT NOT NULL,
    strategy_type TEXT NOT NULL, -- 'iron_condor', 'call_spread', 'put_spread', 'protective_put', 'covered_call'
    direction TEXT NOT NULL, -- 'bullish', 'bearish', 'neutral'

    -- Entry criteria
    entry_price NUMERIC(10,2),
    expiration_date DATE NOT NULL,
    strikes JSONB NOT NULL, -- Array of strike prices involved
    greeks JSONB, -- Greeks at time of recommendation

    -- Risk/Reward
    max_profit NUMERIC(10,2),
    max_loss NUMERIC(10,2),
    break_even NUMERIC(10,2)[],
    probability_of_profit NUMERIC(5,2),

    -- Rationale
    thesis TEXT NOT NULL, -- Why this trade makes sense
    catalysts TEXT[], -- Events that support the trade (earnings, Fed meeting, etc.)
    risk_factors TEXT[], -- What could go wrong

    -- AI confidence (if AI-generated)
    confidence_score NUMERIC(3,2), -- 0.00 to 1.00
    backtested BOOLEAN NOT NULL DEFAULT false,
    backtest_results JSONB,

    -- Tracking
    is_active BOOLEAN NOT NULL DEFAULT true,
    closed_at TIMESTAMPTZ,
    actual_pnl NUMERIC(10,2), -- Track performance if user reports back

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_ideas_brief
    ON trade_ideas(brief_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_ideas_symbol
    ON trade_ideas(symbol, is_active);

-- ============================================================================
-- Economic Events Calendar
-- ============================================================================

-- Track upcoming economic events for briefs
CREATE TABLE IF NOT EXISTS economic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event details
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'earnings', 'fed_meeting', 'cpi', 'jobs_report', 'gdp', 'pce'
    event_date TIMESTAMPTZ NOT NULL,

    -- Affected markets
    symbols TEXT[], -- Stocks/ETFs affected
    sectors TEXT[], -- Sectors impacted

    -- Importance
    importance TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    expected_impact TEXT, -- Description of expected market reaction

    -- Forecasts
    consensus_forecast NUMERIC(10,2),
    actual_result NUMERIC(10,2),
    previous_result NUMERIC(10,2),

    -- Brief association
    included_in_brief_ids UUID[], -- Array of brief IDs that mentioned this event

    -- Metadata
    source TEXT, -- 'earnings_calendar', 'fed', 'bls', 'census'
    source_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_economic_events_date
    ON economic_events(event_date DESC);

CREATE INDEX IF NOT EXISTS idx_economic_events_type
    ON economic_events(event_type, event_date);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;

-- Newsletter subscriptions: Users can only see/modify their own
CREATE POLICY "Users can view their own subscription"
    ON newsletter_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
    ON newsletter_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON newsletter_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Weekly briefs: Public read access for published briefs
CREATE POLICY "Anyone can view published briefs"
    ON weekly_briefs FOR SELECT
    USING (is_published = true);

-- Admin can do anything with briefs (replace 'your-admin-user-id' with actual ID)
CREATE POLICY "Admin can manage all briefs"
    ON weekly_briefs FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email = 'jeffreywhitfield3@gmail.com'
        )
    );

-- Email logs: Only viewable by recipient or admin
CREATE POLICY "Users can view their own email logs"
    ON email_logs FOR SELECT
    USING (auth.uid() = recipient_user_id);

-- Trade ideas: Public read for published briefs
CREATE POLICY "Anyone can view trade ideas from published briefs"
    ON trade_ideas FOR SELECT
    USING (
        brief_id IN (
            SELECT id FROM weekly_briefs WHERE is_published = true
        )
    );

-- Economic events: Public read access
CREATE POLICY "Anyone can view economic events"
    ON economic_events FOR SELECT
    USING (true);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update newsletter subscription timestamp
CREATE OR REPLACE FUNCTION update_newsletter_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_newsletter_subscription_timestamp
    BEFORE UPDATE ON newsletter_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_subscription_timestamp();

-- Function to update weekly brief timestamp
CREATE OR REPLACE FUNCTION update_weekly_brief_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weekly_brief_timestamp
    BEFORE UPDATE ON weekly_briefs
    FOR EACH ROW
    EXECUTE FUNCTION update_weekly_brief_timestamp();

-- Function to get active subscribers for weekly briefs
CREATE OR REPLACE FUNCTION get_weekly_brief_subscribers()
RETURNS TABLE (
    user_id UUID,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ns.user_id,
        ns.email
    FROM newsletter_subscriptions ns
    WHERE ns.is_active = true
      AND ns.weekly_briefs = true
      AND ns.unsubscribed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION mark_email_sent(
    p_email_log_id UUID,
    p_resend_id TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE email_logs
    SET
        status = 'sent',
        resend_id = p_resend_id,
        sent_at = NOW()
    WHERE id = p_email_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track email opens
CREATE OR REPLACE FUNCTION track_email_open(
    p_email_log_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE email_logs
    SET
        status = 'opened',
        opened_at = NOW()
    WHERE id = p_email_log_id;

    -- Update newsletter subscription stats
    UPDATE newsletter_subscriptions
    SET
        email_opens = email_opens + 1,
        last_email_opened_at = NOW()
    WHERE user_id = (
        SELECT recipient_user_id FROM email_logs WHERE id = p_email_log_id
    );
END;
$$ LANGUAGE plpgsql;

-- Function to track email clicks
CREATE OR REPLACE FUNCTION track_email_click(
    p_email_log_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE email_logs
    SET
        status = 'clicked',
        clicked_at = NOW()
    WHERE id = p_email_log_id;

    -- Update newsletter subscription stats
    UPDATE newsletter_subscriptions
    SET
        email_clicks = email_clicks + 1,
        last_email_clicked_at = NOW()
    WHERE user_id = (
        SELECT recipient_user_id FROM email_logs WHERE id = p_email_log_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Insert sample economic events for next week
INSERT INTO economic_events (event_name, event_type, event_date, importance, expected_impact, symbols)
VALUES
    ('Federal Reserve FOMC Meeting', 'fed_meeting', NOW() + INTERVAL '3 days', 'critical', 'Major market volatility expected. Watch SPY, TLT, and DXY.', ARRAY['SPY', 'TLT', 'DXY']),
    ('CPI Release', 'cpi', NOW() + INTERVAL '5 days', 'high', 'Inflation data will impact Fed policy expectations.', ARRAY['SPY', 'TLT']),
    ('Apple Earnings Report', 'earnings', NOW() + INTERVAL '7 days', 'high', 'Tech sector leader, impacts QQQ and tech sentiment.', ARRAY['AAPL', 'QQQ'])
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE newsletter_subscriptions IS 'User email subscription preferences and tracking';
COMMENT ON TABLE weekly_briefs IS 'Published weekly economic and trading briefs';
COMMENT ON TABLE email_logs IS 'Audit log of all emails sent by the platform';
COMMENT ON TABLE trade_ideas IS 'Structured trade recommendations included in briefs';
COMMENT ON TABLE economic_events IS 'Upcoming economic events and market catalysts';

-- Grants (optional - adjust based on your security model)
-- GRANT SELECT ON weekly_briefs TO anon;
-- GRANT SELECT ON trade_ideas TO anon;
-- GRANT SELECT ON economic_events TO anon;
