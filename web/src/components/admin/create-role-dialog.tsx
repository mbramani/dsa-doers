import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type CreateRoleData,
  DISCORD_PERMISSIONS,
  PERMISSION_CATEGORIES,
} from "@/types/admin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateRole } from "@/hooks/use-admin";

interface CreateRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateRoleDialog: React.FC<CreateRoleDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<CreateRoleData>({
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

  const createRoleMutation = useCreateRole();

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      discordRoleConfig: {
        ...prev.discordRoleConfig,
        permissions: checked
          ? [...prev.discordRoleConfig.permissions, permission]
          : prev.discordRoleConfig.permissions.filter((p) => p !== permission),
      },
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createRoleMutation.mutateAsync(formData);
      onClose();
      // Reset form
      setFormData({
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
    } catch {
      toast.error("Failed to create role. Please try again.");
    }
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">➕</span>
            Create New Role
          </DialogTitle>
          <DialogDescription>
            Create a new role with specific permissions and Discord integration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., MENTOR, REVIEWER"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this role represents..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Role Color</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="color"
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
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
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
                  id="isSystemRole"
                  checked={formData.isSystemRole}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isSystemRole: checked }))
                  }
                />
                <Label htmlFor="isSystemRole">System Role</Label>
                <Badge variant="outline" className="text-xs">
                  🤖 Cannot be deleted by users
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Discord Integration */}
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
                  <Label htmlFor="hoist">Display separately</Label>
                  <p className="text-sm text-muted-foreground">
                    Show this role separately in member list
                  </p>
                </div>
                <Switch
                  id="hoist"
                  checked={formData.discordRoleConfig.hoist}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      discordRoleConfig: {
                        ...prev.discordRoleConfig,
                        hoist: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mentionable">Allow anyone to mention</Label>
                  <p className="text-sm text-muted-foreground">
                    Let anyone @mention this role
                  </p>
                </div>
                <Switch
                  id="mentionable"
                  checked={formData.discordRoleConfig.mentionable}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      discordRoleConfig: {
                        ...prev.discordRoleConfig,
                        mentionable: checked,
                      },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Discord Permissions organized by category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discord Permissions</CardTitle>
              <CardDescription>
                Configure permissions for this role in Discord
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
                      <div className="grid grid-cols-1 gap-2 pl-6 border-l-2 border-muted">
                        {permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-2"
                          >
                            <Checkbox
                              id={permission.id}
                              checked={formData.discordRoleConfig.permissions.includes(
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
                                htmlFor={permission.id}
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

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge
                  style={{
                    backgroundColor: formData.color + "20",
                    borderColor: formData.color,
                    color: formData.color,
                  }}
                >
                  {formData.name || "ROLE_NAME"}
                </Badge>
                {formData.isSystemRole && <span className="text-sm">🤖</span>}
                <span className="text-sm text-muted-foreground">
                  Sort: {formData.sortOrder}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {formData.description || "Role description will appear here..."}
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createRoleMutation.isPending}
          >
            {createRoleMutation.isPending ? "Creating..." : "✨ Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoleDialog;
