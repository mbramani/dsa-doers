import Loading from "@/components/ui/loading";
import { Navigate } from "react-router-dom";
import React from "react";
import { useAuthQuery } from "@/hooks/use-auth";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { data: user, isLoading } = useAuthQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Checking admin access..." />
      </div>
    );
  }

  // Check if user has admin role
  const isAdmin = user?.roles.some((role) => role.name === "ADMIN");

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
