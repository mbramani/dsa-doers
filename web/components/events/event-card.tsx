"use client";

import { Calendar, Clock, MapPin, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EventEligibilityBadge from "./event-eligibility-badge";
import EventStatusBadge from "@/components/admin/event-status-badge";
import { EventWithDetails } from "@/types/events";
import Link from "next/link";
import { format } from "date-fns";
import { useEventEligibility } from "@/hooks/user-events";

interface EventCardProps {
  event: EventWithDetails;
}

export default function EventCard({ event }: EventCardProps) {
  const { data: eligibilityData } = useEventEligibility(event.id);
  const eligibility = eligibilityData?.data;

  const isUpcoming = new Date(event.start_time) > new Date();
  const isPastEvent =
    event.status === "completed" || new Date(event.start_time) < new Date();

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2">
            {event.title}
          </h3>
          <div className="flex flex-col gap-1">
            <EventStatusBadge status={event.status} />
            <Badge variant="outline" className="text-xs">
              {event.event_type.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Event Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <time dateTime={event.start_time}>
              {format(new Date(event.start_time), "MMM dd, yyyy")}
            </time>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <time dateTime={event.start_time}>
              {format(new Date(event.start_time), "h:mm a")}
              {event.end_time && (
                <>
                  {" - "}
                  <time dateTime={event.end_time}>
                    {format(new Date(event.end_time), "h:mm a")}
                  </time>
                </>
              )}
            </time>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {event.granted_participants} / {event.max_participants || "∞"}{" "}
              participants
            </span>
          </div>
        </div>

        {/* Required Tags */}
        {event.required_tags && event.required_tags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Required Tags:
            </p>
            <div className="flex flex-wrap gap-1">
              {event.required_tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  <span className="mr-1">{tag.icon}</span>
                  {tag.display_name}
                </Badge>
              ))}
              {event.required_tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{event.required_tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Eligibility Status */}
        {eligibility && (
          <EventEligibilityBadge
            eligibility={eligibility}
            showMissingTags={true}
          />
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex w-full gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/events/${event.id}`}>View Details</Link>
          </Button>

          {eligibility?.is_eligible &&
            isUpcoming &&
            event.status === "active" && (
              <Button className="flex-1">Request Access</Button>
            )}

          {!eligibility?.is_eligible && isUpcoming && (
            <Button variant="secondary" disabled className="flex-1">
              {eligibility?.missing_required_tags &&
              eligibility.missing_required_tags.length > 0
                ? `Missing ${eligibility.missing_required_tags.length} tag${eligibility.missing_required_tags.length !== 1 ? "s" : ""}`
                : "Not Eligible"}
            </Button>
          )}

          {isPastEvent && (
            <Button variant="outline" disabled className="flex-1">
              Event Ended
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
