import {
  authenticateToken,
  optionalAuth,
  requireRoles,
} from "../middleware/auth.middleware";
import {
  createEventSchema,
  deleteEventSchema,
  eventQuerySchema,
  updateEventSchema,
} from "../schemas/event.validation";

import { Router } from "express";
import { eventController } from "../controllers/event.controller";
import { validateRequest } from "../middleware/validation.middleware";

const router = Router();

// Public routes (no authentication required)
router.get(
  "/public",
  validateRequest(eventQuerySchema),
  eventController.getPublicEvents,
);

// Protected routes (authentication required)
router.use(authenticateToken);

// Events accessible to all authenticated users
router.get("/", validateRequest(eventQuerySchema), eventController.getEvents);
router.get("/:id", eventController.getEventById);

// Admin and Moderator only routes
router.use(requireRoles(["ADMIN", "MODERATOR"]));

// Event management operations
router.post(
  "/",
  validateRequest(createEventSchema),
  eventController.createEvent,
);
router.put(
  "/:id",
  validateRequest(updateEventSchema),
  eventController.updateEvent,
);
router.delete(
  "/:id",
  validateRequest(deleteEventSchema),
  eventController.deleteEvent,
);

export { router as eventRoutes };
