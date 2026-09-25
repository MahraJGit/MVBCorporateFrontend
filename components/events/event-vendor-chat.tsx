"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MessageCircle, Send } from "lucide-react";
import {
  listEventChatMessages,
  listEventChats,
  markEventChatRead,
  sendEventChatMessage,
} from "@/features/events/api";
import type { EventChatConversation, EventChatMessage } from "@/features/events/types";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function displayName(first: string, last: string) {
  return `${first} ${last}`.trim();
}

function conversationLabel(conversation: EventChatConversation) {
  return conversation.resourceName || conversation.title;
}

export function EventVendorChat({ eventId }: { eventId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("c");
  const [conversations, setConversations] = useState<EventChatConversation[]>([]);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EventChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((item) => item.id === selectedId) ?? null;

  const refreshList = useCallback(async () => {
    const res = await listEventChats(eventId);
    setConversations(res.data.items);
    setViewerUserId(res.data.viewerUserId);
    return res.data;
  }, [eventId]);

  const refreshMessages = useCallback(
    async (conversationId: string) => {
      const res = await listEventChatMessages(eventId, conversationId);
      setMessages(res.data.items);
      await markEventChatRead(eventId, conversationId).catch(() => undefined);
    },
    [eventId],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    void refreshList()
      .then((data) => {
        if (cancelled) return;
        const current = new URLSearchParams(window.location.search).get("c");
        if (!current && data.items[0]) {
          router.replace(
            `/dashboard/events/${eventId}/messages?c=${data.items[0].id}`,
            { scroll: false },
          );
        }
      })
      .catch((err) => {
        if (!cancelled) toastApiError(err, t("events.chatLoadError"));
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, refreshList, router]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    void refreshMessages(selectedId)
      .catch((err) => {
        if (!cancelled) toastApiError(err, t("events.chatMessagesError"));
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshMessages, selectedId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshList().catch(() => undefined);
      if (selectedId) {
        void refreshMessages(selectedId).catch(() => undefined);
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [refreshList, refreshMessages, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedId]);

  const selectConversation = (id: string) => {
    router.replace(`/dashboard/events/${eventId}/messages?c=${id}`, { scroll: false });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!selectedId || !content || sending) return;
    setSending(true);
    try {
      const res = await sendEventChatMessage(eventId, selectedId, content);
      setDraft("");
      setMessages((current) => [...current, res.data]);
      await refreshList().catch(() => undefined);
    } catch (err) {
      toastApiError(err, t("events.chatSendError"));
    } finally {
      setSending(false);
    }
  };

  const people = useMemo(() => {
    if (!selected) return [];
    return selected.participants.filter((p) => p.kind !== "billing");
  }, [selected]);

  return (
    <div className="grid h-[min(70vh,calc(100dvh-11rem))] min-h-[420px] gap-4 overflow-hidden md:grid-cols-[280px_1fr]">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="shrink-0 border-b border-border p-4">
          <h2 className="text-sm font-semibold">{t("events.chatInbox")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("events.chatInboxHint")}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingList ? (
            <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("events.loading")}
            </p>
          ) : conversations.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("events.chatEmpty")}</p>
          ) : (
            conversations.map((conversation) => {
              const active = conversation.id === selectedId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left hover:bg-accent",
                    active && "bg-accent",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {conversationLabel(conversation)}
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
                        {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {conversation.lineType === "VENUE"
                      ? t("events.chatVenue")
                      : t("events.chatService")}
                  </span>
                  {conversation.lastMessage ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {conversation.lastMessage.content}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
        {!selectedId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 opacity-40" />
            <p>{t("events.chatSelect")}</p>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b border-border p-4">
              <h3 className="font-semibold">
                {selected ? conversationLabel(selected) : t("events.chatThread")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {people
                  .map((p) =>
                    p.kind === "vendor"
                      ? t("events.chatVendorName", {
                          name: displayName(p.user.firstName, p.user.lastName),
                        })
                      : displayName(p.user.firstName, p.user.lastName),
                  )
                  .join(" · ")}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {loadingMessages ? (
                <p className="flex justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </p>
              ) : messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("events.chatNoMessages")}
                </p>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderId === viewerUserId;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                        )}
                      >
                        <p className="mb-1 text-xs font-medium opacity-80">
                          {displayName(message.sender.firstName, message.sender.lastName)}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <p className="mt-1 text-[10px] opacity-70">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={(e) => void send(e)} className="flex shrink-0 gap-2 border-t border-border p-4">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("events.chatPlaceholder")}
                maxLength={2000}
                disabled={sending || loadingMessages}
                className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending || loadingMessages}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
