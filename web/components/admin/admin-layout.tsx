"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Calendar,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth, useLogout } from "@/hooks/auth";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getRoleDisplayName } from "@/lib/role-utils";
import { usePathname } from "next/navigation";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Overview and statistics",
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Manage users and permissions",
  },
  {
    name: "Tags",
    href: "/admin/tags",
    icon: Tags,
    description: "Create and manage tags",
  },
  {
    name: "Events",
    href: "/admin/events",
    icon: Calendar,
    description: "Manage events and voice channel access",
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "System configuration",
  },
];

function AdminSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-lg">👑</span>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Admin Panel</span>
            <span className="truncate text-xs text-muted-foreground">
              DSA Doers
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.description}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function UserMenu() {
  const { data: user } = useAuth();
  const logout = useLogout();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar_url} alt={user?.username} />
            <AvatarFallback>{user?.username?.charAt(0) || "A"}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user?.username}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user?.role ? getRoleDisplayName(user.role) : ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="ml-auto size-8 p-0"
          >
            <LogOut className="size-4" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function DynamicBreadcrumb() {
  const pathname = usePathname();

  // Generate breadcrumbs based on pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: Array<{ label: string; href?: string }> = [
      { label: "Admin", href: "/admin" },
    ];

    if (segments.length > 1) {
      const page = segments[1];
      switch (page) {
        case "users":
          breadcrumbs.push({ label: "Users" });
          break;
        case "tags":
          breadcrumbs.push({ label: "Tags" });
          break;
        case "events":
          breadcrumbs.push({ label: "Events" });
          break;
        case "settings":
          breadcrumbs.push({ label: "Settings" });
          break;
        default:
          breadcrumbs.push({
            label: page.charAt(0).toUpperCase() + page.slice(1),
          });
      }
    } else if (pathname === "/admin") {
      breadcrumbs.push({ label: "Dashboard" });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumb />
          </div>

          <div className="ml-auto flex items-center gap-2 px-4">
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
