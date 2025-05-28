"use client";

import { CreateTagRequest, TagCategory } from "@/types/api";
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

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const createTagSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Name can only contain lowercase letters, numbers, hyphens, and underscores",
    ),
  display_name: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(100, "Display name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  category: z.nativeEnum(TagCategory),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color"),
  icon: z.string().min(1, "Icon is required"),
  is_assignable: z.boolean(),
  is_earnable: z.boolean(),
});

type CreateTagFormData = z.infer<typeof createTagSchema>;

interface CreateTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTagRequest) => void;
  isLoading?: boolean;
}

export default function CreateTagDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateTagDialogProps) {
  const [selectedColor, setSelectedColor] = useState(DEFAULT_TAG_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(TAG_ICONS[0]);

  const form = useForm<CreateTagFormData>({
    resolver: zodResolver(createTagSchema),
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

  const handleSubmit = (data: CreateTagFormData) => {
    onSubmit({
      ...data,
      color: selectedColor,
      icon: selectedIcon,
    });
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

  const previewTag = {
    display_name: form.watch("display_name") || "Tag Preview",
    color: selectedColor,
    icon: selectedIcon,
    category: form.watch("category"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tag</DialogTitle>
          <DialogDescription>
            Create a new tag that can be assigned to users or earned through
            achievements.
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
                    <FormDescription>
                      Unique identifier (auto-generated)
                    </FormDescription>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                    aria-label={`Select icon ${icon}`}
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
                {isLoading ? "Creating..." : "Create Tag"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
