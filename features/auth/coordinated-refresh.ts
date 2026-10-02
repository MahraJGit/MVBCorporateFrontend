import { assertApiConfigured } from "@/lib/env";
import { ApiError } from "@/lib/api/errors";
import type { RefreshTokensResponse } from "./types";
import {
  clearAuthSession,
  getAccessToken,
  hasPersistedAuthSession,
  notifyAuthSessionExpired,
  updateAccessToken,
} from "./session-storage";

const REFRESH_LOCK = "mvb-corporate-auth-refresh";
const REFRESH_PATH = "/api/corporate/auth/refresh";

/** Thrown for non-auth failures so callers can avoid logging the user out. */
export class TransientRefreshError extends Error {
  constructor(message = "Token refresh temporarily unavailable") {
    super(message);
    this.name = "TransientRefreshError";
  }
}

let inTabRefresh: Promise<RefreshTokensResponse | null> | null = null;

function isDefinitiveAuthFailure(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}

async function postRefresh(): Promise<RefreshTokensResponse> {
  const baseUrl = assertApiConfigured();
  const url = `${baseUrl}${REFRESH_PATH}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  } catch {
    throw new ApiError(
      0,
      "Unable to reach the API. Check your connection, or wait a few minutes and try again.",
    );
  }

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(res.status, "Invalid response from server");
    }
  }

  if (!res.ok) throw ApiError.fromUnknown(res.status, data);
  return data as RefreshTokensResponse;
}

async function runRefresh(): Promise<RefreshTokensResponse | null> {
  const request = async () => {
    try {
      return await postRefresh();
    } catch (error) {
      if (isDefinitiveAuthFailure(error)) {
        return null;
      }
      throw new TransientRefreshError(
        error instanceof Error ? error.message : "Token refresh failed",
      );
    }
  };

  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK, request);
  }
  return request();
}

/**
 * Single-flight refresh across concurrent callers in this tab, and across tabs
 * when Web Locks are available. Returns null only on definitive auth failure (401).
 * Throws TransientRefreshError for network / rate-limit / 5xx issues.
 */
export async function coordinatedRefreshTokens(): Promise<RefreshTokensResponse | null> {
  if (!inTabRefresh) {
    inTabRefresh = runRefresh().finally(() => {
      inTabRefresh = null;
    });
  }
  return inTabRefresh;
}

function expireSession(): false {
  clearAuthSession();
  notifyAuthSessionExpired();
  return false;
}

/**
 * Refresh access token via HttpOnly cookie.
 * - Returns true when a usable access token is available afterwards.
 * - Clears the session only on definitive auth failure (invalid/expired refresh).
 * - Leaves the session intact on transient failures (network, 429, 5xx).
 */
export async function refreshAndApplySession(): Promise<boolean> {
  try {
    const data = await coordinatedRefreshTokens();
    if (!data?.accessToken) {
      return expireSession();
    }
    updateAccessToken(data.accessToken);
    return true;
  } catch (error) {
    if (error instanceof TransientRefreshError) {
      return Boolean(getAccessToken()) || hasPersistedAuthSession();
    }
    return expireSession();
  }
}
