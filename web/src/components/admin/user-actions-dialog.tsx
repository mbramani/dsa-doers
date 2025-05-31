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
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAssignRoles,
  useRevokeRoles,
  useRoles,
  useSyncUser,
} from "@/hooks/use-admin";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import type { UserWithRoles } from "@/types/admin";
import { toast } from "sonner";

interface UserActionsDialogProps {
  user: UserWithRoles | null;
  isOpen: boolean;
  onClose: () => void;
}

const UserActionsDialog: React.FC<UserActionsDialogProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("sync");
  const [reason, setReason] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [syncWithDiscord, setSyncWithDiscord] = useState(true);

  const { data: allRoles, isLoading: rolesLoading } = useRoles();
  const assignRolesMutation = useAssignRoles();
  const revokeRolesMutation = useRevokeRoles();
  const syncUserMutation = useSyncUser();

  const handleClose = () => {
    setReason("");
    setSelectedRoles([]);
    setSyncWithDiscord(true);
    setActiveTab("sync");
    onClose();
  };

  const handleSync = async () => {
    if (!user || !reason.trim()) return;

    const loadingToast = toast.loading("Syncing user with Discord...", {
      icon: "🔄",
    });

    try {
      await syncUserMutation.mutateAsync({ userId: user.id, reason });
      toast.dismiss(loadingToast);
      handleClose();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Sync failed:", error);
    }
  };

  const handleAssignRoles = async () => {
    if (!user || !reason.trim() || selectedRoles.length === 0) return;

    const loadingToast = toast.loading(
      `Assigning ${selectedRoles.length} role(s)...`,
      {
        icon: "➕",
      },
    );

    try {
      await assignRolesMutation.mutateAsync({
        userId: user.id,
        roleNames: selectedRoles,
        reason,
        syncWithDiscord,
      });
      toast.dismiss(loadingToast);
      handleClose();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Assign roles failed:", error);
    }
  };

  const handleRevokeRoles = async () => {
    if (!user || !reason.trim() || selectedRoles.length === 0) return;

    const loadingToast = toast.loading(
      `Removing ${selectedRoles.length} role(s)...`,
      {
        icon: "➖",
      },
    );

    try {
      await revokeRolesMutation.mutateAsync({
        userId: user.id,
        roleNames: selectedRoles,
        reason,
        syncWithDiscord,
      });
      toast.dismiss(loadingToast);
      handleClose();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Revoke roles failed:", error);
    }
  };

  if (!user) return null;

  const userRoleNames = user.userRoles.map((ur) => ur.role.name);
  const availableRolesToAssign =
    allRoles?.filter(
      (role) => !userRoleNames.includes(role.name) && !role.isArchived,
    ) || [];
  const availableRolesToRevoke = user.userRoles.filter(
    (ur) => ur.revokedAt === null,
  );

  const isActionDisabled =
    !reason.trim() ||
    (activeTab !== "sync" && selectedRoles.length === 0) ||
    syncUserMutation.isPending ||
    assignRolesMutation.isPending ||
    revokeRolesMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[84vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">⚡</span>
            User Actions - {user.discordUsername}
          </DialogTitle>
          <DialogDescription>
            Perform administrative actions on this user account
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync">🔄 Sync</TabsTrigger>
            <TabsTrigger value="assign">➕ Add Roles</TabsTrigger>
            <TabsTrigger value="revoke">➖ Remove Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <span className="mr-2">🔄</span>
                  Sync User with Discord
                </CardTitle>
                <CardDescription>
                  Force sync user roles with Discord server. This will
                  add/remove roles based on Discord permissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="sync-reason">Reason for sync *</Label>
                <Textarea
                  id="sync-reason"
                  placeholder="Why are you syncing this user..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assign" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <span className="mr-2">➕</span>
                  Assign Roles
                </CardTitle>
                <CardDescription>
                  Add new roles to this user. Only shows roles the user doesn't
                  already have.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rolesLoading ? (
                  <Loading text="Loading roles..." />
                ) : availableRolesToAssign.length === 0 ? (
                  <div className="text-center py-4">
                    <span className="text-2xl mb-2 block">✅</span>
                    <p className="text-muted-foreground">
                      User has all available roles
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Available Roles</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {availableRolesToAssign.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`assign-${role.id}`}
                              checked={selectedRoles.includes(role.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRoles((prev) => [
                                    ...prev,
                                    role.name,
                                  ]);
                                } else {
                                  setSelectedRoles((prev) =>
                                    prev.filter((r) => r !== role.name),
                                  );
                                }
                              }}
                            />
                            <Label
                              htmlFor={`assign-${role.id}`}
                              className="flex items-center space-x-2"
                            >
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: role.color,
                                  color: role.color,
                                }}
                                className="flex items-center space-x-1"
                              >
                                <span>{role.name}</span>
                                {role.isSystemRole && <span>🤖</span>}
                              </Badge>
                              {role.userRoles.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({role.userRoles.length} user
                                  {role.userRoles.length !== 1 ? "s" : ""})
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="assign-sync-discord"
                        checked={syncWithDiscord}
                        onCheckedChange={(checked) =>
                          setSyncWithDiscord(checked as boolean)
                        }
                      />
                      <Label htmlFor="assign-sync-discord">
                        Sync with Discord server
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assign-reason">
                        Reason for assignment *
                      </Label>
                      <Textarea
                        id="assign-reason"
                        placeholder="Why are you assigning these roles..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revoke" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <span className="mr-2">➖</span>
                  Remove Roles
                </CardTitle>
                <CardDescription>
                  Remove existing roles from this user. Only shows roles the
                  user currently has.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableRolesToRevoke.length === 0 ? (
                  <div className="text-center py-4">
                    <span className="text-2xl mb-2 block">😊</span>
                    <p className="text-muted-foreground">
                      User has no roles to remove
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Current Roles</Label>
                      <div className="max-h-32 overflow-y-auto border rounded-md p-3 bg-muted/20">
                        <ScrollArea className="space-y-3">
                          <ScrollBar />
                          {availableRolesToRevoke.map((userRole) => (
                            <div
                              key={userRole.id}
                              className="flex items-start space-x-3 p-3 bg-background border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                            >
                              <Checkbox
                                id={`revoke-${userRole.id}`}
                                checked={selectedRoles.includes(
                                  userRole.role.name,
                                )}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRoles((prev) => [
                                      ...prev,
                                      userRole.role.name,
                                    ]);
                                  } else {
                                    setSelectedRoles((prev) =>
                                      prev.filter(
                                        (r) => r !== userRole.role.name,
                                      ),
                                    );
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    style={{
                                      borderColor: userRole.role.color,
                                      color: userRole.role.color,
                                    }}
                                    className="flex items-center space-x-1 font-medium"
                                  >
                                    <span>{userRole.role.name}</span>
                                    {userRole.isSystemGranted && (
                                      <span title="System granted">🤖</span>
                                    )}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center text-xs text-muted-foreground">
                                    <span className="mr-1">📅</span>
                                    <span>
                                      Assigned:{" "}
                                      {new Date(
                                        userRole.grantedAt,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-start text-xs text-muted-foreground">
                                    <span className="mr-1 mt-0.5">💬</span>
                                    <span className="break-words">
                                      {userRole.grantReason ||
                                        "No reason provided"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="revoke-sync-discord"
                        checked={syncWithDiscord}
                        onCheckedChange={(checked) =>
                          setSyncWithDiscord(checked as boolean)
                        }
                      />
                      <Label htmlFor="revoke-sync-discord">
                        Sync with Discord server
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="revoke-reason">
                        Reason for removal *
                      </Label>
                      <Textarea
                        id="revoke-reason"
                        placeholder="Why are you removing these roles..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {activeTab === "sync" && (
            <Button onClick={handleSync} disabled={isActionDisabled}>
              {syncUserMutation.isPending ? "Syncing..." : "🔄 Sync User"}
            </Button>
          )}

          {activeTab === "assign" && availableRolesToAssign.length > 0 && (
            <Button onClick={handleAssignRoles} disabled={isActionDisabled}>
              {assignRolesMutation.isPending
                ? "Assigning..."
                : `➕ Assign ${selectedRoles.length} Role(s)`}
            </Button>
          )}

          {activeTab === "revoke" && availableRolesToRevoke.length > 0 && (
            <Button
              onClick={handleRevokeRoles}
              disabled={isActionDisabled}
              variant="destructive"
            >
              {revokeRolesMutation.isPending
                ? "Removing..."
                : `➖ Remove ${selectedRoles.length} Role(s)`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserActionsDialog;
