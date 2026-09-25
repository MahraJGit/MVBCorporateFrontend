import { z } from "zod";
import { e164ToApiParts, isE164Valid } from "@/lib/phone";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)");

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email"),
  password: z.string().min(1, "Password is required"),
});

export const accountStepSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required"),
    lastName: z.string().trim().min(2, "Last name is required"),
    email: z.string().trim().email("Enter a valid work email"),
    phoneE164: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (!data.phoneE164?.trim() || !isE164Valid(data.phoneE164)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid phone number",
        path: ["phoneE164"],
      });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const organizationStepSchema = z.object({
  companyName: z.string().trim().min(2, "Organization name is required"),
  legalEntityName: z.string().trim().min(2, "Legal entity name is required").max(200),
  tradeLicenseNumber: z.string().trim().min(2, "Trade license number is required"),
  tradeLicenseExpiry: z.string().trim().min(1, "Trade license expiry is required"),
  vatTrnNumber: z.string().trim().min(2, "VAT/TRN number is required").max(50),
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

export const otpSchema = z.object({
  code: z.string().trim().min(1, "OTP code is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type AccountStepValues = z.infer<typeof accountStepSchema>;
export type OrganizationStepValues = z.infer<typeof organizationStepSchema>;

export function accountStepToApiPhone(phoneE164: string | undefined) {
  const parts = e164ToApiParts(phoneE164);
  if (!parts) throw new Error("Invalid phone number");
  return parts;
}
