import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { deleteProjectImage, extractApiErrorMessage, getProjectById, getUsers, resolveAssetUrl, setProjectApproval } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationToast } from "@/components/ui/notification-toast";
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

interface PendingMediaDelete {
  id: string;
  fileName: string;
  mediaType: "image" | "video";
}

interface ImagePreviewState {
  src: string;
  fileName: string;
}

function DashboardProjectPreviewPage() {
  const { projectId } = Route.useParams();
  const { session } = useAuth();
  const isAdmin = session?.user.role.toLowerCase() === "admin";

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<PendingMediaDelete | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const userNameById = useMemo(() => new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim() || user.email])), [users]);

  const loadProject = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [projectResponse, usersResponse] = await Promise.all([getProjectById(projectId), getUsers()]);

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

  useEffect(() => {
    if (!imagePreview) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImagePreview(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [imagePreview]);

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

  function onRequestDeleteMedia(media: PendingMediaDelete) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setMediaToDelete(media);
  }

  async function confirmDeleteMedia() {
    if (!project || !mediaToDelete) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDeletingMedia(true);

    try {
      await deleteProjectImage(mediaToDelete.id);
      setProject((current) => {
        if (!current) {
          return current;
        }

        if (mediaToDelete.mediaType === "image") {
          return {
            ...current,
            images: current.images.filter((image) => image.id !== mediaToDelete.id),
          };
        }

        return {
          ...current,
          videos: current.videos.filter((video) => video.id !== mediaToDelete.id),
        };
      });
      setMediaToDelete(null);
      setSuccessMessage(mediaToDelete.mediaType === "image" ? "Image removed." : "Video removed.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsDeletingMedia(false);
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

      {imagePreview ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${imagePreview.fileName}`}
          onClick={() => setImagePreview(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-md bg-black/60 px-3 py-1.5 text-sm text-white transition hover:bg-black/75"
            onClick={(event) => {
              event.stopPropagation();
              setImagePreview(null);
            }}
          >
            Close
          </button>
          <img
            src={imagePreview.src}
            alt={imagePreview.fileName}
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(mediaToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingMedia) {
            setMediaToDelete(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {mediaToDelete?.mediaType === "video" ? "Video" : "Image"}</AlertDialogTitle>
            <AlertDialogDescription>{mediaToDelete ? `Delete "${mediaToDelete.fileName}" from this project?` : "Delete this media item from this project?"}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMedia}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingMedia}
              onClick={() => {
                void confirmDeleteMedia();
              }}
            >
              {isDeletingMedia ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Project Preview</CardTitle>
            <CardDescription>Admin-only review page to approve or disapprove projects.</CardDescription>
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
          {isLoading ? <p className="text-sm text-muted-foreground">Loading project preview...</p> : null}

          {!isLoading && !project ? <p className="text-sm text-muted-foreground">Project not found.</p> : null}

          {project ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{project.title}</h2>
                  <Badge variant={project.isApproved ? "secondary" : "outline"}>{project.isApproved ? "Approved" : "Pending"}</Badge>
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
                  <p className="font-medium">{userNameById.get(project.npoUserId) ?? project.npoUserId}</p>
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
                  <p className="font-medium">{project.approvedByUserId ? (userNameById.get(project.approvedByUserId) ?? project.approvedByUserId) : "-"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Addresses</h3>
                {project.addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No addresses added.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {project.addresses.map((address, index) => (
                      <div key={`${address.country}-${address.state}-${address.city}-${index}`} className="rounded-md border p-3 text-sm">
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
                      <div key={image.id} className="relative">
                        <img
                          src={resolveAssetUrl(image.storagePath)}
                          alt={image.fileName}
                          className="h-28 w-36 cursor-zoom-in rounded-md border object-cover"
                          onClick={() => {
                            setImagePreview({
                              src: resolveAssetUrl(image.storagePath),
                              fileName: image.fileName,
                            });
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-7 px-2 text-xs"
                          disabled={isDeletingMedia || isUpdatingApproval}
                          onClick={() => {
                            onRequestDeleteMedia({
                              id: image.id,
                              fileName: image.fileName,
                              mediaType: "image",
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
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
                      <div key={video.id} className="relative">
                        <video src={resolveAssetUrl(video.storagePath)} className="h-28 w-44 rounded-md border bg-black/70 object-cover" controls />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-7 px-2 text-xs"
                          disabled={isDeletingMedia || isUpdatingApproval}
                          onClick={() => {
                            onRequestDeleteMedia({
                              id: video.id,
                              fileName: video.fileName,
                              mediaType: "video",
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
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
