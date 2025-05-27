"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, TrendingUp, UserCheck, Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/admin";

export default function AdminStats() {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load dashboard stats</p>
        </CardContent>
      </Card>
    );
  }

  const { totalUsers, usersByRole, discordStats, recentSignups } = stats?.data?.stats || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers || 0}</div>
          <p className="text-xs text-muted-foreground">
            +{recentSignups || 0} this month
          </p>
        </CardContent>
      </Card>

      {/* Discord Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Discord Members</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{discordStats?.guild_members || 0}</div>
          <p className="text-xs text-muted-foreground">
            {discordStats?.total_discord_users || 0} connected accounts
          </p>
        </CardContent>
      </Card>

      {/* Active Contributors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contributors</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {usersByRole?.find((r: any) => r.role === 'contributor')?.count || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Active community contributors
          </p>
        </CardContent>
      </Card>

      {/* Recent Growth */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Growth</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {recentSignups ? `+${Math.round((recentSignups / totalUsers) * 100)}%` : "0%"}
          </div>
          <p className="text-xs text-muted-foreground">
            This month vs last month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}