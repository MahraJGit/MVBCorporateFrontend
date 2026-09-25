import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { OrgPaymentMethod } from "@/features/events/types";

const BASE = "/api/corporate/organizations/me/billing";

export function listOrgPaymentMethods() {
  return apiGet<{ success: true; data: OrgPaymentMethod[] }>(`${BASE}/methods`);
}

export function createOrgSetupIntent() {
  return apiPost<{ success: true; data: { clientSecret: string } }, Record<string, never>>(
    `${BASE}/setup-intent`,
    {},
  );
}

export function setDefaultOrgPaymentMethod(methodId: string) {
  return apiPatch<{ success: true; data: OrgPaymentMethod[] }, Record<string, never>>(
    `${BASE}/methods/${encodeURIComponent(methodId)}/default`,
    {},
  );
}

export function deleteOrgPaymentMethod(methodId: string) {
  return apiDelete<{ success: true; data: OrgPaymentMethod[] }>(
    `${BASE}/methods/${encodeURIComponent(methodId)}`,
  );
}
