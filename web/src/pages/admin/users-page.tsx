import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserFilters, UserWithRoles } from "@/types/admin";
import {
  useUpdateUserStatus,
  useUserAnalytics,
  useUsers,
} from "@/hooks/use-admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import UserActionsDialog from "@/components/admin/user-actions-dialog";
import { toast } from "sonner";

const UsersPage: React.FC = () => {
  const [filters, setFilters] = useState<Partial<UserFilters>>({
    page: 1,
    limit: 20,
    status: "active",
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"archive" | "restore">(
    "archive",
  );
  const [selectedUserForActions, setSelectedUserForActions] =
    useState<UserWithRoles | null>(null);
  const [isUserActionsModalOpen, setIsUserActionsModalOpen] = useState(false);

  const { data: usersData, isLoading: usersLoading } = useUsers(filters);
  const { data: analytics, isLoading: analyticsLoading } = useUserAnalytics();
  const updateStatusMutation = useUpdateUserStatus();

  const handleStatusUpdate = async () => {
    if (!selectedUser || !actionReason.trim()) return;

    const loadingToast = toast.loading(
      `${actionType === "archive" ? "Archiving" : "Restoring"} user...`,
      {
        icon: actionType === "archive" ? "📦" : "🔄",
      },
    );

    try {
      await updateStatusMutation.mutateAsync({
        userId: selectedUser.id,
        action: actionType,
        reason: actionReason,
      });

      toast.dismiss(loadingToast);
      setIsActionModalOpen(false);
      setActionReason("");
      setSelectedUser(null);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Failed to update user status:", error);
    }
  };

  const openActionModal = (
    user: UserWithRoles,
    action: "archive" | "restore",
  ) => {
    setSelectedUser(user);
    setActionType(action);
    setIsActionModalOpen(true);
  };

  const openUserActionsModal = (user: UserWithRoles) => {
    setSelectedUserForActions(user);
    setIsUserActionsModalOpen(true);
  };

  if (usersLoading || analyticsLoading) {
    return (
      <div className="p-6">
        <Loading size="lg" text="Loading users..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">👥 User Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <span className="text-2xl">👤</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <span className="text-2xl">✅</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Archived Users
              </CardTitle>
              <span className="text-2xl">📦</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.archivedUsers}
              </div>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🔍</span>
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap justify-between">
            <div className="flex-1 min-w-[200px] max-w-[250px] space-y-2">
              <Label htmlFor="search">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by username or email..."
                value={filters.search || ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>

            <div className="flex">
              <div className="min-w-[150px] space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value: "active" | "archived" | "all") =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Active</SelectItem>
                    <SelectItem value="archived">📦 Archived</SelectItem>
                    <SelectItem value="all">🔄 All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[150px] space-y-2">
                <Label htmlFor="sortBy">Sort By</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(
                    value: "createdAt" | "discordUsername" | "lastActivity",
                  ) => setFilters((prev) => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">📅 Join Date</SelectItem>
                    <SelectItem value="discordUsername">🏷️ Username</SelectItem>
                    <SelectItem value="lastActivity">
                      ⏰ Last Activity
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">📊</span>
            Users List
          </CardTitle>
          <CardDescription>
            {usersData?.pagination.total || 0} users found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersData?.data.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">😊</span>
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              user.discordAvatar
                                ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`
                                : undefined
                            }
                          />
                          <AvatarFallback>
                            {user.discordUsername.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.discordUsername}</p>
                          {user.email && (
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.userRoles.slice(0, 3).map((userRole) => (
                          <Badge
                            key={userRole.id}
                            variant="secondary"
                            className="text-xs"
                            style={{
                              backgroundColor: userRole.role.color + "20",
                              borderColor: userRole.role.color,
                              color: userRole.role.color,
                            }}
                          >
                            {userRole.role.name}
                          </Badge>
                        ))}
                        {user.userRoles.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.userRoles.length - 3}
                          </Badge>
                        )}
                      </div>
                      {user.userRoles.length === 0 && (
                        <Badge variant="outline" className="text-xs">
                          No roles
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isArchived ? "secondary" : "default"}
                      >
                        {user.isArchived ? "📦 Archived" : "✅ Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.isArchived ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionModal(user, "restore")}
                          >
                            🔄 Restore
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionModal(user, "archive")}
                          >
                            📦 Archive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openUserActionsModal(user)}
                        >
                          ⚡ Actions
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "archive" ? "📦 Archive User" : "🔄 Restore User"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "archive"
                ? "This will archive the user and remove their access to the platform."
                : "This will restore the user and give them access to the platform again."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder={`Reason for ${actionType}ing this user...`}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!actionReason.trim() || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending
                ? "Processing..."
                : actionType === "archive"
                  ? "📦 Archive"
                  : "🔄 Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Actions Modal */}
      <UserActionsDialog
        user={selectedUserForActions}
        isOpen={isUserActionsModalOpen}
        onClose={() => {
          setIsUserActionsModalOpen(false);
          setSelectedUserForActions(null);
        }}
      />
    </div>
  );
};

export default UsersPage;
