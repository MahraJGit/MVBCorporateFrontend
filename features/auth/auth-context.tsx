"use client";

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
  AUTH_CHANGED_EVENT,
  AUTH_SESSION_EXPIRED_EVENT,
  clearAuthSession,
  getAccessToken,
  getAuthUser,
  hasPersistedAuthSession,
  persistAuthSession,
} from "./session-storage";
import { fetchCorporateMe, logoutCorporate } from "./api";
import { refreshAndApplySession } from "./coordinated-refresh";
import type { CorporateMembership, CorporateUser } from "./types";

type AuthContextValue = {
  user: CorporateUser | null;
  organizations: CorporateMembership[];
  accessToken: string | null;
  isReady: boolean;
  isAuthenticated: boolean;
  establishSession: (session: {
    accessToken: string;
    user: CorporateUser;
    organizations?: CorporateMembership[];
  }) => void;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CorporateUser | null>(null);
  const [organizations, setOrganizations] = useState<CorporateMembership[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const hydrateFromStorage = useCallback(() => {
    setAccessToken(getAccessToken());
    setUser(getAuthUser());
  }, []);

  const establishSession = useCallback(
    (session: {
      accessToken: string;
      user: CorporateUser;
      organizations?: CorporateMembership[];
    }) => {
      persistAuthSession(session);
      setAccessToken(session.accessToken);
      setUser(session.user);
      if (session.organizations) setOrganizations(session.organizations);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutCorporate();
    } catch {
      // still clear local session
    }
    clearAuthSession();
    setAccessToken(null);
    setUser(null);
    setOrganizations([]);
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchCorporateMe();
    setUser(me.data.user);
    setOrganizations(me.data.organizations as CorporateMembership[]);
    persistAuthSession({
      accessToken: getAccessToken()!,
      user: me.data.user,
      organizations: me.data.organizations,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      hydrateFromStorage();

      if (hasPersistedAuthSession()) {
        try {
          const me = await fetchCorporateMe();
          if (cancelled) return;
          setUser(me.data.user);
          setOrganizations(me.data.organizations as CorporateMembership[]);
        } catch {
          const refreshed = await refreshAndApplySession();
          if (cancelled) return;
          if (refreshed) {
            setAccessToken(getAccessToken());
            try {
              const me = await fetchCorporateMe();
              if (cancelled) return;
              setUser(me.data.user);
              setOrganizations(me.data.organizations as CorporateMembership[]);
            } catch {
              clearAuthSession();
              if (!cancelled) {
                setAccessToken(null);
                setUser(null);
                setOrganizations([]);
              }
            }
          } else if (!cancelled) {
            setAccessToken(null);
            setUser(null);
            setOrganizations([]);
          }
        }
        if (!cancelled) setIsReady(true);
        return;
      }

      // Try cookie restore (refresh HttpOnly cookie)
      const restored = await refreshAndApplySession();
      if (!cancelled && restored) {
        setAccessToken(getAccessToken());
        try {
          const me = await fetchCorporateMe();
          if (!cancelled) {
            persistAuthSession({
              accessToken: getAccessToken()!,
              user: me.data.user,
              organizations: me.data.organizations,
            });
            setUser(me.data.user);
            setOrganizations(me.data.organizations as CorporateMembership[]);
          }
        } catch {
          clearAuthSession();
          if (!cancelled) {
            setAccessToken(null);
            setUser(null);
            setOrganizations([]);
          }
        }
      }

      if (!cancelled) setIsReady(true);
    }

    void boot();

    const onAuthChanged = () => hydrateFromStorage();
    const onSessionExpired = () => {
      setAccessToken(null);
      setUser(null);
      setOrganizations([]);
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, [hydrateFromStorage]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      organizations,
      accessToken,
      isReady,
      isAuthenticated: Boolean(accessToken && user),
      establishSession,
      logout,
      refreshMe,
    }),
    [user, organizations, accessToken, isReady, establishSession, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
