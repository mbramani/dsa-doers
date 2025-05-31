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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateRoleDialog from "@/components/admin/create-role-dialog";
import EditRoleDialog from "@/components/admin/edit-role-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import type { Role } from "@/types/admin";
import { toast } from "sonner";
import { useRoles } from "@/hooks/use-admin";

const RolesPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [roleTypeFilter, setRoleTypeFilter] = useState<
    "all" | "system" | "custom"
  >("all");
  const [sortBy, setSortBy] = useState<"name" | "sortOrder" | "createdAt">(
    "sortOrder",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewUsersDialogOpen, setIsViewUsersDialogOpen] = useState(false);

  const { data: roles, isLoading } = useRoles({
    search,
    all: true,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Loading size="lg" text="Loading roles..." />
      </div>
    );
  }

  // Filter roles based on type
  const filteredRoles =
    roles
      ?.filter((role) => {
        const matchesSearch =
          role.name.toLowerCase().includes(search.toLowerCase()) ||
          role.description.toLowerCase().includes(search.toLowerCase());

        const matchesType =
          roleTypeFilter === "all" ||
          (roleTypeFilter === "system" && role.isSystemRole) ||
          (roleTypeFilter === "custom" && !role.isSystemRole);

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const order = sortOrder === "asc" ? 1 : -1;
        if (sortBy === "name") {
          return a.name.localeCompare(b.name) * order;
        } else if (sortBy === "sortOrder") {
          return (a.sortOrder - b.sortOrder) * order;
        } else if (sortBy === "createdAt") {
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            order
          );
        }
        return 0;
      }) || [];

  const systemRoles = filteredRoles.filter((role) => role.isSystemRole);
  const customRoles = filteredRoles.filter((role) => !role.isSystemRole);

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const openViewUsersDialog = (role: Role) => {
    setSelectedRole(role);
    setIsViewUsersDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🏷️ Role Management</h1>
          <p className="text-muted-foreground">
            Create and manage platform roles and permissions
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          ➕ Create Role
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <span className="text-2xl">🏷️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRoles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Roles</CardTitle>
            <span className="text-2xl">🤖</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemRoles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
            <span className="text-2xl">👤</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customRoles.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Users with Roles
            </CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredRoles.reduce(
                (total, role) => total + role.userRoles.length,
                0,
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🔍</span>
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] max-w-[300px] space-y-2">
              <Label htmlFor="search">Search Roles</Label>
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="min-w-[150px] space-y-2">
              <Label htmlFor="roleType">Role Type</Label>
              <Select
                value={roleTypeFilter}
                onValueChange={(value: "all" | "system" | "custom") =>
                  setRoleTypeFilter(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔄 All Roles</SelectItem>
                  <SelectItem value="system">🤖 System Roles</SelectItem>
                  <SelectItem value="custom">👤 Custom Roles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px] space-y-2">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(value: "name" | "sortOrder" | "createdAt") =>
                  setSortBy(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sortOrder">📊 Sort Order</SelectItem>
                  <SelectItem value="name">🏷️ Name</SelectItem>
                  <SelectItem value="createdAt">📅 Created Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[120px] space-y-2">
              <Label htmlFor="sortOrder">Order</Label>
              <Select
                value={sortOrder}
                onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">⬆️ Ascending</SelectItem>
                  <SelectItem value="desc">⬇️ Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">📋</span>
            Roles List
          </CardTitle>
          <CardDescription>
            {filteredRoles.length} role{filteredRoles.length !== 1 ? "s" : ""}{" "}
            found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRoles.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">😊</span>
              <p className="text-muted-foreground">No roles found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge
                            style={{
                              backgroundColor: role.color + "20",
                              borderColor: role.color,
                              color: role.color,
                            }}
                            className="font-medium"
                          >
                            {role.name}
                          </Badge>
                          {role.isSystemRole && (
                            <span className="text-xs">🤖</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground max-w-[300px]">
                          {role.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {role.userRoles.length}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          user{role.userRoles.length !== 1 ? "s" : ""}
                        </span>
                        {role.userRoles.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewUsersDialog(role)}
                          >
                            👀 View
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={role.isSystemRole ? "default" : "secondary"}
                      >
                        {role.isSystemRole ? "🤖 System" : "👤 Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {role.sortOrder}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(role.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(role.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            ⚙️ Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Role Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openEditDialog(role)}
                          >
                            ✏️ Edit Role
                          </DropdownMenuItem>
                          {role.userRoles.length > 0 && (
                            <DropdownMenuItem
                              onClick={() => openViewUsersDialog(role)}
                            >
                              👥 View Users
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {!role.isSystemRole && (
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(role)}
                              className="text-red-600 focus:text-red-600"
                            >
                              🗑️ Delete Role
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Users Dialog */}
      <Dialog
        open={isViewUsersDialogOpen}
        onOpenChange={setIsViewUsersDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="mr-2">👥</span>
              Users with "{selectedRole?.name}" Role
            </DialogTitle>
            <DialogDescription>
              {selectedRole?.userRoles.length || 0} user
              {selectedRole?.userRoles.length !== 1 ? "s" : ""} currently have
              this role
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto">
            {selectedRole?.userRoles.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-2xl mb-2 block">😊</span>
                <p className="text-muted-foreground">No users have this role</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRole?.userRoles.map((userRole) => (
                  <div
                    key={userRole.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            userRole.user.discordAvatar
                              ? `https://cdn.discordapp.com/avatars/${userRole.userId}/${userRole.user.discordAvatar}.png`
                              : undefined
                          }
                        />
                        <AvatarFallback>
                          {userRole.user.discordUsername
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {userRole.user.discordUsername}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Granted:{" "}
                          {new Date(userRole.grantedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {userRole.isSystemGranted && (
                        <Badge variant="outline" className="text-xs">
                          🤖 System
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <CreateRoleDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        role={selectedRole}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedRole(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🗑️ Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the "{selectedRole?.name}" role?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                // Handle delete role
                toast.success("Role deletion functionality coming soon!");
                setIsDeleteDialogOpen(false);
                setSelectedRole(null);
              }}
            >
              🗑️ Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPage;
