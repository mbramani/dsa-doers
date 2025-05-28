"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  MessageSquare,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats } from "@/hooks/admin";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && (
            <div
              className={`flex items-center text-xs ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              <TrendingUp
                className={`h-3 w-3 mr-1 ${
                  !trend.isPositive ? "rotate-180" : ""
                }`}
              />
              {trend.value}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
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
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminStats() {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard stats. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  const { users, tags, discord } = stats?.data?.stats || {};
  const contributorCount =
    users?.usersByRole?.find((r: any) => r.role === "contributor")?.count || 0;

  const statsData = [
    {
      title: "Total Users",
      value: users?.totalUsers || 0,
      subtitle: `+${users?.recentSignups || 0} new this month`,
      icon: Users,
      trend:
        users?.recentSignups > 0
          ? {
              value: Math.round((users.recentSignups / users.totalUsers) * 100),
              isPositive: true,
            }
          : undefined,
    },
    {
      title: "Discord Members",
      value: discord?.guild_members || 0,
      subtitle: `${discord?.total_discord_users || 0} connected accounts`,
      icon: MessageSquare,
      trend:
        discord?.guild_members > 0
          ? {
              value: Math.round(
                (discord.total_discord_users / discord.guild_members) * 100,
              ),
              isPositive: true,
            }
          : undefined,
    },
    {
      title: "Contributors",
      value: contributorCount,
      subtitle: "Active community contributors",
      icon: UserCheck,
      trend:
        contributorCount > 0 && users?.totalUsers > 0
          ? {
              value: Math.round((contributorCount / users.totalUsers) * 100),
              isPositive: true,
            }
          : undefined,
    },
    {
      title: "Tags",
      value: tags?.totalTags || 0,
      subtitle: `${tags?.assignedTags || 0} assigned to users`,
      icon: Tag,
      trend:
        tags?.totalTags > 0 && tags?.assignedTags > 0
          ? {
              value: Math.round((tags.assignedTags / tags.totalTags) * 100),
              isPositive: true,
            }
          : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
