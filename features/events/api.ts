import { apiGet, apiPatch, apiPost, apiPut, apiDelete } from "@/lib/api/client";
import { t } from "@/lib/i18n";
import type {
  CorporateEvent,
  CorporateEventBookingStatus,
  CorporateEventStatus,
  CorporateLineBookingStatus,
  CreateEventBody,
  EventBookingConfirmResponse,
  EventBookingLineSelection,
  EventBookingPreview,
  EventChatListResponse,
  EventChatMessage,
  EventPayResponse,
  EventRequestsResponse,
  PendingEventApprovalsResponse,
} from "./types";

const BASE = "/api/corporate/events";

export function listEvents(params?: { status?: CorporateEventStatus; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiGet<{
    success: true;
    data: CorporateEvent[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(`${BASE}${query ? `?${query}` : ""}`);
}

export function getEvent(id: string) {
  return apiGet<{ success: true; data: CorporateEvent }>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
}

export function createEvent(body: CreateEventBody) {
  return apiPost<{ success: true; message: string; data: CorporateEvent }, CreateEventBody>(
    BASE,
    body,
  );
}

export function updateEvent(
  id: string,
  body: Omit<Partial<CreateEventBody>, "teamMemberIds" | "submit"> & {
    fiscalBudgetId?: string;
    budgetCategoryId?: string;
    locationPreference?: string;
  },
) {
  return apiPatch<
    { success: true; message: string; data: CorporateEvent },
    typeof body
  >(`${BASE}/${encodeURIComponent(id)}`, body);
}

export function putEventTeam(
  id: string,
  members: { corporateUserId: string; role?: "LEAD" | "MEMBER" }[],
) {
  return apiPut<
    { success: true; message: string; data: CorporateEvent },
    { members: { corporateUserId: string; role?: "LEAD" | "MEMBER" }[] }
  >(`${BASE}/${encodeURIComponent(id)}/team`, { members });
}

export function submitEvent(id: string) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    Record<string, never>
  >(`${BASE}/${encodeURIComponent(id)}/submit`, {});
}

export function cancelEvent(id: string) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    Record<string, never>
  >(`${BASE}/${encodeURIComponent(id)}/cancel`, {});
}

export function listPendingEventApprovals() {
  return apiGet<PendingEventApprovalsResponse>(`${BASE}/approvals/pending`);
}

export function approveEventFinance(id: string) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    Record<string, never>
  >(`${BASE}/${encodeURIComponent(id)}/approve-finance`, {});
}

export function approveEventManagement(id: string) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    Record<string, never>
  >(`${BASE}/${encodeURIComponent(id)}/approve-management`, {});
}

export function rejectEvent(id: string, reason: string) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    { reason: string }
  >(`${BASE}/${encodeURIComponent(id)}/reject`, { reason });
}

export function replaceEventVenue(
  eventId: string,
  lineId: string,
  body: {
    venueId: string;
    estimatedCost?: number;
    notes?: string;
    preferredStartAt?: string;
    preferredEndAt?: string;
    bookingIntent?: Record<string, unknown>;
  },
) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    typeof body
  >(
    `${BASE}/${encodeURIComponent(eventId)}/venues/${encodeURIComponent(lineId)}/replace`,
    body,
  );
}

export function replaceEventService(
  eventId: string,
  lineId: string,
  body: {
    serviceId: string;
    estimatedCost?: number;
    notes?: string;
    preferredStartAt?: string;
    preferredEndAt?: string;
    bookingIntent?: Record<string, unknown>;
  },
) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    typeof body
  >(
    `${BASE}/${encodeURIComponent(eventId)}/services/${encodeURIComponent(lineId)}/replace`,
    body,
  );
}

export function payEventBookings(
  eventId: string,
  body: { paymentMethodId?: string } = {},
) {
  return apiPost<EventPayResponse, { paymentMethodId?: string }>(
    `${BASE}/${encodeURIComponent(eventId)}/bookings/pay`,
    body,
  );
}

export function completeEventPayment(eventId: string, paymentIntentId: string) {
  return apiPost<EventPayResponse, { paymentIntentId: string }>(
    `${BASE}/${encodeURIComponent(eventId)}/bookings/pay/complete`,
    { paymentIntentId },
  );
}

export function listEventRequests(eventId: string) {
  return apiGet<EventRequestsResponse>(
    `${BASE}/${encodeURIComponent(eventId)}/requests`,
  );
}

export function acceptEventProposal(eventId: string, proposalId: string) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    Record<string, never>
  >(
    `${BASE}/${encodeURIComponent(eventId)}/proposals/${encodeURIComponent(proposalId)}/accept`,
    {},
  );
}

export function declineEventProposal(
  eventId: string,
  proposalId: string,
  reason?: string,
) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    { reason?: string }
  >(
    `${BASE}/${encodeURIComponent(eventId)}/proposals/${encodeURIComponent(proposalId)}/decline`,
    reason ? { reason } : {},
  );
}

export function isPlannableEventStatus(status: CorporateEventStatus) {
  return status === "DRAFT" || status === "REJECTED" || status === "APPROVED";
}

export function addEventVenue(
  eventId: string,
  body: {
    venueId: string;
    estimatedCost?: number;
    notes?: string;
    preferredStartAt?: string;
    preferredEndAt?: string;
    bookingIntent?: Record<string, unknown>;
  },
) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    typeof body
  >(`${BASE}/${encodeURIComponent(eventId)}/venues`, body);
}

