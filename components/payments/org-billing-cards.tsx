"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddCompanyCardForm } from "@/components/payments/add-company-card-form";
import {
  deleteOrgPaymentMethod,
  listOrgPaymentMethods,
  setDefaultOrgPaymentMethod,
} from "@/features/billing/api";
import type { OrgPaymentMethod } from "@/features/events/types";
import { ApiError, toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { getStripePublishableKey } from "@/lib/stripe";

export function OrgBillingCards({
  canManage,
}: {
  canManage: boolean;
}) {
  const [methods, setMethods] = useState<OrgPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const stripeReady = Boolean(getStripePublishableKey());

  const refresh = useCallback(async () => {
    const res = await listOrgPaymentMethods();
    setMethods(res.data);
  }, []);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void refresh()
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 403) return;
        toastApiError(err, t("events.cardsLoadError"));
      })
      .finally(() => setLoading(false));
  }, [canManage, refresh]);

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">{t("events.cardsNoPermission")}</p>
    );
  }

  if (!stripeReady) {
    return (
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        {t("events.stripeNotConfigured")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("events.loading")}
        </p>
      ) : methods.length ? (
        <ul className="space-y-2">
          {methods.map((method) => (
            <li
              key={method.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{method.brand ?? "Card"}</span>
                <span className="font-medium">•••• {method.last4}</span>
                <span className="text-xs text-muted-foreground">
                  {String(method.expMonth).padStart(2, "0")}/{method.expYear}
                </span>
                {method.isDefault ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {t("events.cardDefault")}
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                {!method.isDefault ? (
                  <button
                    type="button"
                    disabled={busyId === method.id}
                    onClick={async () => {
                      setBusyId(method.id);
                      try {
                        const res = await setDefaultOrgPaymentMethod(method.id);
                        setMethods(res.data);
                        toast.success(t("events.cardDefaultSet"));
                      } catch (err) {
                        toastApiError(err, t("events.cardUpdateError"));
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {t("events.cardMakeDefault")}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === method.id}
                  onClick={async () => {
                    if (!window.confirm(t("events.cardRemoveConfirm"))) return;
                    setBusyId(method.id);
                    try {
                      const res = await deleteOrgPaymentMethod(method.id);
                      setMethods(res.data);
                      toast.success(t("events.cardRemoved"));
                    } catch (err) {
                      toastApiError(err, t("events.cardUpdateError"));
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                  aria-label={t("events.cardRemove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {t("events.noCards")}
        </p>
      )}

      {adding ? (
        <div className="rounded-xl border border-border p-4">
          <AddCompanyCardForm
            onSuccess={() => {
              setAdding(false);
              void refresh();
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent"
        >
          {t("events.addCard")}
        </button>
      )}
    </div>
  );
}
