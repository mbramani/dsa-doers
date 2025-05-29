import {
  EventEligibility,
  EventFilters,
  EventListResponse,
  EventWithDetails,
} from "@/types/events";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiResponse } from "@/types/api";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

// Fetch public events with filters
export function useEvents(
  page: number = 1,
  limit: number = 12,
  filters?: EventFilters,
) {
  return useQuery({
    queryKey: ["events", page, limit, filters],
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
      if (filters?.search) {
        params.append("search", filters.search);
      }

      try {
        const response = await apiClient.get(
          `/events/public?${params.toString()}`,
        );
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch events:", error);
        throw new Error(
          error.response?.data?.message || "Failed to fetch events",
        );
      }
    },
    staleTime: 60000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// Fetch single event details
export function useEventDetails(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: async (): Promise<ApiResponse<EventWithDetails>> => {
      try {
        const response = await apiClient.get(`/events/${eventId}`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch event details:", error);
        throw new Error(error.response?.data?.message || "Event not found");
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

// Fetch user's events (events they have access to)
export function useMyEvents() {
  return useQuery({
    queryKey: ["my-events"],
    queryFn: async (): Promise<ApiResponse<EventWithDetails[]>> => {
      try {
        const response = await apiClient.get("/events/my-events");
        return response.data;
      } catch (error: any) {
        console.error("Failed to fetch my events:", error);
        throw new Error(
          error.response?.data?.message || "Failed to fetch your events",
        );
      }
    },
    staleTime: 60000, // 1 minute
    retry: 2,
  });
}

// Check event eligibility for current user
export function useEventEligibility(eventId: string) {
  return useQuery({
    queryKey: ["event-eligibility", eventId],
    queryFn: async (): Promise<ApiResponse<EventEligibility>> => {
      try {
        const response = await apiClient.get(`/events/${eventId}/eligibility`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to check event eligibility:", error);
        throw new Error(
          error.response?.data?.message || "Failed to check eligibility",
        );
      }
    },
    enabled: !!eventId,
    staleTime: 300000, // 5 minutes
    retry: 1,
  });
}

// Check if user has access to event
export function useEventAccessStatus(eventId: string) {
  return useQuery({
    queryKey: ["event-access-status", eventId],
    queryFn: async (): Promise<
      ApiResponse<{ hasAccess: boolean; status: string }>
    > => {
      try {
        const response = await apiClient.get(
          `/events/${eventId}/access-status`,
        );
        return response.data;
      } catch (error: any) {
        console.error("Failed to check access status:", error);
        throw new Error(
          error.response?.data?.message || "Failed to check access status",
        );
      }
    },
    enabled: !!eventId,
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// Request access to an event
export function useRequestEventAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string): Promise<ApiResponse<void>> => {
      try {
        const response = await apiClient.post(
          `/events/${eventId}/request-access`,
        );
        return response.data;
      } catch (error: any) {
        console.error("Failed to request event access:", error);
        const message =
          error.response?.data?.message || "Failed to request access";
        throw new Error(message);
      }
    },
    onSuccess: (data, eventId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["my-events"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({
        queryKey: ["event-access-status", eventId],
      });

      // Don't show toast here, let the component handle it
    },
    onError: (error: Error) => {
      // Don't show toast here, let the component handle it
      console.error("Request access error:", error);
    },
  });
}

// Join event Discord voice channel
export function useJoinEventVoice() {
  return useMutation({
    mutationFn: async (
      eventId: string,
    ): Promise<ApiResponse<{ inviteUrl: string }>> => {
      try {
        const response = await apiClient.post(`/events/${eventId}/join-voice`);
        return response.data;
      } catch (error: any) {
        console.error("Failed to join voice channel:", error);
        throw new Error(
          error.response?.data?.message || "Failed to join voice channel",
        );
      }
    },
    onSuccess: (data) => {
      // Open Discord invite in new tab
      if (data.data?.inviteUrl) {
        window.open(data.data.inviteUrl, "_blank");
        toast.success("Opening Discord voice channel...");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
