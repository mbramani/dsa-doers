import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DISCORD_PERMISSIONS,
  PERMISSION_CATEGORIES,
  type Role,
  type UpdateRoleData,
} from "@/types/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUpdateRole } from "@/hooks/use-admin";

interface EditRoleDialogProps {
  role: Role | null;
  isOpen: boolean;
  onClose: () => void;
}

const EditRoleDialog: React.FC<EditRoleDialogProps> = ({
  role,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState<UpdateRoleData>({
    name: "",
    description: "",
    color: "#3B82F6",
    sortOrder: 0,
    isSystemRole: false,
    discordRoleConfig: {
      permissions: [],
      hoist: false,
      mentionable: true,
    },
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateRoleMutation = useUpdateRole();

  // Initialize form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        color: role.color,
        sortOrder: role.sortOrder,
        isSystemRole: role.isSystemRole,
        discordRoleConfig: {
          permissions: [], // We'd need to fetch this from Discord or store it
          hoist: false,
          mentionable: true,
        },
      });
      setHasUnsavedChanges(false);
    }
  }, [role]);

  // Track changes
  useEffect(() => {
    if (role) {
      const hasChanges =
        formData.name !== role.name ||
        formData.description !== role.description ||
        formData.color !== role.color ||
        formData.sortOrder !== role.sortOrder ||
        formData.isSystemRole !== role.isSystemRole;
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, role]);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (
        confirm("You have unsaved changes. Are you sure you want to close?")
      ) {
        onClose();
        setActiveTab("basic");
        setHasUnsavedChanges(false);
      }
    } else {
      onClose();
      setActiveTab("basic");
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      discordRoleConfig: {
        ...prev.discordRoleConfig!,
        permissions: checked
          ? [...(prev.discordRoleConfig?.permissions || []), permission]
          : (prev.discordRoleConfig?.permissions || []).filter(
              (p) => p !== permission,
            ),
      },
    }));
  };

  const handleSubmit = async () => {
    if (!role || !formData.name?.trim() || !formData.description?.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        roleId: role.id,
        ...formData,
      });
      handleClose();
    } catch {
      toast.error("Failed to update role. Please try again.", {
        description:
          updateRoleMutation.error?.message || "An unexpected error occurred",
      });
    }
  };

  const handleResetChanges = () => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        color: role.color,
        sortOrder: role.sortOrder,
        isSystemRole: role.isSystemRole,
        discordRoleConfig: {
          permissions: [],
          hoist: false,
          mentionable: true,
        },
      });
      setHasUnsavedChanges(false);
      toast.info("Changes reset to original values");
    }
  };

  if (!role) return null;

  // Group permissions by category
  const permissionsByCategory = DISCORD_PERMISSIONS.reduce(
    (acc, permission) => {
      const category = permission.category || "general";
      if (!acc[category]) acc[category] = [];
      acc[category].push(permission);
      return acc;
    },
    {} as Record<string, typeof DISCORD_PERMISSIONS>,
  );

  const isSystemRole = role.isSystemRole;
  const canEdit = !isSystemRole || (isSystemRole && formData.isSystemRole);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">✏️</span>
            Edit Role - {role.name}
            {isSystemRole && (
              <Badge variant="outline" className="ml-2">
                🤖 System Role
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Modify role properties and Discord integration settings
            {hasUnsavedChanges && (
              <span className="text-orange-600 font-medium ml-2">
                • Unsaved changes
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">📝 Basic Info</TabsTrigger>
            <TabsTrigger value="users">
              👥 Users ({role.userRoles.length})
            </TabsTrigger>
            <TabsTrigger value="permissions">🔐 Permissions</TabsTrigger>
            <TabsTrigger value="danger">⚠️ Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>
                  Core role properties and appearance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Role Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value.toUpperCase(),
                      }))
                    }
                    disabled={isSystemRole}
                    placeholder="e.g., MENTOR, REVIEWER"
                  />
                  {isSystemRole && (
                    <p className="text-xs text-muted-foreground mt-1">
                      System role names cannot be changed
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what this role represents..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-color">Role Color</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        id="edit-color"
                        value={formData.color}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            color: e.target.value,
                          }))
                        }
                        className="w-12 h-8 rounded border"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            color: e.target.value,
                          }))
                        }
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-sortOrder">Sort Order</Label>
                    <Input
                      id="edit-sortOrder"
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sortOrder: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isSystemRole"
                    checked={formData.isSystemRole}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        isSystemRole: checked,
                      }))
                    }
                    disabled={!canEdit}
                  />
                  <Label htmlFor="edit-isSystemRole">System Role</Label>
                  <Badge variant="outline" className="text-xs">
                    🤖 Protected from deletion
                  </Badge>
                </div>

                {/* Role Preview */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge
                      style={{
                        backgroundColor: formData.color + "20",
                        borderColor: formData.color,
                        color: formData.color,
                      }}
                    >
                      {formData.name || "ROLE_NAME"}
                    </Badge>
                    {formData.isSystemRole && (
                      <span className="text-sm">🤖</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Sort: {formData.sortOrder}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formData.description ||
                      "Role description will appear here..."}
                  </p>
                </div>

                {/* Role Statistics */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {role.userRoles.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Active Users
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">
                      {new Date(role.updatedAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last Updated
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <span className="mr-2">👥</span>
                  Users with this Role
                </CardTitle>
                <CardDescription>
                  {role.userRoles.length} user
                  {role.userRoles.length !== 1 ? "s" : ""} currently have this
                  role
                </CardDescription>
              </CardHeader>
              <CardContent>
                {role.userRoles.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-4xl mb-2 block">😊</span>
                    <p className="text-muted-foreground">
                      No users have this role yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {role.userRoles.map((userRole) => (
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
                            <div className="text-xs text-muted-foreground">
                              <p>
                                Granted:{" "}
                                {new Date(
                                  userRole.grantedAt,
                                ).toLocaleDateString()}
                              </p>
                              <p>Reason: {userRole.grantReason}</p>
                            </div>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discord Integration</CardTitle>
                <CardDescription>
                  Configure how this role appears and behaves in Discord
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="edit-hoist">Display separately</Label>
                    <p className="text-sm text-muted-foreground">
                      Show this role separately in member list
                    </p>
                  </div>
                  <Switch
                    id="edit-hoist"
                    checked={formData.discordRoleConfig?.hoist}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        discordRoleConfig: {
                          ...prev.discordRoleConfig!,
                          hoist: checked,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="edit-mentionable">
                      Allow anyone to mention
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Let anyone @mention this role
                    </p>
                  </div>
                  <Switch
                    id="edit-mentionable"
                    checked={formData.discordRoleConfig?.mentionable}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        discordRoleConfig: {
                          ...prev.discordRoleConfig!,
                          mentionable: checked,
                        },
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Discord Permissions</CardTitle>
                <CardDescription>
                  Configure specific permissions for this role in Discord
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(permissionsByCategory).map(
                    ([category, permissions]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium flex items-center">
                          <span className="mr-2">
                            {
                              PERMISSION_CATEGORIES[
                                category as keyof typeof PERMISSION_CATEGORIES
                              ]?.icon
                            }
                          </span>
                          {
                            PERMISSION_CATEGORIES[
                              category as keyof typeof PERMISSION_CATEGORIES
                            ]?.label
                          }
                        </h4>
                        <div className="grid grid-cols-1 gap-2 pl-6 border-l-2 border-muted max-h-48 overflow-y-auto">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-start space-x-2"
                            >
                              <Checkbox
                                id={`edit-${permission.id}`}
                                checked={formData.discordRoleConfig?.permissions?.includes(
                                  permission.id,
                                )}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(
                                    permission.id,
                                    checked as boolean,
                                  )
                                }
                              />
                              <div className="flex-1">
                                <Label
                                  htmlFor={`edit-${permission.id}`}
                                  className="text-sm font-medium"
                                >
                                  {permission.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="danger" className="space-y-6">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg text-red-600 flex items-center">
                  <span className="mr-2">⚠️</span>
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect this role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSystemRole ? (
                  <Alert>
                    <AlertDescription>
                      <strong>System Role Protection:</strong> This role is
                      protected and cannot be deleted. System roles are
                      essential for platform functionality.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <h4 className="font-medium text-red-800">Delete Role</h4>
                      <p className="text-sm text-red-600 mt-1">
                        Permanently delete this role. This action cannot be
                        undone. All users will lose this role.
                      </p>
                      <div className="mt-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={role.userRoles.length > 0}
                          onClick={() => {
                            toast.error("Role deletion not implemented yet", {
                              description:
                                "This feature will be available soon",
                            });
                          }}
                        >
                          🗑️ Delete Role
                        </Button>
                        {role.userRoles.length > 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            Cannot delete role with active users. Remove all
                            users first.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                      <h4 className="font-medium text-yellow-800">
                        Archive Role
                      </h4>
                      <p className="text-sm text-yellow-600 mt-1">
                        Hide this role from new assignments while keeping
                        existing assignments.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          toast.info("Role archiving not implemented yet", {
                            description: "This feature will be available soon",
                          });
                        }}
                      >
                        📦 Archive Role
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {hasUnsavedChanges && (
              <Button variant="ghost" onClick={handleResetChanges}>
                🔄 Reset Changes
              </Button>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={updateRoleMutation.isPending || !hasUnsavedChanges}
          >
            {updateRoleMutation.isPending ? "Saving..." : "💾 Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditRoleDialog;
