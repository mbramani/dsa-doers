export interface ApiResponse<T = any> {
  status: "success" | "error";
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

export interface User {
  id: string;
  email?: string;
  username: string;
  avatar_url?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  tags?: UserTag[];
}

export interface DiscordProfile {
  id: string;
  user_id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator?: string;
  discord_avatar?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: Date;
  guild_joined: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthUser extends User {
  discordProfile?: DiscordProfile;
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
  usage_count?: number;
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
  is_active?: boolean;
}

export interface AssignTagRequest {
  user_id: string;
  tag_id: string;
  is_primary?: boolean;
  notes?: string;
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

export interface AuthResult {
  user: AuthUser;
  token: string;
  isNewUser: boolean;
  discordInviteUrl?: string;
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
