export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
  global_name?: string;
}

export interface DiscordTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface JWTPayload {
  userId: string;
  discordId: string;
  discordUsername: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  user: any;
  isNewUser: boolean;
  token: string;
}

export interface UserWithRoles {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDiscriminator?: string;
  discordAvatar?: string;
  email?: string;
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      color?: string;
    };
    grantedAt: Date;
    isSystemGranted: boolean;
  }>;
}
