// src/components/ui/Loading.tsx

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
}

const sizeClasses: Record<Exclude<LoadingProps["size"], undefined>, string> = {
  sm: "w-8 h-8 text-xl", // emoji size
  md: "w-12 h-12 text-2xl",
  lg: "w-16 h-16 text-3xl",
};

const Loading: React.FC<LoadingProps> = ({
  className,
  size = "md",
  text = "Loading…",
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-2",
        className,
      )}
    >
      {/* Emoji spinner */}
      <span
        role="img"
        aria-label="loading"
        className={cn(
          "inline-block animate-spin origin-center", // ensure center origin
          sizeClasses[size],
        )}
      >
        😊
      </span>

      {text && <p className="text-sm text-muted-foreground">{text} 🚀</p>}
    </div>
  );
};

export default Loading;
