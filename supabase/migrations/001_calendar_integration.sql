-- Calendar Integration Migration
-- TheraLink: Mental Health Therapy Matching Platform
-- Created: November 2025

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROVIDER INTEGRATIONS TABLE
-- Stores OAuth tokens and metadata for each provider connection
-- ============================================
CREATE TABLE IF NOT EXISTS provider_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'outlook', 'calendly', 'acuity', 'simplepractice', 'therapynotes', 'ical')),
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    external_account_id TEXT,
    webhook_channel_id TEXT,
    webhook_expiration TIMESTAMPTZ,
    sync_cursor TEXT,
    last_sync_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(therapist_id, provider)
);

-- ============================================
-- 2. EXTERNAL EVENTS TABLE
-- Maps provider events to local appointments
-- ============================================
CREATE TABLE IF NOT EXISTS external_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES provider_integrations(id) ON DELETE CASCADE,
    external_event_id TEXT NOT NULL,
    local_booking_id UUID,
    event_type TEXT CHECK (event_type IN ('busy', 'appointment', 'block', 'personal')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    raw_event JSONB,
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(integration_id, external_event_id)
);

-- ============================================
-- 3. AVAILABILITY CACHE TABLE
-- Normalized 30-minute UTC time slots
-- ============================================
CREATE TABLE IF NOT EXISTS availability_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_start TIMESTAMPTZ NOT NULL,
    slot_end TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    source TEXT CHECK (source IN ('manual', 'google_calendar', 'outlook', 'calendly', 'acuity', 'simplepractice', 'therapynotes', 'ical', 'theralink')),
    blocking_event_id UUID REFERENCES external_events(id) ON DELETE SET NULL,
    cache_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(therapist_id, slot_start)
);

-- ============================================
-- 4. BOOKINGS TABLE
-- TheraLink booking records (source of truth)
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'soft_hold', 'confirmed', 'cancelled', 'completed', 'no_show')),
    soft_hold_expires_at TIMESTAMPTZ,
    session_type TEXT CHECK (session_type IN ('initial_consultation', 'individual', 'couples', 'family', 'group')),
    external_event_id UUID REFERENCES external_events(id) ON DELETE SET NULL,
    idempotency_key TEXT UNIQUE,
    notes_encrypted TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_confirmed_slot UNIQUE (therapist_id, start_time) WHERE (status = 'confirmed')
);

-- ============================================
-- 5. SYNC LOGS TABLE
-- Audit trail for provider synchronization
-- ============================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES provider_integrations(id) ON DELETE CASCADE,
    sync_type TEXT CHECK (sync_type IN ('full', 'incremental', 'webhook', 'manual')),
    sync_direction TEXT CHECK (sync_direction IN ('pull', 'push')),
    status TEXT CHECK (status IN ('started', 'completed', 'failed', 'partial')),
    events_processed INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    events_deleted INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Provider integrations indexes
CREATE INDEX idx_provider_integrations_therapist ON provider_integrations(therapist_id);
CREATE INDEX idx_provider_integrations_status ON provider_integrations(status);
CREATE INDEX idx_provider_integrations_webhook_exp ON provider_integrations(webhook_expiration) WHERE webhook_expiration IS NOT NULL;

-- External events indexes
CREATE INDEX idx_external_events_integration ON external_events(integration_id);
CREATE INDEX idx_external_events_time_range ON external_events(start_time, end_time);
CREATE INDEX idx_external_events_local_booking ON external_events(local_booking_id) WHERE local_booking_id IS NOT NULL;

-- Availability cache indexes
CREATE INDEX idx_availability_cache_therapist_time ON availability_cache(therapist_id, slot_start);
CREATE INDEX idx_availability_cache_available ON availability_cache(therapist_id, is_available, slot_start) WHERE is_available = TRUE;
CREATE INDEX idx_availability_cache_expires ON availability_cache(cache_expires_at);

-- Bookings indexes
CREATE INDEX idx_bookings_therapist_time ON bookings(therapist_id, start_time);
CREATE INDEX idx_bookings_patient ON bookings(patient_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_soft_hold_expires ON bookings(soft_hold_expires_at) WHERE status = 'soft_hold';

-- Sync logs indexes
CREATE INDEX idx_sync_logs_integration ON sync_logs(integration_id);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE provider_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Provider integrations: Therapists can only see their own integrations
CREATE POLICY provider_integrations_therapist_policy ON provider_integrations
    FOR ALL USING (therapist_id = auth.uid());

-- External events: Therapists can see events from their integrations
CREATE POLICY external_events_therapist_policy ON external_events
    FOR ALL USING (
        integration_id IN (
            SELECT id FROM provider_integrations WHERE therapist_id = auth.uid()
        )
    );

-- Availability cache: Public read for available slots, therapists manage their own
CREATE POLICY availability_cache_read_policy ON availability_cache
    FOR SELECT USING (is_available = TRUE OR therapist_id = auth.uid());

CREATE POLICY availability_cache_manage_policy ON availability_cache
    FOR ALL USING (therapist_id = auth.uid());

-- Bookings: Therapists and patients can see their own bookings
CREATE POLICY bookings_therapist_policy ON bookings
    FOR ALL USING (therapist_id = auth.uid() OR patient_id = auth.uid());

-- Sync logs: Therapists can see logs for their integrations
CREATE POLICY sync_logs_therapist_policy ON sync_logs
    FOR SELECT USING (
        integration_id IN (
            SELECT id FROM provider_integrations WHERE therapist_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_integrations_updated_at
    BEFORE UPDATE ON provider_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_events_updated_at
    BEFORE UPDATE ON external_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE provider_integrations IS 'Stores OAuth credentials and sync state for calendar provider connections';
COMMENT ON TABLE external_events IS 'Maps external calendar events to TheraLink system';
COMMENT ON TABLE availability_cache IS 'Cached availability slots for fast queries (30-min granularity)';
COMMENT ON TABLE bookings IS 'Source of truth for all TheraLink appointments';
COMMENT ON TABLE sync_logs IS 'Audit trail for calendar synchronization operations';

COMMENT ON COLUMN provider_integrations.access_token_encrypted IS 'AES-256 encrypted OAuth access token';
COMMENT ON COLUMN provider_integrations.refresh_token_encrypted IS 'AES-256 encrypted OAuth refresh token';
COMMENT ON COLUMN provider_integrations.sync_cursor IS 'Provider-specific cursor for incremental sync (pageToken/syncToken)';
COMMENT ON COLUMN bookings.idempotency_key IS 'Unique key to prevent duplicate booking creation';
COMMENT ON COLUMN bookings.soft_hold_expires_at IS 'Timestamp when soft hold expires (typically 10 minutes)';
