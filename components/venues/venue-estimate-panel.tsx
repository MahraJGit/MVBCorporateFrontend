"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { SoftSlotPicker } from "@/components/availability/soft-slot-picker";
import { DatePickerField, parseIsoDate } from "@/components/date-picker-field";
import { FormSelect } from "@/components/form-select";
import { useAuth } from "@/features/auth/auth-context";
import {
  dateInputToIsoEnd,
  dateInputToIsoStart,
  formatSlotLabel,
  preferredSlotToIsoRange,
  previewVenueAvailability,
  slotKey,
  toLocalDateInputValue,
  type PreferredSlotIntent,
  type SoftAvailabilityPreview,
  type SoftAvailabilitySlot,
} from "@/features/availability/api";
import {
  addEventVenue,
  getEvent,
  isPlannableEventStatus,
  listEvents,
  replaceEventVenue,
} from "@/features/events/api";
import type { CorporateEvent } from "@/features/events/types";
import { addCalendarVenue, getCalendarItem } from "@/features/calendar/api";
import type { CorporateCalendarItem } from "@/features/calendar/types";
import type { PublicVenue } from "@/features/venues/types";
import { useCurrency } from "@/features/currency/currency-context";
import { useLocale } from "@/features/i18n/locale-context";
import {
  calculateVenuePlanEstimate,
  checkVenueCapacity,
  eventDurationFromDates,
  getPackagesFromConfig,
  getVenueAmenityPriceInfo,
  toBookingAmenityPayload,
  type AmenityPackage,
  type AmenitySelection,
} from "@/features/venues/utils";
import { toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const CREATE_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

const fieldCls = cn(
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
  "disabled:opacity-60",
);

type Props = {
  venue: PublicVenue;
  eventId?: string;
  calendarItemId?: string;
  replaceLineId?: string;
};

export function VenueEstimatePanel({
  venue,
  eventId: eventIdProp,
  calendarItemId: calendarItemIdProp,
  replaceLineId,
}: Props) {
  const { t } = useLocale();
  const { formatDisplayPrice } = useCurrency();
  const router = useRouter();
  const { organizations } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const canAdd = CREATE_ROLES.has(role);
  const planFlowId = calendarItemIdProp?.trim() || "";
  const boundEventId = planFlowId ? "" : eventIdProp?.trim() || "";

  const [draftEvents, setDraftEvents] = useState<CorporateEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CorporateEvent | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CorporateCalendarItem | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventId, setEventId] = useState(boundEventId);
  const [durationHours, setDurationHours] = useState(8);
  const [durationDays, setDurationDays] = useState(1);
  const [preferredStart, setPreferredStart] = useState("");
  const [preferredEnd, setPreferredEnd] = useState("");
  const [availability, setAvailability] = useState<SoftAvailabilityPreview | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [preferredSlot, setPreferredSlot] = useState<PreferredSlotIntent | null>(null);
  const [selected, setSelected] = useState<Record<string, AmenitySelection>>({});
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const loadDrafts = useCallback(async () => {
    setLoadingEvents(true);
    try {
      if (planFlowId) {
        const res = await getCalendarItem(planFlowId);
        setSelectedPlan(res.data);
        setSelectedEvent(null);
        setDraftEvents([]);
        setEventId("");
        const dur = eventDurationFromDates(res.data.plannedStartAt, res.data.plannedEndAt);
        setDurationHours(dur.hours);
        setDurationDays(dur.days);
        setPreferredStart(toLocalDateInputValue(res.data.plannedStartAt));
        setPreferredEnd(toLocalDateInputValue(res.data.plannedEndAt));
      } else if (boundEventId) {
        const res = await getEvent(boundEventId);
        setSelectedEvent(res.data);
        setSelectedPlan(null);
        setEventId(res.data.id);
        setDraftEvents([res.data]);
        const dur = eventDurationFromDates(res.data.proposedStartAt, res.data.proposedEndAt);
        setDurationHours(dur.hours);
        setDurationDays(dur.days);
        setPreferredStart(toLocalDateInputValue(res.data.proposedStartAt));
        setPreferredEnd(toLocalDateInputValue(res.data.proposedEndAt));
      } else {
        const res = await listEvents({ limit: 50 });
        const editable = res.data.filter((e) => isPlannableEventStatus(e.status));
        setDraftEvents(editable);
        setSelectedPlan(null);
        if (editable.length === 1) {
          setEventId(editable[0].id);
          setSelectedEvent(editable[0]);
          const dur = eventDurationFromDates(
            editable[0].proposedStartAt,
            editable[0].proposedEndAt,
          );
          setDurationHours(dur.hours);
          setDurationDays(dur.days);
          setPreferredStart(toLocalDateInputValue(editable[0].proposedStartAt));
          setPreferredEnd(toLocalDateInputValue(editable[0].proposedEndAt));
        }
      }
    } catch {
      setDraftEvents([]);
      setSelectedEvent(null);
      setSelectedPlan(null);
    } finally {
      setLoadingEvents(false);
    }
  }, [planFlowId, boundEventId]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    if (planFlowId || !eventId || boundEventId) return;
    const found = draftEvents.find((e) => e.id === eventId) ?? null;
    setSelectedEvent(found);
    if (found) {
      const dur = eventDurationFromDates(found.proposedStartAt, found.proposedEndAt);
      setDurationHours(dur.hours);
      setDurationDays(dur.days);
      setPreferredStart(toLocalDateInputValue(found.proposedStartAt));
      setPreferredEnd(toLocalDateInputValue(found.proposedEndAt));
    }
  }, [eventId, draftEvents, boundEventId, planFlowId]);

  useEffect(() => {
    let cancelled = false;
    if (!preferredStart) {
      setAvailability(null);
      setPreferredSlot(null);
      return;
    }
    setCheckingAvailability(true);
    setPreferredSlot(null);
    void previewVenueAvailability(
      venue.id,
      dateInputToIsoStart(preferredStart),
      dateInputToIsoEnd(preferredEnd || preferredStart),
    )
      .then((preview) => {
        if (!cancelled) setAvailability(preview);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venue.id, preferredStart, preferredEnd]);

  const selectedSlotKey = preferredSlot ? slotKey(preferredSlot) : null;

  const onPickSlot = useCallback((slot: SoftAvailabilitySlot | null) => {
    if (!slot) {
      setPreferredSlot(null);
      return;
    }
    setPreferredSlot({
      id: slot.id,
      date: slot.date ?? preferredStart,
      startTime: slot.startTime,
      endTime: slot.endTime,
      name: slot.name ?? null,
      label: slot.label ?? null,
    });
  }, [preferredStart]);

  const guests =
    (planFlowId
      ? selectedPlan?.estimatedAttendees
      : selectedEvent?.estimatedAttendees) ?? 0;

  const paidAmenities = useMemo(
    () =>
      (venue.amenities ?? []).filter(
        (a) => !(a.isIncluded || a.pricingType === "INCLUDED"),
      ),
    [venue.amenities],
  );

  const packageAmenities = useMemo(
    () => paidAmenities.filter((a) => a.pricingType === "PACKAGE_BASED"),
    [paidAmenities],
  );

  const otherPaidAmenities = useMemo(
    () => paidAmenities.filter((a) => a.pricingType !== "PACKAGE_BASED"),
    [paidAmenities],
  );

  const includedAmenities = useMemo(
    () =>
      (venue.amenities ?? []).filter(
        (a) => a.isIncluded || a.pricingType === "INCLUDED",
      ),
    [venue.amenities],
  );

  const selections = useMemo(() => Object.values(selected), [selected]);

  const estimate = useMemo(
    () =>
      calculateVenuePlanEstimate({
        venue,
        guests: guests > 0 ? guests : 1,
        durationHours,
        durationDays,
        selections,
      }),
    [venue, guests, durationHours, durationDays, selections],
  );

  const capacity = useMemo(() => {
    if (planFlowId) {
      if (!selectedPlan) {
        return { ok: false as const, reason: "missing_guests" as const, guests: 0 };
      }
      return checkVenueCapacity(venue, guests);
    }
    if (!selectedEvent) {
      return { ok: false as const, reason: "missing_guests" as const, guests: 0 };
    }
    return checkVenueCapacity(venue, guests);
  }, [planFlowId, selectedPlan, selectedEvent, venue, guests]);

  const capacityMessage = useMemo(() => {
    if (!capacity.reason) return null;
    if (capacity.reason === "missing_guests") {
      return selectedEvent || selectedPlan ? t("venues.capacityMissingGuests") : null;
    }
    if (capacity.reason === "over_max") {
      return t("venues.capacityOverMax", {
        max: capacity.max ?? "?",
        guests: capacity.guests ?? "?",
      });
    }
    if (capacity.reason === "under_min") {
      return t("venues.capacityUnderMin", {
        min: capacity.min ?? "?",
        guests: capacity.guests ?? "?",
      });
    }
    return null;
  }, [capacity, selectedEvent, selectedPlan, t]);

  const capacityOk =
    Boolean(planFlowId ? selectedPlan : selectedEvent) && capacity.ok;
  const money = (amount: number) => formatDisplayPrice(amount, estimate.currency);

  /** Requesting more than the venue allows fails at booking time, so cap here. */
  const amenityMax = (amenityId: string) => {
    const amenity = (venue.amenities ?? []).find((a) => a.id === amenityId);
    const limits = [amenity?.maxPerBooking, amenity?.capacity].filter(
      (value): value is number => typeof value === "number" && value > 0,
    );
    return limits.length ? Math.min(...limits) : null;
  };

  const clampQuantity = (amenityId: string, quantity: number) => {
    const max = amenityMax(amenityId);
    return Math.max(1, max ? Math.min(quantity, max) : quantity);
  };

  const packageHeads = (amenityId: string, pkg?: AmenityPackage) =>
    clampQuantity(amenityId, Math.max(guests || 1, pkg?.minHeads ?? 1));

  const selectPackage = (amenityId: string, pkg: AmenityPackage) => {
    setSelected((prev) => ({
      ...prev,
      [amenityId]: {
        amenityId,
        quantity: packageHeads(amenityId, pkg),
        packageId: pkg.id,
        packageName: pkg.name,
      },
    }));
  };

  const toggleAmenity = (amenityId: string) => {
    const amenity = (venue.amenities ?? []).find((a) => a.id === amenityId);
    const packages =
      amenity?.pricingType === "PACKAGE_BASED"
        ? getPackagesFromConfig(amenity.pricingConfig)
        : [];
    setSelected((prev) => {
      if (prev[amenityId]) {
        const next = { ...prev };
        delete next[amenityId];
        return next;
      }
      const first = packages[0];
      return {
        ...prev,
        [amenityId]: {
          amenityId,
          quantity: first ? packageHeads(amenityId, first) : clampQuantity(amenityId, guests || 1),
          ...(first ? { packageId: first.id, packageName: first.name } : {}),
        },
      };
    });
  };

  const setQuantity = (amenityId: string, quantity: number) => {
    setSelected((prev) => ({
      ...prev,
      [amenityId]: {
        ...prev[amenityId],
        amenityId,
        quantity: clampQuantity(amenityId, quantity),
      },
    }));
  };

  useEffect(() => {
    setSelected((prev) => {
      let changed = false;
      const next: Record<string, AmenitySelection> = { ...prev };
      for (const amenity of packageAmenities) {
        const sel = next[amenity.id];
        if (!sel) continue;
        const packages = getPackagesFromConfig(amenity.pricingConfig);
        const pkg =
          packages.find((p) => p.id === sel.packageId) ??
          packages.find((p) => p.name === sel.packageName) ??
          packages[0];
        const quantity = packageHeads(amenity.id, pkg);
        if (
          quantity !== sel.quantity ||
          (pkg && (sel.packageId !== pkg.id || sel.packageName !== pkg.name))
        ) {
          next[amenity.id] = {
            ...sel,
            quantity,
            ...(pkg ? { packageId: pkg.id, packageName: pkg.name } : {}),
          };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [guests, packageAmenities]);

  const packageSelectionIncomplete = packageAmenities.some(
    (amenity) => selected[amenity.id] && !selected[amenity.id]?.packageId,
  );

  if (!canAdd) {
    return (
      <p className="rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
        {t("events.addToEventRoleHint")}
      </p>
    );
  }

  if (added) {
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
        <p className="text-sm font-medium">
          {planFlowId ? t("calendar.addedToPlan") : t("events.addedToEvent")}
        </p>
        {planFlowId ? (
          <Link href="/dashboard" className="inline-block text-sm text-primary hover:underline">
            {t("calendar.viewPlan")}
          </Link>
        ) : eventId ? (
          <Link
            href={`/dashboard/events/${eventId}`}
            className="inline-block text-sm text-primary hover:underline"
          >
            {t("events.viewEventPlan")}
          </Link>
        ) : null}
      </div>
    );
  }

  const showEventPickerGate = !planFlowId;
  const readyForForm = planFlowId
    ? Boolean(selectedPlan)
    : draftEvents.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <CalendarDays className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">{t("venues.estimateTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("venues.estimateDesc")}</p>
        </div>
      </div>

      {loadingEvents ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("events.loading")}
        </div>
      ) : !readyForForm ? (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {planFlowId ? t("calendar.planNotFound") : t("events.noDraftEvents")}
          </p>
          {!planFlowId ? (
            <Link href="/dashboard/events/new" className="text-primary hover:underline">
              {t("events.newEvent")}
            </Link>
          ) : (
            <Link href="/dashboard" className="text-primary hover:underline">
              {t("calendar.backToCalendar")}
            </Link>
          )}
        </div>
      ) : (
        <>
          {showEventPickerGate && !boundEventId ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("events.selectEvent")}
              </label>
              <FormSelect
                value={eventId}
                onValueChange={setEventId}
                options={draftEvents.map((e) => ({
                  value: e.id,
                  label: `${e.title}${e.estimatedAttendees ? ` · ${e.estimatedAttendees}` : ""}`,
                }))}
                placeholder={t("events.chooseEvent")}
                icon={CalendarDays}
              />
            </div>
          ) : null}

          {planFlowId && selectedPlan ? (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Users className="h-3.5 w-3.5" />
                {t("venues.eventGuests", {
                  count: selectedPlan.estimatedAttendees ?? "—",
                })}
              </p>
              <p className="mt-1 font-medium text-sky-800 dark:text-sky-300">
                {selectedPlan.title}
              </p>
              {venue.capacityMin || venue.capacityMax ? (
                <p className="mt-1">
                  {t("venues.venueCapacity", {
                    min: venue.capacityMin ?? "?",
                    max: venue.capacityMax ?? "?",
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {!planFlowId && selectedEvent ? (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Users className="h-3.5 w-3.5" />
                {t("venues.eventGuests", {
                  count: selectedEvent.estimatedAttendees ?? "—",
                })}
              </p>
              {venue.capacityMin || venue.capacityMax ? (
                <p className="mt-1">
                  {t("venues.venueCapacity", {
                    min: venue.capacityMin ?? "?",
                    max: venue.capacityMax ?? "?",
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {capacityMessage ? (
            <div
              className={cn(
                "flex gap-2 rounded-xl border px-3 py-2.5 text-xs",
                capacityOk
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                  : "border-destructive/30 bg-destructive/5 text-destructive",
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{capacityMessage}</span>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("venues.preferredStart")}
              </label>
              <DatePickerField
                value={preferredStart}
                onChange={setPreferredStart}
                placeholder={t("events.pickDate")}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("venues.preferredEnd")}
              </label>
              <DatePickerField
                value={preferredEnd}
                onChange={setPreferredEnd}
                placeholder={t("events.pickDate")}
                minDate={parseIsoDate(preferredStart) ?? undefined}
                className="rounded-xl"
              />
            </div>
          </div>

          {checkingAvailability ? (
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("venues.checkingAvailability")}
            </p>
          ) : availability ? (
            <div
              className={cn(
                "flex gap-2 rounded-xl border px-3 py-2.5 text-xs",
                availability.status === "OK" &&
                  "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
                availability.status === "WARNING" &&
                  "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
                availability.status === "UNAVAILABLE" &&
                  "border-destructive/30 bg-destructive/5 text-destructive",
                availability.status === "UNKNOWN" &&
                  "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-medium">{t("venues.softAvailability")}: </span>
                {availability.message}
              </span>
            </div>
          ) : null}

          {availability?.slots?.length ? (
            <SoftSlotPicker
              slots={availability.slots}
              selectedKey={selectedSlotKey}
              onSelect={onPickSlot}
              title={t("venues.preferredSlot")}
              hint={t("venues.preferredSlotHint")}
              unavailableLabel={t("venues.slotUnavailable")}
              clearLabel={t("venues.clearPreferredSlot")}
            />
          ) : null}

          {venue.pricing?.modelType === "HOURLY" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("venues.durationHours")}
              </label>
              <input
                type="number"
                min={1}
                step={1}
                className={cn(fieldCls, "tabular-nums")}
                value={durationHours}
                onChange={(e) =>
                  setDurationHours(Math.max(1, Math.trunc(Number(e.target.value)) || 1))
                }
              />
            </div>
          ) : null}

          {venue.pricing?.modelType === "DAILY_BLOCK" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("venues.durationDays")}
              </label>
              <input
                type="number"
                min={1}
                step={1}
                className={cn(fieldCls, "tabular-nums")}
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(Math.max(1, Math.trunc(Number(e.target.value)) || 1))
                }
              />
            </div>
          ) : null}

          {includedAmenities.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t("venues.includedAmenities")}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {includedAmenities.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                  >
                    {a.catalog?.name ?? "Amenity"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {packageAmenities.length > 0 ? (
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                {t("venues.cateringPackages")}
              </p>
              <ul className="space-y-3">
                {packageAmenities.map((amenity) => {
                  const packages = getPackagesFromConfig(amenity.pricingConfig);
                  const active = Boolean(selected[amenity.id]);
                  const selectedPkg =
                    packages.find((p) => p.id === selected[amenity.id]?.packageId) ??
                    packages.find((p) => p.name === selected[amenity.id]?.packageName);
                  const priceInfo = getVenueAmenityPriceInfo(amenity);
                  return (
                    <li
                      key={amenity.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 transition-colors",
                        active
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleAmenity(amenity.id)}
                        className="flex w-full items-start gap-2.5 text-left"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input",
                          )}
                        >
                          {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {amenity.catalog?.name ?? t("venues.amenity")}
                          </span>
                          {amenity.catalog?.description ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {amenity.catalog.description}
                            </span>
                          ) : null}
                          {selectedPkg ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {money(selectedPkg.pricePerHead)} {t("venues.perGuest")}
                              {` (${selectedPkg.name})`}
                            </span>
                          ) : priceInfo ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {money(priceInfo.amount)} {priceInfo.suffix}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {packages.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {packages.map((pkg) => {
                            const pkgActive = selectedPkg?.id === pkg.id;
                            return (
                              <li key={pkg.id}>
                                <button
                                  type="button"
                                  onClick={() => selectPackage(amenity.id, pkg)}
                                  className={cn(
                                    "w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                                    pkgActive
                                      ? "border-primary/50 bg-primary/10"
                                      : "border-border bg-background hover:border-primary/30",
                                  )}
                                >
                                  <span className="flex items-start gap-2">
                                    <span
                                      className={cn(
                                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                        pkgActive
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-input",
                                      )}
                                    >
                                      {pkgActive ? (
                                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                      ) : null}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-medium">{pkg.name}</span>
                                        <span className="shrink-0 text-sm font-semibold text-primary">
                                          {money(pkg.pricePerHead)}
                                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                            {t("venues.perGuest")}
                                          </span>
                                        </span>
                                      </span>
                                      {pkg.description ? (
                                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                          {pkg.description}
                                        </span>
                                      ) : null}
                                      {pkg.items.length > 0 ? (
                                        <ul className="mt-1 list-inside list-disc text-[11px] text-muted-foreground">
                                          {pkg.items.map((item) => (
                                            <li key={item.id}>
                                              {item.name}
                                              {item.description ? ` — ${item.description}` : ""}
                                            </li>
                                          ))}
                                        </ul>
                                      ) : null}
                                      {pkg.minHeads ? (
                                        <span className="mt-1 block text-[11px] text-muted-foreground">
                                          {t("venues.packageMinGuests", {
                                            count: pkg.minHeads,
                                          })}
                                        </span>
                                      ) : null}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {t("venues.noCateringPackages")}
                        </p>
                      )}
                      {active &&
                      selectedPkg?.minHeads &&
                      guests > 0 &&
                      guests < selectedPkg.minHeads ? (
                        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
                          {t("venues.packageMinGuestsNote", {
                            count: selectedPkg.minHeads,
                            name: selectedPkg.name,
                          })}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {otherPaidAmenities.length > 0 ? (
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {t("venues.selectAddOns")}
              </p>
              <ul className="space-y-2">
                {otherPaidAmenities.map((amenity) => {
                  const active = Boolean(selected[amenity.id]);
                  const priceInfo = getVenueAmenityPriceInfo(amenity);
                  const maxQty = amenity.maxPerBooking ?? 99;
                  return (
                    <li
                      key={amenity.id}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 transition-colors",
                        active
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleAmenity(amenity.id)}
                        className="flex w-full items-start gap-2.5 text-left"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input",
                          )}
                        >
                          {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {amenity.catalog?.name ?? t("venues.amenity")}
                          </span>
                          {priceInfo ? (
                            <span className="text-xs text-muted-foreground">
                              {money(priceInfo.amount)} {priceInfo.suffix}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      {active &&
                      (amenity.pricingType === "PER_UNIT" ||
                        amenity.pricingType === "PER_HOUR") ? (
                        <div className="mt-2 flex items-center gap-2 ps-7">
                          <label className="text-[11px] text-muted-foreground">
                            {t("venues.quantity")}
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={maxQty}
                            step={1}
                            className="h-8 w-20 rounded-lg border border-input bg-background px-2 text-sm tabular-nums"
                            value={selected[amenity.id]?.quantity ?? 1}
                            onChange={(e) =>
                              setQuantity(
                                amenity.id,
                                Math.min(
                                  maxQty,
                                  Math.max(1, Math.trunc(Number(e.target.value)) || 1),
                                ),
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("venues.estimateBreakdown")}
            </p>
            <ul className="space-y-1 text-sm">
              {estimate.lines.map((line, idx) => (
                <li key={`${line.label}-${idx}`} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="tabular-nums font-medium">
                    {money(line.amount)}
                  </span>
                </li>
              ))}
              {estimate.taxAmount > 0 ? (
                <li className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("venues.tax")}</span>
                  <span className="tabular-nums font-medium">
                    {money(estimate.taxAmount)}
                  </span>
                </li>
              ) : null}
            </ul>
            <div className="flex items-end justify-between border-t border-border pt-2">
              <span className="text-sm font-semibold">{t("venues.estimatedTotal")}</span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {money(estimate.totalAmount)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{t("venues.estimateAutoHint")}</p>
          </div>

          <button
            type="button"
            disabled={
              busy ||
              !(planFlowId || eventId) ||
              !capacityOk ||
              packageSelectionIncomplete ||
              (Boolean(venue.pricing) && estimate.totalAmount <= 0)
            }
            onClick={async () => {
              if (!(planFlowId || eventId) || !capacityOk || packageSelectionIncomplete) return;
              setBusy(true);
              try {
                const noteLines = [
                  venue.pricing ? "Auto estimate" : "Pricing on request",
                  ...estimate.lines.map(
                    (l) => `${l.label}: ${l.amount} ${estimate.currency}`,
                  ),
                  estimate.taxAmount > 0
                    ? `Tax: ${estimate.taxAmount} ${estimate.currency}`
                    : null,
                  venue.pricing
                    ? `Total: ${estimate.totalAmount} ${estimate.currency}`
                    : null,
                  guests ? `Guests: ${guests}` : null,
                  preferredStart
                    ? `Preferred: ${preferredStart}${preferredEnd ? ` → ${preferredEnd}` : ""}`
                    : null,
                  preferredSlot
                    ? `Preferred slot: ${formatSlotLabel(preferredSlot)}`
                    : null,
                ].filter(Boolean);

                const slotRange = preferredSlotToIsoRange(preferredStart, preferredSlot);
                const startIso =
                  slotRange.startIso ?? dateInputToIsoStart(preferredStart);
                const endIso =
                  slotRange.endIso ??
                  dateInputToIsoEnd(preferredEnd || preferredStart);

                const payload = {
                  venueId: venue.id,
                  ...(venue.pricing && estimate.totalAmount > 0
                    ? { estimatedCost: estimate.totalAmount }
                    : {}),
                  notes: noteLines.join("\n"),
                  ...(startIso ? { preferredStartAt: startIso } : {}),
                  ...(endIso ? { preferredEndAt: endIso } : {}),
                  bookingIntent: {
                    durationHours,
                    durationDays,
                    guests,
                    amenities: toBookingAmenityPayload(selections),
                    ...(preferredSlot ? { preferredSlot } : {}),
                  },
                };
                const res = planFlowId
                  ? await addCalendarVenue(planFlowId, payload)
                  : replaceLineId
                    ? await replaceEventVenue(eventId, replaceLineId, payload)
                    : await addEventVenue(eventId, payload);
                toast.success(res.message);
                setAdded(true);
              } catch (err) {
                toastApiError(
                  err,
                  planFlowId ? t("calendar.addToPlanError") : t("events.addToEventError"),
                );
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {planFlowId
              ? t("calendar.addEstimateToPlan")
              : t("venues.addEstimateToEvent")}
          </button>

          {!planFlowId && !boundEventId ? (
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/dashboard/events/new")}
            >
              {t("events.createNewEvent")}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
