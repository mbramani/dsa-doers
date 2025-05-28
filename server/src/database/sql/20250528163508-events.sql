-- UP migration
-- Description: events system - tag-based voice channel access

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discord_event_id VARCHAR(255) UNIQUE, -- Discord scheduled event ID
    event_type VARCHAR(50) NOT NULL, -- 'session', 'contest', 'workshop', etc.
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'completed', 'cancelled'
    
    -- Scheduling
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    
    -- Discord Integration
    voice_channel_id VARCHAR(255) NOT NULL, -- Required voice channel for the event
    event_role_id VARCHAR(255), -- Temporary Discord role for event access (optional)
    
    -- Settings
    max_participants INTEGER, -- NULL means unlimited
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event required tags - defines which tags are needed to join voice channel
CREATE TABLE event_required_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(event_id, tag_id)
);

-- Event participants - users who requested access to the event
CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request status
    status VARCHAR(20) NOT NULL DEFAULT 'requested', -- 'requested', 'granted', 'denied', 'revoked'
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id), -- admin who processed the request
    
    -- Additional info
    notes TEXT, -- reason for denial or special notes
    
    UNIQUE(event_id, user_id)
);

-- Event voice access - tracks who has actual Discord voice channel access
CREATE TABLE event_voice_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discord_user_id VARCHAR(255) NOT NULL, -- Discord ID for permission management
    
    -- Access status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'revoked'
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    granted_by_system BOOLEAN DEFAULT true, -- true if auto-granted, false if manually granted
    revoke_reason VARCHAR(100), -- 'event_ended', 'manually_revoked', 'user_left'
    
    UNIQUE(event_id, user_id)
);

-- Indexes for better performance
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_discord_event ON events(discord_event_id);
CREATE INDEX idx_events_voice_channel ON events(voice_channel_id);

CREATE INDEX idx_event_required_tags_event ON event_required_tags(event_id);
CREATE INDEX idx_event_required_tags_tag ON event_required_tags(tag_id);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_user ON event_participants(user_id);
CREATE INDEX idx_event_participants_status ON event_participants(status);

CREATE INDEX idx_event_voice_access_event ON event_voice_access(event_id);
CREATE INDEX idx_event_voice_access_user ON event_voice_access(user_id);
CREATE INDEX idx_event_voice_access_discord ON event_voice_access(discord_user_id);
CREATE INDEX idx_event_voice_access_status ON event_voice_access(status);

-- Updated_at trigger function (reuse existing if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger for events table
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- DOWN migration
--@DOWN

-- Drop triggers
DROP TRIGGER IF EXISTS update_events_updated_at ON events;

-- Drop function if no other tables use it
-- Note: Only drop if this is the only table using it
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order
DROP TABLE IF EXISTS event_voice_access;
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS event_required_tags;
DROP TABLE IF EXISTS events;