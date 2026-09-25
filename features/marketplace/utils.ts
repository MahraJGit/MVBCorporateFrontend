import type {
  PublicMarketplaceService,
  ServiceAddOn,
  ServiceMenuItem,
  ServicePackage,
  ServicePackageMenuRule,
  ServicePricingModel,
} from "./types";
import { t } from "@/lib/i18n";

export function decimalToNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getServiceFromPrice(service: PublicMarketplaceService) {
  const amount = decimalToNumber(service.basePrice);
  return { amount, currency: service.currency || "AED" };
}

export function servicePricingModelLabel(model: ServicePricingModel) {
  switch (model) {
    case "FLAT_PER_EVENT":
      return t("marketplace.pricingFlat");
    case "HOURLY":
      return t("marketplace.pricingHourly");
    case "PER_GUEST":
      return t("marketplace.pricingPerGuest");
    default:
      return model;
  }
}

export function serviceCoverSrc(service: PublicMarketplaceService) {
  if (service.coverImage) return service.coverImage;
  return `https://picsum.photos/seed/${encodeURIComponent(service.id)}/800/500`;
}

export function activePackages(service: PublicMarketplaceService): ServicePackage[] {
  return (service.packages ?? []).filter((p) => p.isActive !== false && Boolean(p.id));
}

export function activeAddOns(service: PublicMarketplaceService): ServiceAddOn[] {
  return (service.addOns ?? []).filter((a) => a.isActive !== false && Boolean(a.id));
}

export function activeMenuItems(service: PublicMarketplaceService): ServiceMenuItem[] {
  return (service.menuItems ?? []).filter((m) => m.isActive !== false && Boolean(m.id));
}

export function menuOptionsForRule(
  rule: ServicePackageMenuRule,
  menuItems: ServiceMenuItem[],
): ServiceMenuItem[] {
  const poolIds = new Set(rule.menuItemIds ?? []);
  return menuItems.filter((item) => {
    if (poolIds.size > 0) return poolIds.has(item.id);
    return (
      (item.course ?? "").trim().toLowerCase() === rule.course.trim().toLowerCase()
    );
  });
}

export function menuCompleteForPackage(
  pkg: ServicePackage | undefined | null,
  menuSelections: Record<string, string[]>,
): boolean {
  const rules = pkg?.menuRules ?? [];
  if (rules.length === 0) return true;
  return rules.every((rule) => {
    const selected = menuSelections[rule.course] ?? [];
    return selected.length >= rule.chooseCount;
  });
}

export function toggleMenuSelection(
  current: Record<string, string[]>,
  course: string,
  itemId: string,
  chooseCount: number,
): Record<string, string[]> {
  const selected = current[course] ?? [];
  const exists = selected.includes(itemId);
  let next: string[];
  if (exists) {
    next = selected.filter((id) => id !== itemId);
  } else if (selected.length >= chooseCount) {
    next = [...selected.slice(1), itemId];
  } else {
    next = [...selected, itemId];
  }
  return { ...current, [course]: next };
}

export type ServiceCapacityCheck = {
  ok: boolean;
  reason: "missing_guests" | "over_max" | "under_min" | null;
  min?: number;
  max?: number;
  guests?: number;
};

export function checkServiceCapacity(
  service: PublicMarketplaceService,
  guests: number,
): ServiceCapacityCheck {
  if (!guests || guests < 1) {
    return { ok: false, reason: "missing_guests", guests };
  }
  if (service.guestMax != null && guests > service.guestMax) {
    return {
      ok: false,
      reason: "over_max",
      max: service.guestMax,
      guests,
    };
  }
  if (service.guestMin != null && guests < service.guestMin) {
    return {
      ok: true,
      reason: "under_min",
      min: service.guestMin,
      guests,
    };
  }
  return { ok: true, reason: null, guests };
}

export type ServiceEstimateLine = {
  label: string;
  amount: number;
};

