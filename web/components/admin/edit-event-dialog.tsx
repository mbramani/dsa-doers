"use client";

import * as z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventType, EventWithDetails, UpdateEventInput } from "@/types/events";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAvailableTags,
  useDiscordChannels,
  useUpdateEvent,
} from "@/hooks/admin-events";
import { useEffect, useMemo } from "react";

import { Button } from "@/components/ui/button";
import DiscordChannelSelect from "./discord-channel-select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import TagMultiSelect from "./tag-multi-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const editEventSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  description: z.string().optional(),
  event_type: z.nativeEnum(EventType, {
    required_error: "Event type is required",
  }),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().optional(),
  voice_channel_id: z.string().min(1, "Voice channel is required"),
  max_participants: z.coerce.number().int().positive().optional(),
  required_tag_ids: z.array(z.string()),
});

type EditEventFormData = z.infer<typeof editEventSchema>;

interface EditEventDialogProps {
  event: EventWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditEventDialog({
  event,
  open,
  onOpenChange,
}: EditEventDialogProps) {
  const updateEvent = useUpdateEvent();
  const { data: channelsData } = useDiscordChannels();
  const { data: tagsData } = useAvailableTags();

  const form = useForm<EditEventFormData>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: "",
      description: "",
      event_type: EventType.SESSION,
      start_time: "",
      end_time: "",
      voice_channel_id: "",
      max_participants: undefined,
      required_tag_ids: [],
    },
  });

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;

      // Format datetime-local strings
      const formatDateTimeLocal = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      };

      form.reset({
        title: event.title,
        description: event.description || "",
        event_type: event.event_type,
        start_time: formatDateTimeLocal(startTime),
        end_time: endTime ? formatDateTimeLocal(endTime) : "",
        voice_channel_id: event.voice_channel_id,
        max_participants: event.max_participants || undefined,
        required_tag_ids: event.required_tags?.map((tag) => tag.tag_id) || [],
      });
    }
  }, [event, form]);

  const onSubmit = async (data: EditEventFormData) => {
    if (!event) return;

    try {
      const eventData: UpdateEventInput = {
        title: data.title,
        description: data.description || undefined,
        event_type: data.event_type,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time
          ? new Date(data.end_time).toISOString()
          : undefined,
        voice_channel_id: data.voice_channel_id,
        max_participants: data.max_participants || undefined,
      };

      await updateEvent.mutateAsync({
        eventId: event.id,
        eventData,
      });

      toast.success("Event updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    }
  };

  const channels = channelsData?.data || [];
  const tags = tagsData?.data?.tags || [];

  const isCompleted =
    event?.status === "completed" || event?.status === "cancelled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update event details and settings.
            {isCompleted &&
              " (Some fields may be read-only for completed events)"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter event title..."
                      {...field}
                      disabled={updateEvent.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter event description..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={updateEvent.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Type */}
            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={updateEvent.isPending || isCompleted}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EventType.SESSION}>Session</SelectItem>
                      <SelectItem value={EventType.CONTEST}>Contest</SelectItem>
                      <SelectItem value={EventType.WORKSHOP}>
                        Workshop
                      </SelectItem>
                      <SelectItem value={EventType.STUDY_GROUP}>
                        Study Group
                      </SelectItem>
                      <SelectItem value={EventType.MOCK_INTERVIEW}>
                        Mock Interview
                      </SelectItem>
                      <SelectItem value={EventType.CODE_REVIEW}>
                        Code Review
                      </SelectItem>
                      <SelectItem value={EventType.DISCUSSION}>
                        Discussion
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Time */}
            <FormField
              control={form.control}
              name="start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      disabled={updateEvent.isPending || isCompleted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Time */}
            <FormField
              control={form.control}
              name="end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      disabled={updateEvent.isPending || isCompleted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Voice Channel */}
            <FormField
              control={form.control}
              name="voice_channel_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voice Channel</FormLabel>
                  <FormControl>
                    <DiscordChannelSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      channels={channels}
                      disabled={updateEvent.isPending || isCompleted}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Participants */}
            <FormField
              control={form.control}
              name="max_participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Participants</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Leave empty for unlimited"
                      {...field}
                      value={field.value || ""}
                      disabled={updateEvent.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Required Tags */}
            <FormField
              control={form.control}
              name="required_tag_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Tags</FormLabel>
                  <FormControl>
                    <TagMultiSelect
                      selectedTagIds={field.value}
                      onSelectionChange={field.onChange}
                      availableTags={tags}
                      disabled={updateEvent.isPending || isCompleted}
                    />
                  </FormControl>
                  <FormDescription>
                    Users must have all selected tags to join this event
                    {isCompleted && " (Cannot modify for completed events)"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateEvent.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateEvent.isPending || isCompleted}
              >
                {updateEvent.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
