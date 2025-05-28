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
import { AuthUser, UserRole } from "@/types/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RefreshCw, Search, Shield, Trash2, UserPlus, Users } from "lucide-react";
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
import { format, formatDistanceToNow } from "date-fns";
import { getRoleBadgeVariant, getRoleDisplayName } from "@/lib/role-utils";
import {
  useAdminUsers,
  useDeleteUser,
  useSyncDiscord,
  useUpdateUserRole,
} from "@/hooks/admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

export default function UserManagementTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<{
    userId: string;
    role: UserRole;
  } | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useAdminUsers(
    page,
    20,
    search,
  );
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const syncDiscord = useSyncDiscord();

  const handleRoleUpdate = async () => {
    if (!selectedRole) return;

    try {
      await updateRole.mutateAsync(selectedRole);
      toast.success("User role has been updated successfully.");
      setSelectedRole(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user role.");
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      await deleteUser.mutateAsync(userId);
      toast.success(`${username} has been deleted successfully.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user.");
    }
  };

  const handleSyncDiscord = async (userId: string, username: string) => {
    try {
      await syncDiscord.mutateAsync(userId);
      toast.success(`${username}'s Discord roles have been synced.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to sync Discord roles.");
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load users</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading the user data. Please try again.
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

  // Extract users and pagination from the API response structure
  const users: AuthUser[] = data?.data?.data || []; // Note: data.data.data because of ApiResponse<PaginatedResponse<AuthUser>>
  const pagination = data?.data?.pagination || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">
                User Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {pagination.total || 0} total users
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Discord Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user: AuthUser) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.avatar_url}
                            alt={user.username}
                          />
                          <AvatarFallback>
                            {user.username?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {user.username}
                          </p>
                          {user.email && (
                            <p className="text-sm text-muted-foreground truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: UserRole) =>
                          setSelectedRole({ userId: user.id, role: value })
                        }
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(UserRole).map((role) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex items-center gap-2">
                                <Badge variant={getRoleBadgeVariant(role)}>
                                  {getRoleDisplayName(role)}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.discordProfile ? (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            user.discordProfile.guild_joined 
                              ? "bg-green-500" 
                              : "bg-yellow-500"
                          )}></div>
                          <span className="text-sm">
                            {user.discordProfile.guild_joined
                              ? "In Guild"
                              : "Connected"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{user.discordProfile.discord_username}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-muted-foreground">
                            Not connected
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.tags && user.tags.length > 0 ? (
                          <>
                            <span className="text-sm font-medium">
                              {user.tags.length}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              tag{user.tags.length !== 1 ? 's' : ''}
                            </span>
                            {user.tags.some(tag => tag.is_primary) && (
                              <Badge variant="outline" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No tags
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <time
                        dateTime={new Date(user.created_at).toISOString()}
                        title={format(new Date(user.created_at), "PPpp")}
                        className="text-sm text-muted-foreground"
                      >
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </time>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.discordProfile && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleSyncDiscord(user.id, user.username)
                              }
                              disabled={syncDiscord.isPending}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Sync Discord
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              // Navigate to user details page or open user details modal
                              // You can implement this based on your routing structure
                              console.log('View user details:', user.id);
                            }}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete User Account
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{user.username}</strong>'s
                                  account? This will remove their access to Discord and all associated data.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteUser(user.id, user.username)
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={deleteUser.isPending}
                                >
                                  {deleteUser.isPending ? "Deleting..." : "Delete User"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {search ? "No users found matching your search" : "No users found"}
                      </p>
                      {search && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setPage(1);
                          }}
                        >
                          Clear search
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
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {((page - 1) * 20) + 1} to{" "}
                {Math.min(page * 20, pagination.total || 0)} of{" "}
                {pagination.total || 0} users
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
                {Array.from({ length: Math.min(5, pagination.totalPages || 0) }, (_, i) => {
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
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(pagination.totalPages || 1, page + 1))}
                disabled={page >= (pagination.totalPages || 1) || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Role Update Confirmation */}
        <AlertDialog
          open={!!selectedRole}
          onOpenChange={() => setSelectedRole(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update User Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to change this user's role to{" "}
                <strong>
                  {selectedRole ? getRoleDisplayName(selectedRole.role) : ""}
                </strong>
                ? This will also update their Discord server roles and permissions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updateRole.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRoleUpdate}
                disabled={updateRole.isPending}
              >
                {updateRole.isPending ? "Updating..." : "Update Role"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
