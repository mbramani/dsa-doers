import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthQuery, useLogoutMutation } from "@/hooks/use-auth";

import AdminBreadcrumb from "./admin-breadcrumb";
import { Outlet } from "react-router-dom";
import React from "react";
import { Separator } from "@/components/ui/separator";
import ThemeToggle from "@/components/ui/theme-toggle";

const AdminLayout: React.FC = () => {
  const { data: user } = useAuthQuery();
  const logoutMutation = useLogoutMutation();
  const location = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/admin",
      emoji: "📊",
      current: location.pathname === "/admin",
    },
    {
      name: "Users",
      href: "/admin/users",
      emoji: "👥",
      current: location.pathname.startsWith("/admin/users"),
    },
    {
      name: "Roles",
      href: "/admin/roles",
      emoji: "🏷️",
      current: location.pathname.startsWith("/admin/roles"),
    },
    {
      name: "Events",
      href: "/admin/events",
      emoji: "📅",
      current: location.pathname.startsWith("/admin/events"),
    },
    {
      name: "Analytics",
      href: "/admin/analytics",
      emoji: "📈",
      current: location.pathname.startsWith("/admin/analytics"),
    },
    {
      name: "Logs",
      href: "/admin/logs",
      emoji: "📋",
      current: location.pathname.startsWith("/admin/logs"),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="px-2 py-4">
              <h2 className="text-lg font-semibold flex items-center">
                <span className="mr-2">🛠️</span>
                Admin Panel
              </h2>
              <p className="text-sm text-muted-foreground">Manage DSA Doers</p>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="px-2">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={item.current}>
                    <Link to={item.href}>
                      <span className="mr-2 text-lg">{item.emoji}</span>
                      {item.name}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            <Separator className="my-2" />

            <SidebarMenu className="px-2">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/dashboard">
                    <span className="text-lg">🏠</span>
                    User Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter>
            {user && (
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton size="lg">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              user.discordAvatar
                                ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.discordAvatar}.png`
                                : undefined
                            }
                            alt={user.discordUsername}
                          />
                          <AvatarFallback>
                            {user.discordUsername.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {user.discordUsername}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user.roles.length} role
                            {user.roles.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">
                            {user.discordUsername}
                          </p>
                          {user.email && (
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                        className="text-red-600 focus:text-red-600"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {logoutMutation.isPending
                          ? "Logging out..."
                          : "Log out"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          {/* Header with breadcrumb, sidebar trigger, and theme toggle */}
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <div className="flex-1">
              <AdminBreadcrumb />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default AdminLayout;
