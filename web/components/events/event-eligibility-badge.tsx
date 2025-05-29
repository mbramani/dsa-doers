"use client";

import { AlertCircle, Check, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";
import { EventEligibility } from "@/types/events";

interface EventEligibilityBadgeProps {
  eligibility: EventEligibility;
  showMissingTags?: boolean;
}

export default function EventEligibilityBadge({
  eligibility,
  showMissingTags = false,
}: EventEligibilityBadgeProps) {
  if (eligibility.is_eligible) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300">
          <Check className="w-3 h-3 mr-1" />
          Eligible to Join
        </Badge>
      </div>
    );
  }

  if (!eligibility.has_all_required_tags) {
    return (
      <div className="space-y-2">
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300"
        >
          <X className="w-3 h-3 mr-1" />
          Missing Required Tags
        </Badge>

        {showMissingTags && eligibility.missing_required_tags?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              You need these tags:
            </p>
            <div className="flex flex-wrap gap-1">
              {eligibility.missing_required_tags.slice(0, 3).map((tag) => (
                <TooltipProvider key={tag.tag_id}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className="text-xs border-red-200 text-red-700 dark:border-red-800 dark:text-red-300"
                      >
                        <span className="mr-1">{tag.icon}</span>
                        {tag.display_name}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Required: {tag.display_name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              {eligibility.missing_required_tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-xs border-red-200 text-red-700"
                >
                  +{eligibility.missing_required_tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback for other eligibility issues
  return (
    <Badge
      variant="secondary"
      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300"
    >
      <AlertCircle className="w-3 h-3 mr-1" />
      Check Eligibility
    </Badge>
  );
}
