"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listCorporateNotifications,
  markAllCorporateNotificationsRead,
  markCorporateNotificationRead,
  notificationHref,
  type CorporateNotification,
} from "@/features/notifications/api";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { NOTIFICATIONS_CHANGED } from "@/features/notifications/use-unread";

export default function NotificationsPage() {
  const [items, setItems] = useState<CorporateNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await listCorporateNotifications();
    setItems(res.data);
    setUnread(res.meta.unreadCount);
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("notifications.loadError")))
      .finally(() => setLoading(false));
  }, [refresh]);

  const markAll = async () => {
    setBusy(true);
    try {
      await markAllCorporateNotificationsRead();
      toast.success(t("notifications.markedAllRead"));
      await refresh();
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch (err) {
      toastApiError(err, t("notifications.markReadError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("notifications.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("notifications.description")}
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void markAll()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            {t("notifications.markAllRead")}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("notifications.loading")}
        </p>
      ) : items.length ? (
        <ul className="space-y-2">
          {items.map((item) => {
            const href = notificationHref(item.link);
            const unreadItem = !item.readAt;
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{item.title}</p>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </>
            );
            const className = cn(
              "block rounded-2xl border px-4 py-3",
              unreadItem
                ? "border-primary/25 bg-primary/5"
                : "border-border bg-card",
            );
            return (
              <li key={item.id}>
                {href ? (
                  <Link
                    href={href}
                    onClick={() => {
                      if (unreadItem) {
                        void markCorporateNotificationRead(item.id).then(() => {
                          void refresh();
                          window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
                        });
                      }
                    }}
                    className={cn(className, "hover:border-primary/40")}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={className}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-16 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 font-medium">{t("notifications.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("notifications.emptyDesc")}
          </p>
        </div>
      )}
    </div>
  );
}
