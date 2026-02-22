import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  extractApiErrorMessage,
  getProjectById,
  getUsers,
  resolveAssetUrl,
  setProjectApproval,
} from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project, User } from "@/types/api";

export const Route = createFileRoute("/dashboard/projects/preview/$projectId")({
  component: DashboardProjectPreviewPage,
});

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

function formatDate(dateValue: string | null | undefined): string {
  if (!dateValue) {
    return "-";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleString();
}

function DashboardProjectPreviewPage() {
  const { projectId } = Route.useParams();
  const { session } = useAuth();
  const isAdmin = session?.user.role.toLowerCase() === "admin";

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const loadProject = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [projectResponse, usersResponse] = await Promise.all([
        getProjectById(projectId),
        getUsers(),
      ]);

      setProject(projectResponse);
      setUsers(usersResponse);
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  async function onSetApproval(isApproved: boolean) {
    if (!project) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUpdatingApproval(true);

    try {
      const updated = await setProjectApproval(project.id, isApproved);
      setProject(updated);
      setSuccessMessage(isApproved ? "Project approved." : "Project disapproved.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsUpdatingApproval(false);
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Preview</CardTitle>
          <CardDescription>Only admin users can preview and approve projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link to="/dashboard/projects" />}>
            Back to Projects
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Project Preview</CardTitle>
            <CardDescription>
              Admin-only review page to approve or disapprove projects.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link to="/dashboard/projects" />}>
              Back to Projects
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isLoading || !project || isUpdatingApproval || project.isApproved}
              onClick={() => {
                void onSetApproval(true);
              }}
            >
              {isUpdatingApproval && !project?.isApproved ? "Saving..." : "Approve"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isLoading || !project || isUpdatingApproval || !project.isApproved}
              onClick={() => {
                void onSetApproval(false);
              }}
            >
              {isUpdatingApproval && project?.isApproved ? "Saving..." : "Disapprove"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/20 dark:text-emerald-300">
              {successMessage}
            </div>
          ) : null}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading project preview...</p>
          ) : null}

          {!isLoading && !project ? (
            <p className="text-sm text-muted-foreground">Project not found.</p>
          ) : null}

          {project ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{project.title}</h2>
                  <Badge variant={project.isApproved ? "secondary" : "outline"}>
                    {project.isApproved ? "Approved" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{project.category?.name ?? project.categoryId}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">NPO Owner</p>
                  <p className="font-medium">
                    {userNameById.get(project.npoUserId) ?? project.npoUserId}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="font-medium">{(project.currency || "USD").toUpperCase()}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Target Amount</p>
                  <p className="font-medium">{formatCurrency(project.targetAmount, project.currency)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Raised Amount</p>
                  <p className="font-medium">{formatCurrency(project.raisedAmount, project.currency)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium">{project.startDate}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="font-medium">{project.endDate || "-"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Approved At</p>
                  <p className="font-medium">{formatDate(project.approvedAt)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Approved By</p>
                  <p className="font-medium">
                    {project.approvedByUserId
                      ? userNameById.get(project.approvedByUserId) ?? project.approvedByUserId
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Addresses</h3>
                {project.addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No addresses added.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {project.addresses.map((address, index) => (
                      <div
                        key={`${address.country}-${address.state}-${address.city}-${index}`}
                        className="rounded-md border p-3 text-sm"
                      >
                        <p>{address.country}</p>
                        <p>{address.state}</p>
                        <p>{address.city}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Images</h3>
                {project.images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No images uploaded.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {project.images.map((image) => (
                      <img
                        key={image.id}
                        src={resolveAssetUrl(image.storagePath)}
                        alt={image.fileName}
                        className="h-28 w-36 rounded-md border object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Videos</h3>
                {project.videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No videos uploaded.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {project.videos.map((video) => (
                      <video
                        key={video.id}
                        src={resolveAssetUrl(video.storagePath)}
                        className="h-28 w-44 rounded-md border bg-black/70 object-cover"
                        controls
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
