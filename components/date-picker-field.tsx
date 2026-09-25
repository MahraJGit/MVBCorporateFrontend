"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export function parseIsoDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function formatDisplay(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildCalendarDays(viewYear: number, viewMonth: number) {
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<{ day: number; inMonth: boolean; date: Date }> = [];

  for (let i = 0; i < startOffset; i += 1) {
    const d = new Date(viewYear, viewMonth, -startOffset + i + 1);
    cells.push({ day: d.getDate(), inMonth: false, date: d });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      inMonth: true,
      date: new Date(viewYear, viewMonth, day),
    });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ day: next.getDate(), inMonth: false, date: next });
  }
  return cells;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type DatePickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  "aria-invalid"?: boolean;
};

export function DatePickerField({
  value,
  onChange,
  disabled,
  id,
  placeholder = "Pick a date",
  className,
  minDate,
  maxDate,
  "aria-invalid": ariaInvalid,
}: DatePickerFieldProps) {
  const selected = parseIsoDate(value);
  const today = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => {
    const base = selected ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  React.useEffect(() => {
    const parsed = parseIsoDate(value);
    if (parsed) {
      setView({ year: parsed.getFullYear(), month: parsed.getMonth() });
    }
  }, [value]);

  const cells = buildCalendarDays(view.year, view.month);

  const isDisabledDay = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const selectDay = (date: Date) => {
    if (isDisabledDay(date)) return;
    onChange(toIsoDate(date.getFullYear(), date.getMonth(), date.getDate()));
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          aria-invalid={ariaInvalid}
          className={cn(
            "relative flex h-11 w-full items-center rounded-lg border border-input bg-card pl-10 pr-3 text-left text-sm shadow-sm transition-colors",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
            !value && "text-muted-foreground",
            ariaInvalid && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className,
          )}
        >
          <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          {formatDisplay(value) ?? placeholder}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-[300] w-[min(100vw-2rem,20rem)] rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() =>
                setView((v) => {
                  const d = new Date(v.year, v.month - 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">
              {MONTHS[view.month]} {view.year}
            </p>
            <button
              type="button"
              aria-label="Next month"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() =>
                setView((v) => {
                  const d = new Date(v.year, v.month + 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const disabledDay = isDisabledDay(cell.date);
              const isSelected = selected ? isSameDay(cell.date, selected) : false;
              const isToday = isSameDay(cell.date, today);

              return (
                <button
                  key={cell.date.toISOString()}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => selectDay(cell.date)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md text-sm transition-colors",
                    !cell.inMonth && "text-muted-foreground/40",
                    cell.inMonth && !isSelected && "text-foreground hover:bg-accent",
                    isToday && !isSelected && "ring-1 ring-primary/40",
                    isSelected && "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                    disabledDay && "pointer-events-none opacity-30",
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {value ? (
            <button
              type="button"
              className="mt-3 w-full rounded-md py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear date
            </button>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
