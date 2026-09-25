"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  icon?: LucideIcon;
  "aria-invalid"?: boolean;
};

export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  id,
  className,
  icon: Icon,
  "aria-invalid": ariaInvalid,
}: FormSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <SelectPrimitive.Root
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-invalid={ariaInvalid}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "data-[placeholder]:text-muted-foreground",
            ariaInvalid && "border-destructive focus:border-destructive focus:ring-destructive/20",
            Icon && "pl-10",
          )}
        >
          {Icon ? (
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          ) : null}
          <SelectPrimitive.Value placeholder={placeholder} className="truncate" />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-70" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            align="start"
            className={cn(
              "z-[300] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "min-w-[var(--radix-select-trigger-width)]",
            )}
          >
            <SelectPrimitive.Viewport className="max-h-[min(280px,calc(100vh-120px))] overflow-y-auto p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-track]:bg-muted/40">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex cursor-pointer select-none items-center rounded-md py-2.5 pr-9 pl-3 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                >
                  <span className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center text-primary">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
