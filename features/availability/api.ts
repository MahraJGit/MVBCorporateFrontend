import { apiGet } from "@/lib/api/client";

type SuccessEnvelope<T> = {
  status?: string;
  message?: string;
  data: T;
};

function unwrap<T>(json: SuccessEnvelope<T>): T {
  return json.data;
}

export type SoftAvailabilityStatus = "OK" | "WARNING" | "UNAVAILABLE" | "UNKNOWN";

export type SoftAvailabilitySlot = {
  id?: string;
  date?: string;
  startTime: string;
  endTime: string;
  available: boolean;
  name?: string | null;
  label?: string | null;
  price?: number;
};

export type SoftAvailabilityPreview = {
  status: SoftAvailabilityStatus;
  message: string;
  /** Present when the resource exposes time windows for the preferred day/range. */
  slots: SoftAvailabilitySlot[];
  bookingMode?: string | null;
  modelType?: string | null;
};

export type PreferredSlotIntent = {
  id?: string;
  date?: string;
  startTime: string;
  endTime: string;
  name?: string | null;
  label?: string | null;
};

function toDateKey(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  return new Date(isoOrDate).toISOString().slice(0, 10);
}

function reasonLabel(reason?: string): string {
  switch (reason) {
    case "CLOSED":
      return "closed";
    case "BLOCKED":
      return "blocked";
    case "FULLY_BOOKED":
      return "fully booked";
    case "OUT_OF_WINDOW":
      return "outside bookable window";
    default:
      return reason ? reason.toLowerCase().replace(/_/g, " ") : "unavailable";
  }
}

export function slotKey(slot: Pick<SoftAvailabilitySlot, "id" | "date" | "startTime" | "endTime">): string {
  if (slot.id) return slot.id;
  return `${slot.date ?? ""}|${slot.startTime}|${slot.endTime}`;
}

export function formatSlotLabel(slot: {
  startTime: string;
  endTime: string;
  name?: string | null;
  label?: string | null;
}): string {
  const title = (slot.label || slot.name || "").trim();
  const range = `${slot.startTime} – ${slot.endTime}`;
  return title ? `${title} (${range})` : range;
}

function normalizeVenueSlots(
  raw: Array<{
    startTime?: string;
    endTime?: string;
    available?: boolean;
    name?: string;
    price?: number;
  }> | undefined,
  dateKey: string,
): SoftAvailabilitySlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s.startTime && s.endTime)
    .map((s) => ({
      date: dateKey,
      startTime: s.startTime!,
      endTime: s.endTime!,
      available: Boolean(s.available),
      name: s.name ?? null,
      price: typeof s.price === "number" ? s.price : undefined,
    }));
}

function normalizeServiceSlots(
  raw: Array<{
    id?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    available?: boolean;
    label?: string | null;
  }> | undefined,
): SoftAvailabilitySlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s.startTime && s.endTime)
    .map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime!,
      endTime: s.endTime!,
      available: s.available !== false,
      label: s.label ?? null,
    }));
}

