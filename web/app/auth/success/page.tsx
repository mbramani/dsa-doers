"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNewUser = searchParams.get("newUser") === "true";
  const inviteUrl = searchParams.get("inviteUrl");

  useEffect(() => {
    // Redirect to home after a few seconds
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4 max-w-md text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-bold text-green-600">
          {isNewUser ? "Welcome to DSA Doers!" : "Welcome back!"}
        </h1>

        {isNewUser && (
          <p className="text-muted-foreground">
            Your account has been created successfully.
          </p>
        )}

        {inviteUrl && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Join our Discord server to connect with the community:
            </p>
            <Button asChild>
              <a href={inviteUrl} target="_blank" rel="noopener noreferrer">
                Join Discord Server
              </a>
            </Button>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Redirecting to home page in 5 seconds...
        </p>

        <Button onClick={() => router.push("/")} variant="outline">
          Go to Home
        </Button>
      </div>
    </div>
  );
}
