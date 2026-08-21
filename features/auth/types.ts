export type CorporateOrgStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type CorporateUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  phoneCountryCode?: string | null;
  status?: string;
  emailVerifiedAt?: string | null;
};

export type CorporateOrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  status: CorporateOrgStatus;
  tradeLicenseNumber?: string;
};

export type CorporateMembership = {
  membershipId: string;
  role: string;
  organization: CorporateOrganizationSummary;
};

export type CorporateSessionPayload = {
  accessToken: string;
  user: CorporateUser;
  organizations?: CorporateMembership[];
};

export type RegisterSuccessResponse = {
  success: true;
  requireOtp: true;
  userId: string;
  message: string;
  data: {
    user: CorporateUser;
    organization: CorporateOrganizationSummary;
  };
};

export type LoginTokensResponse = {
  success: true;
  message: string;
  accessToken: string;
  user: CorporateUser;
  organizations: CorporateMembership[];
};

export type LoginRequireOtpResponse = {
  success: true;
  requireOtp: true;
  userId: string;
  message: string;
};

export type LoginApiResponse = LoginTokensResponse | LoginRequireOtpResponse;

export type VerifyOtpSuccessResponse = LoginTokensResponse;

export type RefreshTokensResponse = {
  success: true;
  accessToken: string;
};

export type MeResponse = {
  success: true;
  data: {
    user: CorporateUser;
    organizations: CorporateMembership[];
  };
};

export type UploadDocumentResponse = {
  success: true;
  data: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
};

export type OrganizationDocumentType =
  | "TRADE_LICENSE"
  | "MEMORANDUM"
  | "VAT_CERTIFICATE"
  | "OTHER";

export type RegisterRequestBody = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  password: string;
  companyName: string;
  tradeLicenseNumber: string;
  industry?: string;
  companySize?: string;
  website?: string;
  country?: string;
  city?: string;
  address?: string;
  documents: Array<{
    type: OrganizationDocumentType;
    fileUrl: string;
    fileName?: string;
    fileSize?: number;
  }>;
};
