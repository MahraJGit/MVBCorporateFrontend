"use client";

import { Check } from "lucide-react";
import {
  formatSlotLabel,
  slotKey,
  type SoftAvailabilitySlot,
} from "@/features/availability/api";
import { cn } from "@/lib/utils";

type Props = {
  slots: SoftAvailabilitySlot[];
  selectedKey: string | null;
  onSelect: (slot: SoftAvailabilitySlot | null) => void;
  title: string;
  hint: string;
  unavailableLabel: string;
  clearLabel: string;
};

export function SoftSlotPicker({
  slots,
  selectedKey,
  onSelect,
  title,
  hint,
  unavailableLabel,
  clearLabel,
}: Props) {
  if (slots.length === 0) return null;

  const ordered = [...slots].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return `${a.date ?? ""}${a.startTime}`.localeCompare(`${b.date ?? ""}${b.startTime}`);
  });

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
        {ordered.map((slot) => {
          const key = slotKey(slot);
          const active = selectedKey === key;
          const label = formatSlotLabel(slot);
          const datePrefix =
            slot.date && ordered.some((s) => s.date && s.date !== slot.date)
              ? `${slot.date} · `
              : "";
          return (
            <li key={key}>
              <button
                type="button"
                disabled={!slot.available}
                onClick={() => onSelect(active ? null : slot)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                  !slot.available && "cursor-not-allowed opacity-50",
                  active
                    ? "border-primary/40 bg-primary/5"
                    : slot.available
                      ? "border-border bg-card hover:border-primary/30"
                      : "border-border bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">
                    {datePrefix}
                    {label}
                  </span>
                  {!slot.available ? (
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {unavailableLabel}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selectedKey ? (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}
