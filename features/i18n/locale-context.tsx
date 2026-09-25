"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyDocumentLocale,
  detectLocale,
  t as translate,
  type AppLocale,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = detectLocale();
    applyDocumentLocale(initial);
    setLocaleState(initial);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    applyDocumentLocale(next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(key, params, locale),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  // Avoid flashing wrong language before stored locale is applied.
  if (!ready) {
    return (
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: detectLocale(),
      setLocale: (next: AppLocale) => applyDocumentLocale(next),
      t: (key: string, params?: Record<string, string | number>) =>
        translate(key, params),
    } satisfies LocaleContextValue;
  }
  return ctx;
}
