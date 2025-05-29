"use client";

import { Calendar, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventFilters, EventStatus, EventType } from "@/types/events";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import EventCard from "@/components/events/event-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents } from "@/hooks/user-events";
import { useState } from "react";

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<EventFilters>({});

  const { data, isLoading, error } = useEvents(page, 12, {
    ...filters,
    search,
  });

  const events = data?.data?.data || [];
  const pagination = data?.data?.pagination || {
    page: 1,
    totalPages: 1,
    totalItems: 0,
  };

  const handleFilterChange = (key: keyof EventFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === "all") {
      delete newFilters[key];
    } else {
      newFilters[key] = value as any;
    }
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || search;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Events</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover and join events tailored to your skills and interests. Build
          connections and level up your programming journey.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={(filters.status as string) || "all"}
              onValueChange={(value) => handleFilterChange("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value={EventStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={EventStatus.COMPLETED}>Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={(filters.event_type as string) || "all"}
              onValueChange={(value) => handleFilterChange("event_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value={EventType.SESSION}>Session</SelectItem>
                <SelectItem value={EventType.CONTEST}>Contest</SelectItem>
                <SelectItem value={EventType.WORKSHOP}>Workshop</SelectItem>
                <SelectItem value={EventType.STUDY_GROUP}>
                  Study Group
                </SelectItem>
                <SelectItem value={EventType.MOCK_INTERVIEW}>
                  Mock Interview
                </SelectItem>
                <SelectItem value={EventType.CODE_REVIEW}>
                  Code Review
                </SelectItem>
                <SelectItem value={EventType.DISCUSSION}>Discussion</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      {error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Failed to load events
              </h3>
              <p className="text-muted-foreground">
                There was an error loading the events. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No events found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {hasActiveFilters
                      ? "No events match your current filters."
                      : "There are no events available at the moment."}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from(
                { length: Math.min(5, pagination.totalPages || 0) },
                (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      disabled={isLoading}
                      className="w-10 h-10"
                    >
                      {pageNum}
                    </Button>
                  );
                },
              )}
            </div>
            <Button
              variant="outline"
              onClick={() =>
                setPage(Math.min(pagination.totalPages || 1, page + 1))
              }
              disabled={page >= (pagination.totalPages || 1) || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