/** Client-side soft preview using public venue day availability. */
export async function previewVenueAvailability(
  venueId: string,
  preferredStartAt?: string | null,
  preferredEndAt?: string | null,
): Promise<SoftAvailabilityPreview> {
  if (!preferredStartAt) {
    return {
      status: "UNKNOWN",
      message: "Set a preferred date to check availability.",
      slots: [],
    };
  }

  const startKey = toDateKey(preferredStartAt);
  const endKey = preferredEndAt ? toDateKey(preferredEndAt) : startKey;

  try {
    const day = unwrap(
      await apiGet<
        SuccessEnvelope<{
          available: boolean;
          reason?: string;
          modelType?: string;
          slots?: Array<{
            startTime?: string;
            endTime?: string;
            available?: boolean;
            name?: string;
            price?: number;
          }>;
        }>
      >(`/api/venues/${encodeURIComponent(venueId)}/availability/day?date=${startKey}`),
    );

    const slots = normalizeVenueSlots(day.slots, startKey);

    if (!day.available) {
      return {
        status: "UNAVAILABLE",
        message: `Looks ${reasonLabel(day.reason)} on ${startKey}. You can still plan — confirm after approval.`,
        slots,
        modelType: day.modelType ?? null,
      };
    }

    if (endKey !== startKey) {
      const endDay = unwrap(
        await apiGet<
          SuccessEnvelope<{ available: boolean; reason?: string }>
        >(
          `/api/venues/${encodeURIComponent(venueId)}/availability/day?date=${endKey}`,
        ),
      );
      if (!endDay.available) {
        return {
          status: "WARNING",
          message: `Start day looks open, but ${endKey} may be ${reasonLabel(endDay.reason)}.`,
          slots,
          modelType: day.modelType ?? null,
        };
      }
    }

    const openSlots = slots.filter((s) => s.available).length;
    if (slots.length > 0 && openSlots <= 2) {
      return {
        status: "WARNING",
        message: `Only ${openSlots} open slot(s) on ${startKey}.`,
        slots,
        modelType: day.modelType ?? null,
      };
    }

    return {
      status: "OK",
      message: `Looks available on ${startKey}.`,
      slots,
      modelType: day.modelType ?? null,
    };
  } catch {
    return {
      status: "UNKNOWN",
      message: "Could not check venue availability right now.",
      slots: [],
    };
  }
}

/** Client-side soft preview using marketplace availability range. */
export async function previewServiceAvailability(
  serviceId: string,
  preferredStartAt?: string | null,
  preferredEndAt?: string | null,
): Promise<SoftAvailabilityPreview> {
  if (!preferredStartAt) {
    return {
      status: "UNKNOWN",
      message: "Set a preferred date to check availability.",
      slots: [],
    };
  }

  const startKey = toDateKey(preferredStartAt);
  const endKey = preferredEndAt ? toDateKey(preferredEndAt) : startKey;

  try {
    const result = unwrap(
      await apiGet<
        SuccessEnvelope<{
          available: boolean;
          bookingMode?: string;
          slots?: Array<{
            id?: string;
            date?: string;
            startTime?: string;
            endTime?: string;
            available?: boolean;
            label?: string | null;
          }>;
        }>
      >(
        `/api/marketplace-services/${encodeURIComponent(serviceId)}/availability?startDate=${startKey}&endDate=${endKey}`,
      ),
    );

    const slots = normalizeServiceSlots(result.slots);

    if (!result.available) {
      return {
        status: "UNAVAILABLE",
        message: `Looks unavailable for ${startKey}${endKey !== startKey ? `–${endKey}` : ""}. You can still plan — confirm after approval.`,
        slots,
        bookingMode: result.bookingMode ?? null,
      };
    }

    if (result.bookingMode === "SLOT") {
      const open = slots.filter((s) => s.available).length;
      if (open <= 1) {
        return {
          status: "WARNING",
          message: `Only ${open} open time window(s) in this range.`,
          slots,
          bookingMode: result.bookingMode,
        };
      }
    }

    return {
      status: "OK",
      message: `Looks available for ${startKey}${endKey !== startKey ? `–${endKey}` : ""}.`,
      slots,
      bookingMode: result.bookingMode ?? null,
    };
  } catch {
    return {
      status: "UNKNOWN",
      message: "Could not check service availability right now.",
      slots: [],
    };
  }
}

export function toLocalDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateInputToIsoStart(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T09:00:00`).toISOString();
}

export function dateInputToIsoEnd(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T18:00:00`).toISOString();
}

/** Prefer exact slot times when a soft slot was chosen. */
export function preferredSlotToIsoRange(
  dateStr: string,
  slot: PreferredSlotIntent | null | undefined,
): { startIso?: string; endIso?: string } {
  if (!dateStr || !slot?.startTime || !slot?.endTime) {
    return {};
  }
  const day = slot.date && /^\d{4}-\d{2}-\d{2}$/.test(slot.date) ? slot.date : dateStr;
  return {
    startIso: new Date(`${day}T${slot.startTime}:00`).toISOString(),
    endIso: new Date(`${day}T${slot.endTime}:00`).toISOString(),
  };
}
