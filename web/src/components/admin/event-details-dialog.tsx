import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarIcon,
  ChevronsUpDown,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Event, UpdateEventData } from "@/types/admin";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoles, useUpdateEvent } from "@/hooks/use-admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface EventDetailsDialogProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  mode?: "view" | "edit";
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({
  event,
  isOpen,
  onClose,
  mode: initialMode = "view",
}) => {
  const [activeTab, setActiveTab] = useState("details");
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState<UpdateEventData>({});
  const [timeInput, setTimeInput] = useState("14:00");

  const updateEventMutation = useUpdateEvent();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();

  // Initialize form data when event changes
  useEffect(() => {
    if (event) {
      const eventDate = new Date(event.scheduledAt);
      setFormData({
        title: event.title,
        description: event.description || "",
        eventType: event.eventType,
        difficultyLevel: event.difficultyLevel || undefined,
        status: event.status,
        scheduledAt: eventDate,
        duration: event.duration ?? undefined,
        capacity: event.capacity ?? undefined,
        prerequisiteRoles: [...event.prerequisiteRoles],
        discordChannelId: event.discordChannelId ?? undefined,
      });
      setTimeInput(format(eventDate, "HH:mm"));
      setHasUnsavedChanges(false);
    }
  }, [event]);

  // Track changes
  useEffect(() => {
    if (event && mode === "edit") {
      const hasChanges =
        formData.title !== event.title ||
        formData.description !== (event.description || "") ||
        formData.eventType !== event.eventType ||
        formData.difficultyLevel !== event.difficultyLevel ||
        formData.status !== event.status ||
        formData.scheduledAt?.getTime() !==
          new Date(event.scheduledAt).getTime() ||
        formData.duration !== event.duration ||
        formData.capacity !== event.capacity ||
        JSON.stringify(formData.prerequisiteRoles) !==
          JSON.stringify(event.prerequisiteRoles) ||
        formData.discordChannelId !== event.discordChannelId;

      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, event, mode]);

  const handleDateTimeChange = (date: Date | undefined, time?: string) => {
    if (!date) return;

    const timeToUse = time || timeInput;
    const [hours, minutes] = timeToUse.split(":").map(Number);

    const newDateTime = new Date(date);
    newDateTime.setHours(hours, minutes, 0, 0);

    setFormData((prev) => ({ ...prev, scheduledAt: newDateTime }));
  };

  const addPrerequisiteRole = (roleName: string) => {
    if (!formData.prerequisiteRoles?.includes(roleName)) {
      setFormData((prev) => ({
        ...prev,
        prerequisiteRoles: [...(prev.prerequisiteRoles || []), roleName],
      }));
    }
    setRolesOpen(false);
  };

  const removePrerequisiteRole = (roleName: string) => {
    setFormData((prev) => ({
      ...prev,
      prerequisiteRoles: (prev.prerequisiteRoles || []).filter(
        (role) => role !== roleName,
      ),
    }));
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

  const handleSave = async () => {
    if (!event) return;

    try {
      const updateData: UpdateEventData = {};

      // Only include changed fields
      if (formData.title !== event.title) updateData.title = formData.title;
      if (formData.description !== (event.description || ""))
        updateData.description = formData.description;
      if (formData.eventType !== event.eventType)
        updateData.eventType = formData.eventType;
      if (formData.difficultyLevel !== event.difficultyLevel)
        updateData.difficultyLevel = formData.difficultyLevel;
      if (formData.status !== event.status) updateData.status = formData.status;
      if (
        formData.scheduledAt?.getTime() !==
        new Date(event.scheduledAt).getTime()
      )
        updateData.scheduledAt = formData.scheduledAt;
      if (formData.duration !== event.duration)
        updateData.duration = formData.duration;
      if (formData.capacity !== event.capacity)
        updateData.capacity = formData.capacity;
      if (
        JSON.stringify(formData.prerequisiteRoles) !==
        JSON.stringify(event.prerequisiteRoles)
      ) {
        updateData.prerequisiteRoles = formData.prerequisiteRoles;
      }
      if (formData.discordChannelId !== event.discordChannelId)
        updateData.discordChannelId = formData.discordChannelId;

      if (Object.keys(updateData).length === 0) {
        toast.info("No changes to save");
        return;
      }

      await updateEventMutation.mutateAsync({
        eventId: event.id,
        ...updateData,
      });

      setMode("view");
      setHasUnsavedChanges(false);
    } catch {
      toast.error("Failed to save changes");
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges && mode === "edit") {
      if (
        confirm("You have unsaved changes. Are you sure you want to close?")
      ) {
        setMode("view");
        setActiveTab("details");
        setHasUnsavedChanges(false);
        onClose();
      }
    } else {
      setMode("view");
      setActiveTab("details");
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  const handleCancelEdit = () => {
    if (event) {
      const eventDate = new Date(event.scheduledAt);
      setFormData({
        title: event.title,
        description: event.description || "",
        eventType: event.eventType,
        difficultyLevel: event.difficultyLevel || undefined,
        status: event.status,
        scheduledAt: eventDate,
        duration: event.duration ?? undefined,
        capacity: event.capacity ?? undefined,
        prerequisiteRoles: [...event.prerequisiteRoles],
        discordChannelId: event.discordChannelId ?? undefined,
      });
      setTimeInput(format(eventDate, "HH:mm"));
      setMode("view");
      setHasUnsavedChanges(false);
    }
  };

  const getDiscordSyncStatus = () => {
    if (!event) return null;

    const hasDiscordEvent = !!event.discordEventId;
    const hasDiscordChannel = !!event.discordChannelId;

    if (hasDiscordEvent && hasDiscordChannel) {
      return {
        status: "full",
        label: "Fully Synced",
        icon: "🟢",
        description: "Event and channel synced",
      };
    } else if (hasDiscordEvent) {
      return {
        status: "event",
        label: "Event Only",
        icon: "🟡",
        description: "Discord event created, no specific channel",
      };
    } else if (hasDiscordChannel) {
      return {
        status: "channel",
        label: "Channel Only",
        icon: "🟡",
        description: "Channel assigned, no Discord event",
      };
    } else {
      return {
        status: "none",
        label: "Not Synced",
        icon: "🔴",
        description: "No Discord integration",
      };
    }
  };

  if (!event) return null;

  const syncStatus = getDiscordSyncStatus();
  const validTransitions = getValidStatusTransitions(event.status);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="mr-2">{mode === "edit" ? "✏️" : "👁️"}</span>
              {mode === "edit" ? "Edit Event" : "Event Details"}
              {hasUnsavedChanges && (
                <Badge variant="outline" className="ml-2 text-orange-600">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {syncStatus && (
                <Badge variant="outline" className="text-xs">
                  {syncStatus.icon} {syncStatus.label}
                </Badge>
              )}
              <Badge variant={getStatusBadgeVariant(event.status)}>
                {getStatusIcon(event.status)} {event.status}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Modify event properties and Discord integration settings"
              : "View detailed information about this event"}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">📋 Details</TabsTrigger>
            <TabsTrigger value="schedule">📅 Schedule</TabsTrigger>
            <TabsTrigger value="access">🔐 Access</TabsTrigger>
            <TabsTrigger value="discord">🎮 Discord</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    {mode === "edit" ? (
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        maxLength={100}
                      />
                    ) : (
                      <p className="font-medium text-lg">{event.title}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    {mode === "edit" ? (
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={4}
                        maxLength={2000}
                      />
                    ) : (
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {event.description || "No description provided"}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Event Type</Label>
                      {mode === "edit" ? (
                        <Select
                          value={formData.eventType}
                          onValueChange={(value: "voice" | "stage") =>
                            setFormData((prev) => ({
                              ...prev,
                              eventType: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="voice">
                              🎤 Voice Channel
                            </SelectItem>
                            <SelectItem value="stage">
                              🎭 Stage Channel
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">
                          {event.eventType === "voice" ? "🎤" : "🎭"}{" "}
                          {event.eventType}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <Label>Difficulty</Label>
                      {mode === "edit" ? (
                        <Select
                          value={formData.difficultyLevel || "beginner"}
                          onValueChange={(
                            value: "beginner" | "intermediate" | "advanced",
                          ) =>
                            setFormData((prev) => ({
                              ...prev,
                              difficultyLevel: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">
                              🟢 Beginner
                            </SelectItem>
                            <SelectItem value="intermediate">
                              🟡 Intermediate
                            </SelectItem>
                            <SelectItem value="advanced">
                              🔴 Advanced
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: getDifficultyColor(
                              event.difficultyLevel,
                            ),
                            color: getDifficultyColor(event.difficultyLevel),
                          }}
                        >
                          {event.difficultyLevel || "Not specified"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {mode === "edit" && validTransitions.length > 0 && (
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: Event["status"]) =>
                          setFormData((prev) => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={event.status}>
                            {getStatusIcon(event.status)} {event.status}{" "}
                            (current)
                          </SelectItem>
                          {validTransitions.map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusIcon(status)} {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={
                          event.creator.discordAvatar
                            ? `https://cdn.discordapp.com/avatars/${event.createdBy}/${event.creator.discordAvatar}.png`
                            : undefined
                        }
                      />
                      <AvatarFallback>
                        {event.creator.discordUsername
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {event.creator.discordUsername}
                      </p>
                      <p className="text-xs text-muted-foreground">Creator</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-muted-foreground">
                        {format(new Date(event.createdAt), "PPp")}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-muted-foreground">
                        {format(new Date(event.updatedAt), "PPp")}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="font-medium text-sm">Event ID</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {event.id}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Schedule Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date & Time</Label>
                    {mode === "edit" ? (
                      <div className="space-y-2">
                        <Popover open={dateOpen} onOpenChange={setDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.scheduledAt &&
                                  "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.scheduledAt ? (
                                format(formData.scheduledAt, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.scheduledAt}
                              onSelect={(date) => {
                                handleDateTimeChange(date);
                                setDateOpen(false);
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={timeInput}
                          onChange={(e) => {
                            setTimeInput(e.target.value);
                            handleDateTimeChange(
                              formData.scheduledAt,
                              e.target.value,
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">
                          {format(
                            new Date(event.scheduledAt),
                            "EEEE, MMMM do, yyyy",
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          {format(new Date(event.scheduledAt), "h:mm a")}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Duration</Label>
                    {mode === "edit" ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="60"
                          min="15"
                          max="480"
                          value={formData.duration || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              duration: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          minutes
                        </span>
                      </div>
                    ) : (
                      <p className="font-medium">
                        {event.duration
                          ? `${event.duration} minutes`
                          : "Not specified"}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Capacity</Label>
                  {mode === "edit" ? (
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      min="1"
                      max="100"
                      value={formData.capacity || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          capacity: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        }))
                      }
                    />
                  ) : (
                    <p className="font-medium">
                      {event.capacity
                        ? `${event.capacity} participants`
                        : "Unlimited"}
                    </p>
                  )}
                </div>

                {event.duration && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <Label className="text-sm font-medium">
                      Schedule Summary
                    </Label>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <strong>Starts:</strong>{" "}
                        {format(new Date(event.scheduledAt), "PPp")}
                      </p>
                      <p>
                        <strong>Ends:</strong>{" "}
                        {format(
                          new Date(
                            new Date(event.scheduledAt).getTime() +
                              event.duration * 60000,
                          ),
                          "PPp",
                        )}
                      </p>
                      <p>
                        <strong>Duration:</strong> {event.duration} minutes
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Access Control</CardTitle>
                <CardDescription>
                  Role requirements for event participation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mode === "edit" && (
                  <div>
                    <Popover open={rolesOpen} onOpenChange={setRolesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={rolesOpen}
                          className="w-full justify-between"
                          disabled={rolesLoading}
                        >
                          Add prerequisite role...
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search roles..." />
                          <CommandEmpty>No roles found.</CommandEmpty>
                          <CommandGroup>
                            {roles
                              .filter(
                                (role) =>
                                  !(formData.prerequisiteRoles || []).includes(
                                    role.name,
                                  ),
                              )
                              .map((role) => (
                                <CommandItem
                                  key={role.id}
                                  onSelect={() =>
                                    addPrerequisiteRole(role.name)
                                  }
                                >
                                  <div className="flex items-center space-x-2">
                                    <Badge
                                      variant="outline"
                                      style={{
                                        borderColor: role.color,
                                        color: role.color,
                                      }}
                                    >
                                      {role.name}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {role.description}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">
                    {mode === "edit"
                      ? "Selected Prerequisites"
                      : "Prerequisite Roles"}
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(mode === "edit"
                      ? formData.prerequisiteRoles
                      : event.prerequisiteRoles
                    )?.length === 0 ? (
                      <Badge variant="outline" className="text-xs">
                        Open to all members
                      </Badge>
                    ) : (
                      (mode === "edit"
                        ? formData.prerequisiteRoles
                        : event.prerequisiteRoles
                      )?.map((roleName) => {
                        const role = roles.find((r) => r.name === roleName);
                        return (
                          <Badge
                            key={roleName}
                            variant="outline"
                            style={{
                              borderColor: role?.color || "#6b7280",
                              color: role?.color || "#6b7280",
                            }}
                            className="flex items-center space-x-1"
                          >
                            <span>{roleName}</span>
                            {mode === "edit" && (
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removePrerequisiteRole(roleName)}
                              />
                            )}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discord" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Discord Integration Status
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Status
                  </Button>
                </CardTitle>
                <CardDescription>
                  Discord event and channel synchronization details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {syncStatus && (
                  <Alert>
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>{syncStatus.icon}</span>
                          <div>
                            <strong>{syncStatus.label}</strong>
                            <p className="text-sm text-muted-foreground">
                              {syncStatus.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {event.discordEventId && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Discord Scheduled Event
                    </Label>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📅</span>
                        <div>
                          <p className="font-medium">Event Created</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {event.discordEventId}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View in Discord
                      </Button>
                    </div>
                  </div>
                )}

                {event.discordChannelId && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Discord Channel
                    </Label>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {event.eventType === "voice" ? "🎤" : "🎭"}
                        </span>
                        <div>
                          <p className="font-medium">
                            {event.eventType === "voice" ? "Voice" : "Stage"}{" "}
                            Channel
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            ID: {event.discordChannelId}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Channel
                      </Button>
                    </div>
                  </div>
                )}

                {!event.discordEventId && !event.discordChannelId && (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">🚫</span>
                    <p className="text-muted-foreground">
                      No Discord integration configured
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This event exists only in the platform database
                    </p>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Integration History
                  </Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Event created</span>
                      <span className="text-muted-foreground">
                        {format(new Date(event.createdAt), "PPp")}
                      </span>
                    </div>
                    {event.discordEventId && (
                      <div className="flex justify-between">
                        <span>Discord event synced</span>
                        <span className="text-green-600">✅ Active</span>
                      </div>
                    )}
                    {event.discordChannelId && (
                      <div className="flex justify-between">
                        <span>Channel permissions updated</span>
                        <span className="text-green-600">✅ Current</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              {mode === "edit" && hasUnsavedChanges ? "Cancel" : "Close"}
            </Button>
            {mode === "edit" && hasUnsavedChanges && (
              <Button variant="ghost" onClick={handleCancelEdit}>
                🔄 Reset Changes
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {mode === "view" ? (
              <Button onClick={() => setMode("edit")}>✏️ Edit Event</Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={updateEventMutation.isPending || !hasUnsavedChanges}
              >
                {updateEventMutation.isPending
                  ? "Saving..."
                  : "💾 Save Changes"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;
