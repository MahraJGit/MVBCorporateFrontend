import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api/client";
import type { CreateBudgetBody, OrgFiscalBudget } from "./types";

const BASE = "/api/corporate/budgets";

export function listBudgets() {
  return apiGet<{ success: true; data: OrgFiscalBudget[] }>(BASE);
}

export function getCurrentBudget() {
  return apiGet<{ success: true; data: OrgFiscalBudget | null }>(`${BASE}/current`);
}

export function createBudget(body: CreateBudgetBody) {
  return apiPost<
    { success: true; message: string; data: OrgFiscalBudget },
    CreateBudgetBody
  >(BASE, body);
}

export function updateBudget(
  id: string,
  body: { totalAmount?: number; notes?: string | null; currency?: string },
) {
  return apiPatch<
    { success: true; message: string; data: OrgFiscalBudget },
    { totalAmount?: number; notes?: string | null; currency?: string }
  >(`${BASE}/${encodeURIComponent(id)}`, body);
}

export function activateBudget(id: string) {
  return apiPost<
    { success: true; message: string; data: OrgFiscalBudget },
    Record<string, never>
  >(`${BASE}/${encodeURIComponent(id)}/activate`, {});
}

export function addBudgetCategory(
  budgetId: string,
  body: { name: string; allocatedAmount: number },
) {
  return apiPost<
    { success: true; message: string; data: unknown; budget: OrgFiscalBudget },
    { name: string; allocatedAmount: number }
  >(`${BASE}/${encodeURIComponent(budgetId)}/categories`, body);
}

export function updateBudgetCategory(
  budgetId: string,
  categoryId: string,
  body: { name?: string; allocatedAmount?: number },
) {
  return apiPatch<
    { success: true; message: string; data: unknown; budget: OrgFiscalBudget },
    { name?: string; allocatedAmount?: number }
  >(
    `${BASE}/${encodeURIComponent(budgetId)}/categories/${encodeURIComponent(categoryId)}`,
    body,
  );
}

export function deleteBudgetCategory(budgetId: string, categoryId: string) {
  return apiDelete<{
    success: true;
    message: string;
    returnedAmount?: number;
    currency?: string;
    budget: OrgFiscalBudget;
  }>(
    `${BASE}/${encodeURIComponent(budgetId)}/categories/${encodeURIComponent(categoryId)}`,
  );
}

export function returnUnusedBudgetCategory(budgetId: string, categoryId: string) {
  return apiPost<
    {
      success: true;
      message: string;
      returnedAmount: number;
      currency: string;
      budget: OrgFiscalBudget;
    },
    Record<string, never>
  >(
    `${BASE}/${encodeURIComponent(budgetId)}/categories/${encodeURIComponent(categoryId)}/return-unused`,
    {},
  );
}

export function deleteBudget(id: string) {
  return apiDelete<{ success: true; message: string }>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
}

export function formatMoney(amount: string | number, currency = "AED") {
  const n = typeof amount === "number" ? amount : Number(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `${currency} ${n}`;
  }
}
