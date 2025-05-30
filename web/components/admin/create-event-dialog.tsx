"use client";

import * as z from "zod";

import { Calendar, Clock, FileText, Hash, Loader2, Users } from "lucide-react";
import { CreateEventInput, EventStatus, EventType } from "@/types/events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useCreateEvent,
  useDiscordChannels,
} from "@/hooks/admin-events";

import { Button } from "@/components/ui/button";
import DiscordChannelSelect from "./discord-channel-select";
import { Input } from "@/components/ui/input";
import TagMultiSelect from "./tag-multi-select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const createEventSchema = z.object({
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

type CreateEventFormData = z.infer<typeof createEventSchema>;

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateEventDialog({
  open,
  onOpenChange,
}: CreateEventDialogProps) {
  const createEvent = useCreateEvent();
  const { data: channelsData } = useDiscordChannels();
  const { data: tagsData } = useAvailableTags();

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
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

  const onSubmit = async (data: CreateEventFormData) => {
    try {
      const eventData: CreateEventInput = {
        title: data.title,
        description: data.description || undefined,
        event_type: data.event_type,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time
          ? new Date(data.end_time).toISOString()
          : undefined,
        voice_channel_id: data.voice_channel_id,
        max_participants: data.max_participants || undefined,
        required_tag_ids: data.required_tag_ids,
      };

      await createEvent.mutateAsync(eventData);
      toast.success("Event created successfully!");
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    }
  };

  const channels = channelsData?.data || [];
  const tags = tagsData?.data?.tags || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Create a new event with Discord voice channel access control.
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
                      disabled={createEvent.isPending}
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
                      disabled={createEvent.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of the event (supports markdown)
                  </FormDescription>
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
                    defaultValue={field.value}
                    disabled={createEvent.isPending}
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
                      disabled={createEvent.isPending}
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
                      disabled={createEvent.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional end time for the event
                  </FormDescription>
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
                      disabled={createEvent.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Discord voice channel for this event
                  </FormDescription>
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
                      disabled={createEvent.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of participants (leave empty for unlimited)
                  </FormDescription>
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
                      disabled={createEvent.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Users must have all selected tags to join this event
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
                disabled={createEvent.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Event
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
