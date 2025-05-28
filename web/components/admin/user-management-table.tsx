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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, RefreshCw, Search, Trash2 } from "lucide-react";
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
import { UserRole } from "@/types/api";
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
    } catch (error) {
      toast.error("Failed to update user role.");
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    try {
      await deleteUser.mutateAsync(userId);
      toast.success(`${username} has been deleted successfully.`);
    } catch (error) {
      toast.error("Failed to delete user.");
    }
  };

  const handleSyncDiscord = async (userId: string, username: string) => {
    try {
      await syncDiscord.mutateAsync(userId);
      toast.success(`${username}'s Discord roles have been synced.`);
    } catch (error) {
      toast.error("Failed to sync Discord roles.");
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load users</p>
        </CardContent>
      </Card>
    );
  }

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-xl font-semibold">
            Users ({pagination.total || 0})
          </CardTitle>
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
                <TableHead>Discord</TableHead>
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
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={user.avatar_url}
                            alt={user.username}
                          />
                          <AvatarFallback>
                            {user.username?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {user.username}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: UserRole) =>
                          setSelectedRole({ userId: user.id, role: value })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(UserRole).map((role) => (
                            <SelectItem key={role} value={role}>
                              <Badge variant={getRoleBadgeVariant(role)}>
                                {getRoleDisplayName(role)}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {user.discordProfile ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm">
                            {user.discordProfile.guild_joined
                              ? "Joined"
                              : "Connected"}
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
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
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
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {user.username}'s
                                  account. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteUser(user.id, user.username)
                                  }
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
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
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to{" "}
              {Math.min(page * 20, pagination.total)} of {pagination.total}{" "}
              users
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.pages}
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
                ? This will also update their Discord server roles.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
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
