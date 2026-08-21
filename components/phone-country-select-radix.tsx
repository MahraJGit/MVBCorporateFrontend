"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CountryOption = {
  value?: string;
  label: string;
  divider?: boolean;
};

type FlagComponentProps = {
  country?: string;
  label: string;
  "aria-hidden"?: boolean;
  aspectRatio?: number;
};

function isSameOptionValue(v1: string | undefined | null, v2: string | undefined | null) {
  if (v1 === undefined || v1 === null) return v2 === undefined || v2 === null;
  return v1 === v2;
}

function getSelectedOption(options: CountryOption[], value: string | undefined) {
  for (const option of options) {
    if (option.divider) continue;
    if (isSameOptionValue(option.value, value)) return option;
  }
  return undefined;
}

function optionToRadixValue(option: CountryOption) {
  if (option.divider) return "";
  return option.value ?? "ZZ";
}

function resolveRadixValue(options: CountryOption[], country: string | undefined) {
  for (const o of options) {
    if (o.divider) continue;
    if (isSameOptionValue(o.value, country)) return optionToRadixValue(o);
  }
  for (const o of options) {
    if (!o.divider) return optionToRadixValue(o);
  }
  return "";
}

export function PhoneCountrySelectRadix(props: {
  name?: string;
  "aria-label"?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  options: CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
  iconComponent: React.ComponentType<FlagComponentProps>;
  className?: string;
}) {
  const {
    name,
    "aria-label": ariaLabel,
    value,
    onChange,
    onFocus,
    onBlur,
    options,
    disabled,
    readOnly,
    iconComponent: Icon,
    className,
  } = props;

  const selectedOption = React.useMemo(
    () => getSelectedOption(options, value),
    [options, value],
  );
  const fallbackCountryOption = React.useMemo(
    () => options.find((o) => !o.divider),
    [options],
  );
  const iconOption = selectedOption ?? fallbackCountryOption;
  const radixValue = React.useMemo(
    () => resolveRadixValue(options, value),
    [options, value],
  );

  return (
    <div className="PhoneInputCountry">
      <SelectPrimitive.Root
        name={name}
        value={radixValue}
        onValueChange={(next) => onChange(next === "ZZ" ? undefined : next)}
        disabled={!!(disabled || readOnly)}
      >
        <SelectPrimitive.Trigger
          aria-label={ariaLabel}
          onFocus={onFocus}
          onBlur={onBlur}
          type="button"
          className={cn(
            "PhoneInputCountrySelectTrigger flex shrink-0 items-center gap-0 rounded-md px-1 py-0.5 outline-none",
            "hover:bg-accent/50 data-placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-50",
            className,
          )}
        >
          {iconOption ? (
            <Icon
              aria-hidden
              country={selectedOption !== undefined ? value : fallbackCountryOption?.value}
              label={iconOption.label}
            />
          ) : null}
          <span className="PhoneInputCountrySelectArrow inline-block shrink-0" />
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            align="start"
            sideOffset={6}
            className={cn(
              "z-[300] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            )}
          >
            <SelectPrimitive.Viewport className="max-h-[min(360px,calc(100vh-120px))] overflow-y-auto bg-card p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-track]:bg-muted/40">
              {options.map((option, idx) => {
                if (option.divider) {
                  return (
                    <div key={`divider-${idx}`} role="presentation" className="my-1 h-px bg-border" />
                  );
                }
                const itemValue = optionToRadixValue(option);
                return (
                  <SelectPrimitive.Item
                    key={`${itemValue}-${idx}-${option.label}`}
                    value={itemValue}
                    className="relative flex cursor-pointer items-center rounded-sm bg-card py-2 pr-8 pl-2 text-sm text-foreground outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  >
                    <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-primary">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText asChild>
                      <span className="flex items-center gap-3 pr-6">
                        <span
                          aria-hidden
                          className="inline-flex size-7.5 shrink-0 items-center justify-center [&_.PhoneInputCountryIcon]:rounded-[2px] [&_.PhoneInputCountryIcon]:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] [&_.PhoneInputCountryIconImg]:rounded-[2px]"
                        >
                          <Icon aria-hidden country={option.value} label={option.label} />
                        </span>
                        <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
                      </span>
                    </SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
