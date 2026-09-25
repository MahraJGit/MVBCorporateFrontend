"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, Plus, XCircle } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { formatMoney } from "@/features/budget/api";
import { eventStatusLabel, listEvents } from "@/features/events/api";
import type { CorporateEvent, CorporateEventStatus } from "@/features/events/types";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CREATE_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

function statusClass(status: CorporateEventStatus) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-500/10 text-emerald-600";
    case "PENDING_APPROVAL":
      return "bg-amber-500/10 text-amber-600";
    case "REJECTED":
    case "CANCELLED":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default function EventsPage() {
  const { organizations } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const canCreate = CREATE_ROLES.has(role);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CorporateEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<CorporateEventStatus | "ALL">("ALL");

  const refresh = useCallback(async () => {
    const res = await listEvents({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      limit: 50,
    });
    setItems(res.data);
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("events.loadError")))
      .finally(() => setLoading(false));
  }, [refresh]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("events.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("events.description")}</p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/events/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t("events.newEvent")}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            "ALL",
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "REJECTED",
            "CANCELLED",
          ] as const
        ).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              statusFilter === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {value === "ALL" ? t("events.filterAll") : eventStatusLabel(value)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("events.loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <CalendarDays className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{t("events.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("events.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/events/${item.id}`}
              className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        statusClass(item.status),
                      )}
                    >
                      {eventStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMoney(item.allocatedAmount, item.currency)}
                    {item.budgetCategory?.name ? ` · ${item.budgetCategory.name}` : ""}
                    {item.fiscalBudget ? ` · FY ${item.fiscalBudget.fiscalYear}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("events.requestedBy", {
                      name: `${item.createdBy.firstName} ${item.createdBy.lastName}`,
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {item.financeApprovedAt ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                    {t("events.finance")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {item.managementApprovedAt ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                    )}
                    {t("events.management")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
