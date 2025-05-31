import { Navigate, useLocation } from "react-router-dom";

import Loading from "@/components/ui/loading";
import React from "react";
import { useAuthQuery } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { data: user, isLoading } = useAuthQuery();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" text="Checking authentication..." />
      </div>
    );
  }

  if (!user) {
    // Redirect to home page with return URL
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
