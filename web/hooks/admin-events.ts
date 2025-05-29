import {
  CreateEventInput,
  DiscordChannel,
  EventEntity,
  EventFilters,
  EventListResponse,
  EventParticipant,
  EventParticipantsResponse,
  EventVoiceAccess,
  EventWithDetails,
  TagOption,
  UpdateEventInput,
} from "@/types/events";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiResponse } from "@/types/api";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

// Fetch events with filters and pagination
export function useAdminEvents(
  page: number = 1,
  limit: number = 20,
  filters?: EventFilters,
) {
  return useQuery({
    queryKey: ["admin-events", page, limit, filters],
    queryFn: async (): Promise<ApiResponse<EventListResponse>> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Add filters to params
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          filters.status.forEach((status) => params.append("status", status));
        } else {
          params.append("status", filters.status);
        }
      }
      if (filters?.event_type) {
        if (Array.isArray(filters.event_type)) {
          filters.event_type.forEach((type) =>
            params.append("event_type", type),
          );
        } else {
          params.append("event_type", filters.event_type);
        }
      }
      if (filters?.created_by) {
        params.append("created_by", filters.created_by);
      }
      if (filters?.start_date) {
        params.append("start_date", filters.start_date);
      }
      if (filters?.end_date) {
        params.append("end_date", filters.end_date);
      }
      if (filters?.search) {
        params.append("search", filters.search);
      }

      try {
        const response = await apiClient.get(`/events?${params.toString()}`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch admin events:", error);
        throw new Error(
          error.response?.data?.message || "Failed to fetch events",
        );
      }
    },
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// Fetch single event details
export function useAdminEvent(eventId: string) {
  return useQuery({
    queryKey: ["admin-event", eventId],
    queryFn: async (): Promise<ApiResponse<EventWithDetails>> => {
      try {
        const response = await apiClient.get(`/events/${eventId}`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch event details:", error);
        throw new Error(
          error.response?.data?.message || "Failed to fetch event details",
        );
      }
    },
    enabled: !!eventId,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Create new event
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      eventData: CreateEventInput,
    ): Promise<ApiResponse<EventEntity>> => {
      try {
        const response = await apiClient.post("/events", eventData);
        return response.data;
      } catch (error: any) {
        console.error("Failed to create event:", error);
        const message =
          error.response?.data?.message || "Failed to create event";
        throw new Error(message);
      }
    },
    onSuccess: (data) => {
      // Invalidate events list to refresh
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });

      // Show success toast
      toast.success(
        `Event "${data.data?.title || "Unknown"}" created successfully!`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update existing event
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      eventData,
    }: {
      eventId: string;
      eventData: UpdateEventInput;
    }): Promise<ApiResponse<EventEntity>> => {
      try {
        const response = await apiClient.put(`/events/${eventId}`, eventData);
        return response.data;
      } catch (error: any) {
        console.error("Failed to update event:", error);
        const message =
          error.response?.data?.message || "Failed to update event";
        throw new Error(message);
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate events list and specific event
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-event", variables.eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });

      toast.success(`Event "${data.data?.title}" updated successfully!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete event
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string): Promise<ApiResponse<void>> => {
      try {
        const response = await apiClient.delete(`/events/${eventId}`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to delete event:", error);
        const message =
          error.response?.data?.message || "Failed to delete event";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      // Invalidate events list to refresh
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// End event and cleanup
export function useEndEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string): Promise<ApiResponse<void>> => {
      try {
        const response = await apiClient.post(`/events/${eventId}/end`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to end event:", error);
        const message = error.response?.data?.message || "Failed to end event";
        throw new Error(message);
      }
    },
    onSuccess: (data, eventId) => {
      // Invalidate events list and specific event
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-event", eventId] });
      queryClient.invalidateQueries({
        queryKey: ["event-participants", eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch event participants
export function useEventParticipants(
  eventId: string,
  page: number = 1,
  limit: number = 20,
) {
  return useQuery({
    queryKey: ["event-participants", eventId, page, limit],
    queryFn: async (): Promise<ApiResponse<EventParticipantsResponse>> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      try {
        const response = await apiClient.get(
          `/events/${eventId}/participants?${params.toString()}`,
        );
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch event participants:", error);
        throw new Error(
          error.response?.data?.message || "Failed to fetch participants",
        );
      }
    },
    enabled: !!eventId,
    staleTime: 30000,
  });
}

// Grant event access for a user
export function useGrantEventAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      notes,
    }: {
      eventId: string;
      userId: string;
      notes?: string;
    }): Promise<ApiResponse<void>> => {
      try {
        const response = await apiClient.post(
          `/events/${eventId}/grant-access`,
          {
            userId,
            notes,
          },
        );
        return response.data;
      } catch (error: any) {
        console.error("Failed to grant event access:", error);
        throw new Error(
          error.response?.data?.message || "Failed to grant access",
        );
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate participants list
      queryClient.invalidateQueries({
        queryKey: ["event-participants", variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-event", variables.eventId],
      });

      toast.success("Access granted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Revoke event access for a user
export function useRevokeEventAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      userId,
      reason,
    }: {
      eventId: string;
      userId: string;
      reason?: string;
    }): Promise<ApiResponse<void>> => {
      try {
        const response = await apiClient.delete(
          `/events/${eventId}/participants/${userId}`,
          {
            data: { reason },
          },
        );
        return response.data;
      } catch (error: any) {
        console.error("Failed to revoke event access:", error);
        throw new Error(
          error.response?.data?.message || "Failed to revoke access",
        );
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate participants list
      queryClient.invalidateQueries({
        queryKey: ["event-participants", variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-event", variables.eventId],
      });

      toast.success("Access revoked successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Bulk manage participants
export function useBulkManageParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      action,
      userIds,
      reason,
    }: {
      eventId: string;
      action: "grant" | "revoke";
      userIds: string[];
      reason?: string;
    }): Promise<ApiResponse<{ processed: number; failed: number }>> => {
      try {
        const response = await apiClient.post(
          `/events/${eventId}/bulk-manage`,
          {
            action,
            userIds,
            reason,
          },
        );
        return response.data;
      } catch (error: any) {
        console.error("Failed to bulk manage participants:", error);
        throw new Error(
          error.response?.data?.message || "Failed to manage participants",
        );
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["event-participants", variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin-event", variables.eventId],
      });

      const { processed, failed } = data.data || { processed: 0, failed: 0 };
      if (failed > 0) {
        toast.warning(`Processed ${processed} users, ${failed} failed`);
      } else {
        toast.success(`Successfully processed ${processed} users`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Fetch Discord channels for selection
export function useDiscordChannels() {
  return useQuery({
    queryKey: ["discord-channels"],
    queryFn: async (): Promise<ApiResponse<DiscordChannel[]>> => {
      try {
        const response = await apiClient.get("/admin/discord/channels");
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch Discord channels:", error);
        throw new Error(
          error.response?.data?.message || "Failed to fetch Discord channels",
        );
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

// Fetch available tags for event creation
export function useAvailableTags() {
  return useQuery({
    queryKey: ["available-tags"],
    queryFn: async (): Promise<ApiResponse<{ tags: TagOption[] }>> => {
      try {
        const response = await apiClient.get("/admin/tags");
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch available tags:", error);
        throw new Error(
          error.response?.data?.message || "Failed to fetch tags",
        );
      }
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}
