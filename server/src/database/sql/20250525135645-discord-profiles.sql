-- UP migration
-- Description: Create users and discord profiles tables

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    username VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discord_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    discord_username VARCHAR(100) NOT NULL,
    discord_discriminator VARCHAR(10),
    discord_avatar VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    guild_joined BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discord_profiles_user_id ON discord_profiles(user_id);
CREATE INDEX idx_discord_profiles_discord_id ON discord_profiles(discord_id);

-- DOWN migration
--@DOWN
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS discord_profiles;
