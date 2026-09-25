"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { listCorporateNotifications } from "@/features/notifications/api";

export const NOTIFICATIONS_CHANGED = "corporate-notifications-changed";

export function useNotificationUnread(pollMs = 30000) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const res = await listCorporateNotifications();
    setUnread(res.meta.unreadCount);
    return res.meta.unreadCount;
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const timer = setInterval(() => {
      void refresh().catch(() => undefined);
    }, pollMs);
    const onChanged = () => {
      void refresh().catch(() => undefined);
    };
    window.addEventListener(NOTIFICATIONS_CHANGED, onChanged);
    return () => {
      clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChanged);
    };
  }, [pollMs, refresh, pathname]);

  return { unread, refresh };
}

