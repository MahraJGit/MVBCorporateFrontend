import { apiGet, apiPost } from "@/lib/api/client";

export type CorporateNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  eventId: string | null;
  readAt: string | null;
  createdAt: string;
};

export function listCorporateNotifications() {
  return apiGet<{
    success: true;
    data: CorporateNotification[];
    meta: { unreadCount: number };
  }>("/api/corporate/notifications");
}

export function markCorporateNotificationRead(id: string) {
  return apiPost<{ success: true; message: string }, Record<string, never>>(
    `/api/corporate/notifications/${encodeURIComponent(id)}/read`,
    {},
  );
}

export function markAllCorporateNotificationsRead() {
  return apiPost<{ success: true; message: string }, Record<string, never>>(
    "/api/corporate/notifications/read-all",
    {},
  );
}

export function notificationHref(link: string | null) {
  if (!link) return null;
  try {
    if (link.startsWith("/")) return link;
    const url = new URL(link);
    return `${url.pathname}${url.search}`;
  } catch {
    return link;
  }
}
