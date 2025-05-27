import {
  ApiResponse,
  SearchResult,
  Tag,
  TagLeaderboard,
  TagUsageStats,
  UserRole,
  UserTag,
} from "@/types/api";
import {
  AssignTagRequest,
  BulkAssignTagRequest,
  CreateTagRequest,
  RemoveTagRequest,
  UpdateTagRequest,
} from "@/types/api";
import { AuthRequest, authenticateToken, requireRole } from "@/middleware/auth";
import { Response, Router } from "express";

import { createLogger } from "@/utils/logger";
import { tagService } from "@/services/tag-service";

const router = Router();
const logger = createLogger("admin-tags");

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/admin/tags - List all tags
router.get(
  "/",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const tags: Tag[] = await tagService.getAllTags();

      const response: ApiResponse<{ tags: Tag[] }> = {
        status: "success",
        message: "Tags fetched successfully",
        data: { tags },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to fetch tags", { error });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to fetch tags",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/tags/assignable - Get assignable tags
router.get(
  "/assignable",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const tags: Tag[] = await tagService.getAssignableTags();

      const response: ApiResponse<{ tags: Tag[] }> = {
        status: "success",
        message: "Assignable tags fetched successfully",
        data: { tags },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to fetch assignable tags", { error });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to fetch assignable tags",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/tags/stats - Get tag usage statistics
router.get(
  "/stats",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const stats: TagUsageStats[] = await tagService.getTagUsageStats();

      const response: ApiResponse<{ stats: TagUsageStats[] }> = {
        status: "success",
        message: "Tag statistics fetched successfully",
        data: { stats },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to fetch tag stats", { error });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to fetch tag statistics",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/tags/search - Search tags
router.get(
  "/search",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const searchTerm = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!searchTerm) {
        const response: ApiResponse = {
          status: "error",
          message: "Search term is required",
          errors: { q: "Search term parameter 'q' is required" },
        };
        return res.status(400).json(response);
      }

      const tags: Tag[] = await tagService.searchTags(searchTerm, limit);

      const response: ApiResponse<{ tags: Tag[] }> = {
        status: "success",
        message: "Tag search results fetched successfully",
        data: { tags },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to search tags", { error, query: req.query });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to search tags",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/tags/:tagId - Get specific tag
router.get(
  "/:tagId",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { tagId } = req.params;

      const tag: Tag | null = await tagService.getTagById(tagId);

      if (!tag) {
        const response: ApiResponse = {
          status: "error",
          message: "Tag not found",
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<{ tag: Tag }> = {
        status: "success",
        message: "Tag fetched successfully",
        data: { tag },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to fetch tag", { error, tagId: req.params.tagId });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to fetch tag",
      };

      res.status(500).json(response);
    }
  },
);

// POST /api/admin/tags - Create new tag
router.post(
  "/",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const createTagData: CreateTagRequest = req.body;

      // Basic validation
      if (
        !createTagData.name ||
        !createTagData.display_name ||
        !createTagData.category
      ) {
        const errors: Record<string, string> = {};
        if (!createTagData.name) {
          errors.name = "Name is required";
        }
        if (!createTagData.display_name) {
          errors.display_name = "Display name is required";
        }
        if (!createTagData.category) {
          errors.category = "Category is required";
        }

        const response: ApiResponse = {
          status: "error",
          message: "Missing required fields",
          errors,
        };
        return res.status(400).json(response);
      }

      const tag: Tag = await tagService.createTag(createTagData);

      const response: ApiResponse<{ tag: Tag }> = {
        status: "success",
        message: "Tag created successfully",
        data: { tag },
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error("Failed to create tag", { error, body: req.body });

      const response: ApiResponse = {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to create tag",
      };

      res.status(400).json(response);
    }
  },
);

// PUT /api/admin/tags/:tagId - Update tag
router.put(
  "/:tagId",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { tagId } = req.params;
      const updateTagData: UpdateTagRequest = req.body;

      const tag: Tag | null = await tagService.updateTag(tagId, updateTagData);

      if (!tag) {
        const response: ApiResponse = {
          status: "error",
          message: "Tag not found",
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<{ tag: Tag }> = {
        status: "success",
        message: "Tag updated successfully",
        data: { tag },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to update tag", { error, tagId: req.params.tagId });

      const response: ApiResponse = {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to update tag",
      };

      res.status(400).json(response);
    }
  },
);

// DELETE /api/admin/tags/:tagId - Delete tag
router.delete(
  "/:tagId",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const { tagId } = req.params;

      const success: boolean = await tagService.deleteTag(tagId);

      if (!success) {
        const response: ApiResponse = {
          status: "error",
          message: "Tag not found",
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        status: "success",
        message: "Tag deleted successfully",
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to delete tag", { error, tagId: req.params.tagId });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to delete tag",
      };

      res.status(500).json(response);
    }
  },
);

// POST /api/admin/tags/assign - Assign tag to user
router.post(
  "/assign",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const assignRequest: AssignTagRequest = req.body;

      // Validation
      if (!assignRequest.user_id || !assignRequest.tag_id) {
        const errors: Record<string, string> = {};
        if (!assignRequest.user_id) {
          errors.user_id = "User ID is required";
        }
        if (!assignRequest.tag_id) {
          errors.tag_id = "Tag ID is required";
        }

        const response: ApiResponse = {
          status: "error",
          message: "Missing required fields",
          errors,
        };
        return res.status(400).json(response);
      }

      const userTag: UserTag = await tagService.assignTagToUser({
        user_id: assignRequest.user_id,
        tag_id: assignRequest.tag_id,
        assigned_by: req.user?.userId,
        is_primary: assignRequest.is_primary,
        notes: assignRequest.notes,
      });

      const response: ApiResponse<{ userTag: UserTag }> = {
        status: "success",
        message: "Tag assigned successfully",
        data: { userTag },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to assign tag", { error, body: req.body });

      const response: ApiResponse = {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to assign tag",
      };

      res.status(400).json(response);
    }
  },
);

// POST /api/admin/tags/bulk-assign - Bulk assign tag to multiple users
router.post(
  "/bulk-assign",
  requireRole([UserRole.ADMIN]),
  async (req: AuthRequest, res: Response) => {
    try {
      const bulkAssignRequest: BulkAssignTagRequest = req.body;

      // Validation
      if (
        !Array.isArray(bulkAssignRequest.user_ids) ||
        bulkAssignRequest.user_ids.length === 0
      ) {
        const response: ApiResponse = {
          status: "error",
          message: "user_ids must be a non-empty array",
          errors: { user_ids: "Must be a non-empty array of user IDs" },
        };
        return res.status(400).json(response);
      }

      if (!bulkAssignRequest.tag_id) {
        const response: ApiResponse = {
          status: "error",
          message: "tag_id is required",
          errors: { tag_id: "Tag ID is required" },
        };
        return res.status(400).json(response);
      }

      const userTags: UserTag[] = await tagService.bulkAssignTag(
        bulkAssignRequest.user_ids,
        bulkAssignRequest.tag_id,
        req.user?.userId,
      );

      const response: ApiResponse<{ userTags: UserTag[]; count: number }> = {
        status: "success",
        message: `Tag assigned to ${userTags.length} users successfully`,
        data: { userTags, count: userTags.length },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to bulk assign tag", { error, body: req.body });

      const response: ApiResponse = {
        status: "error",
        message:
          error instanceof Error ? error.message : "Failed to bulk assign tag",
      };

      res.status(400).json(response);
    }
  },
);

// DELETE /api/admin/tags/remove - Remove tag from user
router.delete(
  "/remove",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const removeRequest: RemoveTagRequest = req.body;

      // Validation
      if (!removeRequest.user_id || !removeRequest.tag_id) {
        const errors: Record<string, string> = {};
        if (!removeRequest.user_id) {
          errors.user_id = "User ID is required";
        }
        if (!removeRequest.tag_id) {
          errors.tag_id = "Tag ID is required";
        }

        const response: ApiResponse = {
          status: "error",
          message: "Missing required fields",
          errors,
        };
        return res.status(400).json(response);
      }

      const success: boolean = await tagService.removeTagFromUser(
        removeRequest.user_id,
        removeRequest.tag_id,
      );

      const response: ApiResponse<{ removed: boolean }> = {
        status: "success",
        message: success
          ? "Tag removed successfully"
          : "Tag was not found or already removed",
        data: { removed: success },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to remove tag", { error, body: req.body });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to remove tag",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/tags/user-tags/search - Search users by tags
router.get(
  "/user-tags/search",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const searchTerm = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!searchTerm) {
        const response: ApiResponse = {
          status: "error",
          message: "Search term is required",
          errors: { q: "Search term parameter 'q' is required" },
        };
        return res.status(400).json(response);
      }

      const results: SearchResult[] = await tagService.searchUserTags(
        searchTerm,
        limit,
      );

      const response: ApiResponse<{ results: SearchResult[]; count: number }> =
        {
          status: "success",
          message: "Search results fetched successfully",
          data: { results, count: results.length },
        };

      res.json(response);
    } catch (error) {
      logger.error("Failed to search user tags", { error, query: req.query });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to search user tags",
      };

      res.status(500).json(response);
    }
  },
);

// GET /api/admin/tags/leaderboard - Get tag leaderboard
router.get(
  "/leaderboard",
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  async (req: AuthRequest, res: Response) => {
    try {
      const tagName = req.query.tag as string;

      const leaderboard: TagLeaderboard[] =
        await tagService.getTagLeaderboard(tagName);

      const response: ApiResponse<{ leaderboard: TagLeaderboard[] }> = {
        status: "success",
        message: "Tag leaderboard fetched successfully",
        data: { leaderboard },
      };

      res.json(response);
    } catch (error) {
      logger.error("Failed to get tag leaderboard", {
        error,
        query: req.query,
      });

      const response: ApiResponse = {
        status: "error",
        message: "Failed to get tag leaderboard",
      };

      res.status(500).json(response);
    }
  },
);

export { router as adminTagsRouter };
