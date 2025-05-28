"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreateTagRequest,
  Tag,
  TagCategory,
  UpdateTagRequest,
} from "@/types/api";
import {
  Eye,
  EyeOff,
  Filter,
  Grid3X3,
  List,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminTags,
  useCreateTag,
  useDeleteTag,
  useTagFilters,
  useUpdateTag,
} from "@/hooks/admin";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CreateTagDialog from "./create-tag-dialog";
import EditTagDialog from "./edit-tag-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import TagCard from "./tag-card";
import { cn } from "@/lib/utils";
import { getTagCategoryDisplayName } from "@/lib/tag-utils";
import { toast } from "sonner";

// Pagination configuration
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 20;

export default function TagManagementTable() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  // Use our custom filter hook
  const {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    assignableFilter,
    setAssignableFilter,
    resetFilters,
    hasActiveFilters,
  } = useTagFilters();

  // Data fetching
  const {
    data: tagsResponse,
    isLoading,
    isError,
    refetch: refreshTags,
    isRefetching,
  } = useAdminTags();

  // Mutations
  const createTagMutation = useCreateTag();
  const updateTagMutation = useUpdateTag();
  const deleteTagMutation = useDeleteTag();

  const tags: Tag[] = tagsResponse?.data?.tags || [];

  // Filter and paginate tags
  const { filteredTags, paginatedTags, totalPages, totalFiltered } =
    useMemo(() => {
      const filtered = tags.filter((tag) => {
        const matchesSearch =
          tag.name.toLowerCase().includes(search.toLowerCase()) ||
          tag.display_name.toLowerCase().includes(search.toLowerCase()) ||
          tag.description?.toLowerCase().includes(search.toLowerCase());

        const matchesCategory =
          categoryFilter === "all" || tag.category === categoryFilter;

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && tag.is_active) ||
          (statusFilter === "inactive" && !tag.is_active);

        const matchesAssignable =
          assignableFilter === "all" ||
          (assignableFilter === "assignable" && tag.is_assignable) ||
          (assignableFilter === "earnable" && tag.is_earnable);

        return (
          matchesSearch && matchesCategory && matchesStatus && matchesAssignable
        );
      });

      const totalPages = Math.ceil(filtered.length / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginated = filtered.slice(startIndex, endIndex);

      return {
        filteredTags: filtered,
        paginatedTags: paginated,
        totalPages,
        totalFiltered: filtered.length,
      };
    }, [
      tags,
      search,
      categoryFilter,
      statusFilter,
      assignableFilter,
      currentPage,
      itemsPerPage,
    ]);

  // Reset to first page when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    switch (filterType) {
      case "search":
        setSearch(value);
        break;
      case "category":
        setCategoryFilter(value);
        break;
      case "status":
        setStatusFilter(value);
        break;
      case "assignable":
        setAssignableFilter(value);
        break;
    }
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    resetFilters();
  };

  // Event handlers
  const handleCreateTag = async (data: CreateTagRequest) => {
    try {
      await createTagMutation.mutateAsync(data);
      setCreateDialogOpen(false);
      toast.success("Tag created successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create tag");
    }
  };

  const handleUpdateTag = async (tagId: string, data: UpdateTagRequest) => {
    try {
      await updateTagMutation.mutateAsync({ tagId, tagData: data });
      setEditDialogOpen(false);
      setSelectedTag(null);
      toast.success("Tag updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update tag");
    }
  };

  const handleDeleteTag = async (tag: Tag) => {
    try {
      await deleteTagMutation.mutateAsync(tag.id);
      setDeleteDialogOpen(false);
      setTagToDelete(null);
      toast.success("Tag deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete tag");
    }
  };

  const handleToggleActive = async (tag: Tag) => {
    try {
      await updateTagMutation.mutateAsync({
        tagId: tag.id,
        tagData: { is_active: !tag.is_active },
      });
      toast.success(
        `Tag ${tag.is_active ? "deactivated" : "activated"} successfully!`,
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle tag status");
    }
  };

  const handleEditTag = (tag: Tag) => {
    setSelectedTag(tag);
    setEditDialogOpen(true);
  };

  const handleDeleteConfirm = (tag: Tag) => {
    setTagToDelete(tag);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tagToDelete) {
      handleDeleteTag(tagToDelete);
    }
  };

  const handleAssignToUsers = (tag: Tag) => {
    // TODO: Implement assign to users dialog in next task
    console.log("Assign tag to users:", tag);
    toast.info("Tag assignment feature coming soon!");
  };

  const handleRefresh = () => {
    refreshTags();
    toast.success("Tags refreshed!");
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Calculate stats
  const getTagStats = () => {
    const totalTags = tags.length;
    const activeTags = tags.filter((tag) => tag.is_active).length;
    const assignableTags = tags.filter((tag) => tag.is_assignable).length;
    const earnableTags = tags.filter((tag) => tag.is_earnable).length;

    return { totalTags, activeTags, assignableTags, earnableTags };
  };

  const stats = getTagStats();

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      if (currentPage <= 4) {
        items.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        items.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        items.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }

    return items;
  };

  // Handle loading and error states
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load tags</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Tags
                </p>
                <p className="text-2xl font-bold">{stats.totalTags}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600">🏷️</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Tags
                </p>
                <p className="text-2xl font-bold">{stats.activeTags}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assignable
                </p>
                <p className="text-2xl font-bold">{stats.assignableTags}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Earnable
                </p>
                <p className="text-2xl font-bold">{stats.earnableTags}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600">🏆</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">
                Tag Management ({totalFiltered} of {stats.totalTags})
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Create and manage tags for users and achievements
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefetching}
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")}
                />
                Refresh
              </Button>

              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="border-none rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="border-none rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create Tag
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters and Pagination Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={categoryFilter}
                onValueChange={(value) => handleFilterChange("category", value)}
              >
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.values(TagCategory).map((category) => (
                    <SelectItem key={category} value={category}>
                      {getTagCategoryDisplayName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger className="w-full lg:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={assignableFilter}
                onValueChange={(value) =>
                  handleFilterChange("assignable", value)
                }
              >
                <SelectTrigger className="w-full lg:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="assignable">Assignable</SelectItem>
                  <SelectItem value="earnable">Earnable</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters() && (
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  size="sm"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {/* Items per page selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option.toString()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  items per page
                </span>
              </div>

              {totalFiltered > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalFiltered)} of{" "}
                  {totalFiltered} tags
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-4">
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: itemsPerPage }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-3 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: itemsPerPage }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 border rounded"
                    >
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : paginatedTags.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Filter className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No tags found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters()
                  ? "Try adjusting your filters or search terms."
                  : "Get started by creating your first tag."}
              </p>
              {!hasActiveFilters() && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </Button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedTags.map((tag) => (
                <TagCard
                  key={tag.id}
                  tag={tag}
                  onEdit={handleEditTag}
                  onDelete={handleDeleteConfirm}
                  onToggleActive={handleToggleActive}
                  onAssignToUsers={handleAssignToUsers}
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tag.icon}</span>
                          <div>
                            <p className="font-medium">{tag.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              @{tag.name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                          }}
                        >
                          {getTagCategoryDisplayName(tag.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {tag.is_active ? (
                            <Eye className="h-3 w-3 text-green-600" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-red-600" />
                          )}
                          <span className="text-sm">
                            {tag.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {tag.is_assignable && (
                            <Badge variant="outline" className="text-xs">
                              A
                            </Badge>
                          )}
                          {tag.is_earnable && (
                            <Badge variant="outline" className="text-xs">
                              E
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{tag.usage_count || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(tag.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTag(tag)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(tag)}
                            disabled={updateTagMutation.isPending}
                          >
                            {tag.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center pt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        handlePageChange(Math.max(1, currentPage - 1))
                      }
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {generatePaginationItems().map((item, index) => (
                    <PaginationItem key={index}>
                      {item === "..." ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(item as number)}
                          isActive={currentPage === item}
                          className="cursor-pointer"
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, currentPage + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateTagDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTag}
        isLoading={createTagMutation.isPending}
      />

      <EditTagDialog
        tag={selectedTag}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdateTag}
        isLoading={updateTagMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "
              {tagToDelete?.display_name}"? This action cannot be undone and
              will remove the tag from all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTagMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteTagMutation.isPending}
            >
              {deleteTagMutation.isPending ? "Deleting..." : "Delete Tag"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
