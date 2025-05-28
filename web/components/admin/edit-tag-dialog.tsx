"use client";

import {
  DEFAULT_TAG_COLORS,
  TAG_ICONS,
  getTagCategoryDisplayName,
  getTagCategoryIcon,
} from "@/lib/tag-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag, TagCategory, UpdateTagRequest } from "@/types/api";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const updateTagSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Name can only contain lowercase letters, numbers, hyphens, and underscores",
    )
    .optional(),
  display_name: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters")
    .optional(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  category: z.nativeEnum(TagCategory).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color")
    .optional(),
  icon: z.string().min(1, "Icon is required").optional(),
  is_assignable: z.boolean().optional(),
  is_earnable: z.boolean().optional(),
});

type UpdateTagFormData = z.infer<typeof updateTagSchema>;

interface EditTagDialogProps {
  tag: Tag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tagId: string, data: UpdateTagRequest) => void;
  isLoading?: boolean;
}

export default function EditTagDialog({
  tag,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: EditTagDialogProps) {
  const [selectedColor, setSelectedColor] = useState(
    tag?.color || DEFAULT_TAG_COLORS[0],
  );
  const [selectedIcon, setSelectedIcon] = useState(tag?.icon || TAG_ICONS[0]);

  const form = useForm<UpdateTagFormData>({
    resolver: zodResolver(updateTagSchema),
    defaultValues: {
      name: "",
      display_name: "",
      description: "",
      category: TagCategory.SKILL,
      color: DEFAULT_TAG_COLORS[0],
      icon: TAG_ICONS[0],
      is_assignable: true,
      is_earnable: false,
    },
  });

  // Update form when tag changes
  useEffect(() => {
    if (tag) {
      form.reset({
        name: tag.name,
        display_name: tag.display_name,
        description: tag.description || "",
        category: tag.category,
        color: tag.color,
        icon: tag.icon,
        is_assignable: tag.is_assignable,
        is_earnable: tag.is_earnable,
      });
      setSelectedColor(tag.color);
      setSelectedIcon(tag.icon);
    }
  }, [tag, form]);

  const handleSubmit = (data: UpdateTagFormData) => {
    if (!tag) return;

    // Only include changed fields
    const changes: UpdateTagRequest = {};

    if (data.name !== tag.name) changes.name = data.name;
    if (data.display_name !== tag.display_name)
      changes.display_name = data.display_name;
    if (data.description !== tag.description)
      changes.description = data.description;
    if (data.category !== tag.category) changes.category = data.category;
    if (selectedColor !== tag.color) changes.color = selectedColor;
    if (selectedIcon !== tag.icon) changes.icon = selectedIcon;
    if (data.is_assignable !== tag.is_assignable)
      changes.is_assignable = data.is_assignable;
    if (data.is_earnable !== tag.is_earnable)
      changes.is_earnable = data.is_earnable;

    onSubmit(tag.id, changes);
  };

  const handleNameChange = (value: string) => {
    // Auto-generate name from display name
    const name = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    form.setValue("name", name);
  };

  if (!tag) return null;

  const previewTag = {
    display_name: form.watch("display_name") || tag.display_name,
    color: selectedColor,
    icon: selectedIcon,
    category: form.watch("category") || tag.category,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tag</DialogTitle>
          <DialogDescription>
            Update the tag details. Only modified fields will be saved.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Tag Preview */}
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedIcon}</span>
                <Badge
                  style={{
                    backgroundColor: selectedColor,
                    color: "#ffffff",
                    border: "none",
                  }}
                >
                  {previewTag.display_name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {getTagCategoryDisplayName(previewTag.category)}
                </span>
              </div>
            </div>

            {/* Usage Information */}
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm font-medium mb-1">Usage Information</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Currently used by {tag.usage_count || 0} users</p>
                <p>
                  Created on {new Date(tag.created_at).toLocaleDateString()}
                </p>
                <p>
                  Last updated {new Date(tag.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Amazing Contributor"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleNameChange(e.target.value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>The name shown to users</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Name</FormLabel>
                    <FormControl>
                      <Input placeholder="amazing_contributor" {...field} />
                    </FormControl>
                    <FormDescription>Unique identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this tag represents..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of the tag's purpose
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(TagCategory).map((category) => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            <span>{getTagCategoryIcon(category)}</span>
                            <span>{getTagCategoryDisplayName(category)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedColor === color
                        ? "border-foreground scale-110"
                        : "border-muted-foreground/20 hover:scale-105",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setSelectedColor(color);
                      form.setValue("color", color);
                    }}
                    aria-label={`Select color ${color}`}
                    title={`Select color ${color}`}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  setSelectedColor(e.target.value);
                  form.setValue("color", e.target.value);
                }}
                className="w-20 h-8"
              />
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <div className="grid grid-cols-10 gap-2 max-h-24 overflow-y-auto p-2 border rounded">
                {TAG_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded border text-lg hover:bg-muted transition-colors",
                      selectedIcon === icon && "bg-muted ring-2 ring-primary",
                    )}
                    onClick={() => {
                      setSelectedIcon(icon);
                      form.setValue("icon", icon);
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_assignable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Assignable</FormLabel>
                      <FormDescription>
                        Admins can manually assign this tag to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_earnable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Earnable</FormLabel>
                      <FormDescription>
                        Users can earn this tag through achievements
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
