-- UP migration
-- Description: Add user roles system

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('newbie', 'member', 'contributor', 'moderator', 'admin');

-- Add role column to users table
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'newbie';

-- Create index on role for faster queries
CREATE INDEX idx_users_role ON users(role);

-- DOWN migration
--@DOWN
DROP INDEX IF EXISTS idx_users_role;
ALTER TABLE users DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS user_role;