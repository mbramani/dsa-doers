import {
  AssignTagRequest,
  CreateTagRequest,
  Tag,
  TagUsageStats,
  UpdateTagRequest,
  UserRole,
  UserTag,
} from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";
import { useState } from "react"; // Add this import

const adminApi = {
  getDashboardStats: async () => {
    const response = await apiClient.get("/admin/dashboard/stats");
    return response.data;
  },

  getUsers: async (page = 1, limit = 20, search = "") => {
    const response = await apiClient.get(
      `/admin/users?page=${page}&limit=${limit}&search=${search}`,
    );
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserRole: async ({
    userId,
    role,
  }: {
    userId: string;
    role: UserRole;
  }) => {
    const response = await apiClient.put(`/admin/users/${userId}/role`, {
      role,
    });
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  syncDiscord: async (userId: string) => {
    const response = await apiClient.post(
      `/admin/users/${userId}/sync-discord`,
    );
    return response.data;
  },

  // New tag-related functions
  getTags: async () => {
    const response = await apiClient.get("/admin/tags");
    return response.data;
  },

  getAssignableTags: async () => {
    const response = await apiClient.get("/admin/tags/assignable");
    return response.data;
  },

  getTag: async (tagId: string) => {
    const response = await apiClient.get(`/admin/tags/${tagId}`);
    return response.data;
  },

  createTag: async (tagData: CreateTagRequest) => {
    const response = await apiClient.post("/admin/tags", tagData);
    return response.data;
  },

  updateTag: async ({
    tagId,
    tagData,
  }: {
    tagId: string;
    tagData: UpdateTagRequest;
  }) => {
    const response = await apiClient.put(`/admin/tags/${tagId}`, tagData);
    return response.data;
  },

  deleteTag: async (tagId: string) => {
    const response = await apiClient.delete(`/admin/tags/${tagId}`);
    return response.data;
  },

  assignTag: async (assignData: AssignTagRequest) => {
    const response = await apiClient.post("/admin/tags/assign", assignData);
    return response.data;
  },

  bulkAssignTag: async ({
    tagId,
    userIds,
  }: {
    tagId: string;
    userIds: string[];
  }) => {
    const response = await apiClient.post("/admin/tags/bulk-assign", {
      tag_id: tagId,
      user_ids: userIds,
    });
    return response.data;
  },

  removeTag: async ({ userId, tagId }: { userId: string; tagId: string }) => {
    const response = await apiClient.delete("/admin/tags/remove", {
      data: { user_id: userId, tag_id: tagId },
    });
    return response.data;
  },

  setPrimaryTag: async ({
    userId,
    tagId,
  }: {
    userId: string;
    tagId: string;
  }) => {
    const response = await apiClient.post("/admin/tags/set-primary", {
      user_id: userId,
      tag_id: tagId,
    });
    return response.data;
  },

  getTagStats: async () => {
    const response = await apiClient.get("/admin/tags/stats");
    return response.data;
  },

  searchTags: async (searchTerm: string, limit = 50) => {
    const response = await apiClient.get(
      `/admin/tags/search?q=${encodeURIComponent(searchTerm)}&limit=${limit}`,
    );
    return response.data;
  },

  getTagLeaderboard: async (tagName?: string) => {
    const url = tagName
      ? `/admin/tags/leaderboard?tag=${encodeURIComponent(tagName)}`
      : "/admin/tags/leaderboard";
    const response = await apiClient.get(url);
    return response.data;
  },

  searchUserTags: async (query: string, limit = 50) => {
    const response = await apiClient.get(
      `/admin/tags/user-tags/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    return response.data;
  },

  syncUserTagsWithDiscord: async (userId: string) => {
    const response = await apiClient.post(
      `/admin/discord/sync-user-tags/${userId}`,
    );
    return response.data;
  },
};

// Existing user hooks
export const useAdminStats = () => {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.getDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAdminUsers = (page: number, limit: number, search: string) => {
  return useQuery({
    queryKey: ["admin", "users", page, limit, search],
    queryFn: () => adminApi.getUsers(page, limit, search),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
};

export const useSyncDiscord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.syncDiscord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
};

// New tag management hooks

// Query hooks for reading data
export const useAdminTags = () => {
  return useQuery({
    queryKey: ["admin", "tags"],
    queryFn: adminApi.getTags,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAssignableTags = () => {
  return useQuery({
    queryKey: ["admin", "tags", "assignable"],
    queryFn: adminApi.getAssignableTags,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAdminTag = (tagId: string) => {
  return useQuery({
    queryKey: ["admin", "tags", tagId],
    queryFn: () => adminApi.getTag(tagId),
    enabled: !!tagId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTagStats = () => {
  return useQuery({
    queryKey: ["admin", "tags", "stats"],
    queryFn: adminApi.getTagStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTagLeaderboard = (tagName?: string) => {
  return useQuery({
    queryKey: ["admin", "tags", "leaderboard", tagName],
    queryFn: () => adminApi.getTagLeaderboard(tagName),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSearchTags = (searchTerm: string, limit = 50) => {
  return useQuery({
    queryKey: ["admin", "tags", "search", searchTerm, limit],
    queryFn: () => adminApi.searchTags(searchTerm, limit),
    enabled: searchTerm.length >= 2, // Only search when we have at least 2 characters
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSearchUserTags = (query: string, limit = 50) => {
  return useQuery({
    queryKey: ["admin", "tags", "user-search", query, limit],
    queryFn: () => adminApi.searchUserTags(query, limit),
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Mutation hooks for modifying data
export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.createTag,
    onSuccess: (data) => {
      // Invalidate and refetch tag-related queries
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });

      // Add the new tag to the cache
      if (data.data?.tag) {
        queryClient.setQueryData(["admin", "tags", data.data.tag.id], data);
      }
    },
    onError: (error) => {
      console.error("Failed to create tag:", error);
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.updateTag,
    onSuccess: (data, variables) => {
      // Invalidate tag lists
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });

      // Update the specific tag in cache
      if (data.data?.tag) {
        queryClient.setQueryData(["admin", "tags", variables.tagId], data);
      }
    },
    onError: (error) => {
      console.error("Failed to update tag:", error);
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteTag,
    onSuccess: (data, tagId) => {
      // Invalidate tag-related queries
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

      // Remove the tag from cache
      queryClient.removeQueries({ queryKey: ["admin", "tags", tagId] });
    },
    onError: (error) => {
      console.error("Failed to delete tag:", error);
    },
  });
};

export const useAssignTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.assignTag,
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tags", "stats"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "tags", "leaderboard"],
      });

      // If we have user data, update their specific cache
      if (variables.user_id) {
        queryClient.invalidateQueries({
          queryKey: ["admin", "users", variables.user_id],
        });
      }
    },
    onError: (error) => {
      console.error("Failed to assign tag:", error);
    },
  });
};

export const useBulkAssignTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.bulkAssignTag,
    onSuccess: (data, variables) => {
      // Invalidate all user and tag related queries since this affects multiple users
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tags", "stats"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "tags", "leaderboard"],
      });

      // Invalidate specific users if we have their IDs
      variables.userIds.forEach((userId) => {
        queryClient.invalidateQueries({
          queryKey: ["admin", "users", userId],
        });
      });
    },
    onError: (error) => {
      console.error("Failed to bulk assign tag:", error);
    },
  });
};

export const useRemoveTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.removeTag,
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tags", "stats"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "tags", "leaderboard"],
      });

      // Update specific user cache
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", variables.userId],
      });
    },
    onError: (error) => {
      console.error("Failed to remove tag:", error);
    },
  });
};

export const useSetPrimaryTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.setPrimaryTag,
    onSuccess: (data, variables) => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["admin", "tags", "leaderboard"],
      });
    },
    onError: (error) => {
      console.error("Failed to set primary tag:", error);
    },
  });
};

export const useSyncUserTagsWithDiscord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.syncUserTagsWithDiscord,
    onSuccess: (data, userId) => {
      // Invalidate user data to reflect Discord sync status
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", userId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) => {
      console.error("Failed to sync user tags with Discord:", error);
    },
  });
};

// Utility hook for tag operations with optimized cache updates
export const useTagOperations = () => {
  const queryClient = useQueryClient();

  const invalidateTagQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const invalidateUserQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const invalidateTagStatsQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "tags", "stats"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "tags", "leaderboard"],
    });
  };

  return {
    invalidateTagQueries,
    invalidateUserQueries,
    invalidateTagStatsQueries,
  };
};

// Hook for managing tag filters and search state
export const useTagFilters = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignableFilter, setAssignableFilter] = useState<string>("all");

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setAssignableFilter("all");
  };

  const hasActiveFilters = () => {
    return (
      search !== "" ||
      categoryFilter !== "all" ||
      statusFilter !== "all" ||
      assignableFilter !== "all"
    );
  };

  return {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    assignableFilter,
    setAssignableFilter,
    resetFilters,
    hasActiveFilters,
  };
};
