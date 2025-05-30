"use client";

import { Calendar, Clock, ExternalLink, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EventStatusBadge from "@/components/admin/event-status-badge";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useMyEvents } from "@/hooks/user-events";

export default function MyEventsPage() {
  const { data, isLoading, error } = useMyEvents();

  const events = data?.data || [];
  const upcomingEvents = events.filter(
    (event) =>
      new Date(event.start_time) > new Date() && event.status === "active",
  );
  const pastEvents = events.filter(
    (event) =>
      new Date(event.start_time) <= new Date() || event.status === "completed",
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Failed to load events
              </h3>
              <p className="text-muted-foreground">
                There was an error loading your events. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">My Events</h1>
        <p className="text-xl text-muted-foreground">
          Events you have access to and your participation history
        </p>
      </div>

      {/* Upcoming Events */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Upcoming Events</h2>
          <Badge variant="secondary">
            {upcomingEvents.length} event
            {upcomingEvents.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingEvents.map((event) => (
              <Card
                key={event.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {event.title}
                    </h3>
                    <EventStatusBadge status={event.status} />
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <time dateTime={event.start_time}>
                        {format(new Date(event.start_time), "EEEE, MMM dd")}
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
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-green-600 dark:text-green-400">
                        Voice channel access granted
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link href={`/events/${event.id}`}>View Details</Link>
                    </Button>
                    <Button size="sm" className="flex-1">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Join Discord
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No upcoming events
                </h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any upcoming events. Browse available events to
                  join new ones.
                </p>
                <Button asChild>
                  <Link href="/events">Browse Events</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Past Events</h2>
            <Badge variant="outline">
              {pastEvents.length} event{pastEvents.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => (
              <Card key={event.id} className="opacity-75">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium line-clamp-2">{event.title}</h3>
                    <EventStatusBadge status={event.status} />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={event.start_time}>
                      {format(new Date(event.start_time), "MMM dd, yyyy")}
                    </time>
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link href={`/events/${event.id}`}>View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
