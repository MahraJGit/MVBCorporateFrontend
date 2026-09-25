export type OrgFiscalBudgetStatus = "DRAFT" | "ACTIVE" | "CLOSED";

export type OrgBudgetCategory = {
  id: string;
  fiscalBudgetId: string;
  name: string;
  allocatedAmount: string | number;
  sortOrder: number;
  committedAmount?: number;
  remainingAmount?: number;
};

export type OrgFiscalBudget = {
  id: string;
  organizationId: string;
  fiscalYear: number;
  periodStart: string;
  periodEnd: string;
  totalAmount: string | number;
  currency: string;
  status: OrgFiscalBudgetStatus;
  notes: string | null;
  activatedAt: string | null;
  closedAt: string | null;
  committedAmount?: number;
  remainingAmount?: number;
  /** Company total minus sum of category envelopes — free for new categories. */
  unallocatedAmount?: number;
  categories: OrgBudgetCategory[];
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type CreateBudgetBody = {
  fiscalYear: number;
  totalAmount: number;
  currency?: string;
  notes?: string;
  activate?: boolean;
  categories: { name: string; allocatedAmount: number; sortOrder?: number }[];
};
