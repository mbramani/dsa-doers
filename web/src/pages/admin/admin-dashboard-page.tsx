import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Loading from "@/components/ui/loading";
import React from "react";
import { useUserAnalytics } from "@/hooks/use-admin";

const AdminDashboardPage: React.FC = () => {
  const { data: analytics, isLoading } = useUserAnalytics();

  if (isLoading) {
    return (
      <div className="p-6">
        <Loading size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of DSA Doers platform
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <span className="text-2xl">👥</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeUsers} active users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New This Month
              </CardTitle>
              <span className="text-2xl">🆕</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.newUsersThisMonth}
              </div>
              <p className="text-xs text-muted-foreground">New registrations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
              <span className="text-2xl">📈</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(
                  (analytics.activeUsers / analytics.totalUsers) * 100,
                )}
                %
              </div>
              <p className="text-xs text-muted-foreground">User engagement</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Roles</CardTitle>
              <span className="text-2xl">🏷️</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.roleDistribution.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Different role types
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Role Distribution */}
      {analytics && analytics.roleDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">🏷️</span>
              Role Distribution
            </CardTitle>
            <CardDescription>
              How users are distributed across different roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.roleDistribution.map((role) => (
                <div
                  key={role.roleName}
                  className="flex items-center justify-between"
                >
                  <span className="font-medium">{role.roleName}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(role.count / analytics.totalUsers) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {role.count}
                    </span>
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
          <CardTitle className="flex items-center">
            <span className="mr-2">⚡</span>
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <span className="text-3xl mb-2 block">👥</span>
                  <h3 className="font-medium">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">
                    View, edit, and manage user accounts
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <span className="text-3xl mb-2 block">🏷️</span>
                  <h3 className="font-medium">Manage Roles</h3>
                  <p className="text-sm text-muted-foreground">
                    Create and assign user roles
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <span className="text-3xl mb-2 block">📅</span>
                  <h3 className="font-medium">Manage Events</h3>
                  <p className="text-sm text-muted-foreground">
                    Schedule and organize events
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboardPage;
