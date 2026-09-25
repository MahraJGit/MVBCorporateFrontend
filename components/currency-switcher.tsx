"use client";

import { Coins } from "lucide-react";
import { FormSelect } from "@/components/form-select";
import {
  CURRENCY_OPTIONS,
  useCurrency,
  type CurrencyCode,
} from "@/features/currency/currency-context";
import { useLocale } from "@/features/i18n/locale-context";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Show code only (e.g. AED). Default shows "AED · UAE Dirham". */
  compact?: boolean;
  /** Render a label above the dropdown. */
  labeled?: boolean;
};

export function CurrencySwitcher({ className, compact, labeled }: Props) {
  const { t } = useLocale();
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  const options = CURRENCY_OPTIONS.map((c) => ({
    value: c.code,
    label: compact ? c.code : `${c.code} · ${c.label}`,
  }));

  return (
    <div className={cn("w-full", className)}>
      {labeled ? (
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("currency.label")}
        </p>
      ) : null}
      <div className="relative">
        <Coins className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <FormSelect
          value={displayCurrency}
          onValueChange={(v) => setDisplayCurrency(v as CurrencyCode)}
          options={options}
          placeholder={t("currency.label")}
          className="[&_button]:h-9 [&_button]:w-full [&_button]:rounded-lg [&_button]:pl-8 [&_button]:text-xs"
        />
      </div>
    </div>
  );
}
