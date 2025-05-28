"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import AdminLayout from "@/components/admin/admin-layout";
import AdminProtection from "@/components/admin/admin-protection";
import TagManagementTable from "@/components/admin/tag-management-table";

export default function AdminTagsPage() {
  return (
    <AdminProtection>
      <AdminLayout>
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tags</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold">Tag Management</h1>
            <p className="text-muted-foreground">
              Create, edit, and manage tags that can be assigned to users or
              earned through achievements.
            </p>
          </div>

          {/* Tag Management Interface */}
          <TagManagementTable />
        </div>
      </AdminLayout>
    </AdminProtection>
  );
}
