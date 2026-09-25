export type CorporateEventStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type CorporateUserBrief = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type CorporateEventBookingStatus =
  | "NOT_STARTED"
  | "PARTIAL"
  | "CONFIRMED"
  | "FAILED";

export type CorporateLineBookingStatus =
  | "NOT_BOOKED"
  | "HELD"
  | "CONFIRMED"
  | "REQUESTED"
  | "FAILED"
  | "CANCELLED";

export type CorporateEventPaymentStatus = "NOT_DUE" | "AWAITING_PAYMENT" | "PAID";

type EventResourceLine = {
  id: string;
  estimatedCost: string | number | null;
  notes: string | null;
  preferredStartAt?: string | null;
  preferredEndAt?: string | null;
  bookingIntent?: Record<string, unknown> | null;
  availabilityStatus?: "OK" | "WARNING" | "UNAVAILABLE" | "UNKNOWN" | string | null;
  availabilityMessage?: string | null;
  bookingStatus?: CorporateLineBookingStatus;
  bookingError?: string | null;
  bookingConfirmedAt?: string | null;
};

export type CorporateEventVenueLine = EventResourceLine & {
  bookingId?: string | null;
  venue: {
    id: string;
    name: string;
    city: string | null;
    countryCode: string | null;
    coverImage: string | null;
  };
};

export type CorporateEventServiceLine = EventResourceLine & {
  serviceBookingId?: string | null;
  serviceInquiryId?: string | null;
  service: {
    id: string;
    title: string;
    slug: string;
    baseCity: string | null;
    countryCode: string | null;
    coverImage: string | null;
    basePrice: string | number | null;
    currency: string;
  };
};

export type CorporateEvent = {
  id: string;
  organizationId: string;
  fiscalBudgetId: string;
  budgetCategoryId: string | null;
  title: string;
  requirements: string | null;
  objectives: string | null;
  proposedStartAt: string | null;
  proposedEndAt: string | null;
  locationPreference: string | null;
  estimatedAttendees: number | null;
  allocatedAmount: string | number;
  currency: string;
  status: CorporateEventStatus;
  financeApprovedAt: string | null;
  managementApprovedAt: string | null;
  rejectedReason: string | null;
  rejectedAt: string | null;
  submittedAt: string | null;
  bookingStatus?: CorporateEventBookingStatus;
  bookingsConfirmedAt?: string | null;
  paymentStatus?: CorporateEventPaymentStatus;
  paidAt?: string | null;
  paidBy?: CorporateUserBrief | null;
  createdAt: string;
  fiscalBudget?: {
    id: string;
    fiscalYear: number;
    totalAmount: string | number;
    currency: string;
    status: string;
  };
  budgetCategory?: { id: string; name: string; allocatedAmount: string | number } | null;
  createdBy: CorporateUserBrief;
  financeApprovedBy: CorporateUserBrief | null;
  managementApprovedBy: CorporateUserBrief | null;
  rejectedBy: CorporateUserBrief | null;
  teamMembers: {
    id: string;
    role: "LEAD" | "MEMBER";
    corporateUser: CorporateUserBrief;
  }[];
  eventVenues?: CorporateEventVenueLine[];
  eventServices?: CorporateEventServiceLine[];
};

export type FulfilmentMode = "INSTANT" | "REQUEST";

export type EventBookingLinePlan = {
  lineId: string;
  type: "VENUE" | "SERVICE";
  resourceId: string;
  resourceName: string;
  bookingStatus: CorporateLineBookingStatus;
  bookingError: string | null;
  bookingRef: string | null;
  mode: FulfilmentMode;
  timezone: string | null;
  bookingMode: "DATE" | "SLOT" | null;
  pricingModel: string | null;
  date: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  slotKey: string | null;
  guests: number | null;
  estimatedCost: number | null;
  blockers: string[];
  warnings: string[];
};

export type EventBookingLineSelection = {
  lineId: string;
  type: "VENUE" | "SERVICE";
  date?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  slotKey?: string;
  guests?: number;
};

export type EventBookingPaymentItem = {
  type: "VENUE" | "SERVICE";
  lineId: string | null;
  bookingId: string;
  name: string;
  amount: number;
  currency: string;
  estimatedCost: number | null;
};

export type EventPaymentCurrencyGroup = {
  currency: string;
  amountDue: number;
  itemCount: number;
  items?: EventBookingPaymentItem[];
};

