import {
  assignRoleSchema,
  forceSyncSchema,
  removeRoleSchema,
  userFiltersSchema,
  userStatusSchema,
} from "../schemas/user.validation";
import { authenticateToken, requireRoles } from "../middleware/auth.middleware";

import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireRoles(["ADMIN"]));

// Analytics route
router.get("/analytics", userController.getUserAnalytics);

// User listing
router.get("/", validateRequest(userFiltersSchema), userController.getUsers);

// User status management (archive/restore)
router.patch(
  "/:userId/status",
  validateRequest(userStatusSchema),
  userController.updateUserStatus,
);

// Role management
router.post(
  "/:userId/roles",
  validateRequest(assignRoleSchema),
  userController.assignRoles,
);

router.post(
  "/:userId/roles/:roleId",
  validateRequest(removeRoleSchema),
  userController.removeRole,
);

// Discord sync
router.post(
  "/:userId/sync",
  validateRequest(forceSyncSchema),
  userController.forceSyncUser,
);

export { router as userRoutes };
