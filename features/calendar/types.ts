export type CorporateCalendarItemStatus = "PLANNED" | "PROMOTED" | "CANCELLED";

export type CalendarItemVenueLine = {
  id: string;
  venueId: string;
  estimatedCost: number | null;
  notes: string | null;
  preferredStartAt: string | null;
  preferredEndAt: string | null;
  availabilityStatus: string | null;
  availabilityMessage: string | null;
  venue: {
    id: string;
    name: string;
    city: string | null;
    countryCode: string | null;
    capacityMax: number | null;
    coverImage?: string | null;
    pricing?: { currency: string } | null;
  };
};

export type CalendarItemServiceLine = {
  id: string;
  serviceId: string;
  estimatedCost: number | null;
  notes: string | null;
  preferredStartAt: string | null;
  preferredEndAt: string | null;
  availabilityStatus: string | null;
  availabilityMessage: string | null;
  service: {
    id: string;
    title: string;
    slug: string;
    currency: string;
    baseCity: string | null;
    countryCode: string | null;
    coverImage?: string | null;
    basePrice?: number | null;
  };
};

export type CorporateCalendarItem = {
  id: string;
  organizationId: string;
  fiscalBudgetId: string | null;
  budgetCategoryId: string | null;
  title: string;
  notes: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  locationPreference: string | null;
  estimatedAttendees: number | null;
  estimatedTotal: number | null;
  currency: string;
  status: CorporateCalendarItemStatus;
  linkedEventId: string | null;
  createdByCorporateUserId: string;
  createdAt: string;
  updatedAt: string;
  fiscalBudget?: {
    id: string;
    fiscalYear: number;
    currency: string;
    status: string;
  } | null;
  budgetCategory?: {
    id: string;
    name: string;
    allocatedAmount: number;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  linkedEvent?: {
    id: string;
    title: string;
    status: string;
  } | null;
  itemVenues?: CalendarItemVenueLine[];
  itemServices?: CalendarItemServiceLine[];
};

export type CreateCalendarItemBody = {
  title: string;
  notes?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  /** Cleared on save — plans no longer collect location. */
  locationPreference?: string | null;
  estimatedAttendees?: number | null;
  fiscalBudgetId?: string | null;
  budgetCategoryId?: string | null;
  currency?: string;
};

export type PromoteCalendarItemBody = {
  fiscalBudgetId: string;
  budgetCategoryId: string;
  allocatedAmount: number;
  title?: string;
  requirements?: string | null;
  objectives?: string | null;
};

export type CalendarListParams = {
  status?: CorporateCalendarItemStatus;
  fiscalBudgetId?: string;
  budgetCategoryId?: string;
  createdByCorporateUserId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
};
