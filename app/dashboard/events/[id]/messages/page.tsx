"use client";

import { EventVendorChat } from "@/components/events/event-vendor-chat";
import { t } from "@/lib/i18n";
import { useParams } from "next/navigation";

export default function EventMessagesPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("events.chatTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("events.chatHint")}</p>
      </div>
      <EventVendorChat eventId={params.id} />
    </div>
  );
}
