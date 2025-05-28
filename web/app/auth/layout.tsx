"use client";

import React, { Suspense } from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin text-6xl">😊</div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
