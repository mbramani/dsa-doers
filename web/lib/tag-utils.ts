import { TagCategory } from "@/types/api";

export const getTagCategoryColor = (category: TagCategory): string => {
  switch (category) {
    case TagCategory.SKILL:
      return "#3B82F6"; // Blue
    case TagCategory.ACHIEVEMENT:
      return "#10B981"; // Emerald
    case TagCategory.SPECIAL:
      return "#8B5CF6"; // Violet
    case TagCategory.CONTEST:
      return "#F59E0B"; // Amber
    case TagCategory.COMMUNITY:
      return "#EF4444"; // Red
    default:
      return "#6B7280"; // Gray
  }
};

export const getTagCategoryIcon = (category: TagCategory): string => {
  switch (category) {
    case TagCategory.SKILL:
      return "🎯";
    case TagCategory.ACHIEVEMENT:
      return "🏆";
    case TagCategory.SPECIAL:
      return "⭐";
    case TagCategory.CONTEST:
      return "🏁";
    case TagCategory.COMMUNITY:
      return "👥";
    default:
      return "🏷️";
  }
};

export const getTagCategoryDisplayName = (category: TagCategory): string => {
  switch (category) {
    case TagCategory.SKILL:
      return "Skill";
    case TagCategory.ACHIEVEMENT:
      return "Achievement";
    case TagCategory.SPECIAL:
      return "Special";
    case TagCategory.CONTEST:
      return "Contest";
    case TagCategory.COMMUNITY:
      return "Community";
    default:
      return category;
  }
};

export const DEFAULT_TAG_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Violet
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

export const TAG_ICONS = [
  "🎯",
  "🏆",
  "⭐",
  "🏁",
  "👥",
  "💡",
  "🚀",
  "🔥",
  "💎",
  "🎨",
  "📚",
  "⚡",
  "🌟",
  "🛡️",
  "🎪",
  "🎭",
  "🎨",
  "🎵",
  "🎲",
  "🎸",
];
