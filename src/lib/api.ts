import ky, { HTTPError, TimeoutError, type KyInstance, type Options } from "ky";
import { getStoredToken } from "@/lib/auth";
import type { Address, ApiErrorShape, Category, LoginRequest, LoginResponse, Project, UpdateUserResponse, User, UserRole } from "@/types/api";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const DEFAULT_API_BASE_URL = "http://localhost:5000/api";
export const API_BASE_URL = configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl.replace(/\/$/, "") : DEFAULT_API_BASE_URL;

const NETWORK_ERROR_MESSAGE = "Unable to reach API from browser. Check VITE_API_BASE_URL, CORS, and HTTPS/HTTP mismatch.";
const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again.";

const API_ORIGIN = (() => {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return "";
    }
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
})();

function toPrefixUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/`;
}

class ApiRequestError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, options?: { status?: number; data?: unknown }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options?.status;
    this.data = options?.data;
  }
}

export const apiClient: KyInstance = ky.create({
  prefixUrl: toPrefixUrl(API_BASE_URL),
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getStoredToken();
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
  },
});

async function parseErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  try {
    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}

async function normalizeApiError(error: unknown): Promise<ApiRequestError> {
  if (error instanceof HTTPError) {
    const data = await parseErrorBody(error.response);
    return new ApiRequestError(error.message, {
      status: error.response.status,
      data,
    });
  }

  if (error instanceof TimeoutError) {
    return new ApiRequestError("Request timed out.");
  }

  if (error instanceof Error) {
    const isNetworkError = /failed to fetch|networkerror|load failed|fetch/i.test(error.message);
    return new ApiRequestError(isNetworkError ? NETWORK_ERROR_MESSAGE : error.message);
  }

  return new ApiRequestError(FALLBACK_ERROR_MESSAGE);
}

async function requestJson<T>(path: string, options?: Options): Promise<T> {
  try {
    return await apiClient(path, options).json<T>();
  } catch (error) {
    throw await normalizeApiError(error);
  }
}

async function requestVoid(path: string, options?: Options): Promise<void> {
  try {
    await apiClient(path, options);
  } catch (error) {
    throw await normalizeApiError(error);
  }
}

function readApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const apiData = data as ApiErrorShape;

  if (apiData.errors) {
    const firstError = Object.values(apiData.errors)[0]?.[0];
    if (firstError) {
      return firstError;
    }
  }

  if (apiData.detail) {
    return apiData.detail;
  }

  if (apiData.title) {
    return apiData.title;
  }

  return null;
}

export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
  }

  return API_ORIGIN ? `${API_ORIGIN}/${path}` : `/${path}`;
}

export function extractApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    const parsedMessage = readApiErrorMessage(error.data);
    if (parsedMessage) {
      return parsedMessage;
    }

    if (typeof error.data === "string" && error.data.trim().length > 0) {
      return error.data;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    const isNetworkError = /failed to fetch|networkerror|load failed|fetch/i.test(error.message);
    if (isNetworkError) {
      return NETWORK_ERROR_MESSAGE;
    }

    return error.message || FALLBACK_ERROR_MESSAGE;
  }

  return FALLBACK_ERROR_MESSAGE;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return requestJson<LoginResponse>("users/login", {
    method: "post",
    json: payload,
  });
}

export async function getCategories(): Promise<Category[]> {
  return requestJson<Category[]>("categories");
}

export async function getUsers(): Promise<User[]> {
  return requestJson<User[]>("users");
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

  payload.images.forEach((image, index) => {
    formData.append(`images[${index}]`, image);
  });
  payload.videos.forEach((video) => {
    formData.append("videos", video);
  });

  return requestJson<Project>("projects", {
    method: "post",
    body: formData,
  });
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

export async function updateProject(projectId: string, payload: UpdateProjectPayload): Promise<Project> {
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

  await requestVoid(`projects/${projectId}`, {
    method: "patch",
    json: body,
  });

  return getProjectById(projectId);
}

export async function setProjectApproval(projectId: string, isApproved: boolean): Promise<Project> {
  await requestVoid(`projects/${projectId}`, {
    method: "patch",
    json: { isApproved },
  });

  return getProjectById(projectId);
}

export async function getProjectById(projectId: string): Promise<Project> {
  return requestJson<Project>(`projects/${projectId}`);
}

export interface AddProjectMediaPayload {
  images: File[];
  videos: File[];
}

export async function addProjectMedia(projectId: string, payload: AddProjectMediaPayload): Promise<Project> {
  const formData = new FormData();
  payload.images.forEach((file) => {
    formData.append("images", file);
  });
  payload.videos.forEach((file) => {
    formData.append("videos", file);
  });

  return requestJson<Project>(`projects/${projectId}/images`, {
    method: "put",
    body: formData,
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  await requestVoid(`projects/${projectId}`, {
    method: "delete",
  });
}

export async function deleteProjectImage(projectImageId: string): Promise<void> {
  await requestVoid(`project-images/${projectImageId}`, {
    method: "delete",
  });
}

export async function updateUserRole(userId: string, role: UserRole): Promise<{ role: UserRole }> {
  return requestJson<{ role: UserRole }>(`users/${userId}/role`, {
    method: "patch",
    json: { role },
  });
}

export interface UpdateProfilePayload {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
}

export async function updateOwnProfile(userId: string, payload: UpdateProfilePayload): Promise<UpdateUserResponse> {
  return requestJson<UpdateUserResponse>(`users/${userId}`, {
    method: "patch",
    json: payload,
  });
}

function toDateEpoch(value: string | undefined | null): number {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const epoch = new Date(value).getTime();
  return Number.isNaN(epoch) ? Number.NEGATIVE_INFINITY : epoch;
}

function getProjectCreatedDate(project: Project): string | undefined {
  return project.createdOn ?? project.createdAt ?? project.startDate;
}

export async function getProjectsForDashboard(): Promise<Project[]> {
  const categories = await getCategories();

  if (categories.length === 0) {
    return [];
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const projectsByCategory = await Promise.all(categories.map((category) => requestJson<Project[]>(`projects/by-category/${category.id}`)));

  const deduped = new Map<string, Project>();

  projectsByCategory.flat().forEach((project) => {
    if (!deduped.has(project.id)) {
      deduped.set(project.id, {
        ...project,
        category: project.category ?? categoryMap.get(project.categoryId) ?? null,
      });
    }
  });

  return [...deduped.values()].sort(
    (a, b) => toDateEpoch(getProjectCreatedDate(b)) - toDateEpoch(getProjectCreatedDate(a)),
  );
}
