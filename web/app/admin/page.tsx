"use client";

import AdminLayout from "@/components/admin/admin-layout";
import AdminProtection from "@/components/admin/admin-protection";
import AdminStats from "@/components/admin/admin-stats";

export default function AdminDashboardPage() {
  return (
    <AdminProtection>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage users, monitor community activity, and configure system
              settings.
            </p>
          </div>

          {/* Dashboard Stats */}
          <AdminStats />
        </div>
      </AdminLayout>
    </AdminProtection>
  );
}
