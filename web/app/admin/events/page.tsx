"use client";

import AdminLayout from "@/components/admin/admin-layout";
import AdminProtection from "@/components/admin/admin-protection";
import EventManagementTable from "@/components/admin/event-management-table";

export default function AdminEventsPage() {
  return (
    <AdminProtection>
      <AdminLayout>
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold">Event Management</h1>
            <p className="text-muted-foreground">
              Create and manage events with Discord voice channel access
              control.
            </p>
          </div>

          {/* Event Management Table */}
          <EventManagementTable />
        </div>
      </AdminLayout>
    </AdminProtection>
  );
}
