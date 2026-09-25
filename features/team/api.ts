import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { t } from "@/lib/i18n";
import type {
  InvitePreviewResponse,
  InviteResponse,
  OrgMemberRole,
  TeamListResponse,
} from "./types";

const BASE = "/api/corporate/members";

export function listTeam() {
  return apiGet<TeamListResponse>(BASE);
}

export function inviteTeamMember(body: { email: string; role: OrgMemberRole }) {
  return apiPost<InviteResponse, typeof body>(`${BASE}/invite`, body);
}

export function updateMemberRole(memberId: string, role: OrgMemberRole) {
  return apiPatch<{ success: true; message: string }, { role: OrgMemberRole }>(
    `${BASE}/${encodeURIComponent(memberId)}/role`,
    { role },
  );
}

export function removeMember(memberId: string) {
  return apiDelete<{ success: true; message: string }>(
    `${BASE}/${encodeURIComponent(memberId)}`,
  );
}

export function revokeInvite(inviteId: string) {
  return apiDelete<{ success: true; message: string }>(
    `${BASE}/invites/${encodeURIComponent(inviteId)}`,
  );
}

export function previewInvite(token: string) {
  return apiGet<InvitePreviewResponse>(
    `${BASE}/invites/${encodeURIComponent(token)}`,
  );
}

export function acceptInvite(token: string) {
  return apiPost<{ success: true; message: string }, { token: string }>(
    `${BASE}/invites/accept`,
    { token },
  );
}

export function registerViaInvite(body: {
  token: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountryCode: string;
  password: string;
}) {
  return apiPost<
    { success: true; message: string; data: { userId: string } },
    typeof body
  >(`${BASE}/invites/register`, body);
}

export function roleLabel(role: string) {
  const key = `roles.${role}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return role
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
