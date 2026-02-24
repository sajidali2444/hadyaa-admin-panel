import { useCallback, useEffect, useMemo, useState } from "react";
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
  deleteProject,
  extractApiErrorMessage,
  getCategories,
  getProjectsForDashboard,
  getUsers,
} from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotificationToast } from "@/components/ui/notification-toast";
import type { Category, Project, User } from "@/types/api";

export const Route = createFileRoute("/dashboard/projects/")({
  component: DashboardProjectsPage,
});

interface ProjectTableRow {
  id: string;
  title: string;
  category: string;
  owner: string;
  createdDate: string;
  createdDateLabel: string;
  createdDateSort: number;
  targetAmount: number;
  raisedAmount: number;
  currency: string;
  startDate: string;
  status: string;
  project: Project;
}

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

function toDateEpoch(value: string | undefined | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const epoch = new Date(value).getTime();
  return Number.isNaN(epoch) ? Number.NEGATIVE_INFINITY : epoch;
}

function getProjectCreatedDate(project: Project): string {
  return project.createdOn ?? project.createdAt ?? project.startDate;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return value;
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

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdDate", desc: true }]);
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

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setErrorMessage(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [errorMessage]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

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

  const onDeleteProject = useCallback(
    (project: Project) => {
      if (!canManageProjects) {
        return;
      }

      clearAlerts();
      setProjectToDelete(project);
    },
    [canManageProjects],
  );

  const confirmDeleteProject = useCallback(async () => {
    if (!projectToDelete) {
      return;
    }

    clearAlerts();
    setIsDeletingProject(true);

    try {
      await deleteProject(projectToDelete.id);
      setProjects((current) => current.filter((project) => project.id !== projectToDelete.id));
      setProjectToDelete(null);
      setSuccessMessage("Project deleted successfully.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsDeletingProject(false);
    }
  }, [projectToDelete]);

  const tableRows = useMemo<ProjectTableRow[]>(
    () =>
      projects.map((project) => {
        const createdDate = getProjectCreatedDate(project);

        return {
          createdDate,
          createdDateLabel: formatDateTime(createdDate),
          createdDateSort: toDateEpoch(createdDate),
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
        };
      }),
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
        id: "createdDate",
        accessorFn: (row) => row.createdDateSort,
        header: "Created Date",
        cell: ({ row }) => row.original.createdDateLabel,
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
                variant="outline"
                size="sm"
                render={
                  <Link
                    to="/dashboard/projects/edit/$projectId"
                    params={{ projectId: project.id }}
                  />
                }
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
  }, [canManageProjects, isAdmin, onDeleteProject, userId]);

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
      {errorMessage ? (
        <NotificationToast
          type="error"
          message={errorMessage}
          onClose={() => {
            setErrorMessage(null);
          }}
        />
      ) : null}

      {successMessage ? (
        <NotificationToast
          type="success"
          message={successMessage}
          onClose={() => {
            setSuccessMessage(null);
          }}
        />
      ) : null}

      <AlertDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingProject) {
            setProjectToDelete(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete
                ? `Delete "${projectToDelete.title}" permanently? This action cannot be undone.`
                : "Delete this project permanently? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingProject}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingProject}
              onClick={() => {
                void confirmDeleteProject();
              }}
            >
              {isDeletingProject ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] xl:items-end">
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

    </div>
  );
}
