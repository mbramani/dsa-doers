// API response types - what clients receive

export interface ApiResponse<T = any> {
  status: "success" | "error";
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

export enum UserRole {
  NEWBIE = "newbie",
  MEMBER = "member",
  CONTRIBUTOR = "contributor",
  MODERATOR = "moderator",
  ADMIN = "admin",
}

export enum TagCategory {
  SKILL = "skill",
  ACHIEVEMENT = "achievement",
  SPECIAL = "special",
  CONTEST = "contest",
  COMMUNITY = "community",
}

// API DTOs (Data Transfer Objects)
export interface User {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  tags?: UserTag[]; // Populated when needed
}

export interface Tag {
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
  usage_count?: number; // Populated in stats
}

export interface UserTag {
  id: string;
  user_id: string;
  tag_id: string;
  assigned_by?: string;
  assigned_at: Date;
  is_active: boolean;
  is_primary: boolean;
  notes?: string;
  tag?: Tag;
  assigned_by_user?: {
    id: string;
    username: string;
  };
}

export interface DiscordProfile {
  id: string;
  user_id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator?: string;
  discord_avatar?: string;
  guild_joined: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthUser extends User {
  discordProfile?: DiscordProfile;
}

// API request types
export interface CreateTagRequest {
  name: string;
  display_name: string;
  description?: string;
  category: TagCategory;
  color?: string;
  icon?: string;
  is_assignable?: boolean;
  is_earnable?: boolean;
}

export interface UpdateTagRequest {
  name?: string;
  display_name?: string;
  description?: string;
  category?: TagCategory;
  color?: string;
  icon?: string;
  is_assignable?: boolean;
  is_earnable?: boolean;
}

export interface AssignTagRequest {
  user_id: string;
  tag_id: string;
  is_primary?: boolean;
  notes?: string;
}

export interface BulkAssignTagRequest {
  user_ids: string[];
  tag_id: string;
}

export interface RemoveTagRequest {
  user_id: string;
  tag_id: string;
}

export interface SetPrimaryTagRequest {
  user_id: string;
  tag_id: string;
}

export interface CreateUserRequest {
  email?: string;
  username: string;
  avatar_url?: string;
  role?: UserRole;
}

// API response types
export interface TagLeaderboard {
  user_id: string;
  username: string;
  avatar_url?: string;
  tag_count: number;
  primary_tag?: {
    name: string;
    display_name: string;
    color: string;
    icon: string;
  };
}

export interface TagUsageStats {
  name: string;
  display_name: string;
  category: TagCategory;
  color: string;
  icon: string;
  usage_count: number;
  primary_count: number;
  last_assigned?: Date;
}

export interface UserTagStats {
  category: TagCategory;
  tag_count: number;
  tags: Array<{
    name: string;
    display_name: string;
    color: string;
    icon: string;
    assigned_at: Date;
    is_primary: boolean;
  }>;
}

export interface SearchResult {
  user_id: string;
  username: string;
  avatar_url?: string;
  tag_name: string;
  tag_display_name: string;
  tag_color: string;
  tag_icon: string;
  assigned_at: Date;
  is_primary: boolean;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
  isNewUser: boolean;
  discordInviteUrl?: string;
}

export interface DashboardStats {
  totalUsers: number;
  usersByRole: Array<{
    role: UserRole;
    count: number;
  }>;
  discordStats: {
    total_discord_users: number;
    guild_members: number;
  };
  recentSignups: number;
  tagStats: {
    total_tags: number;
    users_with_tags: number;
    total_assignments: number;
  };
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter types
export interface TagFilters {
  category?: TagCategory;
  is_assignable?: boolean;
  is_earnable?: boolean;
  is_active?: boolean;
}

export interface UserFilters {
  role?: UserRole;
  has_discord?: boolean;
  has_tags?: boolean;
}
