import { apiGet } from "@/lib/api/client";
import type {
  ListPublicMarketplaceServicesResult,
  PublicMarketplaceService,
  ServiceCategory,
  ServicePricingModel,
} from "./types";

type SuccessEnvelope<T> = {
  status?: string;
  message?: string;
  data: T;
};

function unwrap<T>(json: SuccessEnvelope<T>): T {
  return json.data;
}

export async function listPublicMarketplaceServices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  countryCode?: string;
  city?: string;
  /** Minimum guests the service must accommodate (guestMax >= guests or unset). */
  guests?: number;
  pricingModel?: ServicePricingModel;
  sortBy?: "createdAt" | "title" | "basePrice";
  sortOrder?: "asc" | "desc";
}): Promise<ListPublicMarketplaceServicesResult> {
  const sp = new URLSearchParams();
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 12));
  if (params?.search) sp.set("search", params.search);
  if (params?.categoryId) sp.set("categoryId", params.categoryId);
  if (params?.countryCode) sp.set("countryCode", params.countryCode);
  if (params?.city) sp.set("city", params.city);
  if (params?.guests) sp.set("guests", String(params.guests));
  if (params?.pricingModel) sp.set("pricingModel", params.pricingModel);
  if (params?.sortBy) sp.set("sortBy", params.sortBy);
  if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);

  const json = await apiGet<SuccessEnvelope<ListPublicMarketplaceServicesResult>>(
    `/api/marketplace-services?${sp.toString()}`,
  );
  return unwrap(json);
}

export async function getPublicMarketplaceServiceBySlug(
  slug: string,
): Promise<PublicMarketplaceService> {
  const json = await apiGet<SuccessEnvelope<PublicMarketplaceService>>(
    `/api/marketplace-services/slug/${encodeURIComponent(slug)}`,
  );
  return unwrap(json);
}

export async function listServiceCategories(): Promise<ServiceCategory[]> {
  const json = await apiGet<SuccessEnvelope<ServiceCategory[]>>(
    "/api/service-categories?isActive=true",
  );
  return unwrap(json);
}
