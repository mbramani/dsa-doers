import { BookOpen, Calendar, Trophy, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/layout";
import Loading from "@/components/ui/loading";
import React from "react";
import { useAuthQuery } from "@/hooks/use-auth";

const Dashboard: React.FC = () => {
  const { data: user, isLoading, error } = useAuthQuery();

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Loading size="lg" text="Loading your dashboard..." />
        </div>
      </Layout>
    );
  }

  if (error || !user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-destructive">Failed to load user data</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, {user.discordUsername}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Ready to continue your DSA learning journey?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Roles
              </CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{user.roles.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assignments</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                No assignments yet
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                No upcoming events
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Roles Section */}
        {user.roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Roles</CardTitle>
              <CardDescription>
                Roles you've earned in the DSA Doers community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {user.roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: role.color || "#64748b" }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{role.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {role?.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start h-auto p-6"
                disabled
              >
                <BookOpen className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Browse Assignments</div>
                  <div className="text-sm text-muted-foreground">
                    Find practice problems
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-6"
                disabled
              >
                <Users className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Join Events</div>
                  <div className="text-sm text-muted-foreground">
                    Participate in learning sessions
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
