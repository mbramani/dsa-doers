"use client";

import { useAuth, useDiscordAuth, useLogout } from "@/hooks/auth";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { UserRole } from "@workspace/types/api";

export default function HomePage() {
  const { data: user, isLoading, error } = useAuth();
  const discordAuth = useDiscordAuth();
  const logout = useLogout();

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.NEWBIE:
        return "bg-green-100 text-green-800";
      case UserRole.MEMBER:
        return "bg-blue-100 text-blue-800";
      case UserRole.CONTRIBUTOR:
        return "bg-purple-100 text-purple-800";
      case UserRole.MODERATOR:
        return "bg-yellow-100 text-yellow-800";
      case UserRole.ADMIN:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center gap-6 max-w-md text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          DSA Doers
        </h1>
        <p className="text-muted-foreground text-lg">
          Join our community of data structures and algorithms enthusiasts!
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error.message || "Something went wrong"}
          </div>
        )}

        {user ? (
          <div className="flex flex-col gap-4 items-center">
            <div className="flex items-center gap-3">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div className="text-left">
                <p className="text-green-600 font-medium">
                  Welcome, {user.username}!
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                  >
                    {user.role.toUpperCase()}
                  </span>
                  {user.role === UserRole.NEWBIE && (
                    <span className="text-xs text-muted-foreground">
                      🎉 New Member!
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button
                onClick={() => logout.mutate()}
                variant="outline"
                disabled={logout.isPending}
              >
                {logout.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>

            {user.discordProfile && !user.discordProfile.guild_joined && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                <p>Join our Discord server to connect with the community!</p>
                <Button asChild className="mt-2" size="sm">
                  {/* <a href={discordService.getInviteUrl()} target="_blank" rel="noopener noreferrer">
                    Join Discord
                  </a> */}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Button
            onClick={() => discordAuth.mutate()}
            size="lg"
            className="bg-[#5865F2] hover:bg-[#4752C4]"
            disabled={discordAuth.isPending}
          >
            {discordAuth.isPending ? (
              "Redirecting..."
            ) : (
              <>🎮 Join DSA Doers Discord</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
