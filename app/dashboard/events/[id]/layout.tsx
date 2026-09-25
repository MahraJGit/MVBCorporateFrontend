"use client";

import { EventHubNav } from "@/components/events/event-hub-nav";

export default function EventHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EventHubNav />
      {children}
    </>
  );
}
