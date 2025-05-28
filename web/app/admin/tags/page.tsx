"use client";

import AdminLayout from "@/components/admin/admin-layout";
import AdminProtection from "@/components/admin/admin-protection";
import TagManagementTable from "@/components/admin/tag-management-table";

export default function AdminTagsPage() {
  return (
    <AdminProtection>
      <AdminLayout>
        <div className="space-y-6">
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
