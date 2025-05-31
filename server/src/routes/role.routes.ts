import {
  assignRoleSchema,
  createRoleSchema,
  revokeRoleSchema,
  roleQuerySchema,
  updateRoleSchema,
} from "../schemas/role.validation";
import { authenticateToken, requireRoles } from "../middleware/auth.middleware";

import { Router } from "express";
import { roleController } from "../controllers/role.controller";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();

// All role management routes require admin access
router.use(authenticateToken);
router.use(requireRoles(["ADMIN"]));

// Role CRUD operations
router.post("/", validateRequest(createRoleSchema), roleController.createRole);

router.get("/", validateRequest(roleQuerySchema), roleController.getRoles);

router.get("/:id", roleController.getRoleById);

router.put(
  "/:id",
  validateRequest(updateRoleSchema),
  roleController.updateRole,
);

router.delete("/:id", roleController.deleteRole);

// Role assignment operations
router.post(
  "/assign",
  validateRequest(assignRoleSchema),
  roleController.assignRole,
);

router.post(
  "/revoke",
  validateRequest(revokeRoleSchema),
  roleController.revokeRole,
);

export { router as roleRoutes };
