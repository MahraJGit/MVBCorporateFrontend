"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react";
import { CalendarPlanPanel } from "@/components/calendar/calendar-plan-panel";
import { FormSelect } from "@/components/form-select";
import { useAuth } from "@/features/auth/auth-context";
import { getCurrentBudget } from "@/features/budget/api";
import type { OrgFiscalBudget } from "@/features/budget/types";
import { listCalendarItems } from "@/features/calendar/api";
import type { CorporateCalendarItem } from "@/features/calendar/types";
import { eventStatusLabel, listEvents } from "@/features/events/api";
import {
  buildMonthCells,
  calendarStatusClasses,
  dateKey,
  eachDateKeyInWindow,
  eventSlotOnDay,
  isSameDay,
  isUpcomingWindow,
  isWeekend,
  parseDateKey,
  resolveEventWindow,
} from "@/features/events/calendar";
import type { CorporateEvent } from "@/features/events/types";
import { useLocale } from "@/features/i18n/locale-context";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CalendarMode = "month" | "year";

type ScheduledEvent = {
  kind: "event";
  event: CorporateEvent;
  start: Date;
  end: Date;
};

type ScheduledPlan = {
  kind: "plan";
  item: CorporateCalendarItem;
  start: Date;
  end: Date;
};

type ScheduledItem = ScheduledEvent | ScheduledPlan;

type PlanPanelState =
  | { mode: "create"; defaultStartKey: string | null }
  | { mode: "detail"; item: CorporateCalendarItem };

const EDIT_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

const PLAN_CHIP =
  "bg-sky-500/15 text-sky-800 hover:bg-sky-500/25 dark:bg-sky-500/20 dark:text-sky-300";
const PLAN_BAR = "bg-sky-500";
const PLAN_BADGE = "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300";

function weekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, index) =>
    new Date(2023, 0, 1 + index).toLocaleDateString(locale, { weekday: "short" }),
  );
}

function eventPlace(event: CorporateEvent) {
  return (
    event.locationPreference ||
    event.eventVenues?.[0]?.venue.name ||
    event.eventServices?.[0]?.service.title ||
    null
  );
}

function resolvePlanWindow(item: CorporateCalendarItem) {
  const startRaw = item.plannedStartAt ? new Date(item.plannedStartAt) : null;
  const endRaw = item.plannedEndAt ? new Date(item.plannedEndAt) : null;
  const start =
    startRaw && Number.isFinite(startRaw.getTime())
      ? startRaw
      : endRaw && Number.isFinite(endRaw.getTime())
        ? endRaw
        : null;
  if (!start) return null;
  const end =
    endRaw && Number.isFinite(endRaw.getTime()) && endRaw.getTime() >= start.getTime()
      ? endRaw
      : start;
  return { start, end };
}

