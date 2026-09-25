"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Store, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { formatMoney } from "@/features/budget/api";
import {
  acceptEventProposal,
  declineEventProposal,
  listEventRequests,
} from "@/features/events/api";
import type { EventRequestLine, EventRequestsResponse } from "@/features/events/types";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function EventRequestsPage() {
  const params = useParams<{ id: string }>();
  const { organizations } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const [payload, setPayload] = useState<EventRequestsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await listEventRequests(params.id);
    setPayload(res.data);
  }, [params.id]);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("events.requestsLoadError")))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("events.loading")}
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-medium">{t("events.notFound")}</p>
      </div>
    );
  }

  const canAct = payload.canAct;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("events.requestsTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {payload.title} · {t("events.requestsHint")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label={t("events.requestsWaiting")} value={payload.summary.waiting} />
          <Stat label={t("events.requestsQuotes")} value={payload.summary.quotes} accent />
          <Stat label={t("events.requestsAccepted")} value={payload.summary.accepted} />
        </div>
      </div>

      {payload.lines.length ? (
        <ul className="space-y-3">
          {payload.lines.map((line) => (
            <RequestCard
              key={line.lineId}
              line={line}
              currency={payload.currency}
              allocatedAmount={payload.allocatedAmount}
              canAct={canAct}
              busy={busyId === line.activeProposal?.id}
              eventId={payload.eventId}
              onAccept={async (proposalId) => {
                setBusyId(proposalId);
                try {
                  const res = await acceptEventProposal(params.id, proposalId);
                  toast.success(res.message);
                  await refresh();
                } catch (err) {
                  toastApiError(err, t("events.acceptProposalError"));
                } finally {
                  setBusyId(null);
                }
              }}
              onDecline={async (proposalId) => {
                const reason = window.prompt(t("events.declineReasonPrompt"));
                if (reason === null) return;
                setBusyId(proposalId);
                try {
                  const res = await declineEventProposal(
                    params.id,
                    proposalId,
                    reason.trim() || undefined,
                  );
                  toast.success(res.message);
                  await refresh();
                } catch (err) {
                  toastApiError(err, t("events.declineProposalError"));
                } finally {
                  setBusyId(null);
                }
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t("events.noRequests")}
          <Link
            href={`/dashboard/events/${payload.eventId}/reserve`}
            className="mt-2 block text-primary hover:underline"
          >
            {t("events.goToReserve")}
          </Link>
        </p>
      )}

      {!canAct && role !== "FINANCE_APPROVER" ? (
        <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t("events.requestsNoPermission")}
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold", accent && value > 0 && "text-sky-600")}>
        {value}
      </p>
    </div>
  );
}

function RequestCard({
  line,
  currency,
  allocatedAmount,
  canAct,
  busy,
  eventId,
  onAccept,
  onDecline,
}: {
  line: EventRequestLine;
  currency: string;
  allocatedAmount: number;
  canAct: boolean;
  busy: boolean;
  eventId: string;
  onAccept: (proposalId: string) => void;
  onDecline: (proposalId: string) => void;
}) {
  const quote = line.activeProposal;
  const swapHref = `/dashboard/marketplace?eventId=${encodeURIComponent(eventId)}&replaceLineId=${encodeURIComponent(line.lineId)}`;

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Store className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{line.serviceName}</p>
            <p className="text-xs text-muted-foreground">
              {t("events.resourceService")}
              {line.estimatedCost != null
                ? ` · ${t("events.estimateLabel")} ${formatMoney(line.estimatedCost, currency)}`
                : ""}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            quote?.status === "SENT"
              ? "bg-sky-500/10 text-sky-600"
              : quote?.status === "ACCEPTED"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground",
          )}
        >
          {quote?.status === "SENT"
            ? t("events.quoteReceived")
            : quote?.status === "ACCEPTED"
              ? t("events.quoteAccepted")
              : t("events.waitingOnVendor")}
        </span>
      </div>

      {quote ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm">
            <span className="font-medium">{quote.vendorName}</span>
            <span className="text-muted-foreground">
              {" "}
              · {t("events.proposalVersion", { version: String(quote.version) })}
            </span>
          </p>
          <p className="text-lg font-semibold">
            {formatMoney(quote.totalAmount, quote.currency)}
          </p>
          {quote.exceedsEstimate || quote.totalAmount > allocatedAmount + 1e-9 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              {quote.totalAmount > allocatedAmount + 1e-9
                ? t("events.quoteExceedsAllocation")
                : t("events.quoteExceedsEstimate")}
            </p>
          ) : null}
          {quote.notes ? (
            <p className="whitespace-pre-line text-xs text-muted-foreground">{quote.notes}</p>
          ) : null}
          {quote.lines.length ? (
            <ul className="space-y-1 text-xs">
              {quote.lines.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {row.label}
                    {row.quantity !== 1 ? ` × ${row.quantity}` : ""}
                  </span>
                  <span>{formatMoney(row.amount, quote.currency)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {quote.status === "SENT" && canAct ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => onAccept(quote.id)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t("events.acceptQuote")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onDecline(quote.id)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                {t("events.declineQuote")}
              </button>
            </div>
          ) : quote.status === "ACCEPTED" ? (
            <p className="text-xs text-muted-foreground">{t("events.quoteHeldHint")}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-xs text-sky-700 dark:text-sky-400">
          {t("events.waitingVendorHint")}
        </p>
      )}

      {canAct ? (
        <Link
          href={swapHref}
          className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
        >
          {t("events.changeService")}
        </Link>
      ) : null}
    </li>
  );
}
