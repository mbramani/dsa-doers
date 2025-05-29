"use client";

import { EventFilters, EventStatus, EventType } from "@/types/events";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";

interface EventFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  onClearFilters: () => void;
}

export default function EventFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
}: EventFiltersProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.start_date ? new Date(filters.start_date) : undefined,
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.end_date ? new Date(filters.end_date) : undefined,
  );

  const handleStatusChange = (value: string) => {
    const newFilters = { ...filters };
    if (value === "all") {
      delete newFilters.status;
    } else {
      newFilters.status = value as EventStatus;
    }
    onFiltersChange(newFilters);
  };

  const handleTypeChange = (value: string) => {
    const newFilters = { ...filters };
    if (value === "all") {
      delete newFilters.event_type;
    } else {
      newFilters.event_type = value as EventType;
    }
    onFiltersChange(newFilters);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    const newFilters = { ...filters };
    if (date) {
      newFilters.start_date = date.toISOString();
    } else {
      delete newFilters.start_date;
    }
    onFiltersChange(newFilters);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    const newFilters = { ...filters };
    if (date) {
      newFilters.end_date = date.toISOString();
    } else {
      delete newFilters.end_date;
    }
    onFiltersChange(newFilters);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Status</Label>
        <Select
          value={
            Array.isArray(filters.status) ? "all" : filters.status || "all"
          }
          onValueChange={handleStatusChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={EventStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={EventStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={EventStatus.COMPLETED}>Completed</SelectItem>
            <SelectItem value={EventStatus.CANCELLED}>Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event Type Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Type</Label>
        <Select
          value={
            Array.isArray(filters.event_type)
              ? "all"
              : filters.event_type || "all"
          }
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value={EventType.SESSION}>Session</SelectItem>
            <SelectItem value={EventType.CONTEST}>Contest</SelectItem>
            <SelectItem value={EventType.WORKSHOP}>Workshop</SelectItem>
            <SelectItem value={EventType.STUDY_GROUP}>Study Group</SelectItem>
            <SelectItem value={EventType.MOCK_INTERVIEW}>
              Mock Interview
            </SelectItem>
            <SelectItem value={EventType.CODE_REVIEW}>Code Review</SelectItem>
            <SelectItem value={EventType.DISCUSSION}>Discussion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start Date Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Start Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !startDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* End Date Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">End Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !endDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="flex items-end lg:col-span-4">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="w-full lg:w-auto"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
