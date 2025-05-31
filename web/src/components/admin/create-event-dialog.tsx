import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateEvent, useRoles } from "@/hooks/use-admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { CreateEventData } from "@/types/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [rolesOpen, setRolesOpen] = useState(false);
  const [channelOpen, setChannelOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const [formData, setFormData] = useState<CreateEventData>({
    title: "",
    description: "",
    eventType: "voice",
    difficultyLevel: "beginner",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    duration: 60,
    capacity: undefined,
    prerequisiteRoles: [],
    discordChannelId: undefined,
    createDiscordEvent: true,
    createPrivateChannel: false,
  });

  const [timeInput, setTimeInput] = useState("14:00");
  const [hasValidationErrors, setHasValidationErrors] = useState(false);

  const createEventMutation = useCreateEvent();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();

  // Mock Discord channels - replace with actual Discord channels API
  const mockDiscordChannels = [
    { id: "123456789", name: "general-voice", type: "voice" },
    { id: "987654321", name: "study-voice", type: "voice" },
    { id: "456789123", name: "main-stage", type: "stage" },
    { id: "789123456", name: "presentations", type: "stage" },
  ];

  const filteredChannels = mockDiscordChannels.filter(
    (channel) => channel.type === formData.eventType,
  );

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.title.trim()) errors.push("Title is required");
    if (formData.title.length > 100)
      errors.push("Title must be 100 characters or less");
    if (!formData.description.trim()) errors.push("Description is required");
    if (formData.description.length > 2000)
      errors.push("Description must be 2000 characters or less");
    if (formData.scheduledAt <= new Date())
      errors.push("Event must be scheduled in the future");
    if (
      formData.duration &&
      (formData.duration < 15 || formData.duration > 480)
    ) {
      errors.push("Duration must be between 15 minutes and 8 hours");
    }
    if (
      formData.capacity &&
      (formData.capacity < 1 || formData.capacity > 100)
    ) {
      errors.push("Capacity must be between 1 and 100");
    }
    if (formData.prerequisiteRoles.length > 10) {
      errors.push("Cannot have more than 10 prerequisite roles");
    }

    if (errors.length > 0) {
      toast.error("Validation failed", {
        description: errors.join(", "),
        icon: "❌",
      });
      setHasValidationErrors(true);
      return false;
    }

    setHasValidationErrors(false);
    return true;
  };

  const handleDateTimeChange = (date: Date | undefined, time?: string) => {
    if (!date) return;

    const timeToUse = time || timeInput;
    const [hours, minutes] = timeToUse.split(":").map(Number);

    const newDateTime = new Date(date);
    newDateTime.setHours(hours, minutes, 0, 0);

    setFormData((prev) => ({ ...prev, scheduledAt: newDateTime }));
  };

  const addPrerequisiteRole = (roleName: string) => {
    if (!formData.prerequisiteRoles.includes(roleName)) {
      setFormData((prev) => ({
        ...prev,
        prerequisiteRoles: [...prev.prerequisiteRoles, roleName],
      }));
    }
    setRolesOpen(false);
  };

  const removePrerequisiteRole = (roleName: string) => {
    setFormData((prev) => ({
      ...prev,
      prerequisiteRoles: prev.prerequisiteRoles.filter(
        (role) => role !== roleName,
      ),
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createEventMutation.mutateAsync(formData);
      handleClose();
    } catch {
      toast.error("Failed to create event");
    }
  };

  const handleClose = () => {
    onClose();
    setActiveTab("basic");
    setFormData({
      title: "",
      description: "",
      eventType: "voice",
      difficultyLevel: "beginner",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 60,
      capacity: undefined,
      prerequisiteRoles: [],
      discordChannelId: undefined,
      createDiscordEvent: true,
      createPrivateChannel: false,
    });
    setTimeInput("14:00");
    setHasValidationErrors(false);
  };

  const getEventTypeIcon = (type: string) => {
    return type === "voice" ? "🎤" : "🎭";
  };

  const getDifficultyColor = (difficulty: string) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">🎯</span>
            Create New Event
          </DialogTitle>
          <DialogDescription>
            Create a new learning event with Discord integration and role-based
            access
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">📝 Basic Info</TabsTrigger>
            <TabsTrigger value="schedule">📅 Schedule</TabsTrigger>
            <TabsTrigger value="access">🔐 Access Control</TabsTrigger>
            <TabsTrigger value="discord">🎮 Discord</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
                <CardDescription>
                  Basic information about your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., React Fundamentals Workshop"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.title.length}/100 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what participants will learn and do in this event..."
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.description.length}/2000 characters
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventType">Event Type *</Label>
                    <Select
                      value={formData.eventType}
                      onValueChange={(value: "voice" | "stage") =>
                        setFormData((prev) => ({
                          ...prev,
                          eventType: value,
                          discordChannelId: undefined, // Reset channel when type changes
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voice">🎤 Voice Channel</SelectItem>
                        <SelectItem value="stage">🎭 Stage Channel</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.eventType === "voice"
                        ? "Interactive discussion format"
                        : "Presentation/lecture format"}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={formData.difficultyLevel}
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
                        <SelectItem value="beginner">🟢 Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          🟡 Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">🔴 Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Event Preview */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">
                        {formData.title || "Event Title"}
                      </h3>
                      <Badge variant="secondary">
                        {getEventTypeIcon(formData.eventType)}{" "}
                        {formData.eventType}
                      </Badge>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: getDifficultyColor(
                            formData.difficultyLevel,
                          ),
                          color: getDifficultyColor(formData.difficultyLevel),
                        }}
                      >
                        {formData.difficultyLevel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formData.description ||
                        "Event description will appear here..."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Scheduling</CardTitle>
                <CardDescription>
                  Set the date, time, and duration for your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Event Date *</Label>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.scheduledAt && "text-muted-foreground",
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
                  </div>

                  <div>
                    <Label htmlFor="time">Event Time *</Label>
                    <Input
                      id="time"
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Between 15 minutes and 8 hours
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="capacity">Max Participants</Label>
                    <Input
                      id="capacity"
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for unlimited
                    </p>
                  </div>
                </div>

                {/* Schedule Preview */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="text-sm font-medium">
                    Schedule Summary
                  </Label>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <strong>Date:</strong>{" "}
                      {format(formData.scheduledAt, "EEEE, MMMM do, yyyy")}
                    </p>
                    <p>
                      <strong>Time:</strong>{" "}
                      {format(formData.scheduledAt, "h:mm a")}
                    </p>
                    {formData.duration && (
                      <p>
                        <strong>Duration:</strong> {formData.duration} minutes
                      </p>
                    )}
                    {formData.capacity && (
                      <p>
                        <strong>Capacity:</strong> {formData.capacity}{" "}
                        participants
                      </p>
                    )}
                    {formData.duration && (
                      <p>
                        <strong>Ends at:</strong>{" "}
                        {format(
                          new Date(
                            formData.scheduledAt.getTime() +
                              formData.duration * 60000,
                          ),
                          "h:mm a",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Access Control</CardTitle>
                <CardDescription>
                  Set role requirements for event participation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Prerequisite Roles</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select roles that users must have to participate in this
                    event
                  </p>

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
                                !formData.prerequisiteRoles.includes(role.name),
                            )
                            .map((role) => (
                              <CommandItem
                                key={role.id}
                                onSelect={() => addPrerequisiteRole(role.name)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.prerequisiteRoles.includes(
                                      role.name,
                                    )
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
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

                {/* Selected Prerequisite Roles */}
                <div>
                  <Label className="text-sm font-medium">
                    Selected Prerequisites
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.prerequisiteRoles.length === 0 ? (
                      <Badge variant="outline" className="text-xs">
                        Open to all members
                      </Badge>
                    ) : (
                      formData.prerequisiteRoles.map((roleName) => {
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
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removePrerequisiteRole(roleName)}
                            />
                          </Badge>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Users need{" "}
                    {formData.prerequisiteRoles.length === 0
                      ? "no specific roles"
                      : `${formData.prerequisiteRoles.length > 1 ? "any of these roles" : "this role"}`}{" "}
                    to participate
                  </p>
                </div>

                {formData.prerequisiteRoles.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <strong>Access Control:</strong> Only users with the
                      selected roles will be able to see and join this event.
                      Make sure the target audience has the required roles.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discord" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discord Integration</CardTitle>
                <CardDescription>
                  Configure Discord channel and event settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="createDiscordEvent">
                      Create Discord Event
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create a Discord scheduled event
                    </p>
                  </div>
                  <Switch
                    id="createDiscordEvent"
                    checked={formData.createDiscordEvent}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        createDiscordEvent: checked,
                      }))
                    }
                  />
                </div>

                <Separator />

                <div>
                  <Label>Discord Channel</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose an existing channel or create a new one
                  </p>

                  <div className="space-y-3">
                    <Popover open={channelOpen} onOpenChange={setChannelOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={channelOpen}
                          className="w-full justify-between"
                        >
                          {formData.discordChannelId
                            ? filteredChannels.find(
                                (channel) =>
                                  channel.id === formData.discordChannelId,
                              )?.name
                            : "Select existing channel..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search channels..." />
                          <CommandEmpty>No channels found.</CommandEmpty>
                          <CommandGroup>
                            {filteredChannels.map((channel) => (
                              <CommandItem
                                key={channel.id}
                                onSelect={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    discordChannelId: channel.id,
                                    createPrivateChannel: false,
                                  }));
                                  setChannelOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.discordChannelId === channel.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex items-center space-x-2">
                                  <span>{getEventTypeIcon(channel.type)}</span>
                                  <span>{channel.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {channel.type}
                                  </Badge>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    <div className="text-center text-muted-foreground">
                      <span className="text-sm">or</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="createPrivateChannel">
                          Create New Private Channel
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Create a new {formData.eventType} channel with
                          role-based permissions
                        </p>
                      </div>
                      <Switch
                        id="createPrivateChannel"
                        checked={formData.createPrivateChannel}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            createPrivateChannel: checked,
                            discordChannelId: checked
                              ? undefined
                              : prev.discordChannelId,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {formData.createPrivateChannel && (
                  <Alert>
                    <AlertDescription>
                      <strong>New Channel:</strong> A private{" "}
                      {formData.eventType} channel will be created with access
                      limited to users with the selected prerequisite roles
                      {formData.prerequisiteRoles.length === 0 &&
                        " (currently open to all)"}
                      . The channel will be named based on your event title.
                    </AlertDescription>
                  </Alert>
                )}

                {formData.discordChannelId && (
                  <Alert>
                    <AlertDescription>
                      <strong>Existing Channel:</strong> Permissions for the
                      selected channel will be updated to match your
                      prerequisite roles. This may affect other users' access.
                    </AlertDescription>
                  </Alert>
                )}

                {!formData.discordChannelId &&
                  !formData.createPrivateChannel && (
                    <Alert>
                      <AlertDescription>
                        <strong>No Channel:</strong> The event will be created
                        without a specific Discord channel.
                        {formData.createDiscordEvent &&
                          ' The Discord event will be marked as "External".'}
                      </AlertDescription>
                    </Alert>
                  )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {activeTab !== "basic" && (
              <Button
                variant="ghost"
                onClick={() => {
                  const tabs = ["basic", "schedule", "access", "discord"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabs[currentIndex - 1]);
                  }
                }}
              >
                ⬅️ Previous
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            {activeTab !== "discord" ? (
              <Button
                onClick={() => {
                  const tabs = ["basic", "schedule", "access", "discord"];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
              >
                Next ➡️
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createEventMutation.isPending || hasValidationErrors}
              >
                {createEventMutation.isPending
                  ? "Creating..."
                  : "🎯 Create Event"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventDialog;
