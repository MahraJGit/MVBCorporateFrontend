"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { formatMoney } from "@/features/budget/api";
import {
  approveEventFinance,
  approveEventManagement,
  eventStatusLabel,
  listPendingEventApprovals,
  rejectEvent,
} from "@/features/events/api";
import type { CorporateEvent } from "@/features/events/types";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";

export default function ApprovalsPage() {
  const { organizations } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CorporateEvent[]>([]);
  const [meta, setMeta] = useState({
    pendingCount: 0,
    canApproveFinance: false,
    canApproveManagement: false,
    canReject: false,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    const res = await listPendingEventApprovals();
    setItems(res.data);
    setMeta(res.meta);
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("approvals.loadError")))
      .finally(() => setLoading(false));
  }, [refresh]);

  const canAct =
    meta.canApproveFinance || meta.canApproveManagement || meta.canReject;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("approvals.loading")}
      </div>
    );
  }

  if (!canAct) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <CheckSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">{t("approvals.title")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("approvals.noPermission", { role })}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("approvals.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("approvals.descriptionEvents")}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <CheckSquare className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{t("approvals.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("approvals.emptyDescEvents")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div>
                <Link
                  href={`/dashboard/events/${item.id}`}
                  className="font-semibold hover:text-primary hover:underline"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMoney(item.allocatedAmount, item.currency)}
                  {item.budgetCategory?.name ? ` · ${item.budgetCategory.name}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {eventStatusLabel(item.status)} · {item.createdBy.firstName}{" "}
                  {item.createdBy.lastName}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {meta.canApproveFinance && !item.financeApprovedAt ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={async () => {
                      setBusyId(item.id);
                      try {
                        const res = await approveEventFinance(item.id);
                        toast.success(res.message);
                        await refresh();
                      } catch (err) {
                        toastApiError(err, t("approvals.actionError"));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {t("approvals.approveFinance")}
                  </button>
                ) : null}
                {meta.canApproveManagement && !item.managementApprovedAt ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={async () => {
                      setBusyId(item.id);
                      try {
                        const res = await approveEventManagement(item.id);
                        toast.success(res.message);
                        await refresh();
                      } catch (err) {
                        toastApiError(err, t("approvals.actionError"));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {t("approvals.approveManagement")}
                  </button>
                ) : null}
                {meta.canReject ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => {
                      setRejectId(item.id);
                      setReason("");
                    }}
                    className="inline-flex h-9 items-center rounded-lg border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive/5"
                  >
                    {t("approvals.reject")}
                  </button>
                ) : null}
              </div>

              {rejectId === item.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder={t("approvals.rejectPlaceholder")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={busyId === item.id || reason.trim().length < 3}
                    onClick={async () => {
                      setBusyId(item.id);
                      try {
                        const res = await rejectEvent(item.id, reason.trim());
                        toast.success(res.message);
                        setRejectId(null);
                        await refresh();
                      } catch (err) {
                        toastApiError(err, t("approvals.actionError"));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex h-9 items-center rounded-lg bg-destructive px-3 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {t("approvals.confirmReject")}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
