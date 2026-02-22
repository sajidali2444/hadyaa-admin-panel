import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useAuth } from "@/components/auth-provider";
import { CurrencySelect } from "@/components/currency-select";
import { createProject, extractApiErrorMessage, getCategories, getUsers } from "@/lib/api";
import {
  createProjectFormSchema,
  toProjectAddresses,
  type CreateProjectFormValues,
} from "@/lib/validations/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, User } from "@/types/api";

export const Route = createFileRoute("/dashboard/projects/new")({
  component: CreateProjectPage,
});

interface MediaPreview {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_IMAGE_COUNT = 10;
const MAX_VIDEO_COUNT = 1;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;

function CreateProjectPage() {
  const navigate = Route.useNavigate();
  const { session } = useAuth();
  const normalizedRole = session?.user.role.toLowerCase() ?? "";
  const isAdmin = normalizedRole === "admin";
  const isNpo = normalizedRole === "npo";
  const canManageProjects = isAdmin || isNpo;

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const imagePreviews = useMemo<MediaPreview[]>(
    () =>
      selectedImages.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-image-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    [selectedImages],
  );

  const videoPreviews = useMemo<MediaPreview[]>(
    () =>
      selectedVideos.map((file, index) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-video-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    [selectedVideos],
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      videoPreviews.forEach((preview) => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [videoPreviews]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
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
    },
  });

  useEffect(() => {
    if (!session || !canManageProjects) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      setIsLoading(true);
      setApiErrorMessage(null);

      try {
        const [categoriesResponse, usersResponse] = await Promise.all([
          getCategories(),
          isAdmin ? getUsers() : Promise.resolve([]),
        ]);

        setCategories(categoriesResponse);
        setUsers(usersResponse);

        if (isNpo) {
          setValue("npoUserId", session.user.id);
        } else {
          const defaultNpoUserId =
            usersResponse.find((user) => user.role.toLowerCase() === "npo")?.id ?? "";
          setValue("npoUserId", defaultNpoUserId);
        }
      } catch (error) {
        setApiErrorMessage(extractApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [canManageProjects, isAdmin, isNpo, session, setValue]);

  async function onSubmit(values: CreateProjectFormValues) {
    if (!session) {
      return;
    }

    if (selectedImages.length > MAX_IMAGE_COUNT) {
      setApiErrorMessage("You can upload up to 10 images.");
      return;
    }

    if (selectedVideos.length > MAX_VIDEO_COUNT) {
      setApiErrorMessage("You can upload only 1 video.");
      return;
    }

    const oversizedImage = selectedImages.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversizedImage) {
      setApiErrorMessage(`Image '${oversizedImage.name}' exceeds 5 MB.`);
      return;
    }

    const oversizedVideo = selectedVideos.find((file) => file.size > MAX_VIDEO_SIZE_BYTES);
    if (oversizedVideo) {
      setApiErrorMessage(`Video '${oversizedVideo.name}' exceeds 20 MB.`);
      return;
    }

    setApiErrorMessage(null);

    try {
      await createProject({
        npoUserId: values.npoUserId,
        title: values.title,
        categoryId: Number(values.categoryId),
        startDate: values.startDate,
        endDate: values.endDate || undefined,
        description: values.description,
        targetAmount: Number(values.targetAmount),
        currency: values.currency,
        addresses: toProjectAddresses(values),
        images: selectedImages,
        videos: selectedVideos,
      });

      void navigate({ to: "/dashboard/projects" });
    } catch (error) {
      setApiErrorMessage(extractApiErrorMessage(error));
    }
  }

  if (!canManageProjects) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>
            Only Admin and NPO users can create projects.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Create New Project</CardTitle>
          <CardDescription>
            This form uses react-hook-form with zod validation.
          </CardDescription>
        </div>
        <Button variant="outline" render={<Link to="/dashboard/projects" />}>
          Back to Projects
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiErrorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiErrorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading form data...</p>
        ) : (
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
            {isAdmin ? (
              <div className="space-y-2">
                <Label htmlFor="npoUserId">NPO Owner</Label>
                <select
                  id="npoUserId"
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  {...register("npoUserId")}
                >
                  <option value="">Select NPO user</option>
                  {users
                    .filter((user) => user.role.toLowerCase() === "npo")
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                </select>
                {errors.npoUserId ? (
                  <p className="text-xs text-destructive">{errors.npoUserId.message}</p>
                ) : null}
              </div>
            ) : null}

            {!isAdmin ? <input type="hidden" {...register("npoUserId")} /> : null}

            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input id="title" {...register("title")} />
              {errors.title ? (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                {...register("categoryId")}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId ? (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target Amount</Label>
              <Input id="targetAmount" type="number" min="1" step="0.01" {...register("targetAmount")} />
              {errors.targetAmount ? (
                <p className="text-xs text-destructive">{errors.targetAmount.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <CurrencySelect
                    id="currency"
                    name={field.name}
                    value={field.value ?? "USD"}
                    onChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.currency ? (
                <p className="text-xs text-destructive">{errors.currency.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate ? (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate ? (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Address Country (optional)</Label>
              <Input id="country" {...register("country")} />
              {errors.country ? (
                <p className="text-xs text-destructive">{errors.country.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Address State (optional)</Label>
              <Input id="state" {...register("state")} />
              {errors.state ? (
                <p className="text-xs text-destructive">{errors.state.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Address City (optional)</Label>
              <Input id="city" {...register("city")} />
              {errors.city ? (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="images">Project Images</Label>
              <Input
                id="images"
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
                  const oversized = imageFiles.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
                  if (oversized) {
                    setApiErrorMessage(`Image '${oversized.name}' exceeds 5 MB.`);
                    event.target.value = "";
                    return;
                  }

                  setSelectedImages((current) => {
                    const merged = [...current, ...imageFiles];
                    if (merged.length > MAX_IMAGE_COUNT) {
                      setApiErrorMessage("You can upload up to 10 images.");
                    } else {
                      setApiErrorMessage(null);
                    }
                    return merged.slice(0, MAX_IMAGE_COUNT);
                  });
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                {selectedImages.length > 0
                  ? `${selectedImages.length} file(s) selected`
                  : "No files selected"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videos">Project Videos</Label>
              <Input
                id="videos"
                type="file"
                multiple
                accept="video/*"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  const videoFiles = files.filter((file) => file.type.startsWith("video/"));
                  const oversized = videoFiles.find((file) => file.size > MAX_VIDEO_SIZE_BYTES);
                  if (oversized) {
                    setApiErrorMessage(`Video '${oversized.name}' exceeds 20 MB.`);
                    event.target.value = "";
                    return;
                  }

                  setSelectedVideos((current) => {
                    const merged = [...current, ...videoFiles];
                    if (merged.length > MAX_VIDEO_COUNT) {
                      setApiErrorMessage("You can upload only 1 video.");
                    } else {
                      setApiErrorMessage(null);
                    }
                    return merged.slice(0, MAX_VIDEO_COUNT);
                  });
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">
                {selectedVideos.length > 0
                  ? `${selectedVideos.length} video(s) selected`
                  : "No videos selected"}
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Image Preview</Label>
              {imagePreviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">No images selected.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={preview.id} className="relative">
                      <img
                        src={preview.previewUrl}
                        alt={preview.file.name}
                        className="h-24 w-28 rounded-md border object-cover"
                      />
                      <Button
                        className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                        variant="destructive"
                        type="button"
                        onClick={() => {
                          setSelectedImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
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
              <Label>Video Preview</Label>
              {videoPreviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">No videos selected.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {videoPreviews.map((preview, index) => (
                    <div key={preview.id} className="relative">
                      <video
                        src={preview.previewUrl}
                        className="h-24 w-36 rounded-md border bg-black/70 object-cover"
                        controls
                      />
                      <Button
                        className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full p-0 shadow-md"
                        variant="destructive"
                        type="button"
                        onClick={() => {
                          setSelectedVideos((current) => current.filter((_, itemIndex) => itemIndex !== index));
                        }}
                      >
                        X
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Project"}
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
        )}
      </CardContent>
    </Card>
  );
}
