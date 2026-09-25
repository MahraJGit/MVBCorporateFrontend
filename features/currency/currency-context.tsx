"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchExchangeRates, readCachedRates } from "./api";
import {
  CURRENCY_OPTIONS,
  DISPLAY_CURRENCY_STORAGE_KEY,
  EXCHANGE_RATES_STALE_MS,
  RATE_BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "./constants";
import {
  convertAmount,
  formatMoney,
  normalizeCurrencyCode,
  toFiniteAmount,
  type ExchangeRates,
} from "./convert";

export type DisplayPriceResult = {
  formatted: string;
  chargeFormatted: string;
  convertedAmount: number;
  sourceAmount: number;
  sourceCurrency: string;
  displayCurrency: CurrencyCode;
  isConverted: boolean;
};

type CurrencyContextValue = {
  displayCurrency: CurrencyCode;
  setDisplayCurrency: (currency: CurrencyCode) => void;
  rates: ExchangeRates;
  ratesLoading: boolean;
  convert: (amount: number | string, from: string, to?: string) => number;
  formatDisplayPrice: (amount: number | string, sourceCurrency: string) => string;
  getDisplayPrice: (
    amount: number | string,
    sourceCurrency: string,
  ) => DisplayPriceResult;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readStoredDisplayCurrency(): CurrencyCode {
  if (typeof window === "undefined") return RATE_BASE_CURRENCY;
  try {
    const stored = localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
    if (stored && SUPPORTED_CURRENCIES.includes(stored as CurrencyCode)) {
      return stored as CurrencyCode;
    }
  } catch {
    // ignore
  }
  return RATE_BASE_CURRENCY;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] =
    useState<CurrencyCode>(RATE_BASE_CURRENCY);
  const [rates, setRates] = useState<ExchangeRates>(() => readCachedRates()?.rates ?? {});
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    setDisplayCurrencyState(readStoredDisplayCurrency());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = readCachedRates();
    if (cached?.rates) setRates(cached.rates);

    const stale =
      !cached ||
      Date.now() - new Date(cached.date).getTime() > EXCHANGE_RATES_STALE_MS;

    if (!stale && cached) return;

    setRatesLoading(true);
    void fetchExchangeRates(RATE_BASE_CURRENCY)
      .then((data) => {
        if (!cancelled) setRates(data.rates);
      })
      .catch(() => {
        // keep cache / empty rates
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setDisplayCurrency = useCallback((currency: CurrencyCode) => {
    setDisplayCurrencyState(currency);
    try {
      localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
    } catch {
      // ignore
    }
  }, []);

  const convert = useCallback(
    (amount: number | string, from: string, to?: string) => {
      const source = normalizeCurrencyCode(from);
      const target = to ? normalizeCurrencyCode(to) : displayCurrency;
      const converted = convertAmount(
        amount,
        source,
        target,
        rates,
        RATE_BASE_CURRENCY,
      );
      return converted ?? toFiniteAmount(amount);
    },
    [displayCurrency, rates],
  );

  const getDisplayPrice = useCallback(
    (amount: number | string, sourceCurrency: string): DisplayPriceResult => {
      const sourceAmount = toFiniteAmount(amount);
      const source = normalizeCurrencyCode(sourceCurrency);
      const chargeFormatted = formatMoney(sourceAmount, source);
      const isConverted = source !== displayCurrency;
      const convertedAmount = isConverted
        ? convertAmount(sourceAmount, source, displayCurrency, rates, RATE_BASE_CURRENCY)
        : sourceAmount;
      const canConvert = convertedAmount !== null;
      const finalAmount = canConvert ? convertedAmount : sourceAmount;
      const formatted =
        isConverted && canConvert
          ? formatMoney(finalAmount, displayCurrency)
          : chargeFormatted;

      return {
        formatted,
        chargeFormatted,
        convertedAmount: finalAmount,
        sourceAmount,
        sourceCurrency: source,
        displayCurrency,
        isConverted: isConverted && canConvert,
      };
    },
    [displayCurrency, rates],
  );

  const formatDisplayPrice = useCallback(
    (amount: number | string, sourceCurrency: string) =>
      getDisplayPrice(amount, sourceCurrency).formatted,
    [getDisplayPrice],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      displayCurrency,
      setDisplayCurrency,
      rates,
      ratesLoading,
      convert,
      formatDisplayPrice,
      getDisplayPrice,
    }),
    [
      displayCurrency,
      setDisplayCurrency,
      rates,
      ratesLoading,
      convert,
      formatDisplayPrice,
      getDisplayPrice,
    ],
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}

export { CURRENCY_OPTIONS, SUPPORTED_CURRENCIES };
export type { CurrencyCode };
