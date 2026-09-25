export type PricingModel = "HOURLY" | "NAMED_SLOTS" | "DAILY_BLOCK" | "FLAT_RATE";

export type AmenityPricingType =
  | "INCLUDED"
  | "PER_UNIT"
  | "PER_HOUR"
  | "FLAT_PER_EVENT"
  | "PACKAGE_BASED";

export type Currency = "AED" | "PKR" | "USD" | "EUR" | "GBP" | "SAR" | "QAR";

export type VenueType = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
};

export type AmenityCatalogItem = {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  description?: string | null;
};

export type VenuePricing = {
  id?: string;
  modelType: PricingModel;
  basePrice: number | string;
  currency: Currency;
  taxRate: number | string;
  config: Record<string, unknown>;
};

export type VenueAmenity = {
  id: string;
  catalogId: string;
  pricingType: AmenityPricingType;
  isIncluded: boolean;
  pricingConfig: Record<string, unknown>;
  capacity?: number | null;
  maxPerBooking?: number | null;
  catalog?: AmenityCatalogItem;
};

export type PublicVenue = {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  countryCode?: string | null;
  city?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  capacityMin?: number | null;
  capacityMax?: number | null;
  timezone: string;
  customAttributes?: Record<string, unknown>;
  coverImage?: string | null;
  thumbnail?: string | null;
  gallery?: string[];
  venueType?: VenueType | null;
  pricing?: VenuePricing | null;
  amenities?: VenueAmenity[];
  vendor?: {
    id?: string;
    businessName?: string | null;
    slug?: string | null;
  } | null;
  createdAt?: string;
};

export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListPublicVenuesResult = {
  data: PublicVenue[];
  meta: PaginatedMeta;
};
