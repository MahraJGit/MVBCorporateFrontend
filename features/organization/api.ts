import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type {
  OrganizationVerificationMeta,
  ResubmitRequestBody,
} from "@/features/auth/types";

export type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  status: string;
  submissionCount?: number;
  rejectedReason?: string | null;
  tradeLicenseNumber: string;
  tradeLicenseExpiry?: string | null;
  legalEntityName?: string | null;
  vatTrnNumber?: string | null;
  logoUrl?: string | null;
  about?: string | null;
  billingEmail?: string | null;
  billingAddress?: string | null;
  preferredCurrency?: string;
  timezone?: string;
  fiscalYearStartMonth?: number;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
};

export type UpdateOrganizationProfileBody = {
  name?: string;
  legalEntityName?: string | null;
  vatTrnNumber?: string | null;
  tradeLicenseNumber?: string;
  tradeLicenseExpiry?: string | null;
  logoUrl?: string | null;
  about?: string | null;
  billingEmail?: string | null;
  billingAddress?: string | null;
  preferredCurrency?: string;
  timezone?: string;
  fiscalYearStartMonth?: number;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
};

const ORG_BASE = "/api/corporate/organizations";
const AUTH_BASE = "/api/corporate/auth";
const withCookies: RequestInit = { credentials: "include" };

export function fetchOrganizationProfile() {
  return apiGet<{
    success: true;
    data: {
      role: string;
      organization: OrganizationProfile;
      verification: OrganizationVerificationMeta;
    };
  }>(`${ORG_BASE}/me`, withCookies);
}

export function resubmitOrganization(body: ResubmitRequestBody) {
  return apiPost<
    {
      success: true;
      message: string;
      data: OrganizationProfile;
      meta: OrganizationVerificationMeta;
    },
    ResubmitRequestBody
  >(`${ORG_BASE}/me/resubmit`, body, withCookies);
}

export function updateOrganizationProfile(body: UpdateOrganizationProfileBody) {
  return apiPatch<
    { success: true; message: string; data: OrganizationProfile },
    UpdateOrganizationProfileBody
  >(`${ORG_BASE}/me/profile`, body, withCookies);
}

export function uploadOrganizationLogo(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiPost<
    { success: true; data: { url: string; fileName: string; fileSize: number; mimeType: string } },
    FormData
  >(`${AUTH_BASE}/upload-logo`, form, withCookies);
}

export async function getCorporatePresignedViewUrl(fileUrl: string): Promise<string> {
  const res = await apiPost<
    { success: true; data: { viewUrl: string } },
    { fileUrl: string }
  >(`${AUTH_BASE}/presigned-view`, { fileUrl }, withCookies);
  return res.data.viewUrl;
}
