-- UP migration
-- Description: Create user tags system for custom tags like "array101", "tree_master" etc.

-- Create tags table (master list of all available tags)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- e.g., "array101", "tree_master"
  display_name VARCHAR(100) NOT NULL, -- e.g., "Array Master", "Tree Expert"
  description TEXT,
  category VARCHAR(50), -- e.g., "skill", "achievement", "special"
  color VARCHAR(7), -- hex color like "#FF5733"
  icon VARCHAR(50), -- emoji or icon name
  is_active BOOLEAN DEFAULT true,
  is_assignable BOOLEAN DEFAULT true, -- can admins assign this tag?
  is_earnable BOOLEAN DEFAULT false, -- can users earn this automatically?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_tags junction table (many-to-many relationship)
CREATE TABLE user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id), -- who assigned this tag (NULL for auto-earned)
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- is this a primary/featured tag for the user?
  notes TEXT, -- reason for assignment or achievement details
  
  UNIQUE(user_id, tag_id) -- prevent duplicate tags for same user
);

-- Create indexes for performance
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_active ON tags(is_active) WHERE is_active = true;
CREATE INDEX idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX idx_user_tags_tag_id ON user_tags(tag_id);
CREATE INDEX idx_user_tags_active ON user_tags(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_tags_primary ON user_tags(user_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary tag per user
CREATE UNIQUE INDEX idx_user_tags_one_primary 
ON user_tags(user_id) 
WHERE is_primary = true;

-- Insert some default tags
INSERT INTO tags (name, display_name, description, category, color, icon, is_assignable, is_earnable) VALUES
-- Skill-based tags
('array101', 'Array Master', 'Expert in array manipulation and algorithms', 'skill', '#FF5733', '🔢', true, true),
('tree_master', 'Tree Expert', 'Mastered tree data structures and algorithms', 'skill', '#33FF57', '🌳', true, true),
('dp_ninja', 'DP Ninja', 'Dynamic Programming specialist', 'skill', '#3357FF', '⚡', true, true),
('graph_guru', 'Graph Guru', 'Graph algorithms expert', 'skill', '#FF33F5', '🕸️', true, true),
('string_wizard', 'String Wizard', 'String manipulation master', 'skill', '#F5FF33', '🪄', true, true),

-- Achievement tags
('problem_solver', 'Problem Solver', 'Solved 100+ problems', 'achievement', '#FFB133', '🏆', false, true),
('speed_demon', 'Speed Demon', 'Consistently fast problem solving', 'achievement', '#FF3333', '⚡', false, true),
('helper', 'Community Helper', 'Actively helps other members', 'achievement', '#33FFFF', '🤝', true, false),

-- Special tags
('contest_winner', 'Contest Winner', 'Won a coding contest', 'special', '#FFD700', '👑', true, false),
('mentor', 'Mentor', 'Mentors junior developers', 'special', '#9D33FF', '🎯', true, false),
('early_adopter', 'Early Adopter', 'One of the first community members', 'special', '#33FF99', '🌟', true, false);

-- DOWN migration
--@DOWN
DROP TABLE IF EXISTS user_tags;
DROP TABLE IF EXISTS tags;