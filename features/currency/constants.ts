export type CurrencyCode =
  | "AED"
  | "PKR"
  | "USD"
  | "EUR"
  | "GBP"
  | "SAR"
  | "QAR";

export const RATE_BASE_CURRENCY: CurrencyCode = "AED";

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "AED",
  "PKR",
  "USD",
  "EUR",
  "GBP",
  "SAR",
  "QAR",
];

export type CurrencyOption = {
  code: CurrencyCode;
  label: string;
};

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "AED", label: "UAE Dirham" },
  { code: "PKR", label: "Pakistani Rupee" },
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "QAR", label: "Qatari Riyal" },
];

export const DISPLAY_CURRENCY_STORAGE_KEY = "venue-corporate-display-currency";
export const EXCHANGE_RATES_CACHE_KEY = "venue-corporate-exchange-rates-v1";
export const EXCHANGE_RATES_STALE_MS = 6 * 60 * 60 * 1000;
