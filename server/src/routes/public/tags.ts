import { ApiResponse, Tag, TagLeaderboard } from "@/types/api";
import { Response, Router } from "express";

import { createLogger } from "@/utils/logger";
import { tagService } from "@/services/tag-service";

const router = Router();
const logger = createLogger("public-tags");

// GET /api/public/tags - Get all public tags
router.get("/", async (req, res: Response) => {
  try {
    const tags: Tag[] = await tagService.getAllTags();

    // Filter to only show public/active tags
    const publicTags = tags.filter((tag) => tag.is_active);

    const response: ApiResponse<{ tags: Tag[] }> = {
      status: "success",
      message: "Public tags retrieved successfully",
      data: { tags: publicTags },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to get public tags", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to get public tags",
    };

    res.status(500).json(response);
  }
});

// GET /api/public/tags/leaderboard - Get public tag leaderboard
router.get("/leaderboard", async (req, res: Response) => {
  try {
    const tagName = req.query.tag as string;
    const leaderboard: TagLeaderboard[] =
      await tagService.getTagLeaderboard(tagName);

    const response: ApiResponse<{ leaderboard: TagLeaderboard[] }> = {
      status: "success",
      message: "Tag leaderboard retrieved successfully",
      data: { leaderboard },
    };

    res.json(response);
  } catch (error) {
    logger.error("Failed to get tag leaderboard", { error });

    const response: ApiResponse = {
      status: "error",
      message: "Failed to get tag leaderboard",
    };

    res.status(500).json(response);
  }
});

export { router as publicTagsRouter };