export function WorkspaceCalendar() {
  const router = useRouter();
  const { locale } = useLocale();
  const { organizations } = useAuth();
  const canEdit = EDIT_ROLES.has(organizations[0]?.role ?? "COLLABORATOR");

  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(() => dateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CorporateEvent[]>([]);
  const [plans, setPlans] = useState<CorporateCalendarItem[]>([]);
  const [budget, setBudget] = useState<OrgFiscalBudget | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [showPlans, setShowPlans] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [planPanel, setPlanPanel] = useState<PlanPanelState | null>(null);

  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);
  const categories = budget?.categories ?? [];

  const refresh = useCallback(async () => {
    const [eventsRes, plansRes, budgetRes] = await Promise.all([
      listEvents({ limit: 100 }),
      listCalendarItems({ limit: 100 }),
      getCurrentBudget().catch(() => null),
    ]);
    setEvents(eventsRes.data);
    setPlans(
      plansRes.data.filter(
        (item) => item.status === "PLANNED" || item.status === "PROMOTED",
      ),
    );
    setBudget(budgetRes?.data ?? null);
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("dashboard.calendarLoadError")))
      .finally(() => setLoading(false));
  }, [refresh]);

  const filteredPlans = useMemo(() => {
    return plans.filter((item) => {
      if (categoryId && item.budgetCategoryId !== categoryId) return false;
      return true;
    });
  }, [plans, categoryId]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (categoryId && event.budgetCategoryId !== categoryId) return false;
      return true;
    });
  }, [events, categoryId]);

  const scheduled = useMemo<ScheduledItem[]>(() => {
    const rows: ScheduledItem[] = [];
    if (showEvents) {
      for (const event of filteredEvents) {
        const window = resolveEventWindow(event);
        if (!window) continue;
        rows.push({ kind: "event", event, start: window.start, end: window.end });
      }
    }
    if (showPlans) {
      for (const item of filteredPlans) {
        const window = resolvePlanWindow(item);
        if (!window) continue;
        rows.push({ kind: "plan", item, start: window.start, end: window.end });
      }
    }
    return rows;
  }, [filteredEvents, filteredPlans, showEvents, showPlans]);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduledItem[]>();
    for (const row of scheduled) {
      for (const key of eachDateKeyInWindow({ start: row.start, end: row.end })) {
        const list = map.get(key) ?? [];
        list.push(row);
        map.set(key, list);
      }
    }
    return map;
  }, [scheduled]);

  const upcoming = useMemo(
    () =>
      scheduled
        .filter((row) => {
          if (row.kind === "event") {
            return (
              row.event.status !== "CANCELLED" &&
              row.event.status !== "REJECTED" &&
              isUpcomingWindow({ start: row.start, end: row.end })
            );
          }
          return (
            row.item.status !== "CANCELLED" &&
            isUpcomingWindow({ start: row.start, end: row.end })
          );
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, 6),
    [scheduled],
  );

  const undated = useMemo(
    () =>
      showEvents
        ? filteredEvents.filter(
            (event) =>
              !resolveEventWindow(event) &&
              event.status !== "CANCELLED" &&
              event.status !== "REJECTED",
          )
        : [],
    [filteredEvents, showEvents],
  );

  const undatedPlans = useMemo(
    () =>
      showPlans
        ? filteredPlans.filter((item) => !resolvePlanWindow(item) && item.status === "PLANNED")
        : [],
    [filteredPlans, showPlans],
  );

  const monthCount = useMemo(() => {
    const seen = new Set<string>();
    for (const row of scheduled) {
      if (row.kind === "event") {
        if (row.event.status === "CANCELLED" || row.event.status === "REJECTED") continue;
      } else if (row.item.status === "CANCELLED") {
        continue;
      }
      for (const key of eachDateKeyInWindow({ start: row.start, end: row.end })) {
        const date = parseDateKey(key);
        if (date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth()) {
          seen.add(row.kind === "event" ? row.event.id : row.item.id);
        }
      }
    }
    return seen.size;
  }, [scheduled, cursor]);

  const title =
    mode === "year"
      ? String(cursor.getFullYear())
      : cursor.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const go = (dir: "prev" | "next" | "today") => {
    if (dir === "today") {
      const now = new Date();
      setCursor(now);
      setSelectedKey(dateKey(now));
      setMode("month");
      return;
    }
    setCursor((current) => {
      const next = new Date(current);
      if (mode === "year") {
        next.setFullYear(current.getFullYear() + (dir === "next" ? 1 : -1));
      } else {
        next.setMonth(current.getMonth() + (dir === "next" ? 1 : -1));
      }
      return next;
    });
  };

  const openEvent = (id: string) => {
    setPlanPanel(null);
    router.push(`/dashboard/events/${id}`);
  };

  const openPlan = (item: CorporateCalendarItem) => {
    setPlanPanel({ mode: "detail", item });
  };

  const openNewPlan = () => {
    setPlanPanel({ mode: "create", defaultStartKey: selectedKey });
  };

  const selectedDate = selectedKey ? parseDateKey(selectedKey) : null;
  const selectedItems = selectedKey ? (byDay.get(selectedKey) ?? []) : [];
  const showingDay = Boolean(selectedKey);

  const upsertPlan = (item: CorporateCalendarItem) => {
    setPlans((prev) => {
      const next = prev.filter((row) => row.id !== item.id);
      if (item.status === "PLANNED" || item.status === "PROMOTED") next.unshift(item);
      return next;
    });
    if (item.status === "PLANNED" || item.status === "PROMOTED") {
      setPlanPanel({ mode: "detail", item });
    } else {
      setPlanPanel(null);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
      <section className="min-w-0 overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_24px_60px_-32px_rgba(0,0,0,0.45)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-linear-to-br from-primary/10 via-transparent to-transparent px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex overflow-hidden rounded-xl border border-border/80 bg-background/80">
              <button
                type="button"
                onClick={() => go("prev")}
                className="inline-flex h-10 w-10 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={t("dashboard.calendarPrev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => go("next")}
                className="inline-flex h-10 w-10 items-center justify-center border-l border-border/80 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={t("dashboard.calendarNext")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-tight">{title}</h2>
              {mode === "month" ? (
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.calendarThisMonth", { count: monthCount })}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={openNewPlan}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                {t("dashboard.calendarNewPlan")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => go("today")}
              className="inline-flex h-10 items-center rounded-xl border border-border bg-background/80 px-3 text-sm font-medium hover:bg-accent"
            >
              {t("dashboard.calendarToday")}
            </button>
            <div className="flex rounded-xl border border-border bg-background/80 p-1">
              {(
                [
                  ["month", t("dashboard.calendarMonth")],
                  ["year", t("dashboard.calendarYear")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={cn(
                    "h-8 rounded-lg px-3.5 text-xs font-semibold transition-colors",
                    mode === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3 sm:px-5">
          {categories.length ? (
            <div className="min-w-44 flex-1 sm:max-w-xs">
              <FormSelect
                value={categoryId || "__all__"}
                onValueChange={(value) =>
                  setCategoryId(value === "__all__" ? "" : value)
                }
                options={[
                  { value: "__all__", label: t("dashboard.calendarAllCategories") },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder={t("dashboard.calendarFilterCategory")}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPlans((v) => !v)}
              aria-pressed={showPlans}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                showPlans
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  showPlans ? "bg-sky-500" : "bg-muted-foreground/40",
                )}
              />
              {t("dashboard.calendarShowPlans")}
            </button>
            <button
              type="button"
              onClick={() => setShowEvents((v) => !v)}
              aria-pressed={showEvents}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                showEvents
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  showEvents ? "bg-primary" : "bg-muted-foreground/40",
                )}
              />
              {t("dashboard.calendarShowEvents")}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-28 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("dashboard.loading")}
          </p>
        ) : mode === "month" ? (
          <MonthBoard
            locale={locale}
            year={cursor.getFullYear()}
            month={cursor.getMonth()}
            today={today}
            selectedKey={selectedKey}
            byDay={byDay}
            onSelectDay={(key) => {
              setSelectedKey(key);
              if (planPanel?.mode === "create") {
                setPlanPanel({ mode: "create", defaultStartKey: key });
              }
            }}
            onOpenEvent={openEvent}
            onOpenPlan={openPlan}
          />
        ) : (
          <YearBoard
            locale={locale}
            year={cursor.getFullYear()}
            today={today}
            byDay={byDay}
            onOpenMonth={(month, dayKey) => {
              setCursor(new Date(cursor.getFullYear(), month, 1));
              if (dayKey) setSelectedKey(dayKey);
              setMode("month");
            }}
          />
        )}

        <footer className="flex flex-wrap items-center gap-4 border-t border-border/70 px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
          {(
            [
              ["APPROVED", t("events.statusApproved")],
              ["PENDING_APPROVAL", t("events.statusPendingApproval")],
              ["DRAFT", t("events.statusDraft")],
            ] as const
          ).map(([status, label]) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", calendarStatusClasses(status).dot)} />
              {label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            {t("dashboard.calendarPlanned")}
          </span>
        </footer>
      </section>

      <aside className="space-y-4">
        {planPanel ? (
          <CalendarPlanPanel
            mode={planPanel.mode}
            item={planPanel.mode === "detail" ? planPanel.item : null}
            defaultStartKey={
              planPanel.mode === "create" ? planPanel.defaultStartKey : selectedKey
            }
            canEdit={canEdit}
            onClose={() => setPlanPanel(null)}
            onSaved={upsertPlan}
            onDeleted={(id) => {
              setPlans((prev) => prev.filter((row) => row.id !== id));
              setPlanPanel(null);
            }}
          />
        ) : (
          <section className="rounded-3xl border border-border/80 bg-card p-5 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {showingDay ? t("dashboard.calendarDayAgenda") : t("dashboard.calendarUpcoming")}
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
                  {showingDay && selectedDate
                    ? selectedDate.toLocaleDateString(locale, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : upcoming.length
                      ? t("dashboard.calendarUpcomingCount", { count: upcoming.length })
                      : t("dashboard.calendarUpcoming")}
                </h2>
              </div>
              {showingDay && selectedKey !== todayKey ? (
                <button
                  type="button"
                  onClick={() => setSelectedKey(todayKey)}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  {t("dashboard.calendarToday")}
                </button>
              ) : null}
            </div>

            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard.loading")}
              </p>
            ) : showingDay ? (
              selectedItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard.calendarSelectedEmpty")}</p>
              ) : (
                <ul className="space-y-2.5">
                  {selectedItems.map((row) =>
                    row.kind === "event" ? (
                      <UpcomingRow
                        key={`e-${row.event.id}`}
                        event={row.event}
                        start={row.start}
                        end={row.end}
                        locale={locale}
                        day={selectedDate ?? row.start}
                        onOpen={() => openEvent(row.event.id)}
                      />
                    ) : (
                      <PlanRow
                        key={`p-${row.item.id}`}
                        item={row.item}
                        start={row.start}
                        end={row.end}
                        locale={locale}
                        day={selectedDate ?? row.start}
                        onOpen={() => openPlan(row.item)}
                      />
                    ),
                  )}
                </ul>
              )
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.calendarUpcomingEmpty")}</p>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((row) =>
                  row.kind === "event" ? (
                    <UpcomingRow
                      key={`e-${row.event.id}`}
                      event={row.event}
                      start={row.start}
                      end={row.end}
                      locale={locale}
                      onOpen={() => openEvent(row.event.id)}
                    />
                  ) : (
                    <PlanRow
                      key={`p-${row.item.id}`}
                      item={row.item}
                      start={row.start}
                      end={row.end}
                      locale={locale}
                      onOpen={() => openPlan(row.item)}
                    />
                  ),
                )}
              </ul>
            )}
          </section>
        )}

        {undated.length > 0 ? (
          <section className="rounded-3xl border border-border/80 bg-card p-5">
            <h2 className="text-sm font-semibold">{t("dashboard.calendarUndated")}</h2>
            <ul className="mt-3 space-y-2">
              {undated.slice(0, 5).map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => openEvent(event.id)}
                    className="w-full rounded-2xl border border-dashed border-border px-3 py-2.5 text-left hover:border-primary/40 hover:bg-accent/50"
                  >
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("dashboard.calendarNoDates")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {undatedPlans.length > 0 ? (
          <section className="rounded-3xl border border-border/80 bg-card p-5">
            <h2 className="text-sm font-semibold">{t("dashboard.calendarUndatedPlans")}</h2>
            <ul className="mt-3 space-y-2">
              {undatedPlans.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openPlan(item)}
                    className="w-full rounded-2xl border border-dashed border-sky-500/30 px-3 py-2.5 text-left hover:border-sky-500/50 hover:bg-sky-500/5"
                  >
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("dashboard.calendarNoDates")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && events.length === 0 && plans.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
            <CalendarDays className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium">{t("events.empty")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("events.emptyDesc")}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function MonthBoard({
  locale,
  year,
  month,
  today,
  selectedKey,
  byDay,
  onSelectDay,
  onOpenEvent,
  onOpenPlan,
}: {
  locale: string;
  year: number;
  month: number;
  today: Date;
  selectedKey: string | null;
  byDay: Map<string, ScheduledItem[]>;
  onSelectDay: (key: string) => void;
  onOpenEvent: (id: string) => void;
  onOpenPlan: (item: CorporateCalendarItem) => void;
}) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const labels = weekdayLabels(locale);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border/70 bg-muted/25">
        {labels.map((label) => (
          <div
            key={label}
            className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" role="grid">
        {cells.map((cell) => {
          const items = byDay.get(cell.key) ?? [];
          const isToday = isSameDay(cell.date, today);
          const selected = selectedKey === cell.key;
          const visible = items.slice(0, 3);
          const extra = items.length - visible.length;
          return (
            <div
              key={cell.key}
              role="gridcell"
              aria-selected={selected}
              onClick={() => onSelectDay(cell.key)}
              className={cn(
                "min-h-28 cursor-pointer border-b border-r border-border/60 p-1.5 text-left transition-colors sm:min-h-32 sm:p-2",
                !cell.inMonth && "bg-muted/20",
                cell.inMonth && isWeekend(cell.date) && "bg-muted/10",
                selected && "bg-primary/8 ring-1 ring-inset ring-primary/40",
                isToday && !selected && "bg-primary/5",
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                    !cell.inMonth && "text-muted-foreground/45",
                    isToday && "bg-primary text-primary-foreground shadow-sm",
                  )}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {visible.map((row) => {
                  if (row.kind === "plan") {
                    return (
                      <button
                        key={`${cell.key}-p-${row.item.id}`}
                        type="button"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          onOpenPlan(row.item);
                        }}
                        className={cn(
                          "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-semibold leading-tight",
                          PLAN_CHIP,
                        )}
                      >
                        <span className={cn("h-3 w-0.5 shrink-0 rounded-full", PLAN_BAR)} />
                        <span className="truncate">{row.item.title}</span>
                      </button>
                    );
                  }
                  const tone = calendarStatusClasses(row.event.status);
                  const slot = eventSlotOnDay(row.start, row.end, cell.date, locale);
                  return (
                    <button
                      key={`${cell.key}-e-${row.event.id}`}
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        onOpenEvent(row.event.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-semibold leading-tight",
                        tone.chip,
                      )}
                    >
                      <span className={cn("h-3 w-0.5 shrink-0 rounded-full", tone.bar)} />
                      {slot.label ? (
                        <span className="hidden shrink-0 tabular-nums opacity-80 sm:inline">
                          {slot.label}
                        </span>
                      ) : null}
                      <span className="truncate">{row.event.title}</span>
                    </button>
                  );
                })}
                {extra > 0 ? (
                  <p className="px-1 text-[10px] font-medium text-muted-foreground">
                    {t("dashboard.calendarMore", { count: extra })}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearBoard({
  locale,
  year,
  today,
  byDay,
  onOpenMonth,
}: {
  locale: string;
  year: number;
  today: Date;
  byDay: Map<string, ScheduledItem[]>;
  onOpenMonth: (month: number, dayKey?: string) => void;
}) {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 12 }, (_, month) => {
        const cells = buildMonthCells(year, month);
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, {
          month: "long",
        });
        const monthEventCount = new Set(
          cells.flatMap((cell) =>
            cell.inMonth
              ? (byDay.get(cell.key) ?? []).map((row) =>
                  row.kind === "event" ? row.event.id : row.item.id,
                )
              : [],
          ),
        ).size;
        return (
          <div
            key={month}
            className={cn(
              "rounded-2xl border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
              isCurrentMonth ? "border-primary/40 bg-primary/6" : "border-border/70 bg-background/30",
            )}
          >
            <button
              type="button"
              onClick={() => onOpenMonth(month)}
              className="mb-3 flex w-full items-baseline justify-between text-left"
            >
              <p className="text-sm font-semibold">{monthLabel}</p>
              {monthEventCount > 0 ? (
                <span className="text-[10px] font-semibold text-primary">
                  {t("dashboard.calendarThisMonth", { count: monthEventCount })}
                </span>
              ) : null}
            </button>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const count = cell.inMonth ? (byDay.get(cell.key)?.length ?? 0) : 0;
                const isToday = isSameDay(cell.date, today);
                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!cell.inMonth}
                    title={
                      cell.inMonth
                        ? cell.date.toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                          })
                        : undefined
                    }
                    onClick={() => onOpenMonth(month, cell.key)}
                    className={cn(
                      "aspect-square w-full rounded-lg transition-transform hover:scale-110",
                      !cell.inMonth && "bg-transparent",
                      cell.inMonth && count === 0 && "bg-muted",
                      cell.inMonth && count === 1 && "bg-primary/40",
                      cell.inMonth && count === 2 && "bg-primary/70",
                      cell.inMonth && count >= 3 && "bg-primary",
                      isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                    )}
                    aria-label={cell.date.toLocaleDateString(locale)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpcomingRow({
  event,
  start,
  end,
  locale,
  day,
  onOpen,
}: {
  event: CorporateEvent;
  start: Date;
  end: Date;
  locale: string;
  day?: Date;
  onOpen: () => void;
}) {
  const tone = calendarStatusClasses(event.status);
  const sameDay = dateKey(start) === dateKey(end);
  const slot = eventSlotOnDay(start, end, day ?? start, locale);
  const range = sameDay
    ? slot.label
    : `${start.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric" })}`;
  const place = eventPlace(event);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full gap-3 rounded-2xl border border-border/80 bg-background/50 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40"
    >
      <div
        className={cn(
          "flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-2xl",
          tone.badge,
        )}
      >
        <span className="text-[10px] font-semibold uppercase leading-none opacity-80">
          {start.toLocaleDateString(locale, { month: "short" })}
        </span>
        <span className="text-lg font-bold leading-none">{start.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-snug">{event.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {range || t("dashboard.calendarAllDay")}
          {" · "}
          {eventStatusLabel(event.status)}
        </p>
        {place ? (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {place}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function PlanRow({
  item,
  start,
  end,
  locale,
  day,
  onOpen,
}: {
  item: CorporateCalendarItem;
  start: Date;
  end: Date;
  locale: string;
  day?: Date;
  onOpen: () => void;
}) {
  const sameDay = dateKey(start) === dateKey(end);
  const slot = eventSlotOnDay(start, end, day ?? start, locale);
  const range = sameDay
    ? slot.label
    : `${start.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric" })}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full gap-3 rounded-2xl border border-sky-500/25 bg-sky-500/5 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-sky-500/10"
    >
      <div
        className={cn(
          "flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-2xl",
          PLAN_BADGE,
        )}
      >
        <span className="text-[10px] font-semibold uppercase leading-none opacity-80">
          {start.toLocaleDateString(locale, { month: "short" })}
        </span>
        <span className="text-lg font-bold leading-none">{start.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-snug">{item.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {range || t("dashboard.calendarAllDay")}
          {" · "}
          {t("dashboard.calendarPlanned")}
          {item.estimatedAttendees
            ? ` · ${t("dashboard.calendarAttendees", { count: item.estimatedAttendees })}`
            : ""}
        </p>
      </div>
    </button>
  );
}
