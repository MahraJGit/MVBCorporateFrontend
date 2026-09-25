"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowLeft, CreditCard, Inbox, LayoutList, Lock, MessageCircle } from "lucide-react";
import { getEvent, canAccessEventVendorChat, eventHasVendorChat, getEventChatUnreadCount } from "@/features/events/api";
import type { CorporateEvent } from "@/features/events/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth-context";

export function EventHubNav() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { user, organizations } = useAuth();
  const [event, setEvent] = useState<CorporateEvent | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getEvent(params.id)
      .then((res) => {
        if (!cancelled) setEvent(res.data);
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, pathname]);

  const role = organizations[0]?.role;
  const canChat = event
    ? canAccessEventVendorChat(event, user?.id, role)
    : false;
  const showChat = Boolean(event && canChat && eventHasVendorChat(event));

  useEffect(() => {
    if (!showChat) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    void getEventChatUnreadCount(params.id)
      .then((res) => {
        if (!cancelled) setUnread(res.data.count);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, pathname, showChat]);

  const base = `/dashboard/events/${params.id}`;
  const approved = event?.status === "APPROVED";
  const requested = (event?.eventServices ?? []).filter(
    (row) => row.bookingStatus === "REQUESTED",
  ).length;
  const awaitingPay = event?.paymentStatus === "AWAITING_PAYMENT";

  const tabs = [
    {
      href: base,
      label: t("events.hubOverview"),
      icon: LayoutList,
      exact: true,
      show: true,
    },
    {
      href: `${base}/reserve`,
      label: t("events.hubReserve"),
      icon: Lock,
      exact: false,
      show: approved,
    },
    {
      href: `${base}/requests`,
      label: t("events.hubRequests"),
      icon: Inbox,
      exact: false,
      show: approved,
      badge: requested,
    },
    {
      href: `${base}/pay`,
      label: t("events.hubPay"),
      icon: CreditCard,
      exact: false,
      show: approved,
      badge: awaitingPay ? 1 : 0,
    },
    {
      href: `${base}/messages`,
      label: t("events.hubMessages"),
      icon: MessageCircle,
      exact: false,
      show: showChat,
      badge: unread,
    },
  ].filter((tab) => tab.show);

  return (
    <div className="mx-auto mb-6 max-w-5xl space-y-3">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("events.backToEvents")}
      </Link>
      {tabs.length > 1 ? (
        <nav className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          {tabs.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.badge ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px text-[10px] font-semibold",
                      active
                        ? "bg-primary-foreground/20"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