export function removeEventVenue(eventId: string, lineId: string) {
  return apiDelete<{ success: true; message: string; data: CorporateEvent }>(
    `${BASE}/${encodeURIComponent(eventId)}/venues/${encodeURIComponent(lineId)}`,
  );
}

export function addEventService(
  eventId: string,
  body: {
    serviceId: string;
    estimatedCost?: number;
    notes?: string;
    preferredStartAt?: string;
    preferredEndAt?: string;
    bookingIntent?: Record<string, unknown>;
  },
) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    typeof body
  >(`${BASE}/${encodeURIComponent(eventId)}/services`, body);
}

export function removeEventService(eventId: string, lineId: string) {
  return apiDelete<{ success: true; message: string; data: CorporateEvent }>(
    `${BASE}/${encodeURIComponent(eventId)}/services/${encodeURIComponent(lineId)}`,
  );
}

export function previewEventBookings(
  eventId: string,
  lines: EventBookingLineSelection[] = [],
) {
  return apiPost<
    { success: true; data: EventBookingPreview },
    { lines: EventBookingLineSelection[] }
  >(`${BASE}/${encodeURIComponent(eventId)}/bookings/preview`, { lines });
}

export function confirmEventBookings(
  eventId: string,
  lines: EventBookingLineSelection[] = [],
) {
  return apiPost<
    EventBookingConfirmResponse,
    { lines: EventBookingLineSelection[] }
  >(`${BASE}/${encodeURIComponent(eventId)}/bookings/confirm`, { lines });
}

export function cancelEventLineBooking(
  eventId: string,
  type: "VENUE" | "SERVICE",
  lineId: string,
) {
  return apiPost<
    { success: true; message: string; data: CorporateEvent },
    Record<string, never>
  >(
    `${BASE}/${encodeURIComponent(eventId)}/bookings/${type}/${encodeURIComponent(lineId)}/cancel`,
    {},
  );
}

export function listEventChats(eventId: string) {
  return apiGet<EventChatListResponse>(
    `${BASE}/${encodeURIComponent(eventId)}/chat`,
  );
}

export function listEventChatMessages(
  eventId: string,
  conversationId: string,
  cursor?: string,
) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiGet<{
    success: true;
    data: { items: EventChatMessage[]; nextCursor?: string };
  }>(
    `${BASE}/${encodeURIComponent(eventId)}/chat/${encodeURIComponent(conversationId)}/messages${qs}`,
  );
}

export function sendEventChatMessage(
  eventId: string,
  conversationId: string,
  content: string,
) {
  return apiPost<
    { success: true; data: EventChatMessage },
    { content: string }
  >(
    `${BASE}/${encodeURIComponent(eventId)}/chat/${encodeURIComponent(conversationId)}/messages`,
    { content },
  );
}

export function markEventChatRead(eventId: string, conversationId: string) {
  return apiPatch<{ success: true }, Record<string, never>>(
    `${BASE}/${encodeURIComponent(eventId)}/chat/${encodeURIComponent(conversationId)}/read`,
    {},
  );
}

export function getEventChatUnreadCount(eventId: string) {
  return apiGet<{ success: true; data: { count: number } }>(
    `${BASE}/${encodeURIComponent(eventId)}/chat/unread-count`,
  );
}

export function canAccessEventVendorChat(
  event: CorporateEvent,
  userId?: string | null,
  role?: string | null,
) {
  if (role === "OWNER") return true;
  if (!userId) return false;
  return event.teamMembers.some((member) => member.corporateUser.id === userId);
}

export function eventHasVendorChat(event: CorporateEvent) {
  if (event.paymentStatus === "PAID") return true;
  const venues = event.eventVenues ?? [];
  const services = event.eventServices ?? [];
  return (
    venues.some((row) => row.bookingStatus === "CONFIRMED") ||
    services.some((row) => row.bookingStatus === "CONFIRMED")
  );
}

export function eventBookingStatusLabel(status?: CorporateEventBookingStatus) {
  switch (status) {
    case "CONFIRMED":
      return t("events.bookingStatusConfirmed");
    case "PARTIAL":
      return t("events.bookingStatusPartial");
    case "FAILED":
      return t("events.bookingStatusFailed");
    default:
      return t("events.bookingStatusNotStarted");
  }
}

export function lineBookingStatusLabel(status?: CorporateLineBookingStatus) {
  switch (status) {
    case "HELD":
      return t("events.lineHeld");
    case "CONFIRMED":
      return t("events.lineBooked");
    case "REQUESTED":
      return t("events.lineRequested");
    case "FAILED":
      return t("events.lineFailed");
    case "CANCELLED":
      return t("events.lineCancelled");
    default:
      return t("events.lineNotBooked");
  }
}

export function eventStatusLabel(status: CorporateEventStatus) {
  switch (status) {
    case "DRAFT":
      return t("events.statusDraft");
    case "PENDING_APPROVAL":
      return t("events.statusPendingApproval");
    case "APPROVED":
      return t("events.statusApproved");
    case "REJECTED":
      return t("events.statusRejected");
    case "CANCELLED":
      return t("events.statusCancelled");
    default:
      return status;
  }
}
