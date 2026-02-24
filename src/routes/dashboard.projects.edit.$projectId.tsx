import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  addProjectMedia,
  deleteProjectImage,
  extractApiErrorMessage,
  getCategories,
  getProjectById,
  getUsers,
  resolveAssetUrl,
  updateProject,
} from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySelect } from "@/components/currency-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotificationToast } from "@/components/ui/notification-toast";
import { Textarea } from "@/components/ui/textarea";
import type { Address, Category, Project, User } from "@/types/api";

export const Route = createFileRoute("/dashboard/projects/edit/$projectId")({
  component: EditProjectPage,
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

function EditProjectPage() {
  const navigate = Route.useNavigate();
  const { projectId } = Route.useParams();
  const { session } = useAuth();

  const userId = session?.user.id ?? "";
  const normalizedRole = session?.user.role.toLowerCase() ?? "";
  const isAdmin = normalizedRole === "admin";
  const isNpo = normalizedRole === "npo";
  const canManageProjects = isAdmin || isNpo;

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [newEditImages, setNewEditImages] = useState<File[]>([]);
  const [newEditVideos, setNewEditVideos] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const npoUsers = useMemo(
    () => users.filter((user) => user.role.toLowerCase() === "npo"),
    [users],
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

  function projectToForm(item: Project): ProjectFormState {
    const firstAddress = item.addresses[0];

    return {
      npoUserId: item.npoUserId,
      title: item.title,
      categoryId: String(item.categoryId),
      startDate: item.startDate,
      endDate: item.endDate ?? "",
      description: item.description,
      targetAmount: String(item.targetAmount),
      currency: item.currency || "USD",
      country: firstAddress?.country ?? "",
      state: firstAddress?.state ?? "",
      city: firstAddress?.city ?? "",
    };
  }

  const loadData = useCallback(async () => {
    if (!session || !canManageProjects) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    clearAlerts();

    try {
      const [categoriesResponse, projectResponse, usersResponse] = await Promise.all([
        getCategories(),
        getProjectById(projectId),
        isAdmin ? getUsers() : Promise.resolve([]),
      ]);

      if (isNpo && projectResponse.npoUserId !== userId) {
        setProject(null);
        setErrorMessage("You are not allowed to edit this project.");
        return;
      }

      setCategories(categoriesResponse);
      setUsers(usersResponse);
      setProject(projectResponse);
      setEditForm(projectToForm(projectResponse));
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [canManageProjects, isAdmin, isNpo, projectId, session, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onUpdateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !session) {
      return;
    }

    clearAlerts();
    setIsUpdating(true);

    try {
      if (project.images.length + newEditImages.length > MAX_IMAGE_COUNT) {
        setErrorMessage("Total images cannot exceed 10 per project.");
        return;
      }

      if (project.videos.length + newEditVideos.length > MAX_VIDEO_COUNT) {
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

      await updateProject(project.id, {
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
        await addProjectMedia(project.id, {
          images: newEditImages,
          videos: newEditVideos,
        });
      }

      const latest = await getProjectById(project.id);
      setProject(latest);
      setEditForm(projectToForm(latest));
      setNewEditImages([]);
      setNewEditVideos([]);
      setSuccessMessage("Project updated successfully.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  }

  async function onDeleteMedia(projectImageId: string) {
    if (!project) {
      return;
    }

    clearAlerts();
    setIsDeletingMedia(true);

    try {
      await deleteProjectImage(projectImageId);
      const refreshedProject = await getProjectById(project.id);
      setProject(refreshedProject);
      setEditForm(projectToForm(refreshedProject));
      setSuccessMessage("Project media removed.");
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setIsDeletingMedia(false);
    }
  }

  if (!canManageProjects) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit Project</CardTitle>
          <CardDescription>Only Admin and NPO users can edit projects.</CardDescription>
        </CardHeader>
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

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Edit Project</CardTitle>
            <CardDescription>Update project details and media in a dedicated page.</CardDescription>
          </div>
          <div className="flex gap-2">
            {isAdmin && project ? (
              <Button
                variant="secondary"
                render={
                  <Link to="/dashboard/projects/preview/$projectId" params={{ projectId: project.id }} />
                }
              >
                Preview
              </Button>
            ) : null}
            <Button variant="outline" render={<Link to="/dashboard/projects" />}>
              Back to Projects
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading project...</p> : null}

          {!isLoading && !project ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Project not found or not accessible.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void navigate({ to: "/dashboard/projects" });
                }}
              >
                Go Back
              </Button>
            </div>
          ) : null}

          {project ? (
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

                    const remainingSlots = MAX_IMAGE_COUNT - project.images.length;
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

                    const remainingSlots = MAX_VIDEO_COUNT - project.videos.length;
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
                          className="absolute top-1 right-1 z-10 h-7 w-7 rounded-full p-0 shadow-md"
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
                          className="absolute top-1 right-1 z-10 h-7 w-7 rounded-full p-0 shadow-md"
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
                {project.images.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No uploaded images.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {project.images.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={resolveAssetUrl(image.storagePath)}
                          alt={image.fileName}
                          className="h-20 w-24 rounded-md border object-cover"
                        />
                        <Button
                          className="absolute top-1 right-1 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                          variant="destructive"
                          type="button"
                          disabled={isDeletingMedia}
                          onClick={() => {
                            void onDeleteMedia(image.id);
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
                {project.videos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No uploaded videos.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {project.videos.map((video) => (
                      <div key={video.id} className="relative">
                        <video
                          src={resolveAssetUrl(video.storagePath)}
                          className="h-20 w-32 rounded-md border bg-black/70 object-cover"
                          controls
                        />
                        <Button
                          className="absolute top-1 right-1 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                          variant="destructive"
                          type="button"
                          disabled={isDeletingMedia}
                          onClick={() => {
                            void onDeleteMedia(video.id);
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
                    void navigate({ to: "/dashboard/projects" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
