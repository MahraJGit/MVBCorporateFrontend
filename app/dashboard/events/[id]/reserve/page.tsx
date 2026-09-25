"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Send,
  Store,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SoftSlotPicker } from "@/components/availability/soft-slot-picker";
import { DatePickerField, parseIsoDate } from "@/components/date-picker-field";
import {
  previewServiceAvailability,
  previewVenueAvailability,
  slotKey as buildSlotKey,
  type SoftAvailabilitySlot,
} from "@/features/availability/api";
import { useAuth } from "@/features/auth/auth-context";
import { formatMoney } from "@/features/budget/api";
import {
  cancelEventLineBooking,
  confirmEventBookings,
  lineBookingStatusLabel,
  previewEventBookings,
} from "@/features/events/api";
import type {
  EventBookingLinePlan,
  EventBookingLineSelection,
  EventBookingOutcome,
  EventBookingPreview,
} from "@/features/events/types";
import { toastApiError } from "@/lib/api/errors";
import { plural, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CONFIRM_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

const OPEN_STATES = new Set(["NOT_BOOKED", "FAILED", "CANCELLED"]);

function selectionFromPlan(plan: EventBookingLinePlan): EventBookingLineSelection {
  return {
    lineId: plan.lineId,
    type: plan.type,
    ...(plan.date ? { date: plan.date } : {}),
    ...(plan.endDate ? { endDate: plan.endDate } : {}),
    ...(plan.startTime ? { startTime: plan.startTime } : {}),
    ...(plan.endTime ? { endTime: plan.endTime } : {}),
    ...(plan.slotKey ? { slotKey: plan.slotKey } : {}),
    ...(plan.guests ? { guests: plan.guests } : {}),
  };
}

function statusChipClass(status: string) {
  switch (status) {
    case "HELD":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "CONFIRMED":
      return "bg-emerald-500/10 text-emerald-600";
    case "REQUESTED":
      return "bg-sky-500/10 text-sky-600";
    case "FAILED":
      return "bg-destructive/10 text-destructive";
    case "CANCELLED":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-amber-500/10 text-amber-600";
  }
}

type CardProps = {
  plan: EventBookingLinePlan;
  selection: EventBookingLineSelection;
  currency: string;
  busy: boolean;
  canAct: boolean;
  canSwap: boolean;
  eventId: string;
  onChange: (next: EventBookingLineSelection) => void;
  onConfirm: () => void;
  onCancelBooking: () => void;
};

function LineCard({
  plan,
  selection,
  currency,
  busy,
  canAct,
  canSwap,
  eventId,
  onChange,
  onConfirm,
  onCancelBooking,
}: CardProps) {
  const [slots, setSlots] = useState<SoftAvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isVenue = plan.type === "VENUE";
  const usesSlots = isVenue || plan.bookingMode === "SLOT";
  const isOpen = OPEN_STATES.has(plan.bookingStatus);
  const isHeld = plan.bookingStatus === "HELD";
  const date = selection.date ?? "";
  const swapHref = isVenue
    ? `/dashboard/venues?eventId=${encodeURIComponent(eventId)}&replaceLineId=${encodeURIComponent(plan.lineId)}`
    : `/dashboard/marketplace?eventId=${encodeURIComponent(eventId)}&replaceLineId=${encodeURIComponent(plan.lineId)}`;

  useEffect(() => {
    if (!isOpen || !usesSlots || !date) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    const request = isVenue
      ? previewVenueAvailability(plan.resourceId, date)
      : previewServiceAvailability(plan.resourceId, date, date);

    request
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, usesSlots, isVenue, plan.resourceId, date]);

  const selectedSlot = useMemo(() => {
    if (!usesSlots) return null;
    if (isVenue) {
      return (
        slots.find(
          (s) => s.startTime === selection.startTime && s.endTime === selection.endTime,
        ) ?? null
      );
    }
    if (!selection.slotKey) return null;
    const [, startTime] = selection.slotKey.split("|");
    return slots.find((s) => s.startTime === startTime) ?? null;
  }, [usesSlots, isVenue, slots, selection.startTime, selection.endTime, selection.slotKey]);

  const pickSlot = (slot: SoftAvailabilitySlot | null) => {
    if (isVenue) {
      onChange({
        ...selection,
        startTime: slot?.startTime,
        endTime: slot?.endTime,
      });
      return;
    }
    onChange({
      ...selection,
      slotKey: slot ? `${slot.date ?? date}|${slot.startTime}` : undefined,
    });
  };

  const Icon = isVenue ? Building2 : Store;
  const ready = isOpen && plan.blockers.length === 0;

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{plan.resourceName}</p>
            <p className="text-xs text-muted-foreground">
              {isVenue ? t("events.resourceVenue") : t("events.resourceService")}
              {plan.estimatedCost
                ? ` · ${formatMoney(plan.estimatedCost, currency)}`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              plan.mode === "INSTANT"
                ? "bg-primary/10 text-primary"
                : "bg-sky-500/10 text-sky-600",
            )}
          >
            {plan.mode === "INSTANT"
              ? t("events.modeInstant")
              : t("events.modeRequest")}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
              statusChipClass(plan.bookingStatus),
            )}
          >
            {lineBookingStatusLabel(plan.bookingStatus)}
          </span>
        </div>
      </div>

      {!isOpen ? (
        <div className="mt-4 space-y-2">
          <p
            className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              isHeld
                ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                : plan.bookingStatus === "REQUESTED"
                  ? "border-sky-500/25 bg-sky-500/5 text-sky-700 dark:text-sky-400"
                  : "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
            )}
          >
            {isHeld
              ? t("events.lineHeldHint")
              : plan.bookingStatus === "REQUESTED"
                ? t("events.lineRequestedHint")
                : t("events.lineBookedHint")}
            {plan.date ? ` · ${plan.date}` : ""}
            {plan.startTime && plan.endTime
              ? ` · ${plan.startTime} – ${plan.endTime}`
              : ""}
          </p>
          {plan.bookingStatus === "REQUESTED" ? (
            <Link
              href={`/dashboard/events/${eventId}/requests`}
              className="block text-xs font-medium text-primary hover:underline"
            >
              {t("events.viewRequests")}
            </Link>
          ) : isHeld ? (
            <Link
              href={`/dashboard/events/${eventId}/pay`}
              className="block text-xs font-medium text-primary hover:underline"
            >
              {t("events.goToPay")}
            </Link>
          ) : null}
          {canAct ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCancelBooking}
              className="text-xs text-destructive hover:underline disabled:opacity-50"
            >
              {t("events.releaseBooking")}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("events.bookingDate")}
              </label>
              <DatePickerField
                value={date}
                onChange={(value) =>
                  onChange({
                    ...selection,
                    date: value || undefined,
                    ...(isVenue ? {} : { slotKey: undefined }),
                  })
                }
                placeholder={t("events.pickDate")}
                minDate={new Date()}
                className="rounded-xl"
              />
            </div>

            {!usesSlots ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t("events.bookingEndDate")}
                </label>
                <DatePickerField
                  value={selection.endDate ?? ""}
                  onChange={(value) =>
                    onChange({ ...selection, endDate: value || undefined })
                  }
                  placeholder={t("events.pickDate")}
                  minDate={parseIsoDate(date) ?? new Date()}
                  className="rounded-xl"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t("events.bookingGuests")}
                </label>
                <input
                  type="number"
                  min={1}
                  value={selection.guests ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...selection,
                      guests: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            )}
          </div>

          {usesSlots ? (
            loadingSlots ? (
              <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("events.loadingSlots")}
              </p>
            ) : slots.length ? (
              <SoftSlotPicker
                slots={slots}
                selectedKey={selectedSlot ? buildSlotKey(selectedSlot) : null}
                onSelect={pickSlot}
                title={t("events.chooseSlot")}
                hint={t("events.chooseSlotHint")}
                unavailableLabel={t("events.slotTaken")}
                clearLabel={t("events.clearSlot")}
              />
            ) : date ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                {t("events.noSlotsOnDate")}
              </p>
            ) : null
          ) : null}

          {plan.blockers.map((blocker) => (
            <p
              key={blocker}
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{blocker}</span>
            </p>
          ))}

          {plan.warnings.map((warning) => (
            <p
              key={warning}
              className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </p>
          ))}

          {plan.bookingError && plan.bookingStatus === "FAILED" ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {t("events.lastAttempt")}: {plan.bookingError}
            </p>
          ) : null}

          {plan.mode === "REQUEST" ? (
            <p className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-xs text-sky-700 dark:text-sky-400">
              {t("events.requestOnlyHint")}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {canAct ? (
              <button
                type="button"
                disabled={busy || !ready}
                onClick={onConfirm}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold hover:bg-accent disabled:opacity-50"
              >
                {plan.mode === "INSTANT" ? (
                  <CalendarCheck className="h-3.5 w-3.5" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {plan.mode === "INSTANT"
                  ? t("events.holdThis")
                  : t("events.requestThis")}
              </button>
            ) : null}
            {canSwap ? (
              <Link
                href={swapHref}
                className="text-xs font-medium text-primary hover:underline"
              >
                {isVenue ? t("events.changeVenue") : t("events.changeService")}
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </li>
  );
}

export default function ReserveBookingsPage() {
  const params = useParams<{ id: string }>();
  const { organizations } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";

  const [preview, setPreview] = useState<EventBookingPreview | null>(null);
  const [selections, setSelections] = useState<Record<string, EventBookingLineSelection>>({});
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<EventBookingOutcome[] | null>(null);

  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  // Selections replaced by a fresh preview are already validated — don't bounce back.
  const skipNextRecheck = useRef(false);

  const runPreview = useCallback(
    async (lines: EventBookingLineSelection[], keepSelections: boolean) => {
      const res = await previewEventBookings(params.id, lines);
      setPreview(res.data);
      if (!keepSelections) {
        const next: Record<string, EventBookingLineSelection> = {};
        for (const plan of res.data.lines) {
          next[plan.lineId] = selectionFromPlan(plan);
        }
        skipNextRecheck.current = true;
        setSelections(next);
      }
      return res.data;
    },
    [params.id],
  );

  useEffect(() => {
    setLoading(true);
    runPreview([], false)
      .catch((err) => toastApiError(err, t("events.detailLoadError")))
      .finally(() => setLoading(false));
  }, [runPreview]);

  const recheck = useCallback(async () => {
    setRechecking(true);
    try {
      await runPreview(Object.values(selectionsRef.current), true);
    } catch (err) {
      toastApiError(err, t("events.recheckError"));
    } finally {
      setRechecking(false);
    }
  }, [runPreview]);

  // Re-validate against live availability shortly after the user edits a line.
  const updateSelection = useCallback(
    (next: EventBookingLineSelection) => {
      setSelections((prev) => ({ ...prev, [next.lineId]: next }));
    },
    [],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (skipNextRecheck.current) {
      skipNextRecheck.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void recheck();
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections]);

  const canAct = CONFIRM_ROLES.has(role) && preview?.status === "APPROVED";
  const canSwap = Boolean(preview?.canSwap);

  const openLines = useMemo(
    () => (preview?.lines ?? []).filter((l) => OPEN_STATES.has(l.bookingStatus)),
    [preview],
  );
  const readyLines = useMemo(
    () => openLines.filter((l) => l.blockers.length === 0),
    [openLines],
  );

  const confirm = useCallback(
    async (lineIds: string[]) => {
      if (!lineIds.length) return;
      setBusy(true);
      setResults(null);
      try {
        const payload = lineIds
          .map((id) => selectionsRef.current[id])
          .filter(Boolean) as EventBookingLineSelection[];
        // An empty payload means "book everything" server-side — never send that by accident.
        if (payload.length !== lineIds.length) {
          toast.error(t("events.recheckError"));
          return;
        }
        const res = await confirmEventBookings(params.id, payload);
        setResults(res.meta.results);
        if (res.meta.failed > 0) {
          toast.warning(res.message);
        } else if (res.meta.requested > 0) {
          toast.success(t("events.requestSentToast"));
        } else {
          toast.success(res.message);
        }
        await runPreview([], false);
      } catch (err) {
        toastApiError(err, t("events.confirmBookingsError"));
      } finally {
        setBusy(false);
      }
    },
    [params.id, runPreview],
  );

  const releaseBooking = useCallback(
    async (plan: EventBookingLinePlan) => {
      if (!window.confirm(t("events.confirmRelease"))) return;
      setBusy(true);
      try {
        const res = await cancelEventLineBooking(params.id, plan.type, plan.lineId);
        toast.success(res.message);
        await runPreview([], false);
      } catch (err) {
        toastApiError(err, t("events.releaseBookingError"));
      } finally {
        setBusy(false);
      }
    },
    [params.id, runPreview],
  );

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
        <Link href="/dashboard/events" className="mt-4 inline-block text-sm text-primary">
          {t("events.backToEvents")}
        </Link>
      </div>
    );
  }

  const totalEstimate = preview.lines.reduce(
    (sum, line) => sum + (line.estimatedCost ?? 0),
    0,
  );
  const bookedCount =
    preview.summary.confirmed +
    preview.summary.requested +
    (preview.summary.held ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("events.reserveTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {preview.title} · {formatMoney(totalEstimate, preview.currency)}
            </p>
          </div>
          <button
            type="button"
            disabled={rechecking}
            onClick={() => void recheck()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", rechecking && "animate-spin")} />
            {t("events.recheck")}
          </button>
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("events.reserveHint")}</span>
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{t("events.bookedCount")}</p>
            <p className="mt-0.5 text-lg font-semibold">
              {bookedCount} / {preview.summary.total}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{t("events.readyCount")}</p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-600">
              {preview.summary.ready}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">{t("events.blockedCount")}</p>
            <p
              className={cn(
                "mt-0.5 text-lg font-semibold",
                preview.summary.blocked > 0 ? "text-destructive" : "",
              )}
            >
              {preview.summary.blocked}
            </p>
          </div>
        </div>

        {preview.reason ? (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            {preview.reason}
          </p>
        ) : null}
      </div>

      {results?.length ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">{t("events.lastRun")}</h2>
          <ul className="space-y-2">
            {results.map((row) => (
              <li
                key={row.lineId}
                className="flex items-start gap-2 rounded-xl border border-border px-3 py-2 text-xs"
              >
                {row.status === "FAILED" ? (
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
                <span>
                  <span className="font-medium">{row.resourceName || row.type}</span>
                  {" — "}
                  {row.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.lines.length ? (
        <ul className="space-y-3">
          {preview.lines.map((plan) => (
            <LineCard
              key={plan.lineId}
              plan={plan}
              selection={selections[plan.lineId] ?? selectionFromPlan(plan)}
              currency={preview.currency}
              busy={busy}
              canAct={canAct}
              canSwap={canSwap}
              eventId={preview.eventId}
              onChange={updateSelection}
              onConfirm={() => void confirm([plan.lineId])}
              onCancelBooking={() => void releaseBooking(plan)}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t("events.noPlannedResources")}
        </p>
      )}

      {canAct && readyLines.length > 1 ? (
        <div className="sticky bottom-4 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t("events.confirmAllHint")}
            </p>
            <button
              type="button"
              disabled={busy || rechecking}
              onClick={() => void confirm(readyLines.map((l) => l.lineId))}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarCheck className="h-4 w-4" />
              )}
              {t("events.confirmAll", {
                count: String(readyLines.length),
                plural: plural(readyLines.length),
              })}
            </button>
          </div>
        </div>
      ) : null}

      {!CONFIRM_ROLES.has(role) ? (
        <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t("events.confirmNoPermission")}
        </p>
      ) : null}
    </div>
  );
}
