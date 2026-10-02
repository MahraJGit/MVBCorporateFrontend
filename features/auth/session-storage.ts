import type { CorporateUser } from "./types";

const ACCESS = "mvb_corporate_access_token";
const USER = "mvb_corporate_user_json";
const ORGS = "mvb_corporate_orgs_json";

export const AUTH_CHANGED_EVENT = "mvb-corporate-auth-changed";
export const AUTH_SESSION_EXPIRED_EVENT = "mvb-corporate-auth-session-expired";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function notifyAuthSessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

export function persistAuthSession(session: {
  accessToken: string;
  user: CorporateUser;
  organizations?: unknown;
}) {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS, session.accessToken);
  s.setItem(USER, JSON.stringify(session.user));
  if (session.organizations) {
    s.setItem(ORGS, JSON.stringify(session.organizations));
  }
  notifyAuthChanged();
}

export function clearAuthSession() {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS);
  s.removeItem(USER);
  s.removeItem(ORGS);
  notifyAuthChanged();
}

export function getAccessToken(): string | null {
  return storage()?.getItem(ACCESS) ?? null;
}

export function getAuthUser(): CorporateUser | null {
  const raw = storage()?.getItem(USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CorporateUser;
  } catch {
    return null;
  }
}

export function updateAccessToken(accessToken: string) {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS, accessToken);
  notifyAuthChanged();
}

export function hasPersistedAuthSession(): boolean {
  return Boolean(getAccessToken() && getAuthUser());
}
