"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Globe,
  FileText,
  Upload,
  Hash,
  Users,
  Check,
} from "lucide-react";
import type { Value } from "react-phone-number-input";
import { cn } from "@/lib/utils";
import { AuthBrandHeader } from "@/components/auth-brand-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignupPhoneField } from "@/components/signup-phone-field";
import { FormSelect } from "@/components/form-select";
import { DatePickerField } from "@/components/date-picker-field";
import {
  COMPANY_SIZE_OPTIONS,
  COUNTRY_OPTIONS,
  INDUSTRY_OPTIONS,
  optionLabel,
} from "@/features/organization/form-options";
import {
  accountStepSchema,
  accountStepToApiPhone,
  organizationStepSchema,
} from "@/features/auth/schemas";
import { registerOrganization, uploadCorporateDocument } from "@/features/auth/api";
import { ApiError, toastApiError } from "@/lib/api/errors";
import type { OrganizationDocumentType } from "@/features/auth/types";

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Organization" },
  { id: 3, label: "Documents" },
  { id: 4, label: "Review" },
] as const;

type DocKey = "tradeLicense" | "memorandum" | "vatCertificate" | "other";

type DocState = {
  file: File | null;
  uploadedUrl?: string;
};

const DOC_TYPE: Record<DocKey, OrganizationDocumentType> = {
  tradeLicense: "TRADE_LICENSE",
  memorandum: "MEMORANDUM",
  vatCertificate: "VAT_CERTIFICATE",
  other: "OTHER",
};

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneE164: undefined as Value | undefined,
    password: "",
    confirmPassword: "",
  });
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [org, setOrg] = useState({
    companyName: "",
    legalEntityName: "",
    tradeLicenseNumber: "",
    tradeLicenseExpiry: "",
    vatTrnNumber: "",
    industry: "",
    companySize: "",
    website: "",
    country: "",
    city: "",
    address: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});

  const [docs, setDocs] = useState<Record<DocKey, DocState>>({
    tradeLicense: { file: null },
    memorandum: { file: null },
    vatCertificate: { file: null },
    other: { file: null },
  });
  const [docError, setDocError] = useState<string | undefined>();

  const [agreed, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const setAcc = (key: keyof typeof account) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAccount((p) => ({ ...p, [key]: e.target.value }));
    setAccountErrors((errs) => {
      const next = { ...errs };
      delete next[key];
      return next;
    });
  };

  const setOrgValue = (key: keyof typeof org, value: string) => {
    setOrg((p) => ({ ...p, [key]: value }));
    setOrgErrors((errs) => {
      const next = { ...errs };
      delete next[key];
      return next;
    });
  };

  const setOrgField = (key: keyof typeof org) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setOrg((p) => ({ ...p, [key]: e.target.value }));
    setOrgErrors((errs) => {
      const next = { ...errs };
      delete next[key];
      return next;
    });
  };

  const handleFile = (key: DocKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setDocError("File must be 10 MB or smaller");
      return;
    }
    setDocs((p) => ({ ...p, [key]: { file: f } }));
    setDocError(undefined);
  };

  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  const next = () => {
    setFormError(undefined);
    if (step === 1) {
      const parsed = accountStepSchema.safeParse({
        ...account,
        phoneE164: account.phoneE164 ?? "",
      });
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        const nextErrs: Record<string, string> = {};
        for (const [k, v] of Object.entries(flat)) {
          if (v?.[0]) nextErrs[k] = v[0];
        }
        setAccountErrors(nextErrs);
        return;
      }
    }
    if (step === 2) {
      const parsed = organizationStepSchema.safeParse(org);
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        const nextErrs: Record<string, string> = {};
        for (const [k, v] of Object.entries(flat)) {
          if (v?.[0]) nextErrs[k] = v[0];
        }
        setOrgErrors(nextErrs);
        return;
      }
    }
    if (step === 3) {
      if (!docs.tradeLicense.file || !docs.memorandum.file) {
        setDocError("Trade license and Memorandum of Association are required");
        return;
      }
    }
    goTo(Math.min(step + 1, 4));
  };

  const prev = () => goTo(Math.max(step - 1, 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(undefined);
    setTermsError(undefined);

    if (!agreed) {
      setTermsError("Please accept the terms to continue");
      return;
    }
    if (!docs.tradeLicense.file || !docs.memorandum.file) {
      setDocError("Required documents are missing");
      goTo(3);
      return;
    }

    setPending(true);
    try {
      const uploads: Array<{
        type: OrganizationDocumentType;
        fileUrl: string;
        fileName?: string;
        fileSize?: number;
      }> = [];

      for (const key of Object.keys(docs) as DocKey[]) {
        const entry = docs[key];
        if (!entry.file) continue;
        let url = entry.uploadedUrl;
        if (!url) {
          const uploaded = await uploadCorporateDocument(entry.file);
          url = uploaded.data.url;
          setDocs((p) => ({
            ...p,
            [key]: { ...p[key], uploadedUrl: url },
          }));
        }
        uploads.push({
          type: DOC_TYPE[key],
          fileUrl: url!,
          fileName: entry.file.name,
          fileSize: entry.file.size,
        });
      }

      let logoUrl: string | undefined;
      if (logoFile) {
        const uploadedLogo = await uploadCorporateDocument(logoFile);
        logoUrl = uploadedLogo.data.url;
      }

      let phoneParts: { phone: string; phoneCountryCode: string };
      try {
        phoneParts = accountStepToApiPhone(account.phoneE164);
      } catch {
        setAccountErrors((e) => ({ ...e, phoneE164: "Enter a valid phone number" }));
        goTo(1);
        setPending(false);
        return;
      }

      const result = await registerOrganization({
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        email: account.email.trim(),
        phone: phoneParts.phone,
        phoneCountryCode: phoneParts.phoneCountryCode,
        password: account.password,
        companyName: org.companyName.trim(),
        tradeLicenseNumber: org.tradeLicenseNumber.trim(),
        tradeLicenseExpiry: org.tradeLicenseExpiry,
        legalEntityName: org.legalEntityName.trim(),
        vatTrnNumber: org.vatTrnNumber.trim(),
        logoUrl,
        industry: org.industry || undefined,
        companySize: org.companySize || undefined,
        website: org.website || undefined,
        country: org.country || undefined,
        city: org.city || undefined,
        address: org.address || undefined,
        documents: uploads,
      });

      toast.success(result.message || "Registered successfully");
      router.push(`/verify-otp?userId=${encodeURIComponent(result.userId)}`);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.length) {
        const accountFields = new Set([
          "firstName",
          "lastName",
          "email",
          "phone",
          "phoneCountryCode",
          "phoneE164",
          "password",
        ]);
        const orgFields = new Set([
          "companyName",
          "legalEntityName",
          "tradeLicenseNumber",
          "tradeLicenseExpiry",
          "vatTrnNumber",
          "industry",
          "companySize",
          "website",
          "country",
          "city",
          "address",
          "documents",
        ]);

        const nextAccount: Record<string, string> = {};
        const nextOrg: Record<string, string> = {};
        let docsMessage: string | undefined;

        for (const fe of err.fieldErrors) {
          const field = fe.field.replace(/^body\./, "").split(".")[0];
          if (field === "phone" || field === "phoneCountryCode") {
            if (!nextAccount.phoneE164) nextAccount.phoneE164 = fe.message;
          } else if (accountFields.has(field)) {
            if (!nextAccount[field]) nextAccount[field] = fe.message;
          } else if (field === "documents") {
            docsMessage = fe.message;
          } else if (orgFields.has(field)) {
            if (!nextOrg[field]) nextOrg[field] = fe.message;
          }
        }

        if (Object.keys(nextAccount).length) {
          setAccountErrors(nextAccount);
          goTo(1);
          return;
        }
        if (Object.keys(nextOrg).length) {
          setOrgErrors(nextOrg);
          goTo(2);
          return;
        }
        if (docsMessage) {
          setDocError(docsMessage);
          goTo(3);
          return;
        }

        setFormError(err.fieldErrors.map((f) => f.message).join(" "));
        return;
      }

      toast.error(toastApiError(err));
    } finally {
      setPending(false);
    }
  };

  const inputCls = cn(
    "h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
    "disabled:cursor-not-allowed disabled:opacity-60",
  );

  const FileUpload = useCallback(
    ({
      id,
      label,
      field,
      required,
    }: {
      id: string;
      label: string;
      field: DocKey;
      required?: boolean;
    }) => {
      const file = docs[field].file;
      return (
        <div>
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
            {label} {required && <span className="text-destructive">*</span>}
          </label>
          <label
            htmlFor={id}
            className={cn(
              "flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input bg-card/50 transition-colors hover:border-primary/50 hover:bg-accent/50",
              file && "border-primary/30 bg-primary/5",
            )}
          >
            {file ? (
              <>
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs text-foreground font-medium truncate max-w-[200px]">{file.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB — click to replace
                </span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">PDF, JPG, PNG (max 10 MB)</span>
              </>
            )}
          </label>
          <input
            id={id}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFile(field)}
            disabled={pending}
          />
        </div>
      );
    },
    [docs, pending],
  );

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right max-w-[55%] truncate">
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-8">
      <ThemeToggle className="fixed top-4 right-4 z-20" />

      <AuthBrandHeader />

      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => s.id < step && goTo(s.id)}
                disabled={s.id > step || pending}
                className="flex flex-col items-center gap-1 disabled:cursor-default"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                    step > s.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : step === s.id
                        ? "border-primary bg-primary/10 text-primary scale-110"
                        : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    step >= s.id ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-4 h-0.5 flex-1 mx-1.5 rounded-full transition-colors duration-500",
                    step > s.id ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Create your account</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Personal details of the organization admin
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">First name</label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input className={inputCls} value={account.firstName} onChange={setAcc("firstName")} disabled={pending} placeholder="John" />
                        </div>
                        {accountErrors.firstName ? <p className="mt-1 text-xs text-destructive">{accountErrors.firstName}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Last name</label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input className={inputCls} value={account.lastName} onChange={setAcc("lastName")} disabled={pending} placeholder="Doe" />
                        </div>
                        {accountErrors.lastName ? <p className="mt-1 text-xs text-destructive">{accountErrors.lastName}</p> : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Work email</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={inputCls} type="email" value={account.email} onChange={setAcc("email")} disabled={pending} placeholder="you@company.com" />
                      </div>
                      {accountErrors.email ? <p className="mt-1 text-xs text-destructive">{accountErrors.email}</p> : null}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Phone number</label>
                      <SignupPhoneField
                        id="register-phone"
                        className="mt-0"
                        value={account.phoneE164}
                        onChange={(next) => {
                          setAccount((prev) => ({ ...prev, phoneE164: next }));
                          setAccountErrors((errs) => {
                            const copy = { ...errs };
                            delete copy.phoneE164;
                            delete copy.phone;
                            delete copy.phoneCountryCode;
                            return copy;
                          });
                        }}
                        disabled={pending}
                        aria-invalid={!!accountErrors.phoneE164}
                        defaultCountry="AE"
                      />
                      {accountErrors.phoneE164 ? (
                        <p className="mt-1 text-xs text-destructive">{accountErrors.phoneE164}</p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={cn(inputCls, "pr-10")} type={showPassword ? "text" : "password"} value={account.password} onChange={setAcc("password")} disabled={pending} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" disabled={pending}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {accountErrors.password ? <p className="mt-1 text-xs text-destructive">{accountErrors.password}</p> : null}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Confirm password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={cn(inputCls, "pr-10")} type={showConfirm ? "text" : "password"} value={account.confirmPassword} onChange={setAcc("confirmPassword")} disabled={pending} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" disabled={pending}>
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {accountErrors.confirmPassword ? <p className="mt-1 text-xs text-destructive">{accountErrors.confirmPassword}</p> : null}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Organization details</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">Tell us about your company</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Organization name</label>
                      <div className="relative">
                        <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={inputCls} value={org.companyName} onChange={setOrgField("companyName")} disabled={pending} placeholder="Acme Corporation" />
                      </div>
                      {orgErrors.companyName ? <p className="mt-1 text-xs text-destructive">{orgErrors.companyName}</p> : null}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Trade license number</label>
                      <div className="relative">
                        <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={inputCls} value={org.tradeLicenseNumber} onChange={setOrgField("tradeLicenseNumber")} disabled={pending} placeholder="TL-12345678" />
                      </div>
                      {orgErrors.tradeLicenseNumber ? <p className="mt-1 text-xs text-destructive">{orgErrors.tradeLicenseNumber}</p> : null}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Legal entity name</label>
                      <div className="relative">
                        <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={inputCls} value={org.legalEntityName} onChange={setOrgField("legalEntityName")} disabled={pending} placeholder="Acme Events LLC" />
                      </div>
                      {orgErrors.legalEntityName ? <p className="mt-1 text-xs text-destructive">{orgErrors.legalEntityName}</p> : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">VAT / TRN number</label>
                        <input className={cn(inputCls, "!pl-3")} value={org.vatTrnNumber} onChange={setOrgField("vatTrnNumber")} disabled={pending} placeholder="100123456789003" />
                        {orgErrors.vatTrnNumber ? <p className="mt-1 text-xs text-destructive">{orgErrors.vatTrnNumber}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">License expiry</label>
                        <DatePickerField
                          value={org.tradeLicenseExpiry}
                          onChange={(v) => setOrgValue("tradeLicenseExpiry", v)}
                          disabled={pending}
                          placeholder="Select expiry date"
                          minDate={new Date()}
                          aria-invalid={Boolean(orgErrors.tradeLicenseExpiry)}
                        />
                        {orgErrors.tradeLicenseExpiry ? <p className="mt-1 text-xs text-destructive">{orgErrors.tradeLicenseExpiry}</p> : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Company logo <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:bg-accent/40">
                        <Upload className="h-4 w-4 shrink-0" />
                        <span>{logoFile ? logoFile.name : "Upload PNG or JPG (max 10 MB)"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={pending}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setLogoFile(f);
                          }}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Industry</label>
                        <FormSelect
                          value={org.industry}
                          onValueChange={(v) => setOrgValue("industry", v)}
                          options={INDUSTRY_OPTIONS}
                          placeholder="Select industry"
                          disabled={pending}
                          icon={Briefcase}
                          aria-invalid={Boolean(orgErrors.industry)}
                        />
                        {orgErrors.industry ? <p className="mt-1 text-xs text-destructive">{orgErrors.industry}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Company size</label>
                        <FormSelect
                          value={org.companySize}
                          onValueChange={(v) => setOrgValue("companySize", v)}
                          options={COMPANY_SIZE_OPTIONS}
                          placeholder="Select size"
                          disabled={pending}
                          icon={Users}
                          aria-invalid={Boolean(orgErrors.companySize)}
                        />
                        {orgErrors.companySize ? <p className="mt-1 text-xs text-destructive">{orgErrors.companySize}</p> : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Website <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={inputCls} value={org.website} onChange={setOrgField("website")} disabled={pending} placeholder="https://acme.com" />
                      </div>
                      {orgErrors.website ? <p className="mt-1 text-xs text-destructive">{orgErrors.website}</p> : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Country</label>
                        <FormSelect
                          value={org.country}
                          onValueChange={(v) => setOrgValue("country", v)}
                          options={COUNTRY_OPTIONS}
                          placeholder="Select country"
                          disabled={pending}
                          icon={MapPin}
                          aria-invalid={Boolean(orgErrors.country)}
                        />
                        {orgErrors.country ? <p className="mt-1 text-xs text-destructive">{orgErrors.country}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">City</label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input className={inputCls} value={org.city} onChange={setOrgField("city")} disabled={pending} placeholder="Dubai" />
                        </div>
                        {orgErrors.city ? <p className="mt-1 text-xs text-destructive">{orgErrors.city}</p> : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Office address</label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input className={inputCls} value={org.address} onChange={setOrgField("address")} disabled={pending} placeholder="Business Bay, Office 123" />
                      </div>
                      {orgErrors.address ? <p className="mt-1 text-xs text-destructive">{orgErrors.address}</p> : null}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Verification documents</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Upload documents for organization verification
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FileUpload id="doc-trade" label="Trade license" field="tradeLicense" required />
                      <FileUpload id="doc-memo" label="Memorandum" field="memorandum" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FileUpload id="doc-vat" label="VAT certificate" field="vatCertificate" />
                      <FileUpload id="doc-other" label="Other document" field="other" />
                    </div>
                    {docError ? <p className="text-xs text-destructive">{docError}</p> : null}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Review & submit</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">Verify your details before submitting</p>
                    </div>

                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      <div className="rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Account</h3>
                        <ReviewRow label="Name" value={`${account.firstName} ${account.lastName}`} />
                        <ReviewRow label="Email" value={account.email} />
                        <ReviewRow label="Phone" value={account.phoneE164 || "—"} />
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Organization</h3>
                        <ReviewRow label="Company" value={org.companyName} />
                        <ReviewRow label="Legal entity" value={org.legalEntityName} />
                        <ReviewRow label="License #" value={org.tradeLicenseNumber} />
                        <ReviewRow label="VAT/TRN" value={org.vatTrnNumber} />
                        <ReviewRow label="License expiry" value={org.tradeLicenseExpiry} />
                        <ReviewRow label="Logo" value={logoFile?.name || "Not uploaded"} />
                        <ReviewRow label="Industry" value={optionLabel(INDUSTRY_OPTIONS, org.industry)} />
                        <ReviewRow label="Location" value={[org.city, optionLabel(COUNTRY_OPTIONS, org.country)].filter(Boolean).join(", ")} />
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Documents</h3>
                        <ReviewRow label="Trade license" value={docs.tradeLicense.file?.name || "Not uploaded"} />
                        <ReviewRow label="Memorandum" value={docs.memorandum.file?.name || "Not uploaded"} />
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreed}
                        onChange={(e) => {
                          setAgreed(e.target.checked);
                          setTermsError(undefined);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                        disabled={pending}
                      />
                      <label htmlFor="terms" className="text-xs leading-snug text-muted-foreground cursor-pointer">
                        I confirm all information is accurate and agree to the Terms and Privacy Policy
                      </label>
                    </div>
                    {termsError ? <p className="text-xs text-destructive">{termsError}</p> : null}
                    {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prev}
                  disabled={pending}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-60"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={pending}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={pending || !agreed}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {pending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <>
                      Submit application <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
