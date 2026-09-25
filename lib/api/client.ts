import { assertApiConfigured } from "@/lib/env";
import { ApiError } from "./errors";
import { getAccessToken } from "@/features/auth/session-storage";

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

export async function apiGet<TResponse>(
  path: string,
  init?: Omit<RequestInit, "method">,
): Promise<TResponse> {
  const headers = withAuthHeaders(init);
  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: "GET",
      credentials: "include",
      ...init,
      headers,
    });
  } catch {
    throw unreachableApiError();
  }

  const data = await parseJson<unknown>(res);
  if (!res.ok) throw ApiError.fromUnknown(res.status, data);
  return data as TResponse;
}

export async function apiPost<TResponse, TBody extends object | FormData>(
  path: string,
  body: TBody,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<TResponse> {
  const headers = withAuthHeaders(init);
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: "POST",
      credentials: "include",
      ...init,
      headers,
      body: isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw unreachableApiError();
  }

  const data = await parseJson<unknown>(res);
  if (!res.ok) throw ApiError.fromUnknown(res.status, data);
  return data as TResponse;
}

export async function apiPatch<TResponse, TBody extends object>(
  path: string,
  body: TBody,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<TResponse> {
  const headers = withAuthHeaders(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: "PATCH",
      credentials: "include",
      ...init,
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw unreachableApiError();
  }

  const data = await parseJson<unknown>(res);
  if (!res.ok) throw ApiError.fromUnknown(res.status, data);
  return data as TResponse;
}

export async function apiPut<TResponse, TBody extends object>(
  path: string,
  body: TBody,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<TResponse> {
  const headers = withAuthHeaders(init);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: "PUT",
      credentials: "include",
      ...init,
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw unreachableApiError();
  }

  const data = await parseJson<unknown>(res);
  if (!res.ok) throw ApiError.fromUnknown(res.status, data);
  return data as TResponse;
}

export async function apiDelete<TResponse>(
  path: string,
  init?: Omit<RequestInit, "method" | "body">,
): Promise<TResponse> {
  const headers = withAuthHeaders(init);
  let res: Response;
  try {
    res = await fetch(buildUrl(path), {
      method: "DELETE",
      credentials: "include",
      ...init,
      headers,
    });
  } catch {
    throw unreachableApiError();
  }

  const data = await parseJson<unknown>(res);
  if (!res.ok) throw ApiError.fromUnknown(res.status, data);
  return data as TResponse;
}
