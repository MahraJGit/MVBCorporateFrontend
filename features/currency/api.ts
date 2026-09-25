import {
  EXCHANGE_RATES_CACHE_KEY,
  RATE_BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
} from "./constants";
import type { ExchangeRates } from "./convert";

export type ExchangeRatesResponse = {
  amount: number;
  base: string;
  date: string;
  rates: ExchangeRates;
};

type OpenErApiResponse = {
  result: string;
  base_code: string;
  time_last_update_utc?: string;
  rates?: ExchangeRates;
};

export function readCachedRates(): ExchangeRatesResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EXCHANGE_RATES_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExchangeRatesResponse;
  } catch {
    return null;
  }
}

export function writeCachedRates(data: ExchangeRatesResponse) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXCHANGE_RATES_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function parseRateDate(utc?: string): string {
  if (!utc) return new Date().toISOString().slice(0, 10);
  const match = utc.match(/\w+, (\d{1,2}) (\w+) (\d{4})/);
  if (!match) return new Date().toISOString().slice(0, 10);
  const [, day, monthName, year] = match;
  const month = new Date(`${monthName} 1, 2000`).getMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function pickSupportedRates(allRates: ExchangeRates, base: string): ExchangeRates {
  const picked: ExchangeRates = { [base]: 1 };
  for (const code of SUPPORTED_CURRENCIES) {
    if (code === base) continue;
    const rate = allRates[code];
    if (typeof rate === "number" && rate > 0) {
      picked[code] = rate;
    }
  }
  return picked;
}

export async function fetchExchangeRates(
  base: string = RATE_BASE_CURRENCY,
): Promise<ExchangeRatesResponse> {
  const res = await fetch(
    `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`,
  );
  if (!res.ok) throw new Error("Failed to load exchange rates");

  const data = (await res.json()) as OpenErApiResponse;
  if (data.result !== "success" || !data.rates) {
    throw new Error("Failed to load exchange rates");
  }

  const normalized: ExchangeRatesResponse = {
    amount: 1,
    base: data.base_code || base,
    date: parseRateDate(data.time_last_update_utc),
    rates: pickSupportedRates(data.rates, base),
  };

  writeCachedRates(normalized);
  return normalized;
}
