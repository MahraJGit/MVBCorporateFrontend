/**
 * Browser API base. Prefer empty (same-origin via Next rewrite) so HttpOnly
 * refresh cookies work securely like the main venue frontend.
 * Optionally set NEXT_PUBLIC_API_BASE_URL to hit the API directly.
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : "";
}

export function assertApiConfigured(): string {
  return getPublicApiBaseUrl();
}
