import { z } from "zod";

export const organizationProfileSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required"),
  legalEntityName: z.string().trim().max(200).optional(),
  vatTrnNumber: z.string().trim().max(50).optional(),
  tradeLicenseNumber: z.string().trim().min(2, "Trade license number is required"),
  tradeLicenseExpiry: z.string().optional(),
  about: z.string().trim().max(2000).optional(),
  billingEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid billing email"),
  billingAddress: z.string().trim().max(500).optional(),
  preferredCurrency: z.string().length(3),
  timezone: z.string().min(1),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
  industry: z.string().trim().min(1, "Select an industry"),
  companySize: z.string().trim().min(1, "Select company size"),
  website: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "Website must start with http:// or https://"),
  country: z.string().trim().min(1, "Select a country"),
  city: z.string().trim().min(1, "City is required"),
  address: z.string().trim().min(2, "Office address is required"),
});

export type OrganizationProfileValues = z.infer<typeof organizationProfileSchema>;
