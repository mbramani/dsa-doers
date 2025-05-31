import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AdminDashboardPage from "@/pages/admin/admin-dashboard-page";
import AdminLayout from "@/components/admin/admin-layout";
import AdminRoute from "@/components/auth/admin-route";
import { AuthProvider } from "@/contexts/auth-context";
import DashboardPage from "@/pages/dashboard-page";
import HomePage from "@/pages/home-page";
import ProtectedRoute from "@/components/auth/protected-route";
import React from "react";
import RolesPage from "./pages/admin/roles-page";
import UsersPage from "@/pages/admin/users-page";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
          </Route>

          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
