import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  type ColumnFiltersState,
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  addProjectMedia,
  deleteProject,
  deleteProjectImage,
  extractApiErrorMessage,
  getCategories,
  getProjectById,
  getProjectsForDashboard,
  getUsers,
  resolveAssetUrl,
  updateProject,
} from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencySelect } from "@/components/currency-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Address, Category, Project, User } from "@/types/api";

export const Route = createFileRoute("/dashboard/projects/")({
  component: DashboardProjectsPage,
});

interface ProjectFormState {
  npoUserId: string;
  title: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  description: string;
  targetAmount: string;
  currency: string;
  country: string;
  state: string;
  city: string;
}

interface ProjectTableRow {
  id: string;
  title: string;
  category: string;
  owner: string;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  startDate: string;
  status: string;
  project: Project;
}

interface MediaPreview {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_IMAGE_COUNT = 10;
const MAX_VIDEO_COUNT = 1;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;

const EMPTY_FORM: ProjectFormState = {
  npoUserId: "",
  title: "",
  categoryId: "",
  startDate: "",
  endDate: "",
  description: "",
  targetAmount: "",
  currency: "USD",
  country: "",
  state: "",
  city: "",
};

function formatCurrency(amount: number, currency: string): string {
  const normalizedCurrency = (currency || "USD").trim().toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`;
  }
}

function DashboardProjectsPage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const normalizedRole = session?.user.role.toLowerCase() ?? "";
  const isAdmin = normalizedRole === "admin";
  const isNpo = normalizedRole === "npo";
  const canManageProjects = isAdmin || isNpo;

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [newEditImages, setNewEditImages] = useState<File[]>([]);
  const [newEditVideos, setNewEditVideos] = useState<File[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const npoUsers = useMemo(
    () => users.filter((user) => user.role.toLowerCase() === "npo"),
    [users],
  );

  const userNameById = useMemo(
    () =>
      new Map(
        users.map((user) => [
          user.id,
          `${user.firstName} ${user.lastName}`.trim() || user.email,
        ]),
      ),
    [users],
  );

  const selectedEditingProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId) ?? null,
    [projects, editingProjectId],
  );

  const editImagePreviews = useMemo<MediaPreview[]>(
    () =>
      newEditImages.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-edit-image-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    [newEditImages],
  );

  const editVideoPreviews = useMemo<MediaPreview[]>(
    () =>
      newEditVideos.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-edit-video-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    [newEditVideos],
  );

  useEffect(() => {
    return () => {
      editImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [editImagePreviews]);

  useEffect(() => {
    return () => {
      editVideoPreviews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [editVideoPreviews]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [categoriesResponse, projectsResponse, usersResponse] = await Promise.all([
        getCategories(),
        getProjectsForDashboard(),
        isAdmin ? getUsers() : Promise.resolve([]),
      ]);

      const scopedProjects = isAdmin
        ? projectsResponse
        : projectsResponse.filter((project) => project.npoUserId === userId);

      setCategories(categoriesResponse);
      setUsers(usersResponse);
      setProjects(scopedProjects);
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function clearAlerts() {
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function setEditField<K extends keyof ProjectFormState>(field: K, value: ProjectFormState[K]) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function toAddressArray(form: ProjectFormState): Address[] {
    if (!form.country.trim() && !form.state.trim() && !form.city.trim()) {
      return [];
    }

    return [
      {
        country: form.country,
        state: form.state,
        city: form.city,
      },
    ];
  }

  function projectToForm(project: Project): ProjectFormState {
    const firstAddress = project.addresses[0];

    return {
      npoUserId: project.npoUserId,
      title: project.title,
      categoryId: String(project.categoryId),
      startDate: project.startDate,
      endDate: project.endDate ?? "",
      description: project.description,
      targetAmount: String(project.targetAmount),
      currency: project.currency || "USD",
      country: firstAddress?.country ?? "",
      state: firstAddress?.state ?? "",
      city: firstAddress?.city ?? "",
    };
  }

  const openEditor = useCallback((project: Project) => {
    clearAlerts();
    setEditingProjectId(project.id);
    setEditForm(projectToForm(project));
    setNewEditImages([]);
    setNewEditVideos([]);
  }, []);

  const onDeleteProject = useCallback(
    async (project: Project) => {
      if (!canManageProjects) {
        return;
      }

      const confirmed = window.confirm(`Delete project \"${project.title}\"?`);
      if (!confirmed) {
        return;
      }

      clearAlerts();

      try {
        await deleteProject(project.id);
        if (editingProjectId === project.id) {
          setEditingProjectId(null);
        }
        setSuccessMessage("Project deleted successfully.");
        await loadData();
      } catch (error) {
        setErrorMessage(extractApiErrorMessage(error));
      }
    },
    [canManageProjects, editingProjectId, loadData],
  );

  async function onUpdateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEditingProject || !session) {
      return;
    }

    clearAlerts();
    setIsUpdating(true);

    try {
      if (selectedEditingProject.images.length + newEditImages.length > MAX_IMAGE_COUNT) {
        setErrorMessage("Total images cannot exceed 10 per project.");
        return;
      }

      if (selectedEditingProject.videos.length + newEditVideos.length > MAX_VIDEO_COUNT) {
        setErrorMessage("Only 1 video is allowed per project.");
        return;
      }

      const oversizedImage = newEditImages.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
      if (oversizedImage) {
        setErrorMessage(`Image '${oversizedImage.name}' exceeds 5 MB.`);
        return;
      }

      const oversizedVideo = newEditVideos.find((file) => file.size > MAX_VIDEO_SIZE_BYTES);
      if (oversizedVideo) {
        setErrorMessage(`Video '${oversizedVideo.name}' exceeds 20 MB.`);
        return;
      }

      await updateProject(selectedEditingProject.id, {
        npoUserId: editForm.npoUserId,
        title: editForm.title,
        categoryId: Number(editForm.categoryId),
        startDate: editForm.startDate,
        endDate: editForm.endDate || undefined,
        description: editForm.description,
        targetAmount: Number(editForm.targetAmount),
        currency: editForm.currency,
        addresses: toAddressArray(editForm),
      });

      if (newEditImages.length > 0 || newEditVideos.length > 0) {
        await addProjectMedia(selectedEditingProject.id, {
          images: newEditImages,
          videos: newEditVideos,
        });
      }

      const latest = await getProjectById(selectedEditingProject.id);
      setEditForm(projectToForm(latest));
      setNewEditImages([]);
      setNewEditVideos([]);
      setSuccessMessage("Project updated successfully.");
      await loadData();
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  async function onDeleteImage(projectImageId: string) {
    if (!selectedEditingProject) {
      return;
    }

    clearAlerts();

    try {
      await deleteProjectImage(projectImageId);
      const refreshedProject = await getProjectById(selectedEditingProject.id);
      setEditForm(projectToForm(refreshedProject));
      setProjects((current) =>
        current.map((project) =>
          project.id === refreshedProject.id
            ? {
                ...project,
                images: refreshedProject.images,
                videos: refreshedProject.videos,
              }
            : project,
        ),
      );
      setSuccessMessage("Project media removed.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    }
  }

  const tableRows = useMemo<ProjectTableRow[]>(
    () =>
      projects.map((project) => ({
        id: project.id,
        title: project.title,
        category: project.category?.name ?? String(project.categoryId),
        owner:
          userNameById.get(project.npoUserId) ??
          (project.npoUserId === userId ? "You" : project.npoUserId),
        targetAmount: project.targetAmount,
        raisedAmount: project.raisedAmount,
        currency: project.currency || "USD",
        startDate: project.startDate,
        status: project.isApproved ? "Approved" : "Pending",
        project,
      })),
    [projects, userNameById, userId],
  );

  const columns = useMemo<ColumnDef<ProjectTableRow>[]>(() => {
    const baseColumns: ColumnDef<ProjectTableRow>[] = [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {row.original.project.description}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
      },
      {
        accessorKey: "targetAmount",
        header: "Target",
        cell: ({ row }) =>
          formatCurrency(row.original.targetAmount, row.original.currency),
      },
      {
        accessorKey: "raisedAmount",
        header: "Raised",
        cell: ({ row }) =>
          formatCurrency(row.original.raisedAmount, row.original.currency),
      },
      {
        accessorKey: "startDate",
        header: "Start Date",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.project.isApproved ? "secondary" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        cell: ({ row }) => {
          const project = row.original.project;
          const canEditThisProject =
            canManageProjects && (isAdmin || project.npoUserId === userId);

          if (!canEditThisProject) {
            return <span className="text-xs text-muted-foreground">No actions</span>;
          }

          return (
            <div className="flex gap-2">
              {isAdmin ? (
                <Button
                  size="sm"
                  variant="secondary"
                  render={
                    <Link
                      to="/dashboard/projects/preview/$projectId"
                      params={{ projectId: project.id }}
                    />
                  }
                >
                  Preview
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openEditor(project)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  void onDeleteProject(project);
                }}
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ];

    if (isAdmin) {
      baseColumns.splice(2, 0, {
        accessorKey: "owner",
        header: "NPO Owner",
      });
    }

    return baseColumns;
  }, [canManageProjects, isAdmin, onDeleteProject, openEditor, userId]);

  const table = useReactTable({
    data: tableRows,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const categoryFilterValue = (table.getColumn("category")?.getFilterValue() as string) ?? "";
  const statusFilterValue = (table.getColumn("status")?.getFilterValue() as string) ?? "";
  const ownerFilterValue = (table.getColumn("owner")?.getFilterValue() as string) ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              {isAdmin
                ? "Admin can view and manage all projects."
                : "NPO users can view and manage only their own projects."}
            </CardDescription>
          </div>
          {canManageProjects ? (
            <Button render={<Link to="/dashboard/projects/new" />}>
              Create New Project
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              {successMessage}
            </div>
          ) : null}

          <div className="grid gap-3 rounded-md border bg-muted/30 p-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end">
            <div className="space-y-1">
              <Label htmlFor="project-search">Search</Label>
              <Input
                id="project-search"
                placeholder="Search by title, category, owner..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="project-category-filter">Category</Label>
              <select
                id="project-category-filter"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={categoryFilterValue}
                onChange={(event) => {
                  const value = event.target.value;
                  table.getColumn("category")?.setFilterValue(value || undefined);
                }}
              >
                <option value="">All</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="project-status-filter">Status</Label>
              <select
                id="project-status-filter"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={statusFilterValue}
                onChange={(event) => {
                  const value = event.target.value;
                  table.getColumn("status")?.setFilterValue(value || undefined);
                }}
              >
                <option value="">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {isAdmin ? (
              <div className="space-y-1">
                <Label htmlFor="project-owner-filter">NPO Owner</Label>
                <select
                  id="project-owner-filter"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={ownerFilterValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    table.getColumn("owner")?.setFilterValue(value || undefined);
                  }}
                >
                  <option value="">All</option>
                  {npoUsers.map((user) => {
                    const label = `${user.firstName} ${user.lastName}`.trim() || user.email;
                    return (
                      <option key={user.id} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGlobalFilter("");
                table.resetColumnFilters();
              }}
            >
              Clear Filters
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Results: {table.getFilteredRowModel().rows.length} / {tableRows.length}
          </p>

          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-3 py-2 text-left font-medium">
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              <span className="text-muted-foreground">
                                {header.column.getIsSorted() === "asc"
                                  ? "↑"
                                  : header.column.getIsSorted() === "desc"
                                    ? "↓"
                                    : ""}
                              </span>
                            </button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        className="px-3 py-8 text-center text-muted-foreground"
                        colSpan={visibleColumnCount}
                      >
                        Loading projects...
                      </td>
                    </tr>
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-8 text-center text-muted-foreground"
                        colSpan={visibleColumnCount}
                      >
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-t">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-3 align-top">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={table.getState().pagination.pageSize}
                onChange={(event) => {
                  table.setPageSize(Number(event.target.value));
                }}
              >
                <option value={5}>5 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                First
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Prev
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))}
                disabled={!table.getCanNextPage()}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEditingProject ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
            <CardDescription>Update fields, images, and approval state.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onUpdateProject}>
              {isAdmin ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-npo">NPO Owner</Label>
                  <select
                    id="edit-npo"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={editForm.npoUserId}
                    onChange={(event) => setEditField("npoUserId", event.target.value)}
                    required
                  >
                    <option value="">Select NPO user</option>
                    {npoUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="edit-title">Project Title</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(event) => setEditField("title", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <select
                  id="edit-category"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={editForm.categoryId}
                  onChange={(event) => setEditField("categoryId", event.target.value)}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-target">Target Amount</Label>
                <Input
                  id="edit-target"
                  type="number"
                  min="1"
                  step="0.01"
                  value={editForm.targetAmount}
                  onChange={(event) => setEditField("targetAmount", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <CurrencySelect
                  id="edit-currency"
                  name="currency"
                  value={editForm.currency}
                  onChange={(value) => setEditField("currency", value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editForm.startDate}
                  onChange={(event) => setEditField("startDate", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-end-date">End Date (optional)</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={editForm.endDate}
                  onChange={(event) => setEditField("endDate", event.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(event) => setEditField("description", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-country">Address Country</Label>
                <Input
                  id="edit-country"
                  value={editForm.country}
                  onChange={(event) => setEditField("country", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-state">Address State</Label>
                <Input
                  id="edit-state"
                  value={editForm.state}
                  onChange={(event) => setEditField("state", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-city">Address City</Label>
                <Input
                  id="edit-city"
                  value={editForm.city}
                  onChange={(event) => setEditField("city", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-images">Add More Images</Label>
                <Input
                  id="edit-images"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(event) => {
                    const files = event.target.files ? Array.from(event.target.files) : [];
                    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
                    const oversized = imageFiles.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
                    if (oversized) {
                      setErrorMessage(`Image '${oversized.name}' exceeds 5 MB.`);
                      event.target.value = "";
                      return;
                    }

                    const remainingSlots = MAX_IMAGE_COUNT - selectedEditingProject.images.length;
                    setNewEditImages((current) => {
                      const merged = [...current, ...imageFiles];
                      if (merged.length > remainingSlots) {
                        setErrorMessage("Total images cannot exceed 10 per project.");
                      } else {
                        setErrorMessage(null);
                      }
                      return merged.slice(0, Math.max(remainingSlots, 0));
                    });
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-videos">Add More Videos</Label>
                <Input
                  id="edit-videos"
                  type="file"
                  multiple
                  accept="video/*"
                  onChange={(event) => {
                    const files = event.target.files ? Array.from(event.target.files) : [];
                    const videoFiles = files.filter((file) => file.type.startsWith("video/"));
                    const oversized = videoFiles.find((file) => file.size > MAX_VIDEO_SIZE_BYTES);
                    if (oversized) {
                      setErrorMessage(`Video '${oversized.name}' exceeds 20 MB.`);
                      event.target.value = "";
                      return;
                    }

                    const remainingSlots = MAX_VIDEO_COUNT - selectedEditingProject.videos.length;
                    setNewEditVideos((current) => {
                      const merged = [...current, ...videoFiles];
                      if (merged.length > remainingSlots) {
                        setErrorMessage("Only 1 video is allowed per project.");
                      } else {
                        setErrorMessage(null);
                      }
                      return merged.slice(0, Math.max(remainingSlots, 0));
                    });
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>New Image Preview</Label>
                {editImagePreviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No new images selected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {editImagePreviews.map((preview, index) => (
                      <div key={preview.id} className="relative">
                        <img
                          src={preview.previewUrl}
                          alt={preview.file.name}
                          className="h-20 w-24 rounded-md border object-cover"
                        />
                        <Button
                          className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                          variant="destructive"
                          type="button"
                          onClick={() => {
                            setNewEditImages((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            );
                          }}
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>New Video Preview</Label>
                {editVideoPreviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No new videos selected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {editVideoPreviews.map((preview, index) => (
                      <div key={preview.id} className="relative">
                        <video
                          src={preview.previewUrl}
                          className="h-20 w-32 rounded-md border bg-black/70 object-cover"
                          controls
                        />
                        <Button
                          className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                          variant="destructive"
                          type="button"
                          onClick={() => {
                            setNewEditVideos((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            );
                          }}
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Uploaded Images</Label>
                {selectedEditingProject.images.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No uploaded images.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedEditingProject.images.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={resolveAssetUrl(image.storagePath)}
                          alt={image.fileName}
                          className="h-20 w-24 rounded-md border object-cover"
                        />
                        <Button
                          className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                          variant="destructive"
                          type="button"
                          onClick={() => {
                            void onDeleteImage(image.id);
                          }}
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Uploaded Videos</Label>
                {selectedEditingProject.videos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No uploaded videos.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedEditingProject.videos.map((video) => (
                      <div key={video.id} className="relative">
                        <video
                          src={resolveAssetUrl(video.storagePath)}
                          className="h-20 w-32 rounded-md border bg-black/70 object-cover"
                          controls
                        />
                        <Button
                          className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                          variant="destructive"
                          type="button"
                          onClick={() => {
                            void onDeleteImage(video.id);
                          }}
                        >
                          X
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingProjectId(null);
                    setNewEditImages([]);
                    setNewEditVideos([]);
                  }}
                >
                  Close Editor
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
