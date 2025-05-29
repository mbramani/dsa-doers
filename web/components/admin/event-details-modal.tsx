"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Hash, Tag, User, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EventStatusBadge from "./event-status-badge";
import { EventWithDetails } from "@/types/events";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useEventParticipants } from "@/hooks/admin-events";

interface EventDetailsModalProps {
  event: EventWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: EventWithDetails) => void;
}

export default function EventDetailsModal({
  event,
  open,
  onOpenChange,
  onEdit,
}: EventDetailsModalProps) {
  const { data: participantsData, isLoading: participantsLoading } =
    useEventParticipants(event?.id || "", 1, 10);

  if (!event) return null;

  const participants = participantsData?.data?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <DialogTitle className="text-xl">{event.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <EventStatusBadge status={event.status} />
                <Badge variant="outline">
                  {event.event_type.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          {event.description && (
            <DialogDescription className="text-left whitespace-pre-wrap">
              {event.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Start Time</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.start_time), "PPP")} at{" "}
                  {format(new Date(event.start_time), "p")}
                </p>
              </div>
            </div>

            {/* End Time */}
            {event.end_time && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">End Time</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(event.end_time), "PPP")} at{" "}
                    {format(new Date(event.end_time), "p")}
                  </p>
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Participants</p>
                <p className="text-sm text-muted-foreground">
                  {event.granted_participants} / {event.max_participants || "∞"}
                </p>
              </div>
            </div>

            {/* Creator */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Created by</p>
                <p className="text-sm text-muted-foreground">
                  {event.creator_username}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Required Tags */}
          {event.required_tags && event.required_tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4" />
                <h3 className="font-medium">Required Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {event.required_tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="flex items-center gap-1"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    <span className="text-xs">{tag.icon}</span>
                    <span>{tag.display_name}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Recent Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <h3 className="font-medium">Recent Participants</h3>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>

            {participantsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            ) : participants.length > 0 ? (
              <div className="space-y-3">
                {participants.slice(0, 5).map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar_url || ""} />
                      <AvatarFallback>
                        {participant.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {participant.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{" "}
                        {format(new Date(participant.requested_at), "MMM dd")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        participant.status === "granted"
                          ? "default"
                          : participant.status === "requested"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {participant.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No participants yet
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && <Button onClick={() => onEdit(event)}>Edit Event</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
