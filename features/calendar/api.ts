import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  CalendarListParams,
  CorporateCalendarItem,
  CreateCalendarItemBody,
  PromoteCalendarItemBody,
} from "./types";

const BASE = "/api/corporate/calendar";

export function listCalendarItems(params?: CalendarListParams) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.fiscalBudgetId) qs.set("fiscalBudgetId", params.fiscalBudgetId);
  if (params?.budgetCategoryId) qs.set("budgetCategoryId", params.budgetCategoryId);
  if (params?.createdByCorporateUserId) {
    qs.set("createdByCorporateUserId", params.createdByCorporateUserId);
  }
  if (params?.q) qs.set("q", params.q);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiGet<{
    success: true;
    data: CorporateCalendarItem[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(`${BASE}${query ? `?${query}` : ""}`);
}

export function getCalendarItem(id: string) {
  return apiGet<{ success: true; data: CorporateCalendarItem }>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
}

export function createCalendarItem(body: CreateCalendarItemBody) {
  return apiPost<
    { success: true; message: string; data: CorporateCalendarItem },
    CreateCalendarItemBody
  >(BASE, body);
}

export function updateCalendarItem(id: string, body: Partial<CreateCalendarItemBody>) {
  return apiPatch<
    { success: true; message: string; data: CorporateCalendarItem },
    Partial<CreateCalendarItemBody>
  >(`${BASE}/${encodeURIComponent(id)}`, body);
}

export function cancelCalendarItem(id: string) {
  return apiPost<
    { success: true; message: string; data: CorporateCalendarItem },
    Record<string, never>
  >(`${BASE}/${encodeURIComponent(id)}/cancel`, {});
}

export function promoteCalendarItem(id: string, body: PromoteCalendarItemBody) {
  return apiPost<
    {
      success: true;
      message: string;
      data: { calendarItem: CorporateCalendarItem; eventId: string };
    },
    PromoteCalendarItemBody
  >(`${BASE}/${encodeURIComponent(id)}/promote`, body);
}

export function addCalendarVenue(
  id: string,
  body: {
    venueId: string;
    estimatedCost?: number;
    notes?: string;
    preferredStartAt?: string | null;
    preferredEndAt?: string | null;
    bookingIntent?: Record<string, unknown> | null;
  },
) {
  return apiPost<
    { success: true; message: string; data: CorporateCalendarItem },
    typeof body
  >(`${BASE}/${encodeURIComponent(id)}/venues`, body);
}

export function removeCalendarVenue(id: string, lineId: string) {
  return apiDelete<{ success: true; message: string; data: CorporateCalendarItem }>(
    `${BASE}/${encodeURIComponent(id)}/venues/${encodeURIComponent(lineId)}`,
  );
}

export function addCalendarService(
  id: string,
  body: {
    serviceId: string;
    estimatedCost?: number;
    notes?: string;
    preferredStartAt?: string | null;
    preferredEndAt?: string | null;
    bookingIntent?: Record<string, unknown> | null;
  },
) {
  return apiPost<
    { success: true; message: string; data: CorporateCalendarItem },
    typeof body
  >(`${BASE}/${encodeURIComponent(id)}/services`, body);
}

export function removeCalendarService(id: string, lineId: string) {
  return apiDelete<{ success: true; message: string; data: CorporateCalendarItem }>(
    `${BASE}/${encodeURIComponent(id)}/services/${encodeURIComponent(lineId)}`,
  );
}

export function calendarStatusLabel(status: CorporateCalendarItem["status"]) {
  switch (status) {
    case "PLANNED":
      return "Planned";
    case "PROMOTED":
      return "Promoted";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}
