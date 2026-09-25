import type { OrgMemberRole } from "@/features/team/types";

/** Capability keys used for nav gating and the Team permissions matrix. */
export type PermissionAction =
  | "viewOverview"
  | "viewBudget"
  | "manageBudget"
  | "viewEvents"
  | "createEvents"
  | "planEventResources"
  | "viewVenues"
  | "viewMarketplace"
  | "payBookings"
  | "viewTeam"
  | "manageTeam"
  | "viewApprovals"
  | "approveFinance"
  | "approveManagement"
  | "rejectEvents"
  | "viewSettings";

export const PERMISSION_ACTIONS: PermissionAction[] = [
  "viewOverview",
  "viewBudget",
  "manageBudget",
  "viewEvents",
  "createEvents",
  "planEventResources",
  "viewVenues",
  "viewMarketplace",
  "payBookings",
  "viewTeam",
  "manageTeam",
  "viewApprovals",
  "approveFinance",
  "approveManagement",
  "rejectEvents",
  "viewSettings",
];

export const ORG_ROLES: OrgMemberRole[] = [
  "OWNER",
  "EVENT_MANAGER",
  "FINANCE_APPROVER",
  "MANAGEMENT_APPROVER",
  "COLLABORATOR",
];

const ALL = true;
const NO = false;

/**
 * Source of truth for workspace capabilities by org role.
 * Keep in sync with backend assertRole checks in corporate modules.
 */
export const ROLE_PERMISSIONS: Record<OrgMemberRole, Record<PermissionAction, boolean>> = {
  OWNER: {
    viewOverview: ALL,
    viewBudget: ALL,
    manageBudget: ALL,
    viewEvents: ALL,
    createEvents: ALL,
    planEventResources: ALL,
    viewVenues: ALL,
    viewMarketplace: ALL,
    payBookings: ALL,
    viewTeam: ALL,
    manageTeam: ALL,
    viewApprovals: ALL,
    approveFinance: ALL,
    approveManagement: ALL,
    rejectEvents: ALL,
    viewSettings: ALL,
  },
  EVENT_MANAGER: {
    viewOverview: ALL,
    viewBudget: ALL,
    manageBudget: NO,
    viewEvents: ALL,
    createEvents: ALL,
    planEventResources: ALL,
    viewVenues: ALL,
    viewMarketplace: ALL,
    payBookings: NO,
    viewTeam: ALL,
    manageTeam: NO,
    viewApprovals: NO,
    approveFinance: NO,
    approveManagement: NO,
    rejectEvents: NO,
    viewSettings: NO,
  },
  FINANCE_APPROVER: {
    viewOverview: ALL,
    viewBudget: ALL,
    manageBudget: ALL,
    viewEvents: ALL,
    createEvents: NO,
    planEventResources: NO,
    viewVenues: ALL,
    viewMarketplace: ALL,
    payBookings: ALL,
    viewTeam: ALL,
    manageTeam: NO,
    viewApprovals: ALL,
    approveFinance: ALL,
    approveManagement: NO,
    rejectEvents: ALL,
    viewSettings: NO,
  },
  MANAGEMENT_APPROVER: {
    viewOverview: ALL,
    viewBudget: ALL,
    manageBudget: NO,
    viewEvents: ALL,
    createEvents: NO,
    planEventResources: NO,
    viewVenues: ALL,
    viewMarketplace: ALL,
    payBookings: NO,
    viewTeam: ALL,
    manageTeam: NO,
    viewApprovals: ALL,
    approveFinance: NO,
    approveManagement: ALL,
    rejectEvents: ALL,
    viewSettings: NO,
  },
  COLLABORATOR: {
    viewOverview: ALL,
    viewBudget: ALL,
    manageBudget: NO,
    viewEvents: ALL,
    createEvents: NO,
    planEventResources: NO,
    viewVenues: ALL,
    viewMarketplace: ALL,
    payBookings: NO,
    viewTeam: ALL,
    manageTeam: NO,
    viewApprovals: NO,
    approveFinance: NO,
    approveManagement: NO,
    rejectEvents: NO,
    viewSettings: NO,
  },
};

export function can(
  role: string | undefined | null,
  action: PermissionAction,
): boolean {
  const normalized = (role ?? "COLLABORATOR") as OrgMemberRole;
  const row = ROLE_PERMISSIONS[normalized] ?? ROLE_PERMISSIONS.COLLABORATOR;
  return Boolean(row[action]);
}

export type NavPermission = PermissionAction | "always";

export function navVisibleForRole(
  role: string | undefined | null,
  required: NavPermission,
): boolean {
  if (required === "always") return true;
  return can(role, required);
}
