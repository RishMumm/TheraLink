-- ============================================
-- TheraLink Newsletter Subscribers Table
-- Migration 002: Newsletter subscription system
-- ============================================

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    
    -- Subscription management
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed BOOLEAN DEFAULT FALSE,
    confirm_token TEXT,
    confirmed_at TIMESTAMPTZ,
    
    -- Unsubscribe tracking
    unsubscribed BOOLEAN DEFAULT FALSE,
    unsubscribed_at TIMESTAMPTZ,
    unsubscribe_reason TEXT,
    
    -- Preferences
    frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    topics TEXT[] DEFAULT ARRAY['wellness', 'tips', 'resources'],
    
    -- Metadata
    source TEXT DEFAULT 'website', -- website, chatbot, therapist_referral
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_confirmed ON newsletter_subscribers(confirmed) WHERE confirmed = TRUE;

-- Enable Row Level Security
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe to newsletter"
    ON newsletter_subscribers FOR INSERT
    WITH CHECK (true);

-- Policy: Only the subscriber can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON newsletter_subscribers FOR SELECT
    USING (
        email = current_setting('request.jwt.claims', true)::json->>'email'
        OR auth.uid() = user_id
    );

-- Policy: Only the subscriber can update their preferences
CREATE POLICY "Users can update own subscription"
    ON newsletter_subscribers FOR UPDATE
    USING (
        email = current_setting('request.jwt.claims', true)::json->>'email'
        OR auth.uid() = user_id
    );

-- Policy: Service role can manage all subscriptions (for sending newsletters)
CREATE POLICY "Service role full access"
    ON newsletter_subscribers FOR ALL
    USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_newsletter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_updated_at
    BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_updated_at();

-- Newsletter sends log (for tracking)
CREATE TABLE IF NOT EXISTS newsletter_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    content_preview TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    recipient_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Content sources used
    quote_used TEXT,
    articles_linked TEXT[],
    
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages newsletter sends"
    ON newsletter_sends FOR ALL
    USING (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE newsletter_subscribers IS 'Mental health newsletter subscription management - HIPAA note: Do not store PHI in newsletter content';
