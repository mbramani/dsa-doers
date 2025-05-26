"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth, useLogout } from "@/hooks/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserRole } from "@/types/api";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: user, isLoading } = useAuth();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && !user) {
      redirect("/");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-96">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case UserRole.NEWBIE:
        return "Welcome to DSA Doers! Complete challenges to advance your role.";
      case UserRole.MEMBER:
        return "You're an active member! Keep solving problems to become a contributor.";
      case UserRole.CONTRIBUTOR:
        return "Great work! You're contributing to the community.";
      case UserRole.MODERATOR:
        return "You help moderate the community. Thank you for your service!";
      case UserRole.ADMIN:
        return "You have full administrative privileges.";
      default:
        return "";
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.NEWBIE:
        return "success";
      case UserRole.MEMBER:
        return "default";
      case UserRole.CONTRIBUTOR:
        return "secondary";
      case UserRole.MODERATOR:
        return "warning";
      case UserRole.ADMIN:
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">DSA Doers Dashboard</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                  <AvatarFallback>
                    {user.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.username}</span>
              </div>
              <Button
                onClick={() => logout.mutate()}
                variant="outline"
                size="sm"
                disabled={logout.isPending}
              >
                {logout.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user.avatar_url} alt={user.username} />
                  <AvatarFallback>
                    {user.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{user.username}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Role:</span>
                <div className="mt-1">
                  <Badge>{user.role.toUpperCase()}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {getRoleDescription(user.role)}
                </p>
              </div>

              <div>
                <span className="text-sm font-medium">Member since:</span>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Discord Status */}
          <Card>
            <CardHeader>
              <CardTitle>Discord Status</CardTitle>
            </CardHeader>
            <CardContent>
              {user.discordProfile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Username: {user.discordProfile.discord_username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Server Status:{" "}
                    {user.discordProfile.guild_joined ? (
                      <Badge className="ml-1">Joined</Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-1">
                        Not Joined
                      </Badge>
                    )}
                  </p>
                  {!user.discordProfile.guild_joined && (
                    <Button size="sm" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        Join Discord Server
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Not Connected</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect your Discord account to join our community.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-muted-foreground">
                  Problems Solved
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-muted-foreground">
                  Contributions
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-muted-foreground">
                  Study Streak
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <p>
                No recent activity. Start solving problems to see your progress
                here!
              </p>
              <Button className="mt-4">Browse Problems</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
