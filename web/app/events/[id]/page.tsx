"use client";

import { ArrowLeft, Calendar, Clock, Hash, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventDetails, useEventEligibility } from "@/hooks/user-events";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EventEligibilityBadge from "@/components/events/event-eligibility-badge";
import { EventErrorBoundary } from "@/components/events/event-error-boundary";
import EventStatusBadge from "@/components/admin/event-status-badge";
import Link from "next/link";
import RequestAccessButton from "@/components/events/request-access-button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useParams } from "next/navigation";

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const {
    data: eventData,
    isLoading: eventLoading,
    error,
  } = useEventDetails(eventId);
  const { data: eligibilityData } = useEventEligibility(eventId);

  const event = eventData?.data;
  const eligibility = eligibilityData?.data;

  if (eventLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Event not found</h3>
              <p className="text-muted-foreground mb-4">
                The event you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <Link href="/events">Back to Events</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isUpcoming = new Date(event.start_time) > new Date();
  const isPastEvent =
    event.status === "completed" || new Date(event.start_time) < new Date();

  return (
    <EventErrorBoundary>
      <div className="container mx-auto py-8 space-y-8">
        {/* Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/events">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-3xl font-bold leading-tight">
                      {event.title}
                    </h1>
                    <div className="flex flex-col gap-2">
                      <EventStatusBadge status={event.status} />
                      <Badge variant="outline">
                        {event.event_type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {eligibility && (
                    <EventEligibilityBadge
                      eligibility={eligibility}
                      showMissingTags={true}
                    />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {event.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                )}

                {/* Event Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          new Date(event.start_time),
                          "EEEE, MMMM do, yyyy",
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.start_time), "h:mm a")}
                        {event.end_time && (
                          <>
                            {" - "}
                            {format(new Date(event.end_time), "h:mm a")}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Participants</p>
                      <p className="text-sm text-muted-foreground">
                        {event.granted_participants} /{" "}
                        {event.max_participants || "Unlimited"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Hash className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Voice Channel</p>
                      <p className="text-sm text-muted-foreground">
                        Available after access granted
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Required Tags */}
            {event.required_tags && event.required_tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Required Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    You must have all of these tags to join this event:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.required_tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="flex items-center gap-1"
                        style={{ borderColor: tag.color, color: tag.color }}
                      >
                        <span className="text-sm">{tag.icon}</span>
                        <span>{tag.display_name}</span>
                        <span className="text-xs opacity-70">
                          ({tag.category})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Join Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eligibility && (
                  <RequestAccessButton
                    eventId={eventId}
                    eligibility={eligibility}
                    isUpcoming={isUpcoming}
                    eventStatus={event.status}
                    className="w-full"
                  />
                )}

                {!eligibility?.is_eligible &&
                  eligibility?.missing_required_tags &&
                  eligibility.missing_required_tags?.length > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        You need the following tags to join this event:
                      </p>
                      <div className="space-y-2">
                        {eligibility.missing_required_tags.map((tag) => (
                          <div
                            key={tag.tag_id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span>{tag.icon}</span>
                            <span>{tag.display_name}</span>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full" asChild>
                        <Link href="/dashboard">View My Tags</Link>
                      </Button>
                    </>
                  )}
              </CardContent>
            </Card>

            {/* Event Creator */}
            <Card>
              <CardHeader>
                <CardTitle>Event Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {event.creator_username?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{event.creator_username}</p>
                    <p className="text-sm text-muted-foreground">
                      Event Organizer
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EventErrorBoundary>
  );
}
