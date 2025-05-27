"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRoleColor, getRoleDisplayName } from "@/lib/role-utils";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserRole } from "@/types/api";
import { useAuth } from "@/hooks/auth";

export default function HomePage() {
  const { data: user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            DSA Doers
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Master Data Structures & Algorithms with our community-driven platform.
            Level up your coding skills and advance your career.
          </p>

          {!isLoading && (
            <div className="flex gap-4 justify-center">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Welcome back, {user.username}!
                    </p>
                    <div
                      className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white mt-1"
                      style={{ backgroundColor: getRoleColor(user.role) }}
                    >
                      {getRoleDisplayName(user.role)}
                    </div>
                    {user.role === UserRole.NEWBIE && (
                      <p className="text-xs text-gray-500 mt-1">
                        Complete challenges to level up!
                      </p>
                    )}
                  </div>
                  <Link href="/dashboard">
                    <Button size="lg">Go to Dashboard</Button>
                  </Link>
                </div>
              ) : (
                <Link href="/api/auth/discord">
                  <Button size="lg" className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
                    🎮 Login with Discord
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 <span>Practice Problems</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Solve curated problems ranging from basic to advanced levels.
                Track your progress and improve systematically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👥 <span>Community</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Join our Discord community to discuss solutions, get help,
                and participate in coding challenges.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏆 <span>Role System</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Advance through roles from 🌱 Newbie to 👑 Admin based on
                your contributions and achievements.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Role Progression */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">🎖️ Role Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.values(UserRole).map((role, index) => (
                <div
                  key={role}
                  className="text-center p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
                  style={{
                    borderColor: user?.role === role ? getRoleColor(role) : undefined,
                    backgroundColor: user?.role === role ? `${getRoleColor(role)}10` : undefined,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: getRoleColor(role) }}
                  >
                    {index + 1}
                  </div>
                  <h4 className="font-medium text-sm mb-1">
                    {getRoleDisplayName(role)}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {role === UserRole.NEWBIE && "Starting point"}
                    {role === UserRole.MEMBER && "Active learner"}
                    {role === UserRole.CONTRIBUTOR && "Problem solver"}
                    {role === UserRole.MODERATOR && "Community helper"}
                    {role === UserRole.ADMIN && "Platform manager"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
