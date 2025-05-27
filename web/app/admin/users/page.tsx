"use client";

import AdminLayout from "@/components/admin/admin-layout";
import AdminProtection from "@/components/admin/admin-protection";
import UserManagementTable from "@/components/admin/user-management-table";

export default function AdminUsersPage() {
  return (
    <AdminProtection>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and Discord integration.
            </p>
          </div>

          {/* User Management Table */}
          <UserManagementTable />
        </div>
      </AdminLayout>
    </AdminProtection>
  );
}