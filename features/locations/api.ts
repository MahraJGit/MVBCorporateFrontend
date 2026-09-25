import { apiGet } from "@/lib/api/client";

export type CatalogCountry = {
  id: string;
  code: string;
  name: string;
  phoneCode?: string | null;
  defaultCurrency?: string | null;
  defaultTimezone?: string | null;
  isActive: boolean;
};

export type CatalogCity = {
  id: string;
  countryId: string;
  name: string;
  timezone?: string | null;
  isFeatured: boolean;
  isActive: boolean;
};

type SuccessEnvelope<T> = {
  status?: string;
  message?: string;
  data: T;
};

function unwrap<T>(json: SuccessEnvelope<T>): T {
  return json.data;
}

export async function listCountries(params?: { activeOnly?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.activeOnly) qs.set("activeOnly", "true");
  const query = qs.toString();
  const json = await apiGet<SuccessEnvelope<CatalogCountry[]>>(
    `/api/locations/countries${query ? `?${query}` : ""}`,
  );
  return unwrap(json);
}

export async function listCitiesByCountryCode(
  countryCode: string,
  params?: { activeOnly?: boolean; featuredOnly?: boolean },
) {
  const code = countryCode.trim().toUpperCase();
  const qs = new URLSearchParams();
  if (params?.activeOnly) qs.set("activeOnly", "true");
  if (params?.featuredOnly) qs.set("featuredOnly", "true");
  const query = qs.toString();
  const json = await apiGet<SuccessEnvelope<CatalogCity[]>>(
    `/api/locations/countries/${encodeURIComponent(code)}/cities${query ? `?${query}` : ""}`,
  );
  return unwrap(json);
}
