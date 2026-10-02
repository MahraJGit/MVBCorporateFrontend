import { assertApiConfigured } from "@/lib/env";
import { ApiError } from "./errors";
import {
  getAccessToken,
  hasPersistedAuthSession,
} from "@/features/auth/session-storage";
import { refreshAndApplySession } from "@/features/auth/coordinated-refresh";

export type ApiClientInit = RequestInit & {
  /** Skip 401 → refresh → retry (used by auth bootstrap endpoints). */
  skipAuthRetry?: boolean;
};

function unreachableApiError(): ApiError {
  return new ApiError(
    0,
    "Unable to reach the API. Check your connection, or wait a few minutes and try again.",
  );
}

function buildUrl(path: string): string {
  const baseUrl = assertApiConfigured();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${normalized}` : normalized;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, "Invalid response from server");
  }
}

function withAuthHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

function isRefreshPath(path: string): boolean {
  return path.includes("/api/corporate/auth/refresh");
}

function shouldRetryAfterUnauthorized(
  path: string,
  skipAuthRetry?: boolean,
): boolean {
  if (skipAuthRetry || isRefreshPath(path)) return false;
  return Boolean(getAccessToken() || hasPersistedAuthSession());
}

async function fetchOnce(
  path: string,
  init: RequestInit,
): Promise<{ res: Response; data: unknown }> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      credentials: "include",
      ...init,
      headers: withAuthHeaders(init),
    });
  } catch {
    throw unreachableApiError();
  }

  const data = await parseJson<unknown>(res);
  return { res, data };
}

async function requestJson<TResponse>(
  path: string,
  init: ApiClientInit,
): Promise<TResponse> {
  const { skipAuthRetry, ...requestInit } = init;
  const first = await fetchOnce(path, requestInit);
  if (first.res.ok) return first.data as TResponse;

  if (
    first.res.status === 401 &&
    shouldRetryAfterUnauthorized(path, skipAuthRetry)
  ) {
    const refreshed = await refreshAndApplySession();
    if (refreshed && getAccessToken()) {
      const second = await fetchOnce(path, requestInit);
      if (second.res.ok) return second.data as TResponse;
      throw ApiError.fromUnknown(second.res.status, second.data);
    }
  }

  throw ApiError.fromUnknown(first.res.status, first.data);
}

export async function apiGet<TResponse>(
  path: string,
  init?: Omit<ApiClientInit, "method" | "body">,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...init,
    method: "GET",
  });
}

export async function apiPost<TResponse, TBody extends object | FormData>(
  path: string,
  body: TBody,
  init?: Omit<ApiClientInit, "method" | "body">,
): Promise<TResponse> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = new Headers(init?.headers ?? undefined);
  if (!isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return requestJson<TResponse>(path, {
    ...init,
    method: "POST",
    headers,
    body: isForm ? (body as FormData) : JSON.stringify(body),
  });
}

export async function apiPatch<TResponse, TBody extends object>(
  path: string,
  body: TBody,
  init?: Omit<ApiClientInit, "method" | "body">,
): Promise<TResponse> {
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return requestJson<TResponse>(path, {
    ...init,
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiPut<TResponse, TBody extends object>(
  path: string,
  body: TBody,
  init?: Omit<ApiClientInit, "method" | "body">,
): Promise<TResponse> {
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return requestJson<TResponse>(path, {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiDelete<TResponse>(
  path: string,
  init?: Omit<ApiClientInit, "method" | "body">,
): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    ...init,
    method: "DELETE",
  });
}
