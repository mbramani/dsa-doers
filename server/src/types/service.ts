// Internal service types - used between layers

import { TagCategory, UserRole } from "./api";

// Service layer DTOs
export interface CreateTagData {
  name: string;
  display_name: string;
  description?: string;
  category: TagCategory;
  color?: string;
  icon?: string;
  is_assignable?: boolean;
  is_earnable?: boolean;
}

export interface UpdateTagData {
  name?: string;
  display_name?: string;
  description?: string;
  category?: TagCategory;
  color?: string;
  icon?: string;
  is_assignable?: boolean;
  is_earnable?: boolean;
}

export interface AssignTagData {
  user_id: string;
  tag_id: string;
  assigned_by?: string;
  is_primary?: boolean;
  notes?: string;
}

export interface CreateUserData {
  email?: string;
  username: string;
  avatar_url?: string;
  role?: UserRole;
}

export interface CreateDiscordProfileData {
  user_id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator?: string;
  discord_avatar?: string;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

// Repository return types
export interface TagWithStats {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: TagCategory;
  color: string;
  icon: string;
  is_active: boolean;
  is_assignable: boolean;
  is_earnable: boolean;
  created_at: Date;
  updated_at: Date;
  usage_count: number;
  primary_count: number;
}

export interface UserWithTags {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  tags: Array<{
    id: string;
    tag_id: string;
    assigned_at: Date;
    is_primary: boolean;
    tag: {
      id: string;
      name: string;
      display_name: string;
      color: string;
      icon: string;
      category: TagCategory;
    };
  }>;
}

// Search and filter types
export interface TagSearchOptions {
  category?: TagCategory;
  is_assignable?: boolean;
  is_earnable?: boolean;
  search_term?: string;
  limit?: number;
  offset?: number;
}

export interface UserSearchOptions {
  role?: UserRole;
  has_discord?: boolean;
  has_tags?: boolean;
  search_term?: string;
  limit?: number;
  offset?: number;
}

export interface UserTagSearchOptions {
  user_id?: string;
  tag_id?: string;
  category?: TagCategory;
  is_primary?: boolean;
  assigned_by?: string;
  search_term?: string;
  limit?: number;
  offset?: number;
}
