import { apiGet } from "@/lib/api/client";
import type { ListPublicVenuesResult, PublicVenue, VenueType } from "./types";

type SuccessEnvelope<T> = {
  status?: string;
  message?: string;
  data: T;
};

function unwrap<T>(json: SuccessEnvelope<T>): T {
  return json.data;
}

export async function listPublicVenues(params?: {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  countryCode?: string;
  venueTypeId?: string;
  /** Minimum guests the venue must accommodate (maps to capacityMax >= guests). */
  guests?: number;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
}): Promise<ListPublicVenuesResult> {
  const sp = new URLSearchParams();
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 12));
  if (params?.search) sp.set("search", params.search);
  if (params?.city) sp.set("city", params.city);
  if (params?.countryCode) sp.set("countryCode", params.countryCode);
  if (params?.venueTypeId) sp.set("venueTypeId", params.venueTypeId);
  if (params?.guests) sp.set("capacityMin", String(params.guests));
  if (params?.sortBy) sp.set("sortBy", params.sortBy);
  if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);

  const json = await apiGet<SuccessEnvelope<ListPublicVenuesResult>>(
    `/api/venues?${sp.toString()}`,
  );
  return unwrap(json);
}

export async function getPublicVenue(id: string): Promise<PublicVenue> {
  const json = await apiGet<SuccessEnvelope<PublicVenue>>(
    `/api/venues/${encodeURIComponent(id)}`,
  );
  return unwrap(json);
}

export async function listVenueTypes(): Promise<VenueType[]> {
  const json = await apiGet<SuccessEnvelope<VenueType[]>>("/api/venues/types");
  return unwrap(json);
}
