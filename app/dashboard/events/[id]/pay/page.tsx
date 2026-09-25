"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AddCompanyCardForm } from "@/components/payments/add-company-card-form";
import { useAuth } from "@/features/auth/auth-context";
import { formatMoney } from "@/features/budget/api";
import { completeEventPayment, payEventBookings, previewEventBookings } from "@/features/events/api";
import type {
  EventBookingPreview,
  EventPayResponse,
  EventPaymentCurrencyGroup,
  OrgPaymentMethod,
} from "@/features/events/types";
import { listOrgPaymentMethods } from "@/features/billing/api";
import { ApiError, toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { confirmCardPaymentIfNeeded, getStripePublishableKey } from "@/lib/stripe";
import { can } from "@/features/team/permissions";
import { cn } from "@/lib/utils";

function isActionPayload(
  data: EventPayResponse["data"],
): data is {
  clientSecret: string;
  paymentIntentId: string;
  amountDue: number;
  currency: string;
  remainingCurrencies: number;
  chargeIndex?: number;
  chargeTotal?: number;
  currencyGroups?: EventPaymentCurrencyGroup[];
  exceedsAllocation?: boolean;
  allocationComparable?: boolean;
  mixedCurrency?: boolean;
} {
  return Boolean(data && typeof data === "object" && "clientSecret" in data);
}

function cardLabel(method: OrgPaymentMethod) {
  const brand = (method.brand ?? "Card").replace(/_/g, " ");
  return `${brand} •••• ${method.last4}`;
}

function buildCurrencyGroups(
  payment: EventBookingPreview["payment"],
): EventPaymentCurrencyGroup[] {
  if (!payment) return [];
  if (payment.currencyGroups?.length) {
    return payment.currencyGroups.map((group) => ({
      ...group,
      items:
        group.items ??
        payment.items?.filter((item) => item.currency === group.currency) ??
        [],
    }));
  }
  const items = payment.items ?? [];
  const codes = [...new Set(items.map((item) => item.currency))];
  return codes.map((currency) => {
    const groupItems = items.filter((item) => item.currency === currency);
    return {
      currency,
      amountDue: groupItems.reduce((sum, item) => sum + item.amount, 0),
      itemCount: groupItems.length,
      items: groupItems,
    };
  });
}

export default function EventPayPage() {
  const params = useParams<{ id: string }>();
  const { organizations } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const canPay = can(role, "payBookings");

  const [preview, setPreview] = useState<EventBookingPreview | null>(null);
  const [methods, setMethods] = useState<OrgPaymentMethod[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [addingCard, setAddingCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [chargeProgress, setChargeProgress] = useState<{
    index: number;
    total: number;
    currency: string;
  } | null>(null);

  const refreshPreview = useCallback(async () => {
    const res = await previewEventBookings(params.id, []);
    setPreview(res.data);
  }, [params.id]);

  const refreshCards = useCallback(async () => {
    if (!canPay) {
      setMethods([]);
      setMethodId("");
      return;
    }
    try {
      const cards = await listOrgPaymentMethods();
      setMethods(cards.data);
      setMethodId((current) => {
        if (current && cards.data.some((m) => m.stripePaymentMethodId === current)) {
          return current;
        }
        const def = cards.data.find((m) => m.isDefault) ?? cards.data[0];
        return def?.stripePaymentMethodId ?? "";
      });
    } catch (err) {
      if (!(err instanceof ApiError && err.statusCode === 403)) {
        toastApiError(err, t("events.cardsLoadError"));
      }
    }
  }, [canPay]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshPreview(), refreshCards()]);
  }, [refreshPreview, refreshCards]);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("events.detailLoadError")))
      .finally(() => setLoading(false));
  }, [refresh]);

  const currencyGroups = useMemo(
    () => buildCurrencyGroups(preview?.payment),
    [preview?.payment],
  );

  const settle = async () => {
    if (!methodId) {
      toast.error(t("events.needCardToPay"));
      return;
    }
    setBusy(true);
    setChargeProgress(null);
    const totalGroupsAtStart = Math.max(1, currencyGroups.length || 1);
    try {
      let remaining = true;
      let step = 0;
      while (remaining) {
        step += 1;
        let result = await payEventBookings(params.id, {
          paymentMethodId: methodId,
        });
        while (result.status === "requires_action" && isActionPayload(result.data)) {
          setChargeProgress({
            index: step,
            total: Math.max(totalGroupsAtStart, result.data.chargeTotal ?? step),
            currency: result.data.currency,
          });
          const paymentIntentId = await confirmCardPaymentIfNeeded(result.data.clientSecret);
          result = await completeEventPayment(params.id, paymentIntentId);
        }
        if (result.status === "partial") {
          const next = result.meta?.nextCharge;
          setChargeProgress({
            index: step,
            total: Math.max(
              totalGroupsAtStart,
              step + (result.meta?.remainingCurrencies ?? 0),
            ),
            currency: result.meta?.chargedCurrency ?? next?.currency ?? "",
          });
          toast.success(
            next
              ? t("events.payPartialNext", {
                  paid: formatMoney(
                    result.meta?.chargedAmount ?? 0,
                    result.meta?.chargedCurrency ?? preview?.currency ?? "AED",
                  ),
                  next: formatMoney(next.amountDue, next.currency),
                  remaining: result.meta?.remainingCurrencies ?? 1,
                })
              : result.message,
          );
          continue;
        }
        toast.success(result.message);
        remaining = false;
      }
      setChargeProgress(null);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "PAYMENT_METHOD_REQUIRED") {
        toast.error(t("events.needCardToPay"));
      } else {
        toastApiError(err, t("events.payBookingsError"));
      }
    } finally {
      setBusy(false);
      setChargeProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("events.loading")}
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-medium">{t("events.notFound")}</p>
      </div>
    );
  }

  const heldCount = preview.payment?.heldCount ?? 0;
  const mixedCurrency = preview.payment?.mixedCurrency ?? currencyGroups.length > 1;
  const nextCharge = preview.payment?.nextCharge ?? currencyGroups[0] ?? null;
  const stripeReady = Boolean(getStripePublishableKey());
  const paid = preview.paymentStatus === "PAID";
  const partiallyPaid =
    !paid &&
    heldCount > 0 &&
    (preview.summary.confirmed ?? 0) > 0 &&
    preview.paymentStatus === "AWAITING_PAYMENT";
  const selected = methods.find((m) => m.stripePaymentMethodId === methodId);
  const allocationComparable = preview.payment?.allocationComparable !== false;

  const payButtonLabel = (() => {
    if (!nextCharge) return t("events.payAmount", { amount: formatMoney(0, preview.currency) });
    if (mixedCurrency) {
      return t("events.payAllCurrencies", {
        first: formatMoney(nextCharge.amountDue, nextCharge.currency),
        count: currencyGroups.length,
      });
    }
    return t("events.payAmount", {
      amount: formatMoney(nextCharge.amountDue, nextCharge.currency),
    });
  })();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("events.payTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {preview.title} · {t("events.payHint")}
        </p>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("events.amountDue")}</p>
            {mixedCurrency && currencyGroups.length > 0 ? (
              <div className="mt-1 space-y-1">
                {currencyGroups.map((group) => (
                  <p key={group.currency} className="text-xl font-semibold tracking-tight">
                    {formatMoney(group.amountDue, group.currency)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {t("events.payCurrencyLineCount", { count: group.itemCount })}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-2xl font-semibold">
                {formatMoney(
                  nextCharge?.amountDue ?? 0,
                  nextCharge?.currency ?? preview.currency,
                )}
              </p>
            )}
          </div>
          {paid ? (
            <p className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
              {t("events.paymentPaidHint")}
            </p>
          ) : partiallyPaid ? (
            <p className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              {t("events.paymentPartialHint")}
            </p>
          ) : null}
        </div>

        {mixedCurrency ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {t("events.payMixedCurrencyHint")}
          </p>
        ) : null}

        {preview.payment?.exceedsAllocation && allocationComparable ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {t("events.payExceedsAllocation", {
              due: formatMoney(
                nextCharge?.amountDue ?? 0,
                nextCharge?.currency ?? preview.currency,
              ),
              allocated: formatMoney(
                preview.payment.allocatedAmount ?? 0,
                preview.currency,
              ),
            })}
          </p>
        ) : null}

        {!allocationComparable && heldCount > 0 ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {t("events.payAllocationSkipped", {
              budgetCurrency: preview.currency,
            })}
          </p>
        ) : null}
      </div>

      {currencyGroups.length ? (
        <div className="space-y-3">
          {currencyGroups.map((group) => (
            <div
              key={group.currency}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  {t("events.payCurrencyGroup", { currency: group.currency })}
                </h2>
                <p className="text-sm font-semibold">
                  {formatMoney(group.amountDue, group.currency)}
                </p>
              </div>
              <ul className="space-y-2">
                {(group.items ?? []).map((item) => (
                  <li
                    key={item.bookingId}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span>
                      {item.name}
                      {item.estimatedCost != null &&
                      item.amount > item.estimatedCost + 1e-9 ? (
                        <span className="ml-2 text-xs text-amber-600">
                          {t("events.aboveEstimate")}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium">
                      {formatMoney(item.amount, item.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : paid ? null : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t("events.nothingToPay")}
          <Link
            href={`/dashboard/events/${preview.eventId}/reserve`}
            className="mt-2 block text-primary hover:underline"
          >
            {t("events.goToReserve")}
          </Link>
        </p>
      )}

      {canPay && heldCount > 0 && !paid ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {!stripeReady ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              {t("events.stripeNotConfigured")}
            </p>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold">{t("events.paySelectCard")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {mixedCurrency
                    ? t("events.payChargeHintMulti")
                    : t("events.payChargeHint")}
                </p>
              </div>

              {methods.length ? (
                <ul className="space-y-2">
                  {methods.map((method) => {
                    const active = method.stripePaymentMethodId === methodId;
                    return (
                      <li key={method.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setMethodId(method.stripePaymentMethodId);
                            setAddingCard(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                            active
                              ? "border-primary/40 bg-primary/5"
                              : "border-border bg-background hover:border-primary/30",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input",
                            )}
                          >
                            {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                          </span>
                          <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 capitalize">{cardLabel(method)}</span>
                          <span className="text-xs text-muted-foreground">
                            {String(method.expMonth).padStart(2, "0")}/{method.expYear}
                          </span>
                          {method.isDefault ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              {t("events.cardDefault")}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : addingCard ? null : (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  {t("events.payNoCardHint")}
                </p>
              )}

              {addingCard ? (
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-sm font-medium">{t("events.addCardToPay")}</p>
                  <AddCompanyCardForm
                    onSuccess={() => {
                      setAddingCard(false);
                      void refreshCards();
                    }}
                    onCancel={() => setAddingCard(false)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCard(true)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {methods.length ? t("events.addAnotherCard") : t("events.addCardToPay")}
                </button>
              )}

              <Link
                href="/dashboard/settings"
                className="block text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                {t("events.manageCardsInSettings")}
              </Link>

              <button
                type="button"
                disabled={busy || !stripeReady || !methodId || addingCard}
                onClick={() => void settle()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {busy && chargeProgress
                  ? t("events.payProgress", {
                      index: chargeProgress.index,
                      total: chargeProgress.total,
                      currency: chargeProgress.currency,
                    })
                  : payButtonLabel}
              </button>
              {selected ? (
                <p className="text-center text-[11px] text-muted-foreground">
                  {t("events.payUsingCard", { card: cardLabel(selected) })}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : heldCount > 0 && !paid ? (
        <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t("events.payNoPermission")}
        </p>
      ) : null}
    </div>
  );
}
