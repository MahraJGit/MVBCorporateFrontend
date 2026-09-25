function isPrivateS3Url(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes(".s3.") && host.endsWith(".amazonaws.com");
  } catch {
    return false;
  }
}

/** Same-origin proxy — works with corporate Next rewrite to the API. */
export function getMediaProxyUrl(storedUrl: string): string {
  const trimmed = storedUrl.trim();
  if (!trimmed) return "";
  if (!isPrivateS3Url(trimmed)) return trimmed;
  return `/api/media?url=${encodeURIComponent(trimmed)}`;
}
