import type { LoginResponse, UserRole } from "@/types/api";

export const AUTH_STORAGE_KEY = "hadyaa.admin.auth";

export interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  role?: string;
  [key: string]: unknown;
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  displayName: string;
  mobileNumber?: string;
  avatarPath?: string;
}

export interface AuthSession {
  token: string;
  user: SessionUser;
}

const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const NAME_ID_CLAIM =
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const EMAIL_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";

function decodeBase64(input: string): string {
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(input);
  }

  return "";
}

function normalizeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  if (remainder === 0) {
    return normalized;
  }

  return normalized.padEnd(normalized.length + (4 - remainder), "=");
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadJson = decodeBase64(normalizeBase64Url(parts[1]));
    return JSON.parse(payloadJson) as JwtPayload;
  } catch {
    return null;
  }
}

function getUserIdFromPayload(payload: JwtPayload): string {
  const id = payload.sub ?? (payload[NAME_ID_CLAIM] as string | undefined);
  return typeof id === "string" ? id : "";
}

function getRoleFromPayload(payload: JwtPayload): UserRole {
  const role = payload.role ?? (payload[ROLE_CLAIM] as string | undefined);
  return typeof role === "string" && role.trim().length > 0 ? role : "Donor";
}

function getEmailFromPayload(payload: JwtPayload): string {
  const email = payload.email ?? (payload[EMAIL_CLAIM] as string | undefined);
  return typeof email === "string" ? email : "";
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

export function createSessionFromLogin(
  loginResponse: LoginResponse,
): AuthSession | null {
  const payload = decodeJwtPayload(loginResponse.token);
  if (!payload) {
    return null;
  }

  const id = getUserIdFromPayload(payload);
  if (!id) {
    return null;
  }

  const firstName = loginResponse.firstName ?? "";
  const lastName = loginResponse.lastName ?? "";

  return {
    token: loginResponse.token,
    user: {
      id,
      role: getRoleFromPayload(payload),
      email: getEmailFromPayload(payload),
      firstName,
      lastName,
      displayName:
        loginResponse.displayName?.trim() || `${firstName} ${lastName}`.trim(),
      mobileNumber: loginResponse.mobileNumber ?? undefined,
      avatarPath: loginResponse.avatarPath ?? undefined,
    },
  };
}

export function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as AuthSession;
    if (!session.token || !session.user?.id || isTokenExpired(session.token)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredSession(session: AuthSession | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function getStoredToken(): string | null {
  const session = readStoredSession();
  return session?.token ?? null;
}
