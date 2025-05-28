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

// Event-related database entities
export interface EventEntity {
  id: string;
  title: string;
  description: string | null;
  discord_event_id: string | null;
  event_type: EventType;
  status: EventStatus;
  start_time: Date;
  end_time: Date | null;
  voice_channel_id: string;
  event_role_id: string | null;
  max_participants: number | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface EventRequiredTagEntity {
  id: string;
  event_id: string;
  tag_id: string;
  created_at: Date;
}

export interface EventParticipantEntity {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipantStatus;
  requested_at: Date;
  processed_at: Date | null;
  processed_by: string | null;
  notes: string | null;
}

export interface EventVoiceAccessEntity {
  id: string;
  event_id: string;
  user_id: string;
  discord_user_id: string;
  status: VoiceAccessStatus;
  granted_at: Date;
  revoked_at: Date | null;
  granted_by_system: boolean;
  revoke_reason: string | null;
}

// Enums for type safety
export enum EventType {
  SESSION = "session",
  CONTEST = "contest",
  WORKSHOP = "workshop",
  STUDY_GROUP = "study_group",
  MOCK_INTERVIEW = "mock_interview",
  CODE_REVIEW = "code_review",
  DISCUSSION = "discussion",
}

export enum EventStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum ParticipantStatus {
  REQUESTED = "requested",
  GRANTED = "granted",
  DENIED = "denied",
  REVOKED = "revoked",
}

export enum VoiceAccessStatus {
  ACTIVE = "active",
  REVOKED = "revoked",
}

// Input types for creation
export interface CreateEventInput {
  title: string;
  description?: string;
  event_type: EventType;
  start_time: Date;
  end_time?: Date;
  voice_channel_id: string;
  max_participants?: number;
  required_tag_ids: string[];
  created_by: string;
}

export interface RequestEventAccessInput {
  event_id: string;
  user_id: string;
  notes?: string;
}

export interface CreateEventParticipantInput {
  event_id: string;
  user_id: string;
  status?: ParticipantStatus;
  notes?: string;
}

export interface CreateEventVoiceAccessInput {
  event_id: string;
  user_id: string;
  discord_user_id: string;
  granted_by_system?: boolean;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  event_type?: EventType;
  start_time?: Date;
  end_time?: Date;
  voice_channel_id?: string;
  max_participants?: number;
  status?: EventStatus;
}

// Query result types with joins
export interface EventWithDetailsQuery extends EventEntity {
  // Creator information
  creator_username: string;
  creator_avatar_url: string | null;

  // Participant statistics
  participant_count: number;
  granted_participants: number;
  voice_access_count: number;

  // Required tags information
  required_tags: {
    id: string;
    tag_id: string;
    name: string;
    display_name: string;
    color: string;
    icon: string;
    category: string;
  }[];
}

export interface EventParticipantWithUserQuery extends EventParticipantEntity {
  // User information
  username: string;
  avatar_url: string | null;
  discord_id: string | null;

  // User's tags (to verify eligibility)
  user_tags: {
    tag_id: string;
    tag_name: string;
    tag_display_name: string;
    tag_color: string;
    tag_icon: string;
    is_primary: boolean;
  }[];
}

export interface EventVoiceAccessWithUserQuery extends EventVoiceAccessEntity {
  // User information
  username: string;
  avatar_url: string | null;

  // Event information
  event_title: string;
  event_type: EventType;
  voice_channel_id: string;
}

export interface UserEventEligibilityQuery {
  user_id: string;
  event_id: string;
  is_eligible: boolean;
  has_all_required_tags: boolean;
  missing_required_tags: {
    tag_id: string;
    name: string;
    display_name: string;
    color: string;
    icon: string;
  }[];
  user_tags: {
    tag_id: string;
    name: string;
    display_name: string;
    color: string;
    icon: string;
    is_primary: boolean;
  }[];
}

export interface EventListQuery extends EventEntity {
  // Creator info
  creator_username: string;

  // Statistics
  participant_count: number;
  voice_access_count: number;

  // Required tags (limited for list view)
  required_tag_count: number;
  required_tags_preview: {
    name: string;
    display_name: string;
    color: string;
    icon: string;
  }[];

  // Current user's status (if user_id provided in query)
  user_participation_status: ParticipantStatus | null;
  user_has_voice_access: boolean;
  user_can_join: boolean; // based on tag eligibility
}

// Event filters for queries
export interface EventFilters {
  status?: EventStatus | EventStatus[];
  event_type?: EventType | EventType[];
  created_by?: string;
  start_date?: Date;
  end_date?: Date;
  voice_channel_id?: string;
  user_eligible_only?: boolean; // filter to only events user can join
  search?: string; // search in title/description
}

// Pagination for event lists
export interface EventPaginationQuery {
  page?: number;
  limit?: number;
  sort_by?: "start_time" | "created_at" | "title" | "participant_count";
  sort_order?: "asc" | "desc";
}

// Event statistics for admin dashboard
export interface EventStatsQuery {
  total_events: number;
  active_events: number;
  completed_events: number;
  total_participants: number;
  avg_participants_per_event: number;
  most_popular_event_type: EventType;
  upcoming_events_count: number;
  events_by_type: {
    event_type: EventType;
    count: number;
  }[];
  events_by_status: {
    status: EventStatus;
    count: number;
  }[];
}

// Voice channel access audit log
export interface VoiceAccessAuditQuery {
  id: string;
  event_id: string;
  event_title: string;
  user_id: string;
  username: string;
  discord_user_id: string;
  action: "granted" | "revoked";
  timestamp: Date;
  granted_by_system: boolean;
  revoke_reason: string | null;
  voice_channel_id: string;
}
