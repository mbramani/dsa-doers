export interface TagEntity {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  color: string;
  icon: string;
  is_active: boolean;
  is_assignable: boolean;
  is_earnable: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserTagEntity {
  id: string;
  user_id: string;
  tag_id: string;
  assigned_by: string | null;
  assigned_at: Date;
  is_active: boolean;
  is_primary: boolean;
  notes: string | null;
}

export interface UserEntity {
  id: string;
  email: string | null;
  username: string;
  avatar_url: string | null;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface DiscordProfileEntity {
  id: string;
  user_id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator: string | null;
  discord_avatar: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: Date | null;
  guild_joined: boolean;
  created_at: Date;
  updated_at: Date;
}

// Database input types for creation
export interface CreateTagInput {
  name: string;
  display_name: string;
  description?: string;
  category: string;
  color?: string;
  icon?: string;
  is_assignable?: boolean;
  is_earnable?: boolean;
}

export interface CreateUserTagInput {
  user_id: string;
  tag_id: string;
  assigned_by?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface CreateUserInput {
  email?: string;
  username: string;
  avatar_url?: string;
  role?: string;
}

export interface CreateDiscordProfileInput {
  user_id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator?: string;
  discord_avatar?: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

// Database query result types
export interface UserWithTagsQuery extends UserEntity {
  tags?: UserTagWithTagQuery[];
  discordProfile?: {
    id: string;
    discord_id: string;
    discord_username: string;
    discord_avatar: string | null;
    guild_joined: boolean;
    created_at: Date;
  } | null;
}
export interface UserTagWithTagQuery extends UserTagEntity {
  tag_name: string;
  tag_display_name: string;
  tag_description: string | null;
  tag_category: string;
  tag_color: string;
  tag_icon: string;
  assigned_by_username: string | null;
}

export interface TagUsageStatsQuery {
  name: string;
  display_name: string;
  category: string;
  color: string;
  icon: string;
  usage_count: number;
  primary_count: number;
  last_assigned: Date | null;
}

export interface TagLeaderboardQuery {
  user_id: string;
  username: string;
  avatar_url: string | null;
  tag_count: number;
  primary_tag_name: string | null;
  primary_tag_display_name: string | null;
  primary_tag_color: string | null;
  primary_tag_icon: string | null;
}
