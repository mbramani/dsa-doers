"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TagOption } from "@/types/events";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TagMultiSelectProps {
  selectedTagIds: string[];
  onSelectionChange: (tagIds: string[]) => void;
  availableTags: TagOption[];
  disabled?: boolean;
  placeholder?: string;
}

export default function TagMultiSelect({
  selectedTagIds,
  onSelectionChange,
  availableTags,
  disabled = false,
  placeholder = "Select tags...",
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedTags = availableTags.filter((tag) =>
    selectedTagIds.includes(tag.id),
  );

  const handleTagToggle = (tagId: string) => {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];

    onSelectionChange(newSelection);
  };

  const handleTagRemove = (tagId: string) => {
    onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-2">
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              <span className="text-xs">{tag.icon}</span>
              <span>{tag.display_name}</span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => handleTagRemove(tag.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Tag Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedTags.length === 0
              ? placeholder
              : `${selectedTags.length} tag${selectedTags.length !== 1 ? "s" : ""} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {availableTags
                  .filter((tag) => tag.is_active)
                  .map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={`${tag.name} ${tag.display_name} ${tag.category}`}
                      onSelect={() => handleTagToggle(tag.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTagIds.includes(tag.id)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm">{tag.icon}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {tag.display_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tag.category} • {tag.name}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: tag.color, color: tag.color }}
                      >
                        {tag.category}
                      </Badge>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
