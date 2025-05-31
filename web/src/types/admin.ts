// Base role type matching your API response
export interface Role {
  id: string;
  name: string;
  description: string;
  discordRoleId: string;
  sortOrder: number;
  isArchived: boolean;
  color: string;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
  userRoles: RoleUserRole[];
}

// User role relationship from role perspective
export interface RoleUserRole {
  id: string;
  userId: string;
  roleId: string;
  grantedAt: string;
  grantedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  grantReason: string;
  revokeReason: string | null;
  isSystemGranted: boolean;
  user: {
    id: string;
    discordUsername: string;
    discordAvatar: string | null;
  };
}

// User role relationship from user perspective
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  grantedAt: string;
  grantedBy: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  grantReason: string;
  revokeReason: string | null;
  isSystemGranted: boolean;
  role: {
    id: string;
    name: string;
    description: string;
    discordRoleId: string;
    sortOrder: number;
    isArchived: boolean;
    color: string;
    isSystemRole: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

// User with roles
export interface UserWithRoles {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDiscriminator: string;
  discordAvatar: string | null;
  email: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  userRoles: UserRole[];
}

// Role creation and update types
export interface CreateRoleData {
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  isSystemRole: boolean;
  discordRoleConfig: {
    permissions: string[];
    hoist: boolean;
    mentionable: boolean;
  };
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  isSystemRole?: boolean;
  discordRoleConfig?: {
    permissions?: string[];
    hoist?: boolean;
    mentionable?: boolean;
  };
}

// Role filters and query types
export interface RoleFilters {
  page: number;
  limit: number;
  search?: string;
  isSystemRole?: boolean;
  sortBy: "name" | "sortOrder" | "createdAt";
  sortOrder: "asc" | "desc";
  all?: boolean;
}

// Role action types
export interface RoleActionData {
  userId: string;
  roleNames: string[];
  reason: string;
  syncWithDiscord: boolean;
}

export type AssignRoleData = RoleActionData;
export type RevokeRoleData = RoleActionData;

// Role assignment results
export interface RoleAssignmentResult {
  appliedRoles: string[];
  skippedRoles: string[];
  errors?: string[];
}

// Role statistics
export interface RoleStats {
  totalRoles: number;
  systemRoles: number;
  customRoles: number;
  usersWithRoles: number;
  roleDistribution: Array<{
    roleName: string;
    userCount: number;
    color: string;
    isSystemRole: boolean;
  }>;
}

// Paginated roles response
export interface PaginatedRoles {
  data: Role[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User analytics
export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  archivedUsers: number;
  newUsersThisMonth: number;
  roleDistribution: Array<{
    roleName: string;
    count: number;
  }>;
  registrationTrend: Array<{
    date: string;
    count: number;
  }>;
}

// User filters
export interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status: "active" | "archived" | "all";
  registeredAfter?: string;
  registeredBefore?: string;
  sortBy: "createdAt" | "discordUsername" | "lastActivity";
  sortOrder: "asc" | "desc";
}

// Paginated users response
export interface PaginatedUsers {
  data: UserWithRoles[];
  pagination: {
    page: string;
    limit: string;
    total: number;
    totalPages: number;
  };
}

// Sync result
export interface SyncResult {
  added: string[];
  removed: string[];
  errors: string[];
}

// Discord permission types
export interface DiscordPermission {
  id: string;
  label: string;
  description: string;
  category?: "general" | "text" | "voice" | "membership" | "advanced";
}

export const DISCORD_PERMISSIONS: DiscordPermission[] = [
  // General Permissions
  {
    id: "ADMINISTRATOR",
    label: "Administrator",
    description: "Full control over the server",
    category: "advanced",
  },
  {
    id: "VIEW_AUDIT_LOG",
    label: "View Audit Log",
    description: "View audit log entries",
    category: "advanced",
  },
  {
    id: "VIEW_SERVER_INSIGHTS",
    label: "View Server Insights",
    description: "View server analytics",
    category: "general",
  },
  {
    id: "MANAGE_GUILD",
    label: "Manage Server",
    description: "Manage server settings",
    category: "advanced",
  },
  {
    id: "MANAGE_ROLES",
    label: "Manage Roles",
    description: "Create, edit, and delete roles",
    category: "advanced",
  },
  {
    id: "MANAGE_CHANNELS",
    label: "Manage Channels",
    description: "Create, edit, and delete channels",
    category: "advanced",
  },
  {
    id: "KICK_MEMBERS",
    label: "Kick Members",
    description: "Remove members from server",
    category: "membership",
  },
  {
    id: "BAN_MEMBERS",
    label: "Ban Members",
    description: "Ban members from server",
    category: "membership",
  },
  {
    id: "CREATE_INSTANT_INVITE",
    label: "Create Invite",
    description: "Create invitation links",
    category: "general",
  },
  {
    id: "CHANGE_NICKNAME",
    label: "Change Nickname",
    description: "Change own nickname",
    category: "general",
  },
  {
    id: "MANAGE_NICKNAMES",
    label: "Manage Nicknames",
    description: "Change others' nicknames",
    category: "membership",
  },
  {
    id: "MANAGE_EMOJIS_AND_STICKERS",
    label: "Manage Emojis and Stickers",
    description: "Create and delete emojis/stickers",
    category: "general",
  },
  {
    id: "MANAGE_WEBHOOKS",
    label: "Manage Webhooks",
    description: "Create, edit, and delete webhooks",
    category: "advanced",
  },

  // Text Permissions
  {
    id: "VIEW_CHANNEL",
    label: "View Channels",
    description: "View text and voice channels",
    category: "text",
  },
  {
    id: "SEND_MESSAGES",
    label: "Send Messages",
    description: "Send messages in text channels",
    category: "text",
  },
  {
    id: "SEND_TTS_MESSAGES",
    label: "Send TTS Messages",
    description: "Send text-to-speech messages",
    category: "text",
  },
  {
    id: "MANAGE_MESSAGES",
    label: "Manage Messages",
    description: "Delete and pin messages",
    category: "text",
  },
  {
    id: "EMBED_LINKS",
    label: "Embed Links",
    description: "Create embedded content from links",
    category: "text",
  },
  {
    id: "ATTACH_FILES",
    label: "Attach Files",
    description: "Upload files and media",
    category: "text",
  },
  {
    id: "READ_MESSAGE_HISTORY",
    label: "Read Message History",
    description: "View message history",
    category: "text",
  },
  {
    id: "MENTION_EVERYONE",
    label: "Mention Everyone",
    description: "Use @everyone and @here",
    category: "text",
  },
  {
    id: "USE_EXTERNAL_EMOJIS",
    label: "Use External Emojis",
    description: "Use emojis from other servers",
    category: "text",
  },
  {
    id: "USE_EXTERNAL_STICKERS",
    label: "Use External Stickers",
    description: "Use stickers from other servers",
    category: "text",
  },
  {
    id: "ADD_REACTIONS",
    label: "Add Reactions",
    description: "React to messages with emojis",
    category: "text",
  },
  {
    id: "USE_SLASH_COMMANDS",
    label: "Use Slash Commands",
    description: "Use application commands",
    category: "text",
  },
  {
    id: "MANAGE_THREADS",
    label: "Manage Threads",
    description: "Create and manage threads",
    category: "text",
  },
  {
    id: "CREATE_PUBLIC_THREADS",
    label: "Create Public Threads",
    description: "Create public threads",
    category: "text",
  },
  {
    id: "CREATE_PRIVATE_THREADS",
    label: "Create Private Threads",
    description: "Create private threads",
    category: "text",
  },
  {
    id: "SEND_MESSAGES_IN_THREADS",
    label: "Send Messages in Threads",
    description: "Send messages in threads",
    category: "text",
  },

  // Voice Permissions
  {
    id: "CONNECT",
    label: "Connect",
    description: "Connect to voice channels",
    category: "voice",
  },
  {
    id: "SPEAK",
    label: "Speak",
    description: "Speak in voice channels",
    category: "voice",
  },
  {
    id: "MUTE_MEMBERS",
    label: "Mute Members",
    description: "Mute members in voice channels",
    category: "voice",
  },
  {
    id: "DEAFEN_MEMBERS",
    label: "Deafen Members",
    description: "Deafen members in voice channels",
    category: "voice",
  },
  {
    id: "MOVE_MEMBERS",
    label: "Move Members",
    description: "Move members between voice channels",
    category: "voice",
  },
  {
    id: "USE_VAD",
    label: "Use Voice Activity",
    description: "Use voice activity detection",
    category: "voice",
  },
  {
    id: "PRIORITY_SPEAKER",
    label: "Priority Speaker",
    description: "Lower others' volume when speaking",
    category: "voice",
  },
  {
    id: "STREAM",
    label: "Video",
    description: "Share video in voice channels",
    category: "voice",
  },
  {
    id: "REQUEST_TO_SPEAK",
    label: "Request to Speak",
    description: "Request to speak in stage channels",
    category: "voice",
  },
];

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = {
  general: { label: "General Permissions", icon: "⚙️" },
  text: { label: "Text Permissions", icon: "💬" },
  voice: { label: "Voice Permissions", icon: "🎤" },
  membership: { label: "Membership Permissions", icon: "👥" },
  advanced: { label: "Advanced Permissions", icon: "🔒" },
};
