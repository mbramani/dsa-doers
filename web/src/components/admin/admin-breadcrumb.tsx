import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link, useLocation } from "react-router-dom";

import React from "react";

const AdminBreadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  const breadcrumbMap: Record<string, { label: string; emoji: string }> = {
    admin: { label: "Admin", emoji: "🛠️" },
    users: { label: "Users", emoji: "👥" },
    roles: { label: "Roles", emoji: "🏷️" },
    events: { label: "Events", emoji: "📅" },
    analytics: { label: "Analytics", emoji: "📈" },
    logs: { label: "Logs", emoji: "📋" },
    dashboard: { label: "Dashboard", emoji: "📊" },
  };

  const generateBreadcrumbs = () => {
    const breadcrumbs: Array<{
      label: string;
      href?: string;
      emoji: string;
      isLast: boolean;
    }> = [];

    let currentPath = "";
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      const breadcrumbInfo = breadcrumbMap[segment] || {
        label: segment,
        emoji: "📄",
      };

      breadcrumbs.push({
        label: breadcrumbInfo.label,
        href: isLast ? undefined : currentPath,
        emoji: breadcrumbInfo.emoji,
        isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {breadcrumb.isLast ? (
                <BreadcrumbPage className="flex items-center">
                  <span className="mr-2">{breadcrumb.emoji}</span>
                  {breadcrumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={breadcrumb.href!} className="flex items-center">
                    <span className="mr-2">{breadcrumb.emoji}</span>
                    {breadcrumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!breadcrumb.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default AdminBreadcrumb;
