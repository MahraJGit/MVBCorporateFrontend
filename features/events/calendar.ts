import type { CorporateEvent, CorporateEventStatus } from "./types";

export type EventScheduleWindow = {
  start: Date;
  end: Date;
};

function asDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function formatClock(date: Date, locale: string) {
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

/** Midnight UTC (or local) usually means a date-only event, not a 00:00 start. */
export function isDateOnlyInstant(date: Date) {
  return (
    (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) ||
    (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0)
  );
}

/** Time shown on a given calendar day: clock, starts/ends, or all-day continuation. */
export function eventSlotOnDay(
  start: Date,
  end: Date,
  day: Date,
  locale: string,
): { kind: "timed" | "starts" | "ends" | "allDay"; label: string } {
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  const dayKey = dateKey(day);
  if (isDateOnlyInstant(start)) {
    return { kind: "allDay", label: "" };
  }
  if (startKey === endKey) {
    return { kind: "timed", label: formatClock(start, locale) };
  }
  if (dayKey === startKey) {
    return { kind: "starts", label: formatClock(start, locale) };
  }
  if (dayKey === endKey) {
    return { kind: "ends", label: formatClock(end, locale) };
  }
  return { kind: "allDay", label: "" };
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

/** Inclusive start/end from proposed dates and planned venue/service windows. */
export function resolveEventWindow(event: CorporateEvent): EventScheduleWindow | null {
  const starts: Date[] = [];
  const ends: Date[] = [];

  const proposedStart = asDate(event.proposedStartAt);
  const proposedEnd = asDate(event.proposedEndAt);
  if (proposedStart) starts.push(proposedStart);
  if (proposedEnd) ends.push(proposedEnd);

  for (const line of [...(event.eventVenues ?? []), ...(event.eventServices ?? [])]) {
    const lineStart = asDate(line.preferredStartAt);
    const lineEnd = asDate(line.preferredEndAt);
    if (lineStart) starts.push(lineStart);
    if (lineEnd) ends.push(lineEnd);
  }

  if (!starts.length && !ends.length) return null;

  const start = new Date(Math.min(...(starts.length ? starts : ends).map((d) => d.getTime())));
  const end = new Date(
    Math.max(...(ends.length ? ends : starts).map((d) => d.getTime()), start.getTime()),
  );
  return { start, end };
}

export function eachDateKeyInWindow(window: EventScheduleWindow): string[] {
  const keys: string[] = [];
  let cursor = startOfDay(window.start);
  const last = startOfDay(window.end);
  while (cursor.getTime() <= last.getTime()) {
    keys.push(dateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function isUpcomingWindow(window: EventScheduleWindow, now = new Date()) {
  return window.end.getTime() >= startOfDay(now).getTime();
}

export function calendarStatusClasses(status: CorporateEventStatus) {
  switch (status) {
    case "APPROVED":
      return {
        chip: "bg-primary/15 text-primary",
        bar: "bg-primary",
        dot: "bg-primary",
        badge: "bg-primary text-primary-foreground",
      };
    case "PENDING_APPROVAL":
      return {
        chip: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        bar: "bg-amber-500",
        dot: "bg-amber-500",
        badge: "bg-amber-500 text-white",
      };
    case "REJECTED":
    case "CANCELLED":
      return {
        chip: "bg-destructive/15 text-destructive",
        bar: "bg-destructive",
        dot: "bg-destructive",
        badge: "bg-destructive text-white",
      };
    default:
      return {
        chip: "bg-muted text-muted-foreground",
        bar: "bg-slate-400",
        dot: "bg-slate-400",
        badge: "bg-slate-500 text-white",
      };
  }
}

export type MonthCell = {
  date: Date;
  key: string;
  inMonth: boolean;
};

export function buildMonthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date,
      key: dateKey(date),
      inMonth: date.getMonth() === month,
    };
  });
}
