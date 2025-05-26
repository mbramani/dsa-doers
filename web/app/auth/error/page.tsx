"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "access_denied":
        return "You denied access to Discord. Please try again if you want to join.";
      case "missing_code":
        return "Authentication failed due to missing authorization code.";
      case "auth_failed":
        return "Authentication failed. Please try again.";
      default:
        return "An unexpected error occurred during authentication.";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4 max-w-md text-center">
        <div className="text-6xl">❌</div>
        <h1 className="text-2xl font-bold text-red-600">
          Authentication Failed
        </h1>

        <p className="text-muted-foreground">{getErrorMessage(error)}</p>

        <div className="flex gap-2">
          <Button onClick={() => router.push("/")} variant="outline">
            Go Home
          </Button>
          <Button onClick={() => router.push("/")}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