export type EventBookingPreview = {
  eventId: string;
  title: string;
  currency: string;
  status: CorporateEventStatus;
  bookingStatus: CorporateEventBookingStatus;
  bookingsConfirmedAt: string | null;
  paymentStatus?: CorporateEventPaymentStatus;
  paidAt?: string | null;
  canConfirm: boolean;
  canSwap?: boolean;
  canPay?: boolean;
  reason: string | null;
  payment?: {
    amountDue: number;
    currency: string;
    heldCount: number;
    allocatedAmount?: number;
    exceedsAllocation?: boolean;
    allocationComparable?: boolean;
    mixedCurrency?: boolean;
    currencies?: string[];
    currencyGroups?: EventPaymentCurrencyGroup[];
    nextCharge?: {
      currency: string;
      amountDue: number;
      itemCount: number;
    } | null;
    remainingCurrencyCount?: number;
    items?: EventBookingPaymentItem[];
  };
  lines: EventBookingLinePlan[];
  summary: {
    total: number;
    pending: number;
    ready: number;
    blocked: number;
    held?: number;
    confirmed: number;
    requested: number;
  };
};

export type EventPayResponse = {
  success: boolean;
  status: "succeeded" | "requires_action" | "partial";
  message: string;
  data?:
    | CorporateEvent
    | {
        clientSecret: string;
        paymentIntentId: string;
        amountDue: number;
        currency: string;
        remainingCurrencies: number;
        chargeIndex?: number;
        chargeTotal?: number;
        currencyGroups?: EventPaymentCurrencyGroup[];
        exceedsAllocation?: boolean;
        allocationComparable?: boolean;
        mixedCurrency?: boolean;
      };
  meta?: {
    remainingCurrencies?: number;
    chargedCurrency?: string;
    chargedAmount?: number;
    chargeIndex?: number;
    chargeTotal?: number;
    nextCharge?: {
      currency: string;
      amountDue: number;
      itemCount: number;
    } | null;
    currencyGroups?: EventPaymentCurrencyGroup[];
  };
};

export type EventProposalLine = {
  id: string;
  lineType: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type EventProposal = {
  id: string;
  status: string;
  version: number;
  notes: string | null;
  subtotal: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  vendorName: string;
  serviceTitle: string;
  exceedsEstimate: boolean;
  lines: EventProposalLine[];
  bookingId: string | null;
  bookingStatus: string | null;
  expiresAt: string | null;
};

export type EventRequestLine = {
  lineId: string;
  serviceId: string;
  serviceName: string;
  estimatedCost: number | null;
  bookingStatus: CorporateLineBookingStatus;
  bookingError: string | null;
  inquiry: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    slotKey: string | null;
  } | null;
  proposals: EventProposal[];
  activeProposal: EventProposal | null;
};

export type EventRequestsResponse = {
  success: true;
  data: {
    eventId: string;
    title: string;
    currency: string;
    allocatedAmount: number;
    canAct: boolean;
    lines: EventRequestLine[];
    summary: { waiting: number; quotes: number; accepted: number };
  };
};

export type OrgPaymentMethod = {
  id: string;
  stripePaymentMethodId: string;
  brand: string | null;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export type EventBookingOutcome = {
  lineId: string;
  type: "VENUE" | "SERVICE";
  resourceName: string;
  status: CorporateLineBookingStatus | "SKIPPED";
  message: string;
  bookingRef?: string | null;
};

export type EventBookingConfirmResponse = {
  success: boolean;
  message: string;
  data: CorporateEvent;
  meta: {
    bookingStatus: CorporateEventBookingStatus;
    held?: number;
    confirmed: number;
    requested: number;
    failed: number;
    skipped: number;
    results: EventBookingOutcome[];
  };
};

export type EventChatParticipantKind = "vendor" | "team" | "billing";

export type EventChatParticipant = {
  userId: string;
  role: string;
  kind: EventChatParticipantKind;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
};

export type EventChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  };
};

export type EventChatConversation = {
  id: string;
  type: string;
  title: string;
  resourceName: string;
  lineType: "VENUE" | "SERVICE";
  lastMessageAt: string | null;
  lastMessage: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    senderName: string;
  } | null;
  unreadCount: number;
  participants: EventChatParticipant[];
};

export type EventChatListResponse = {
  success: true;
  data: {
    eventId: string;
    eventTitle: string;
    viewerUserId: string;
    items: EventChatConversation[];
  };
};

export type CreateEventBody = {
  fiscalBudgetId: string;
  budgetCategoryId: string;
  title: string;
  requirements?: string | null;
  objectives?: string | null;
  proposedStartAt?: string | null;
  proposedEndAt?: string | null;
  locationPreference: string;
  estimatedAttendees?: number | null;
  allocatedAmount: number;
  teamMemberIds?: string[];
  submit?: boolean;
};

export type PendingEventApprovalsResponse = {
  success: true;
  data: CorporateEvent[];
  meta: {
    pendingCount: number;
    canApproveFinance: boolean;
    canApproveManagement: boolean;
    canReject: boolean;
  };
};
