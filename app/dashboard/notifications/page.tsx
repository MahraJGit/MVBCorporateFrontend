"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listCorporateNotifications,
  markAllCorporateNotificationsRead,
  markCorporateNotificationRead,
  notificationHref,
  type CorporateNotification,
} from "@/features/notifications/api";
import { useLocale } from "@/features/i18n/locale-context";
import { toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { NOTIFICATIONS_CHANGED } from "@/features/notifications/use-unread";

type Filter = "all" | "unread";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function relativeTime(
  iso: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return t("notifications.justNow");
  if (mins < 60) return t("notifications.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("notifications.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("notifications.daysAgo", { count: days });
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function groupLabel(
  iso: string,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  if (day === today) return t("notifications.groupToday");
  if (day === today - 86400000) return t("notifications.groupYesterday");
  return t("notifications.groupEarlier");
}

export default function NotificationsPage() {
  const { t, locale } = useLocale();
  const [items, setItems] = useState<CorporateNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

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
  }, [refresh, t]);

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((i) => !i.readAt) : items),
    [filter, items],
  );

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, CorporateNotification[]>();
    for (const item of visible) {
      const label = groupLabel(item.createdAt, t);
      if (!map.has(label)) {
        map.set(label, []);
        order.push(label);
      }
      map.get(label)!.push(item);
    }
    return order.map((label) => ({ label, items: map.get(label)! }));
  }, [visible, t]);

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

  const markOne = async (id: string) => {
    try {
      await markCorporateNotificationRead(id);
      await refresh();
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
    } catch (err) {
      toastApiError(err, t("notifications.markReadError"));
    }
  };

  return (
    <div key={locale} className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("notifications.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("notifications.description")}
          </p>
        </div>
        {unread > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void markAll()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
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

      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "transition-colors",
            filter === "all"
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("notifications.filterAll")}
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={cn(
            "transition-colors",
            filter === "unread"
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("notifications.filterUnread")}
          {unread > 0 ? (
            <span className="ms-1.5 text-muted-foreground">({unread})</span>
          ) : null}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("notifications.loading")}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Bell className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">
            {filter === "unread"
              ? t("notifications.emptyFiltered")
              : t("notifications.empty")}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {filter === "unread"
              ? t("notifications.emptyFilteredDesc")
              : t("notifications.emptyDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {group.label}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {group.items.map((item) => {
                  const href = notificationHref(item.link);
                  const unreadItem = !item.readAt;
                  const body = (
                    <div className="flex gap-3 px-4 py-4 sm:px-5">
                      <div
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          unreadItem ? "bg-primary" : "bg-transparent",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={cn(
                              "text-sm leading-snug",
                              unreadItem
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground",
                            )}
                          >
                            {item.title}
                          </p>
                          <time
                            className="shrink-0 text-xs text-muted-foreground"
                            dateTime={item.createdAt}
                            title={new Date(item.createdAt).toLocaleString()}
                          >
                            {relativeTime(item.createdAt, t)}
                          </time>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  );

                  return (
                    <li
                      key={item.id}
                      className={cn(unreadItem && "bg-primary/[0.03]")}
                    >
                      {href ? (
                        <Link
                          href={href}
                          onClick={() => {
                            if (unreadItem) void markOne(item.id);
                          }}
                          className="block transition-colors hover:bg-muted/40"
                        >
                          {body}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="block w-full text-start transition-colors hover:bg-muted/40"
                          onClick={() => {
                            if (unreadItem) void markOne(item.id);
                          }}
                        >
                          {body}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
