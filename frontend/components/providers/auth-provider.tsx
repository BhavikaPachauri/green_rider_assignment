"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  apiRequest,
  getMe,
  postLogin,
  postLogout,
  postRefresh,
  postRegister,
} from "@/lib/api";
import { loadStoredSession, saveStoredSession } from "@/lib/storage";
import type {
  AuthSession,
  LoginPayload,
  RegisterPayload,
} from "@/types/api";

type AuthContextValue = {
  session: AuthSession | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  authorizedRequest: <T>(path: string, init?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const sessionRef = useRef<AuthSession | null>(null);

  useEffect(() => {
    const storedSession = loadStoredSession();
    sessionRef.current = storedSession;
    setSession(storedSession);
    setHydrated(true);
  }, []);

  const setPersistedSession = (nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    saveStoredSession(nextSession);
  };

  const refreshTokens = async () => {
    const currentSession = sessionRef.current;

    if (!currentSession?.refreshToken) {
      setPersistedSession(null);
      throw new Error("Your session has expired. Please log in again.");
    }

    const refreshed = await postRefresh({
      refreshToken: currentSession.refreshToken,
    });

    const nextSession: AuthSession = {
      ...currentSession,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: refreshed.user ?? currentSession.user,
    };

    setPersistedSession(nextSession);
    return nextSession;
  };

  const value: AuthContextValue = {
    session,
    hydrated,
    isAuthenticated: Boolean(session?.accessToken),
    async login(payload) {
      const tokens = await postLogin(payload);

      const user =
        tokens.user ??
        (await getMe(tokens.accessToken));

      setPersistedSession({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      });
    },
    async register(payload) {
      await postRegister(payload);
      setPersistedSession(null);
    },
    async logout() {
      const currentSession = sessionRef.current;

      try {
        if (currentSession?.refreshToken) {
          await postLogout({ refreshToken: currentSession.refreshToken });
        }
      } finally {
        setPersistedSession(null);
      }
    },
    async authorizedRequest<T>(path: string, init: RequestInit = {}) {
      const currentSession = sessionRef.current;

      if (!currentSession?.accessToken) {
        throw new Error("You need to log in first.");
      }

      try {
        return await apiRequest<T>(path, {
          ...init,
          accessToken: currentSession.accessToken,
        });
      } catch (error) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof error.status === "number"
            ? error.status
            : undefined;

        if (status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshTokens();

        return apiRequest<T>(path, {
          ...init,
          accessToken: refreshedSession.accessToken,
        });
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
