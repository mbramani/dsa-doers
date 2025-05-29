// Event-related types for the frontend

export interface EventEntity {
  id: string;
  title: string;
  description: string | null;
  discord_event_id: string | null;
  event_type: EventType;
  status: EventStatus;
  start_time: string; // ISO string
  end_time: string | null; // ISO string
  voice_channel_id: string;
  event_role_id: string | null;
  max_participants: number | null;
  created_by: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

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

// Event with additional details for display
export interface EventWithDetails extends EventEntity {
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

// Participant information
export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipantStatus;
  requested_at: string;
  processed_at: string | null;
  processed_by: string | null;
  notes: string | null;

  // User information
  username: string;
  avatar_url: string | null;
  discord_id: string | null;
}

// Voice access information
export interface EventVoiceAccess {
  id: string;
  event_id: string;
  user_id: string;
  discord_user_id: string;
  status: VoiceAccessStatus;
  granted_at: string;
  revoked_at: string | null;
  granted_by_system: boolean;
  revoke_reason: string | null;

  // User information
  username: string;
  avatar_url: string | null;
}

// Form input types
export interface CreateEventInput {
  title: string;
  description?: string;
  event_type: EventType;
  start_time: string; // ISO string
  end_time?: string; // ISO string
  voice_channel_id: string;
  max_participants?: number;
  required_tag_ids: string[];
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  event_type?: EventType;
  start_time?: string;
  end_time?: string;
  voice_channel_id?: string;
  max_participants?: number;
  status?: EventStatus;
}

// Filter types
export interface EventFilters {
  status?: EventStatus | EventStatus[];
  event_type?: EventType | EventType[];
  created_by?: string;
  start_date?: string; // ISO string
  end_date?: string; // ISO string
  voice_channel_id?: string;
  search?: string; // search in title/description
}

// Pagination for event lists
export interface EventPaginationQuery {
  page?: number;
  limit?: number;
  sort_by?: "start_time" | "created_at" | "title" | "participant_count";
  sort_order?: "asc" | "desc";
}

// Discord channel information
export interface DiscordChannel {
  id: string;
  name: string;
  type: "voice" | "stage";
}

// Tag information for selection
export interface TagOption {
  id: string;
  name: string;
  display_name: string;
  color: string;
  icon: string;
  category: string;
  is_active: boolean;
}

// API response types
export interface EventListResponse {
  data: EventWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventParticipantsResponse {
  data: EventParticipant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Form validation schemas (you can implement with Zod later)
export interface EventFormData {
  title: string;
  description: string;
  event_type: EventType;
  start_time: Date;
  end_time: Date | null;
  voice_channel_id: string;
  max_participants: number | null;
  required_tag_ids: string[];
}

// User eligibility information
export interface EventEligibility {
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

// Event statistics for admin dashboard
export interface EventStats {
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
