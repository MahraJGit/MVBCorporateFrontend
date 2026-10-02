import { apiPost, apiGet } from "@/lib/api/client";
import type {
  LoginApiResponse,
  MeResponse,
  RefreshTokensResponse,
  RegisterRequestBody,
  RegisterSuccessResponse,
  UploadDocumentResponse,
  VerifyOtpSuccessResponse,
} from "./types";

const AUTH_BASE = "/api/corporate/auth";
const withCookies: RequestInit = { credentials: "include" };

export function registerOrganization(body: RegisterRequestBody) {
  return apiPost<RegisterSuccessResponse, RegisterRequestBody>(
    `${AUTH_BASE}/register`,
    body,
    withCookies,
  );
}

export function verifyCorporateOtp(body: { userId: string; code: string }) {
  return apiPost<VerifyOtpSuccessResponse, { userId: string; code: string }>(
    `${AUTH_BASE}/verify-otp`,
    body,
    withCookies,
  );
}

export function loginCorporate(body: { email: string; password: string }) {
  return apiPost<LoginApiResponse, { email: string; password: string }>(
    `${AUTH_BASE}/login`,
    body,
    withCookies,
  );
}

export function refreshCorporateTokens() {
  return apiPost<RefreshTokensResponse, Record<string, never>>(
    `${AUTH_BASE}/refresh`,
    {},
    { ...withCookies, skipAuthRetry: true },
  );
}

export function logoutCorporate() {
  return apiPost<{ success: boolean; message: string }, Record<string, never>>(
    `${AUTH_BASE}/logout`,
    {},
    withCookies,
  );
}

export function fetchCorporateMe() {
  return apiGet<MeResponse>(`${AUTH_BASE}/me`, withCookies);
}

export function uploadCorporateDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiPost<UploadDocumentResponse, FormData>(
    `${AUTH_BASE}/upload-document`,
    form,
    withCookies,
  );
}
