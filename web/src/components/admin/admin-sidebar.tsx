import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import React from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  className?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ className }) => {
  const location = useLocation();

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
    <div className={cn("w-64 bg-muted/10 border-r", className)}>
      <div className="flex h-full flex-col">
        <div className="p-6">
          <h2 className="text-lg font-semibold">🛠️ Admin Panel</h2>
          <p className="text-sm text-muted-foreground">Manage DSA Doers</p>
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <Button
              key={item.name}
              asChild
              variant={item.current ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                item.current && "bg-secondary",
              )}
            >
              <Link to={item.href}>
                <span className="mr-3 text-lg">{item.emoji}</span>
                {item.name}
              </Link>
            </Button>
          ))}
        </nav>

        <Separator />

        <div className="p-4">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/dashboard">
              <span className="mr-3">🏠</span>
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
