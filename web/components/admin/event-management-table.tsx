"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Edit,
  Eye,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EventFilters,
  EventStatus,
  EventType,
  EventWithDetails,
} from "@/types/events";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminEvents,
  useDeleteEvent,
  useEndEvent,
} from "@/hooks/admin-events";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateEventDialog from "./create-event-dialog";
import EditEventDialog from "./edit-event-dialog";
import EventDetailsModal from "./event-details-modal";
import EventFiltersComponent from "./event-filters";
import EventStatusBadge from "./event-status-badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

export default function EventManagementTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<EventFilters>({});
  const [eventToDelete, setEventToDelete] = useState<EventWithDetails | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDetails | null>(
    null,
  );

  const { data, isLoading, error, refetch, isRefetching } = useAdminEvents(
    page,
    20,
    { ...filters, search },
  );
  const deleteEvent = useDeleteEvent();
  const endEvent = useEndEvent();

  const handleDeleteEvent = async (event: EventWithDetails) => {
    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success(`Event "${event.title}" has been deleted successfully.`);
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event.");
    }
  };

  const handleEndEvent = async (event: EventWithDetails) => {
    try {
      await endEvent.mutateAsync(event.id);
      toast.success(`Event "${event.title}" has been ended successfully.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to end event.");
    }
  };

  const handleEditEvent = (event: EventWithDetails) => {
    setSelectedEvent(event);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (event: EventWithDetails) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  const handleDeleteConfirm = (event: EventWithDetails) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      handleDeleteEvent(eventToDelete);
    }
  };

  const handleFiltersChange = (newFilters: EventFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Failed to load events
            </h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the event data. Please try again.
            </p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extract events and pagination from the API response structure
  const events: EventWithDetails[] = data?.data?.data || [];
  const pagination = data?.data?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">
                Event Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {pagination?.total || 0} total events
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 w-full sm:w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefetching && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              className="flex items-center gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Filters */}
      <div className="px-6 pb-4">
        <EventFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearFilters}
        />
      </div>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : events.length > 0 ? (
                events.map((event: EventWithDetails) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {event.event_type.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EventStatusBadge status={event.status} />
                    </TableCell>
                    <TableCell>
                      <time dateTime={event.start_time} className="text-sm">
                        {format(new Date(event.start_time), "MMM dd, yyyy")}
                        <br />
                        <span className="text-muted-foreground">
                          {format(new Date(event.start_time), "h:mm a")}
                        </span>
                      </time>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {event.granted_participants}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {event.max_participants || "∞"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{event.creator_username}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(event)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditEvent(event)}
                            disabled={
                              event.status === EventStatus.COMPLETED ||
                              event.status === EventStatus.CANCELLED
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Event
                          </DropdownMenuItem>
                          {event.status === EventStatus.ACTIVE && (
                            <DropdownMenuItem
                              onClick={() => handleEndEvent(event)}
                              disabled={endEvent.isPending}
                            >
                              <X className="mr-2 h-4 w-4" />
                              End Event
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteConfirm(event)}
                            className="text-destructive"
                            disabled={deleteEvent.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {search || Object.keys(filters).length > 0
                          ? "No events found matching your criteria"
                          : "No events found"}
                      </p>
                      {search || Object.keys(filters).length > 0 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </Button>
                      ) : (
                        <Button size="sm" className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Create First Event
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination?.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, pagination?.total || 0)} of{" "}
                {pagination?.total || 0} events
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
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
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  },
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage(Math.min(pagination?.totalPages || 1, page + 1))
                }
                disabled={page >= (pagination?.totalPages || 1) || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{eventToDelete?.title}</strong>? This will remove the
                event and revoke access for all participants. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteEvent.isPending}
              >
                {deleteEvent.isPending ? "Deleting..." : "Delete Event"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CreateEventDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <EditEventDialog
          event={selectedEvent}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />

        <EventDetailsModal
          event={selectedEvent}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onEdit={(event) => {
            setDetailsModalOpen(false);
            setSelectedEvent(event);
            setEditDialogOpen(true);
          }}
        />
      </CardContent>
    </Card>
  );
}
