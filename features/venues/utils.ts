import { getMediaProxyUrl } from "./media-url";
import type { PricingModel, PublicVenue } from "./types";

export type VenuePriceLabels = {
  perDay: string;
  perHour: string;
  flatRate: string;
  from: string;
  perUnit: string;
  perHourAmenity: string;
  perBooking: string;
  perGuestPackage: (name: string) => string;
  perGuestFromPackages: string;
  included: string;
  onRequest: string;
};

const DEFAULT_LABELS: VenuePriceLabels = {
  perDay: "per day",
  perHour: "per hour",
  flatRate: "flat rate",
  from: "from",
  perUnit: "per unit",
  perHourAmenity: "per hour",
  perBooking: "per booking",
  perGuestPackage: (name) => `per guest (${name})`,
  perGuestFromPackages: "per guest (from packages)",
  included: "Included",
  onRequest: "On request",
};

export function decimalToNumber(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0;
  return typeof value === "number" ? value : Number(value);
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function getVenueDisplayPrice(
  venue: PublicVenue,
  labels: VenuePriceLabels = DEFAULT_LABELS,
): { price: number; currency: string; label: string } | null {
  const pricing = venue.pricing;
  if (!pricing) return null;

  const currency = pricing.currency || "AED";
  const base = decimalToNumber(pricing.basePrice);
  const config = pricing.config as Record<string, unknown>;

  if (pricing.modelType === "DAILY_BLOCK" && config.pricePerDay !== undefined) {
    return {
      price: decimalToNumber(config.pricePerDay as number),
      currency,
      label: labels.perDay,
    };
  }
  if (pricing.modelType === "HOURLY") {
    return { price: base, currency, label: labels.perHour };
  }
  if (pricing.modelType === "FLAT_RATE") {
    return { price: base, currency, label: labels.flatRate };
  }
  return { price: base, currency, label: labels.from };
}

export function pricingModelLabel(model: PricingModel): string {
  const labels: Record<PricingModel, string> = {
    HOURLY: "Hourly",
    NAMED_SLOTS: "Named slots",
    DAILY_BLOCK: "Daily",
    FLAT_RATE: "Flat rate",
  };
  return labels[model] ?? model;
}

export type AmenityPackageItem = {
  id: string;
  name: string;
  description?: string;
};

export type AmenityPackage = {
  id: string;
  name: string;
  description: string;
  pricePerHead: number;
  minHeads?: number;
  items: AmenityPackageItem[];
};

type RawPackage = {
  id?: string;
  name?: string;
  description?: string;
  pricePerHead?: number;
  minHeads?: number;
  items?: Array<{ id?: string; name?: string; description?: string }>;
};

/** Read packages from pricingConfig; supports legacy `menus` key. */
export function getPackagesFromConfig(
  config: Record<string, unknown> | null | undefined,
): AmenityPackage[] {
  if (!config) return [];

  const source = Array.isArray(config.packages)
    ? (config.packages as RawPackage[])
    : Array.isArray(config.menus)
      ? (config.menus as RawPackage[])
      : [];

  return source.flatMap((raw, index): AmenityPackage[] => {
    if (!raw || typeof raw !== "object") return [];
    const pricePerHead = Number(raw.pricePerHead);
    if (!Number.isFinite(pricePerHead) || pricePerHead < 0) return [];
    const name = raw.name?.trim() || "Package";
    const items: AmenityPackageItem[] = Array.isArray(raw.items)
      ? raw.items.flatMap((item, itemIndex) => {
          const itemName = item.name?.trim() || "";
          if (!itemName) return [];
          const description = item.description?.trim();
          return [
            {
              id: item.id?.trim() || `item-${index}-${itemIndex}`,
              name: itemName,
              ...(description ? { description } : {}),
            },
          ];
        })
      : [];
    const parsedMinHeads =
      raw.minHeads != null && Number.isFinite(Number(raw.minHeads))
        ? Number(raw.minHeads)
        : undefined;
    const minHeads =
      parsedMinHeads != null && parsedMinHeads > 0 ? parsedMinHeads : undefined;
    return [
      {
        id: raw.id?.trim() || `pkg-${index}-${name}`,
        name,
        description: raw.description?.trim() || "",
        pricePerHead,
        ...(minHeads != null ? { minHeads } : {}),
        items,
      },
    ];
  });
}

export function getVenueAmenityPriceInfo(
  amenity: {
    pricingType: string;
    isIncluded?: boolean;
    pricingConfig?: Record<string, unknown> | null;
  },
  labels: VenuePriceLabels = DEFAULT_LABELS,
): { amount: number; suffix: string } | null {
  if (amenity.pricingType === "INCLUDED" || amenity.isIncluded) return null;
  const config = amenity.pricingConfig ?? {};
  if (amenity.pricingType === "PER_UNIT" && config.unitPrice != null) {
    return { amount: Number(config.unitPrice), suffix: labels.perUnit };
  }
  if (amenity.pricingType === "PER_HOUR" && config.hourlyPrice != null) {
    return { amount: Number(config.hourlyPrice), suffix: labels.perHourAmenity };
  }
  if (amenity.pricingType === "FLAT_PER_EVENT" && config.flatPrice != null) {
    return { amount: Number(config.flatPrice), suffix: labels.perBooking };
  }
  if (amenity.pricingType === "PACKAGE_BASED") {
    const packages = getPackagesFromConfig(config);
    if (packages.length === 1) {
      return {
        amount: packages[0].pricePerHead,
        suffix: labels.perGuestPackage(packages[0].name),
      };
    }
    if (packages.length > 1) {
      const min = Math.min(...packages.map((p) => p.pricePerHead));
      return { amount: min, suffix: labels.perGuestFromPackages };
    }
  }
  return null;
}

const PROPERTY_VENUE_PATTERN =
  /villa|apartment|house|chalet|cottage|studio|penthouse|loft|accommodation|rental|property|suite|flat|bungalow/i;

export function isPropertyStyleVenueType(name?: string | null, slug?: string | null): boolean {
  if (!name && !slug) return false;
  return PROPERTY_VENUE_PATTERN.test(name ?? "") || PROPERTY_VENUE_PATTERN.test(slug ?? "");
}

export type VenuePropertyAttributes = {
  floorArea?: number;
  bedrooms?: number;
  bathrooms?: number;
};

export function parseVenuePropertyAttributes(
  customAttributes?: Record<string, unknown> | null,
): VenuePropertyAttributes {
  if (!customAttributes) return {};
  const num = (key: string) => {
    const v = customAttributes[key];
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    floorArea: num("floorArea"),
    bedrooms: num("bedrooms"),
    bathrooms: num("bathrooms"),
  };
}

export function venueCoverSrc(venue: Pick<PublicVenue, "id" | "coverImage" | "thumbnail">): string {
  const raw = venue.coverImage?.trim() || venue.thumbnail?.trim() || "";
  if (raw) return getMediaProxyUrl(raw);
  return `https://picsum.photos/seed/${encodeURIComponent(venue.id)}/800/500`;
}

export type AmenitySelection = {
  amenityId: string;
  quantity: number;
  packageId?: string;
  packageName?: string;
};

export function toBookingAmenityPayload(selections: AmenitySelection[]) {
  return selections.map((sel) => ({
    amenityId: sel.amenityId,
    venueAmenityId: sel.amenityId,
    quantity: sel.quantity,
    ...(sel.packageId ? { packageId: sel.packageId } : {}),
    ...(sel.packageName ? { packageName: sel.packageName } : {}),
    ...(sel.packageId ? { selectedConfig: { packageId: sel.packageId } } : {}),
  }));
}

export type VenueEstimateInput = {
  venue: PublicVenue;
  /** Event guest count for capacity + package pricing. */
  guests: number;
  /** Hours for HOURLY / PER_HOUR amenities. */
  durationHours: number;
  /** Days for DAILY_BLOCK. */
  durationDays: number;
  selections: AmenitySelection[];
};

export type VenueEstimateLine = {
  label: string;
  amount: number;
};

export type CapacityCheckReason = "missing_guests" | "over_max" | "under_min";

export type CapacityCheckResult = {
  ok: boolean;
  reason: CapacityCheckReason | null;
  min?: number;
  max?: number;
  guests?: number;
};

export type VenueEstimateResult = {
  currency: string;
  baseAmount: number;
  amenitiesAmount: number;
  taxAmount: number;
  totalAmount: number;
  lines: VenueEstimateLine[];
  capacityOk: boolean;
  capacity: CapacityCheckResult;
};

function amenityUnitCost(
  amenity: NonNullable<PublicVenue["amenities"]>[number],
  quantity: number,
  durationHours: number,
  guests: number,
  selection?: Pick<AmenitySelection, "packageId" | "packageName">,
): number {
  if (amenity.pricingType === "INCLUDED" || amenity.isIncluded) return 0;
  const config = amenity.pricingConfig ?? {};
  const packageKey = selection?.packageId || selection?.packageName;

  if (amenity.pricingType === "PER_UNIT") {
    let unitPrice = Number(config.unitPrice || 0);
    const bulkTiers =
      (config.bulkTiers as Array<{ minQuantity: number; unitPrice: number }>) ?? [];
    const sorted = [...bulkTiers].sort((a, b) => b.minQuantity - a.minQuantity);
    for (const tier of sorted) {
      if (quantity >= tier.minQuantity) {
        unitPrice = Number(tier.unitPrice);
        break;
      }
    }
    return quantity * unitPrice;
  }

  if (amenity.pricingType === "PER_HOUR") {
    return quantity * durationHours * Number(config.hourlyPrice || 0);
  }

  if (amenity.pricingType === "FLAT_PER_EVENT") {
    return Number(config.flatPrice || 0);
  }

  if (amenity.pricingType === "PACKAGE_BASED") {
    const packages = getPackagesFromConfig(config);
    const pkg =
      packages.find((p) => p.id === packageKey) ??
      packages.find((p) => p.name === packageKey) ??
      packages[0];
    if (!pkg) return 0;
    const heads = Math.max(quantity, guests, pkg.minHeads ?? 1, 1);
    return heads * pkg.pricePerHead;
  }

  return 0;
}

export function checkVenueCapacity(
  venue: PublicVenue,
  guests: number,
): CapacityCheckResult {
  if (!guests || guests < 1) {
    return { ok: false, reason: "missing_guests", guests };
  }
  if (venue.capacityMax != null && guests > venue.capacityMax) {
    return {
      ok: false,
      reason: "over_max",
      max: venue.capacityMax,
      guests,
    };
  }
  if (venue.capacityMin != null && guests < venue.capacityMin) {
    return {
      ok: true,
      reason: "under_min",
      min: venue.capacityMin,
      guests,
    };
  }
  return { ok: true, reason: null, guests };
}

/** Corporate planning estimate (client-side) from venue pricing + selected add-ons. */
export function calculateVenuePlanEstimate(input: VenueEstimateInput): VenueEstimateResult {
  const { venue, guests, durationHours, durationDays, selections } = input;
  const pricing = venue.pricing;
  const currency = pricing?.currency || "AED";
  const lines: VenueEstimateLine[] = [];
  let baseAmount = 0;

  if (pricing) {
    const config = (pricing.config ?? {}) as Record<string, unknown>;
    const base = decimalToNumber(pricing.basePrice);

    if (pricing.modelType === "HOURLY") {
      const hours = Math.max(1, durationHours);
      baseAmount = base * hours;
      lines.push({ label: `Venue · ${hours}h`, amount: baseAmount });
    } else if (pricing.modelType === "DAILY_BLOCK") {
      const days = Math.max(1, durationDays);
      const perDay = decimalToNumber(config.pricePerDay as number | string) || base;
      baseAmount = perDay * days;
      lines.push({ label: `Venue · ${days} day${days === 1 ? "" : "s"}`, amount: baseAmount });
    } else if (pricing.modelType === "NAMED_SLOTS") {
      const slots = Array.isArray(config.slots) ? config.slots : [];
      const first = slots[0] as { price?: number } | undefined;
      baseAmount = first?.price != null ? Number(first.price) : base;
      lines.push({ label: "Venue · slot", amount: baseAmount });
    } else {
      baseAmount = base;
      lines.push({ label: "Venue · flat rate", amount: baseAmount });
    }
  }

  let amenitiesAmount = 0;
  const amenityMap = new Map((venue.amenities ?? []).map((a) => [a.id, a]));

  for (const sel of selections) {
    const amenity = amenityMap.get(sel.amenityId);
    if (!amenity) continue;
    const qty = Math.max(1, sel.quantity || 1);
    const amount = amenityUnitCost(
      amenity,
      qty,
      Math.max(1, durationHours),
      guests,
      sel,
    );
    const packages = getPackagesFromConfig(amenity.pricingConfig);
    const pkg =
      packages.find((p) => p.id === sel.packageId) ??
      packages.find((p) => p.name === sel.packageName);
    if (amount <= 0 && (amenity.isIncluded || amenity.pricingType === "INCLUDED")) {
      lines.push({
        label: `${amenity.catalog?.name ?? "Amenity"} (included)`,
        amount: 0,
      });
      continue;
    }
    amenitiesAmount += amount;
    const amenityName = amenity.catalog?.name ?? "Add-on";
    const heads = Math.max(qty, guests, pkg?.minHeads ?? 1, 1);
    lines.push({
      label: pkg
        ? `${amenityName} · ${pkg.name} · ${heads} guests`
        : amenityName,
      amount,
    });
  }

  const taxRate = pricing ? decimalToNumber(pricing.taxRate) : 0;
  const subtotal = baseAmount + amenitiesAmount;
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = Math.round(subtotal + taxAmount);
  const capacity = checkVenueCapacity(venue, guests);

  return {
    currency,
    baseAmount: Math.round(baseAmount),
    amenitiesAmount: Math.round(amenitiesAmount),
    taxAmount: Math.round(taxAmount),
    totalAmount,
    lines,
    capacityOk: capacity.ok,
    capacity,
  };
}

export function eventDurationFromDates(
  startAt?: string | null,
  endAt?: string | null,
): { hours: number; days: number } {
  if (!startAt || !endAt) return { hours: 8, days: 1 };
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { hours: 8, days: 1 };
  }
  const hours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
  const days = Math.max(1, Math.ceil(hours / 24));
  return { hours, days };
}

export { DEFAULT_LABELS as defaultVenuePriceLabels };
