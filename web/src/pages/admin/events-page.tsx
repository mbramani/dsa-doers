import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Event, EventFilters } from "@/types/admin";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDeleteEvent,
  useEventAnalytics,
  useEvents,
  useUpdateEvent,
} from "@/hooks/use-admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateEventDialog from "@/components/admin/create-event-dialog";
import EventDetailsDialog from "@/components/admin/event-details-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const EventsPage: React.FC = () => {
  const [filters, setFilters] = useState<Partial<EventFilters>>({
    page: 1,
    limit: 20,
    sortBy: "scheduledAt",
    sortOrder: "asc",
  });

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [actionType, setActionType] = useState<"edit" | "delete" | "status">(
    "edit",
  );
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [newStatus, setNewStatus] = useState<Event["status"]>("scheduled");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] =
    useState<Event | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);

  const { data: eventsData, isLoading: eventsLoading } = useEvents(filters);
  const { data: analytics } = useEventAnalytics();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  const openActionModal = (
    event: Event,
    action: "edit" | "delete" | "status",
  ) => {
    setSelectedEvent(event);
    setActionType(action);
    setNewStatus(event.status);
    setIsActionModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedEvent || !actionReason.trim()) return;

    const loadingToast = toast.loading(`Updating event status...`, {
      icon: "🔄",
    });

    try {
      await updateEventMutation.mutateAsync({
        eventId: selectedEvent.id,
        status: newStatus,
      });

      toast.dismiss(loadingToast);
      setIsActionModalOpen(false);
      setActionReason("");
      setSelectedEvent(null);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Failed to update event status:", error);
    }
  };

  const handleEventDelete = async () => {
    if (!selectedEvent || !actionReason.trim()) return;

    const loadingToast = toast.loading("Deleting event...", {
      icon: "🗑️",
    });

    try {
      await deleteEventMutation.mutateAsync({
        eventId: selectedEvent.id,
        reason: actionReason,
      });

      toast.dismiss(loadingToast);
      setIsActionModalOpen(false);
      setActionReason("");
      setSelectedEvent(null);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Failed to delete event:", error);
    }
  };

  const getStatusBadgeVariant = (status: Event["status"]) => {
    switch (status) {
      case "scheduled":
        return "default";
      case "active":
        return "secondary";
      case "completed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: Event["status"]) => {
    switch (status) {
      case "scheduled":
        return "📅";
      case "active":
        return "🔴";
      case "completed":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "❓";
    }
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "beginner":
        return "#22c55e";
      case "intermediate":
        return "#f59e0b";
      case "advanced":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getValidStatusTransitions = (currentStatus: Event["status"]) => {
    const transitions: Record<Event["status"], Event["status"][]> = {
      scheduled: ["active", "cancelled"],
      active: ["completed", "cancelled"],
      completed: [],
      cancelled: ["scheduled"],
    };
    return transitions[currentStatus] || [];
  };

  const openEventDetails = (event: Event) => {
    setSelectedEventForDetails(event);
    setIsEventDetailsOpen(true);
  };

  if (eventsLoading) {
    return (
      <div className="p-6">
        <Loading size="lg" text="Loading events..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Event Management</h1>
          <p className="text-muted-foreground">
            Create and manage learning events with Discord integration
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          ➕ Create Event
        </Button>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <span className="text-2xl">🎯</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalEvents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <span className="text-2xl">📅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.scheduledEvents}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <span className="text-2xl">🔴</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeEvents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.completedEvents}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Voice Events
              </CardTitle>
              <span className="text-2xl">🎤</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.eventsByType.voice}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stage Events
              </CardTitle>
              <span className="text-2xl">🎭</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.eventsByType.stage}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🔍</span>
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search Events</Label>
              <Input
                id="search"
                placeholder="Search by title or description..."
                value={filters.search || ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={filters.eventType || "all"}
                onValueChange={(value: "voice" | "stage" | "all") =>
                  setFilters((prev) => ({
                    ...prev,
                    eventType: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔄 All Types</SelectItem>
                  <SelectItem value="voice">🎤 Voice</SelectItem>
                  <SelectItem value="stage">🎭 Stage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={filters.difficultyLevel || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    difficultyLevel:
                      value === "all"
                        ? undefined
                        : (value as "beginner" | "intermediate" | "advanced"),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔄 All Levels</SelectItem>
                  <SelectItem value="beginner">🟢 Beginner</SelectItem>
                  <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                  <SelectItem value="advanced">🔴 Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status:
                      value === "all" ? undefined : (value as Event["status"]),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔄 All Status</SelectItem>
                  <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                  <SelectItem value="active">🔴 Active</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="upcoming">Show Upcoming</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="upcoming"
                  checked={filters.upcoming || false}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({ ...prev, upcoming: checked }))
                  }
                />
                <span className="text-sm text-muted-foreground">
                  Only future events
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">📋</span>
            Events List
          </CardTitle>
          <CardDescription>
            {eventsData?.pagination.total || 0} events found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsData?.data.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">🎯</span>
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Type & Difficulty</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prerequisites</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsData?.data.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                        {event.discordEventId && (
                          <Badge variant="outline" className="text-xs">
                            🎮 Discord Event
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="secondary">
                          {event.eventType === "voice" ? "🎤" : "🎭"}{" "}
                          {event.eventType}
                        </Badge>
                        {event.difficultyLevel && (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: getDifficultyColor(
                                event.difficultyLevel,
                              ),
                              color: getDifficultyColor(event.difficultyLevel),
                            }}
                          >
                            {event.difficultyLevel}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">
                          {new Date(event.scheduledAt).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(event.scheduledAt).toLocaleTimeString()}
                        </p>
                        {event.duration && (
                          <p className="text-xs text-muted-foreground">
                            {event.duration}min
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(event.status)}>
                        {getStatusIcon(event.status)} {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {event.prerequisiteRoles.slice(0, 2).map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className="text-xs"
                          >
                            {role}
                          </Badge>
                        ))}
                        {event.prerequisiteRoles.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.prerequisiteRoles.length - 2}
                          </Badge>
                        )}
                        {event.prerequisiteRoles.length === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Open to all
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={
                              event.creator.discordAvatar
                                ? `https://cdn.discordapp.com/avatars/${event.createdBy}/${event.creator.discordAvatar}.png`
                                : undefined
                            }
                          />
                          <AvatarFallback className="text-xs">
                            {event.creator.discordUsername
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {event.creator.discordUsername}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            ⚙️ Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Event Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openEventDetails(event)}
                          >
                            👁️ View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEventDetails(event)}
                          >
                            ✏️ Edit Event
                          </DropdownMenuItem>
                          {getValidStatusTransitions(event.status).length >
                            0 && (
                            <DropdownMenuItem
                              onClick={() => openActionModal(event, "status")}
                            >
                              🔄 Change Status
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openActionModal(event, "delete")}
                            className="text-red-600 focus:text-red-600"
                          >
                            🗑️ Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <CreateEventDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEventForDetails}
        isOpen={isEventDetailsOpen}
        onClose={() => {
          setIsEventDetailsOpen(false);
          setSelectedEventForDetails(null);
        }}
      />

      {/* Action Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "delete" && "🗑️ Delete Event"}
              {actionType === "status" && "🔄 Change Event Status"}
              {actionType === "edit" && "✏️ Edit Event"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "delete" &&
                "This will permanently delete the event and remove it from Discord. This action cannot be undone."}
              {actionType === "status" &&
                `Change the status of "${selectedEvent?.title}" to reflect its current state.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "status" && selectedEvent && (
              <div>
                <Label htmlFor="newStatus">New Status</Label>
                <Select
                  value={newStatus}
                  onValueChange={(value: Event["status"]) =>
                    setNewStatus(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getValidStatusTransitions(selectedEvent.status).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {getStatusIcon(status)} {status}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="reason">
                {actionType === "delete"
                  ? "Reason for deletion *"
                  : "Reason (optional)"}
              </Label>
              <Textarea
                id="reason"
                placeholder={`Reason for ${actionType}...`}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionModalOpen(false)}
            >
              Cancel
            </Button>
            {actionType === "delete" && (
              <Button
                variant="destructive"
                onClick={handleEventDelete}
                disabled={!actionReason.trim() || deleteEventMutation.isPending}
              >
                {deleteEventMutation.isPending ? "Deleting..." : "🗑️ Delete"}
              </Button>
            )}
            {actionType === "status" && (
              <Button
                onClick={handleStatusUpdate}
                disabled={
                  updateEventMutation.isPending ||
                  newStatus === selectedEvent?.status
                }
              >
                {updateEventMutation.isPending
                  ? "Updating..."
                  : "🔄 Update Status"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage;
