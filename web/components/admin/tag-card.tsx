"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag } from "@/types/api";
import { getTagCategoryDisplayName } from "@/lib/tag-utils";

interface TagCardProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  onToggleActive: (tag: Tag) => void;
  onAssignToUsers: (tag: Tag) => void;
}

export default function TagCard({
  tag,
  onEdit,
  onDelete,
  onToggleActive,
  onAssignToUsers,
}: TagCardProps) {
  return (
    <Card className="relative group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tag.icon}</span>
            <div>
              <CardTitle className="text-base">{tag.display_name}</CardTitle>
              <p className="text-xs text-muted-foreground">@{tag.name}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tag)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAssignToUsers(tag)}>
                <Users className="mr-2 h-4 w-4" />
                Assign to Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(tag)}>
                {tag.is_active ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(tag)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Tag
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {tag.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tag.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {getTagCategoryDisplayName(tag.category)}
            </Badge>

            {tag.is_assignable && (
              <Badge variant="outline" className="text-xs">
                Assignable
              </Badge>
            )}

            {tag.is_earnable && (
              <Badge variant="outline" className="text-xs">
                Earnable
              </Badge>
            )}

            {!tag.is_active && (
              <Badge
                variant="secondary"
                className="text-xs bg-red-100 text-red-700"
              >
                Inactive
              </Badge>
            )}
          </div>

          {tag.usage_count !== undefined && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Used by {tag.usage_count} users</span>
              <span>
                Created {new Date(tag.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
