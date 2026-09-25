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
  previewServiceAvailability,
  slotKey,
  toLocalDateInputValue,
  type PreferredSlotIntent,
  type SoftAvailabilityPreview,
  type SoftAvailabilitySlot,
} from "@/features/availability/api";
import { useCurrency } from "@/features/currency/currency-context";
import {
  addEventService,
  getEvent,
  isPlannableEventStatus,
  listEvents,
  replaceEventService,
} from "@/features/events/api";
import type { CorporateEvent } from "@/features/events/types";
import { addCalendarService, getCalendarItem } from "@/features/calendar/api";
import type { CorporateCalendarItem } from "@/features/calendar/types";
import type { PublicMarketplaceService } from "@/features/marketplace/types";
import {
  activeAddOns,
  activeMenuItems,
  activePackages,
  calculateServicePlanEstimate,
  checkServiceCapacity,
  eventDurationFromDates,
  menuCompleteForPackage,
  menuOptionsForRule,
  toggleMenuSelection,
} from "@/features/marketplace/utils";
import { useLocale } from "@/features/i18n/locale-context";
import { toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const CREATE_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

const fieldCls = cn(
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
  "disabled:opacity-60",
);

type Props = {
  service: PublicMarketplaceService;
  eventId?: string;
  calendarItemId?: string;
  replaceLineId?: string;
};

export function MarketplaceEstimatePanel({
  service,
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

  const packages = useMemo(() => activePackages(service), [service]);
  const addOns = useMemo(() => activeAddOns(service), [service]);
  const menuItems = useMemo(() => activeMenuItems(service), [service]);
  const isMenuBuilder = service.customizationMode === "MENU_BUILDER";
  const requiresPackage =
    service.customizationMode === "PACKAGE" ||
    service.customizationMode === "MENU_BUILDER" ||
    packages.length > 0;

  const [draftEvents, setDraftEvents] = useState<CorporateEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CorporateEvent | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CorporateCalendarItem | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventId, setEventId] = useState(boundEventId);
  const [durationHours, setDurationHours] = useState(8);
  const [packageId, setPackageId] = useState("");
  const [preferredStart, setPreferredStart] = useState("");
  const [preferredEnd, setPreferredEnd] = useState("");
  const [availability, setAvailability] = useState<SoftAvailabilityPreview | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [preferredSlot, setPreferredSlot] = useState<PreferredSlotIntent | null>(null);
  const [menuSelections, setMenuSelections] = useState<Record<string, string[]>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, boolean>>({});
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
      setPreferredStart(toLocalDateInputValue(found.proposedStartAt));
      setPreferredEnd(toLocalDateInputValue(found.proposedEndAt));
    }
  }, [eventId, draftEvents, boundEventId, planFlowId]);

  useEffect(() => {
    if (packages.length === 1 && !packageId) {
      setPackageId(packages[0].id);
    }
  }, [packages, packageId]);

  useEffect(() => {
    let cancelled = false;
    if (!preferredStart) {
      setAvailability(null);
      setPreferredSlot(null);
      return;
    }
    setCheckingAvailability(true);
    setPreferredSlot(null);
    void previewServiceAvailability(
      service.id,
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
  }, [service.id, preferredStart, preferredEnd]);

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

  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === packageId) ?? null,
    [packages, packageId],
  );

  const guests =
    (planFlowId
      ? selectedPlan?.estimatedAttendees
      : selectedEvent?.estimatedAttendees) ?? 0;

  const estimate = useMemo(
    () =>
      calculateServicePlanEstimate({
        service,
        guests: guests > 0 ? guests : 1,
        durationHours,
        packageId: packageId || null,
        selectedAddOnIds: Object.keys(selectedAddOns).filter((id) => selectedAddOns[id]),
        menuSelections,
      }),
    [service, guests, durationHours, packageId, selectedAddOns, menuSelections],
  );

  const capacity = useMemo(() => {
    if (planFlowId) {
      if (!selectedPlan) {
        return { ok: false as const, reason: "missing_guests" as const, guests: 0 };
      }
      return checkServiceCapacity(service, guests);
    }
    if (!selectedEvent) {
      return { ok: false as const, reason: "missing_guests" as const, guests: 0 };
    }
    return checkServiceCapacity(service, guests);
  }, [planFlowId, selectedPlan, selectedEvent, service, guests]);

  const capacityMessage = useMemo(() => {
    if (!capacity.reason) return null;
    if (capacity.reason === "missing_guests") {
      return selectedEvent || selectedPlan ? t("marketplace.capacityMissingGuests") : null;
    }
    if (capacity.reason === "over_max") {
      return t("marketplace.capacityOverMax", {
        max: capacity.max ?? "?",
        guests: capacity.guests ?? "?",
      });
    }
    if (capacity.reason === "under_min") {
      return t("marketplace.capacityUnderMin", {
        min: capacity.min ?? "?",
        guests: capacity.guests ?? "?",
      });
    }
    return null;
  }, [capacity, selectedEvent, selectedPlan, t]);

  const capacityOk =
    Boolean(planFlowId ? selectedPlan : selectedEvent) && capacity.ok;
  const packageOk = !requiresPackage || Boolean(packageId);
  const menuOk =
    !isMenuBuilder ||
    !selectedPackage ||
    menuCompleteForPackage(selectedPackage, menuSelections);
  const money = (amount: number) => formatDisplayPrice(amount, estimate.currency);
  const perGuestHint = service.pricingModel === "PER_GUEST";

  const selectPackage = (id: string) => {
    setPackageId((current) => (current === id ? "" : id));
    setMenuSelections({});
  };

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
          <h2 className="font-semibold">{t("marketplace.estimateTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("marketplace.estimateDesc")}</p>
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
                {t("marketplace.eventGuests", {
                  count: selectedPlan.estimatedAttendees ?? "—",
                })}
              </p>
              <p className="mt-1 font-medium text-sky-800 dark:text-sky-300">
                {selectedPlan.title}
              </p>
              {service.guestMin || service.guestMax ? (
                <p className="mt-1">
                  {t("marketplace.serviceCapacity", {
                    min: service.guestMin ?? "?",
                    max: service.guestMax ?? "?",
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {!planFlowId && selectedEvent ? (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Users className="h-3.5 w-3.5" />
                {t("marketplace.eventGuests", {
                  count: selectedEvent.estimatedAttendees ?? "—",
                })}
              </p>
              {service.guestMin || service.guestMax ? (
                <p className="mt-1">
                  {t("marketplace.serviceCapacity", {
                    min: service.guestMin ?? "?",
                    max: service.guestMax ?? "?",
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
                {t("marketplace.preferredStart")}
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
                {t("marketplace.preferredEnd")}
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
              {t("marketplace.checkingAvailability")}
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
                <span className="font-medium">{t("marketplace.softAvailability")}: </span>
                {availability.message}
              </span>
            </div>
          ) : null}

          {availability?.slots?.length ? (
            <SoftSlotPicker
              slots={availability.slots}
              selectedKey={selectedSlotKey}
              onSelect={onPickSlot}
              title={t("marketplace.preferredSlot")}
              hint={t("marketplace.preferredSlotHint")}
              unavailableLabel={t("marketplace.slotUnavailable")}
              clearLabel={t("marketplace.clearPreferredSlot")}
            />
          ) : null}

          {packages.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("marketplace.selectPackage")}
              </p>
              <ul className="space-y-2">
                {packages.map((pkg) => {
                  const active = packageId === pkg.id;
                  const unit = Number(pkg.price) || 0;
                  return (
                    <li key={pkg.id}>
                      <button
                        type="button"
                        onClick={() => selectPackage(pkg.id)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-card hover:border-primary/30",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
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
                            <span className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium">{pkg.name}</span>
                              <span className="shrink-0 text-sm font-semibold text-primary">
                                {money(unit)}
                                {perGuestHint ? (
                                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                    {t("marketplace.perGuest")}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                            {pkg.description ? (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                {pkg.description}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {isMenuBuilder && selectedPackage ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-start gap-2">
                <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{t("marketplace.customizeMenu")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("marketplace.customizeMenuHint")}
                  </p>
                </div>
              </div>

              {(selectedPackage.menuRules ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("marketplace.noMenuRules")}</p>
              ) : (
                (selectedPackage.menuRules ?? []).map((rule) => {
                  const options = menuOptionsForRule(rule, menuItems);
                  const selected = menuSelections[rule.course] ?? [];
                  return (
                    <div key={`${rule.course}-${rule.chooseCount}`} className="space-y-2">
                      <p className="text-xs font-medium">
                        {t("marketplace.chooseCourse", {
                          count: rule.chooseCount,
                          course: rule.course,
                          selected: selected.length,
                        })}
                      </p>
                      {options.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t("marketplace.noMenuItemsForCourse", { course: rule.course })}
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {options.map((item) => {
                            const checked = selected.includes(item.id);
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMenuSelections((prev) =>
                                      toggleMenuSelection(
                                        prev,
                                        rule.course,
                                        item.id,
                                        rule.chooseCount,
                                      ),
                                    )
                                  }
                                  className={cn(
                                    "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                                    checked
                                      ? "border-primary/40 bg-primary/5"
                                      : "border-border bg-card hover:border-primary/30",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                      checked
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-input",
                                    )}
                                  >
                                    {checked ? (
                                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                    ) : null}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium">
                                      {item.name}
                                    </span>
                                    {item.description ? (
                                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                        {item.description}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}

              {!menuOk ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t("marketplace.menuIncomplete")}
                </p>
              ) : null}
            </div>
          ) : null}

          {service.pricingModel === "HOURLY" && !packageId ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                {t("marketplace.durationHours")}
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

          {addOns.length > 0 ? (
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {t("marketplace.selectAddOns")}
              </p>
              <ul className="space-y-2">
                {addOns.map((addOn) => {
                  const active = Boolean(selectedAddOns[addOn.id]);
                  const price = Number(addOn.price) || 0;
                  return (
                    <li key={addOn.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAddOns((prev) => ({
                            ...prev,
                            [addOn.id]: !prev[addOn.id],
                          }))
                        }
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          active
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-card",
                        )}
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
                          <span className="block text-sm font-medium">{addOn.name}</span>
                          {addOn.description ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {addOn.description}
                            </span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {money(price)}
                            {perGuestHint ? ` ${t("marketplace.perGuest")}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("marketplace.estimateBreakdown")}
            </p>
            <ul className="space-y-1 text-sm">
              {estimate.lines.map((line, idx) => (
                <li key={`${line.label}-${idx}`} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{line.label}</span>
                  <span className="tabular-nums font-medium">{money(line.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-end justify-between border-t border-border pt-2">
              <span className="text-sm font-semibold">{t("marketplace.estimatedTotal")}</span>
              <span className="text-lg font-bold text-primary tabular-nums">
                {money(estimate.totalAmount)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("marketplace.estimateAutoHint")}
            </p>
          </div>

          <button
            type="button"
            disabled={
              busy ||
              !(planFlowId || eventId) ||
              !capacityOk ||
              !packageOk ||
              !menuOk ||
              estimate.totalAmount <= 0
            }
            onClick={async () => {
              if (!(planFlowId || eventId) || !capacityOk || !packageOk || !menuOk) return;
              setBusy(true);
              try {
                const menuLines: string[] = [];
                if (selectedPackage?.menuRules?.length) {
                  for (const rule of selectedPackage.menuRules) {
                    const ids = menuSelections[rule.course] ?? [];
                    const names = ids
                      .map((id) => menuItems.find((m) => m.id === id)?.name)
                      .filter(Boolean);
                    if (names.length) {
                      menuLines.push(`${rule.course}: ${names.join(", ")}`);
                    }
                  }
                }

                const noteLines = [
                  "Auto estimate",
                  selectedPackage ? `Package: ${selectedPackage.name}` : null,
                  ...menuLines,
                  ...estimate.lines.map(
                    (l) => `${l.label}: ${l.amount} ${estimate.currency}`,
                  ),
                  `Total: ${estimate.totalAmount} ${estimate.currency}`,
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
                  serviceId: service.id,
                  estimatedCost: estimate.totalAmount,
                  notes: noteLines.join("\n"),
                  ...(startIso ? { preferredStartAt: startIso } : {}),
                  ...(endIso ? { preferredEndAt: endIso } : {}),
                  bookingIntent: {
                    packageId: packageId || null,
                    packageName: selectedPackage?.name ?? null,
                    menuSelections,
                    addOnIds: Object.keys(selectedAddOns).filter((id) => selectedAddOns[id]),
                    durationHours,
                    guests,
                    ...(preferredSlot ? { preferredSlot } : {}),
                  },
                };
                const res = planFlowId
                  ? await addCalendarService(planFlowId, payload)
                  : replaceLineId
                    ? await replaceEventService(eventId, replaceLineId, payload)
                    : await addEventService(eventId, payload);
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
              : t("marketplace.addEstimateToEvent")}
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
