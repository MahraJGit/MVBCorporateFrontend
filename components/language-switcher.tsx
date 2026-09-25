"use client";

import { Languages } from "lucide-react";
import { FormSelect } from "@/components/form-select";
import { useLocale } from "@/features/i18n/locale-context";
import { SUPPORTED_LOCALES, type AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Native name only. Default includes English label too. */
  compact?: boolean;
  /** Render a label above the dropdown. */
  labeled?: boolean;
};

export function LanguageSwitcher({ className, compact, labeled }: Props) {
  const { locale, setLocale, t } = useLocale();

  const options = SUPPORTED_LOCALES.map((l) => ({
    value: l.code,
    label: compact ? l.nativeLabel : `${l.nativeLabel} · ${l.label}`,
  }));

  return (
    <div className={cn("w-full", className)}>
      {labeled ? (
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("language.label")}
        </p>
      ) : null}
      <div className="relative">
        <Languages className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <FormSelect
          value={locale}
          onValueChange={(v) => setLocale(v as AppLocale)}
          options={options}
          placeholder={t("language.label")}
          className="[&_button]:h-9 [&_button]:w-full [&_button]:rounded-lg [&_button]:pl-8 [&_button]:text-xs"
        />
      </div>
    </div>
  );
}
