export type OrgMemberRole =
  | "OWNER"
  | "EVENT_MANAGER"
  | "FINANCE_APPROVER"
  | "MANAGEMENT_APPROVER"
  | "COLLABORATOR";

export const ASSIGNABLE_ORG_ROLES: OrgMemberRole[] = [
  "EVENT_MANAGER",
  "FINANCE_APPROVER",
  "MANAGEMENT_APPROVER",
  "COLLABORATOR",
];

export type TeamMember = {
  id: string;
  role: OrgMemberRole;
  invitedAt: string;
  joinedAt: string | null;
  createdAt: string;
  corporateUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: string;
  };
};

export type TeamInvite = {
  id: string;
  email: string;
  role: OrgMemberRole;
  expiresAt: string;
  createdAt: string;
  inviteUrl?: string;
  invitedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export type TeamListResponse = {
  success: true;
  data: {
    members: TeamMember[];
    invites: TeamInvite[];
  };
};

export type InviteResponse = {
  success: true;
  message: string;
  data:
    | { type: "member"; member: TeamMember }
    | {
        type: "invite";
        invite: Omit<TeamInvite, "invitedBy">;
        inviteUrl: string;
        emailed: boolean;
      };
};

export type InvitePreviewResponse = {
  success: true;
  data: {
    email: string;
    role: OrgMemberRole;
    expiresAt: string;
    accountExists: boolean;
    organization: {
      id: string;
      name: string;
      logoUrl: string | null;
      status: string;
    };
  };
};
