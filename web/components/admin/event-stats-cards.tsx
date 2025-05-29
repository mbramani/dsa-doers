"use client";

import { Calendar, Clock, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import apiClient from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

interface EventStatsData {
  total_events: number;
  active_events: number;
  completed_events: number;
  total_participants: number;
  avg_participants_per_event: number;
  upcoming_events_count: number;
}

export default function EventStatsCards() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-event-stats"],
    queryFn: async () => {
      const response = await apiClient.get("/events/stats");
      return response.data.data as EventStatsData;
    },
    staleTime: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Failed to load event statistics
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      title: "Total Events",
      value: data.total_events,
      description: `${data.active_events} active`,
      icon: Calendar,
      trend: data.active_events > 0 ? "positive" : "neutral",
    },
    {
      title: "Total Participants",
      value: data.total_participants,
      description: `Avg ${data.avg_participants_per_event.toFixed(1)} per event`,
      icon: Users,
      trend: "positive",
    },
    {
      title: "Upcoming Events",
      value: data.upcoming_events_count,
      description: "Events starting soon",
      icon: Clock,
      trend: data.upcoming_events_count > 0 ? "positive" : "neutral",
    },
    {
      title: "Completed Events",
      value: data.completed_events,
      description: `${((data.completed_events / data.total_events) * 100).toFixed(1)}% completion rate`,
      icon: TrendingUp,
      trend: "positive",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