export type ServiceEstimateResult = {
  currency: string;
  baseAmount: number;
  addOnsAmount: number;
  menuExtrasAmount: number;
  totalAmount: number;
  lines: ServiceEstimateLine[];
  capacity: ServiceCapacityCheck;
  capacityOk: boolean;
};

export type ServiceEstimateInput = {
  service: PublicMarketplaceService;
  guests: number;
  durationHours: number;
  packageId?: string | null;
  selectedAddOnIds: string[];
  /** course -> selected menu item ids */
  menuSelections?: Record<string, string[]>;
};

/** Corporate planning estimate from service pricing + package + menu + add-ons. */
export function calculateServicePlanEstimate(
  input: ServiceEstimateInput,
): ServiceEstimateResult {
  const {
    service,
    guests,
    durationHours,
    packageId,
    selectedAddOnIds,
    menuSelections = {},
  } = input;
  const currency = service.currency || "AED";
  const lines: ServiceEstimateLine[] = [];
  let baseAmount = 0;
  const guestCount = Math.max(1, guests);
  const perGuest = service.pricingModel === "PER_GUEST";

  const packages = activePackages(service);
  const selectedPackage = packageId
    ? packages.find((p) => p.id === packageId)
    : null;

  if (selectedPackage) {
    const unit = decimalToNumber(selectedPackage.price) ?? 0;
    baseAmount = perGuest ? unit * guestCount : unit;
    lines.push({
      label: perGuest
        ? `${selectedPackage.name} · ${guestCount} guests`
        : selectedPackage.name,
      amount: baseAmount,
    });
  } else {
    const base = decimalToNumber(service.basePrice) ?? 0;
    if (service.pricingModel === "HOURLY") {
      const hours = Math.max(1, durationHours);
      baseAmount = base * hours;
      lines.push({ label: `Service · ${hours}h`, amount: baseAmount });
    } else if (service.pricingModel === "PER_GUEST") {
      baseAmount = base * guestCount;
      lines.push({ label: `Service · ${guestCount} guests`, amount: baseAmount });
    } else {
      baseAmount = base;
      lines.push({ label: "Service · flat", amount: baseAmount });
    }
  }

  let menuExtrasAmount = 0;
  const menuMap = new Map(activeMenuItems(service).map((m) => [m.id, m]));
  if (selectedPackage?.menuRules?.length) {
    for (const rule of selectedPackage.menuRules) {
      const selectedIds = menuSelections[rule.course] ?? [];
      const extraUnit = decimalToNumber(rule.extraPerGuest) ?? 0;
      if (extraUnit > 0 && selectedIds.length > 0) {
        const amount = extraUnit * guestCount;
        menuExtrasAmount += amount;
        lines.push({
          label: `${rule.course} extras · ${guestCount} guests`,
          amount,
        });
      }
      for (const id of selectedIds) {
        const item = menuMap.get(id);
        if (!item) continue;
        const itemPrice = decimalToNumber(item.price);
        if (itemPrice == null || itemPrice <= 0) continue;
        const amount = perGuest ? itemPrice * guestCount : itemPrice;
        menuExtrasAmount += amount;
        lines.push({
          label: item.name,
          amount,
        });
      }
    }
  }

  let addOnsAmount = 0;
  const addOnMap = new Map(activeAddOns(service).map((a) => [a.id, a]));
  for (const id of selectedAddOnIds) {
    const addOn = addOnMap.get(id);
    if (!addOn) continue;
    const unit = decimalToNumber(addOn.price) ?? 0;
    const amount = perGuest ? unit * guestCount : unit;
    addOnsAmount += amount;
    lines.push({
      label: perGuest ? `${addOn.name} · ${guestCount} guests` : addOn.name,
      amount,
    });
  }

  const totalAmount = Math.round(baseAmount + menuExtrasAmount + addOnsAmount);
  const capacity = checkServiceCapacity(service, guests);

  return {
    currency,
    baseAmount: Math.round(baseAmount),
    addOnsAmount: Math.round(addOnsAmount),
    menuExtrasAmount: Math.round(menuExtrasAmount),
    totalAmount,
    lines,
    capacity,
    capacityOk: capacity.ok,
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
