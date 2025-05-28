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
import {
  getRoleBadgeVariant,
  getRoleDescription,
  getRoleDisplayName,
} from "@/lib/role-utils";
import { useAuth, useLogout } from "@/hooks/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
        <div className="animate-spin text-6xl">😊</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleDisplayName(user.role)}
                  </Badge>
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
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Connected</span>
                  </div>

                  <div>
                    <span className="text-sm font-medium">
                      Discord Username:
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {user.discordProfile.discord_username}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Server Status:</span>
                    <p className="text-sm text-muted-foreground">
                      {user.discordProfile.guild_joined
                        ? "✅ Joined"
                        : "❌ Not joined"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm">Not connected</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect your Discord account to join our server.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.role === UserRole.ADMIN && (
                <Button asChild className="w-full" variant="outline">
                  <Link href="/admin">🛠️ Admin Panel</Link>
                </Button>
              )}
              {(user.role === UserRole.ADMIN ||
                user.role === UserRole.MODERATOR) && (
                <Button asChild className="w-full" variant="outline">
                  <Link href="/admin/users">⚡ Moderation Tools</Link>
                </Button>
              )}
              <Button asChild className="w-full" variant="outline">
                <Link href="/challenges">🎯 View Challenges</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/stats">📊 My Stats</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Role-specific content */}
        {user.role === UserRole.NEWBIE && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>🌱 Welcome to DSA Doers!</CardTitle>
              <CardDescription>
                Get started with your journey in Data Structures and Algorithms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📚 Start Learning</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Begin with basic concepts and work your way up
                  </p>
                  <Button size="sm">View Beginner Guide</Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">👥 Join Community</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Connect with other learners on Discord
                  </p>
                  <Button size="sm" variant="outline">
                    Join Discord
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
