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
