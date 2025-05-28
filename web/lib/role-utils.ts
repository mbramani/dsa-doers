import { UserRole } from "@/types/api";

export const roleMapping = {
  [UserRole.NEWBIE]: "🌱 Newbie",
  [UserRole.MEMBER]: "💙 Member",
  [UserRole.CONTRIBUTOR]: "💜 Contributor",
  [UserRole.MODERATOR]: "⚡ Moderator",
  [UserRole.ADMIN]: "👑 Admin",
};

export const roleColors = {
  [UserRole.NEWBIE]: "#00ff00", // Green
  [UserRole.MEMBER]: "#0099ff", // Blue
  [UserRole.CONTRIBUTOR]: "#9900ff", // Purple
  [UserRole.MODERATOR]: "#ffff00", // Yellow
  [UserRole.ADMIN]: "#ff0000", // Red
};

export const getRoleDisplayName = (role: UserRole): string => {
  return roleMapping[role] || role;
};

export const getRoleColor = (role: UserRole): string => {
  return roleColors[role] || "#6b7280";
};

export const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case UserRole.ADMIN:
      return "destructive";
    case UserRole.MODERATOR:
      return "default";
    case UserRole.CONTRIBUTOR:
      return "secondary";
    case UserRole.MEMBER:
      return "outline";
    case UserRole.NEWBIE:
      return "secondary";
    default:
      return "outline";
  }
};

export const getRoleDescription = (role: UserRole): string => {
  switch (role) {
    case UserRole.NEWBIE:
      return "Welcome to DSA Doers! Complete challenges to advance your role.";
    case UserRole.MEMBER:
      return "You're an active member! Keep solving problems to become a contributor.";
    case UserRole.CONTRIBUTOR:
      return "Great work! You're contributing to the community.";
    case UserRole.MODERATOR:
      return "You help moderate the community. Thank you for your service!";
    case UserRole.ADMIN:
      return "You have full administrative privileges.";
    default:
      return "";
  }
};
