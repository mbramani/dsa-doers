"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { UserRole } from "@/types/api";
import { redirect } from "next/navigation";
import { useAuth } from "@/hooks/auth";
import { useEffect } from "react";

interface AdminProtectionProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export default function AdminProtection({ 
  children, 
  requiredRoles = [UserRole.ADMIN, UserRole.MODERATOR] 
}: AdminProtectionProps) {
  const { data: user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || !requiredRoles.includes(user.role))) {
      redirect("/dashboard");
    }
  }, [user, isLoading, requiredRoles]);

   if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin text-6xl">😊</div>
      </div>
    );
  }

  if (!user || !requiredRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}