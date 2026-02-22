import axios from "axios";
import { getStoredToken } from "@/lib/auth";
import type {
  Address,
  ApiErrorShape,
  Category,
  LoginRequest,
  LoginResponse,
  Project,
  UpdateUserResponse,
  User,
  UserRole,
} from "@/types/api";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
export const API_BASE_URL =
  configuredBaseUrl && configuredBaseUrl.length > 0
    ? configuredBaseUrl.replace(/\/$/, "")
    : "http://localhost:5000/api";

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "http://localhost:5000";
  }
})();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${API_ORIGIN}${path}`;
  }

  return `${API_ORIGIN}/${path}`;
}

export function extractApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;

    if (data?.errors) {
      const firstError = Object.values(data.errors)[0]?.[0];
      if (firstError) {
        return firstError;
      }
    }

    if (data?.detail) {
      return data.detail;
    }

    if (data?.title) {
      return data.title;
    }

    if (typeof error.response?.data === "string") {
      return error.response.data;
    }

    if (error.message) {
      return error.message;
    }
  }

  return "Something went wrong. Please try again.";
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/users/login", payload);
  return response.data;
}

export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<Category[]>("/categories");
  return response.data;
}

export async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<User[]>("/users");
  return response.data;
}

function normalizeAddresses(addresses: Address[]): Address[] {
  return addresses
    .map((address) => ({
      country: address.country.trim(),
      state: address.state.trim(),
      city: address.city.trim(),
    }))
    .filter((address) => address.country && address.state && address.city);
}

export interface CreateProjectPayload {
  npoUserId: string;
  title: string;
  categoryId: number;
  startDate: string;
  endDate?: string;
  description: string;
  targetAmount: number;
  currency: string;
  addresses: Address[];
  images: File[];
  videos: File[];
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const formData = new FormData();
  formData.append("npoUserId", payload.npoUserId);
  formData.append("title", payload.title);
  formData.append("categoryId", String(payload.categoryId));
  formData.append("startDate", payload.startDate);
  if (payload.endDate) {
    formData.append("endDate", payload.endDate);
  }
  formData.append("description", payload.description);
  formData.append("targetAmount", String(payload.targetAmount));
  formData.append("currency", payload.currency.trim().toUpperCase());

  const normalizedAddresses = normalizeAddresses(payload.addresses);
  normalizedAddresses.forEach((address, index) => {
    formData.append(`addresses[${index}].country`, address.country);
    formData.append(`addresses[${index}].state`, address.state);
    formData.append(`addresses[${index}].city`, address.city);
  });

  payload.images.forEach((image) => {
    formData.append("images", image);
  });
  payload.videos.forEach((video) => {
    formData.append("videos", video);
  });

  const response = await apiClient.post<Project>("/projects", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export interface UpdateProjectPayload {
  npoUserId: string;
  title: string;
  categoryId: number;
  startDate: string;
  endDate?: string;
  description: string;
  targetAmount: number;
  currency: string;
  addresses: Address[];
}

export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<Project> {
  const normalizedAddresses = normalizeAddresses(payload.addresses);

  const body: Record<string, unknown> = {
    npoUserId: payload.npoUserId,
    title: payload.title,
    categoryId: payload.categoryId,
    startDate: payload.startDate,
    endDate: payload.endDate || null,
    description: payload.description,
    targetAmount: payload.targetAmount,
    currency: payload.currency.trim().toUpperCase(),
    addresses: normalizedAddresses,
  };

  await apiClient.patch(`/projects/${projectId}`, body);
  return getProjectById(projectId);
}

export async function setProjectApproval(
  projectId: string,
  isApproved: boolean,
): Promise<Project> {
  await apiClient.patch(`/projects/${projectId}`, { isApproved });
  return getProjectById(projectId);
}

export async function getProjectById(projectId: string): Promise<Project> {
  const response = await apiClient.get<Project>(`/projects/${projectId}`);
  return response.data;
}

export interface AddProjectMediaPayload {
  images: File[];
  videos: File[];
}

export async function addProjectMedia(
  projectId: string,
  payload: AddProjectMediaPayload,
): Promise<Project> {
  const formData = new FormData();
  payload.images.forEach((file) => {
    formData.append("images", file);
  });
  payload.videos.forEach((file) => {
    formData.append("videos", file);
  });

  const response = await apiClient.put<Project>(
    `/projects/${projectId}/images`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`);
}

export async function deleteProjectImage(projectImageId: string): Promise<void> {
  await apiClient.delete(`/project-images/${projectImageId}`);
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ role: UserRole }> {
  const response = await apiClient.patch<{ role: UserRole }>(`/users/${userId}/role`, {
    role,
  });

  return response.data;
}

export interface UpdateProfilePayload {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
}

export async function updateOwnProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<UpdateUserResponse> {
  const response = await apiClient.patch<UpdateUserResponse>(`/users/${userId}`, payload);
  return response.data;
}

function compareDateDesc(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
}

export async function getProjectsForDashboard(): Promise<Project[]> {
  const categories = await getCategories();

  if (categories.length === 0) {
    return [];
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const projectsByCategory = await Promise.all(
    categories.map(async (category) => {
      const response = await apiClient.get<Project[]>(`/projects/by-category/${category.id}`);
      return response.data;
    }),
  );

  const deduped = new Map<string, Project>();

  projectsByCategory.flat().forEach((project) => {
    if (!deduped.has(project.id)) {
      deduped.set(project.id, {
        ...project,
        category: project.category ?? categoryMap.get(project.categoryId) ?? null,
      });
    }
  });

  return [...deduped.values()].sort((a, b) => compareDateDesc(a.startDate, b.startDate));
}
