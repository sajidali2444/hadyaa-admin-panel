import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createSessionFromLogin,
  readStoredSession,
  writeStoredSession,
  type AuthSession,
} from "@/lib/auth";
import { extractApiErrorMessage, login as loginRequest } from "@/lib/api";
import type { LoginRequest, LoginResponse, UpdateUserResponse } from "@/types/api";

interface LoginResult {
  session: AuthSession;
  response: LoginResponse;
}

interface AuthContextValue {
  session: AuthSession | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<LoginResult>;
  logout: () => void;
  applyProfileUpdate: (payload: UpdateUserResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSession(readStoredSession());
    setIsHydrated(true);
  }, []);

  const login = useCallback(async (payload: LoginRequest): Promise<LoginResult> => {
    try {
      const response = await loginRequest(payload);
      const nextSession = createSessionFromLogin(response);
      if (!nextSession) {
        throw new Error("Unable to parse login token.");
      }

      setSession(nextSession);
      writeStoredSession(nextSession);
      return { session: nextSession, response };
    } catch (error) {
      throw new Error(extractApiErrorMessage(error));
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    writeStoredSession(null);
  }, []);

  const applyProfileUpdate = useCallback((payload: UpdateUserResponse) => {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const nextSession: AuthSession = {
        ...current,
        user: {
          ...current.user,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          displayName: `${payload.firstName} ${payload.lastName}`.trim(),
          role: payload.role,
          mobileNumber: payload.mobileNumber ?? undefined,
          avatarPath: payload.avatarPath ?? undefined,
        },
      };

      writeStoredSession(nextSession);
      return nextSession;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isHydrated,
      isAuthenticated: Boolean(session?.token),
      login,
      logout,
      applyProfileUpdate,
    }),
    [session, isHydrated, login, logout, applyProfileUpdate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
