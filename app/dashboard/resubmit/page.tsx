"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Upload,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { FormSelect } from "@/components/form-select";
import { DatePickerField } from "@/components/date-picker-field";
import {
  COMPANY_SIZE_OPTIONS,
  COUNTRY_OPTIONS,
  INDUSTRY_OPTIONS,
} from "@/features/organization/form-options";
import {
  fetchOrganizationProfile,
  resubmitOrganization,
} from "@/features/organization/api";
import { uploadCorporateDocument } from "@/features/auth/api";
import { organizationStepSchema } from "@/features/auth/schemas";
import type { OrganizationDocumentType, ResubmitRequestBody } from "@/features/auth/types";
import { MAX_ORG_SUBMISSIONS } from "@/features/auth/types";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError, toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

type DocKey = "tradeLicense" | "memorandum" | "vatCertificate" | "other";

type DocState = { file: File | null; uploadedUrl?: string };

const DOC_TYPE: Record<DocKey, OrganizationDocumentType> = {
  tradeLicense: "TRADE_LICENSE",
  memorandum: "MEMORANDUM",
  vatCertificate: "VAT_CERTIFICATE",
  other: "OTHER",
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function ResubmitPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, refreshMe } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [attemptInfo, setAttemptInfo] = useState({ count: 1, remaining: 0 });

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});
  const [docError, setDocError] = useState<string | undefined>();
  const [docs, setDocs] = useState<Record<DocKey, DocState>>({
    tradeLicense: { file: null },
    memorandum: { file: null },
    vatCertificate: { file: null },
    other: { file: null },
  });

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login");
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    void fetchOrganizationProfile()
      .then((res) => {
        const o = res.data.organization;
        const v = res.data.verification;

        if (o.status === "SUSPENDED" || !v.canResubmit) {
          router.replace("/dashboard");
          return;
        }

        if (o.status !== "REJECTED") {
          router.replace("/dashboard");
          return;
        }

        setRejectionReason(o.rejectedReason ?? null);
        setAttemptInfo({
          count: v.submissionCount,
          remaining: v.remainingSubmissions,
        });
        setLogoUrl(o.logoUrl ?? null);
        setOrg({
          companyName: o.name ?? "",
          legalEntityName: o.legalEntityName ?? "",
          tradeLicenseNumber: o.tradeLicenseNumber ?? "",
          tradeLicenseExpiry: toDateInput(o.tradeLicenseExpiry),
          vatTrnNumber: o.vatTrnNumber ?? "",
          industry: o.industry ?? "",
          companySize: o.companySize ?? "",
          website: o.website ?? "",
          country: o.country ?? "",
          city: o.city ?? "",
          address: o.address ?? "",
        });
      })
      .catch((err) => toastApiError(err, "Could not load application."))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  const setOrgValue = (key: keyof typeof org, value: string) => {
    setOrg((p) => ({ ...p, [key]: value }));
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
                <span className="max-w-[200px] truncate text-xs font-medium text-foreground">
                  {file.name}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(undefined);

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

    if (!docs.tradeLicense.file || !docs.memorandum.file) {
      setDocError("Trade license and Memorandum of Association are required");
      return;
    }

    setPending(true);
    try {
      const uploads: ResubmitRequestBody["documents"] = [];
      for (const key of Object.keys(docs) as DocKey[]) {
        const entry = docs[key];
        if (!entry.file) continue;
        let url = entry.uploadedUrl;
        if (!url) {
          const uploaded = await uploadCorporateDocument(entry.file);
          url = uploaded.data.url;
        }
        uploads.push({
          type: DOC_TYPE[key],
          fileUrl: url!,
          fileName: entry.file.name,
          fileSize: entry.file.size,
        });
      }

      let finalLogoUrl = logoUrl ?? undefined;

      await resubmitOrganization({
        companyName: org.companyName.trim(),
        tradeLicenseNumber: org.tradeLicenseNumber.trim(),
        tradeLicenseExpiry: org.tradeLicenseExpiry,
        legalEntityName: org.legalEntityName.trim(),
        vatTrnNumber: org.vatTrnNumber.trim(),
        logoUrl: finalLogoUrl,
        industry: org.industry || undefined,
        companySize: org.companySize || undefined,
        website: org.website || undefined,
        country: org.country || undefined,
        city: org.city || undefined,
        address: org.address || undefined,
        documents: uploads,
      });

      await refreshMe();
      toast.success(t("resubmit.success"));
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.length) {
        const next: Record<string, string> = {};
        for (const fe of err.fieldErrors) {
          if (fe.field && fe.message) next[fe.field] = fe.message;
        }
        setOrgErrors(next);
      } else {
        toastApiError(err, t("resubmit.error"));
      }
    } finally {
      setPending(false);
    }
  };

  if (!isReady || !isAuthenticated || loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("resubmit.loading")}
      </div>
    );
  }

  const nextAttempt = attemptInfo.count + 1;

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">{t("resubmit.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("resubmit.description")}</p>

        {rejectionReason ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-semibold text-destructive">{t("resubmit.adminFeedback")}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{rejectionReason}</p>
          </div>
        ) : null}

        <p className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("resubmit.attemptLine", { next: nextAttempt, max: MAX_ORG_SUBMISSIONS })}
          {attemptInfo.remaining <= 1 ? (
            <span className="text-destructive">{t("resubmit.lastAttemptWarning")}</span>
          ) : null}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Organization details</h2>

            <div>
              <label className="mb-1 block text-sm font-medium">Organization name</label>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className={inputCls}
                  value={org.companyName}
                  onChange={(e) => setOrgValue("companyName", e.target.value)}
                  disabled={pending}
                />
              </div>
              {orgErrors.companyName ? (
                <p className="mt-1 text-xs text-destructive">{orgErrors.companyName}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Legal entity name</label>
              <input
                className={cn(inputCls, "!pl-3")}
                value={org.legalEntityName}
                onChange={(e) => setOrgValue("legalEntityName", e.target.value)}
                disabled={pending}
              />
              {orgErrors.legalEntityName ? (
                <p className="mt-1 text-xs text-destructive">{orgErrors.legalEntityName}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Trade license #</label>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className={inputCls}
                    value={org.tradeLicenseNumber}
                    onChange={(e) => setOrgValue("tradeLicenseNumber", e.target.value)}
                    disabled={pending}
                  />
                </div>
                {orgErrors.tradeLicenseNumber ? (
                  <p className="mt-1 text-xs text-destructive">{orgErrors.tradeLicenseNumber}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">License expiry</label>
                <DatePickerField
                  value={org.tradeLicenseExpiry}
                  onChange={(v) => setOrgValue("tradeLicenseExpiry", v)}
                  disabled={pending}
                  minDate={new Date()}
                />
                {orgErrors.tradeLicenseExpiry ? (
                  <p className="mt-1 text-xs text-destructive">{orgErrors.tradeLicenseExpiry}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">VAT / TRN</label>
              <input
                className={cn(inputCls, "!pl-3")}
                value={org.vatTrnNumber}
                onChange={(e) => setOrgValue("vatTrnNumber", e.target.value)}
                disabled={pending}
              />
              {orgErrors.vatTrnNumber ? (
                <p className="mt-1 text-xs text-destructive">{orgErrors.vatTrnNumber}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Industry</label>
                <FormSelect
                  value={org.industry}
                  onValueChange={(v) => setOrgValue("industry", v)}
                  options={INDUSTRY_OPTIONS}
                  placeholder="Select industry"
                  disabled={pending}
                  icon={Briefcase}
                />
                {orgErrors.industry ? (
                  <p className="mt-1 text-xs text-destructive">{orgErrors.industry}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Company size</label>
                <FormSelect
                  value={org.companySize}
                  onValueChange={(v) => setOrgValue("companySize", v)}
                  options={COMPANY_SIZE_OPTIONS}
                  placeholder="Select size"
                  disabled={pending}
                  icon={Users}
                />
                {orgErrors.companySize ? (
                  <p className="mt-1 text-xs text-destructive">{orgErrors.companySize}</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Country</label>
                <FormSelect
                  value={org.country}
                  onValueChange={(v) => setOrgValue("country", v)}
                  options={COUNTRY_OPTIONS}
                  placeholder="Select country"
                  disabled={pending}
                  icon={MapPin}
                />
                {orgErrors.country ? (
                  <p className="mt-1 text-xs text-destructive">{orgErrors.country}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">City</label>
                <input
                  className={cn(inputCls, "!pl-3")}
                  value={org.city}
                  onChange={(e) => setOrgValue("city", e.target.value)}
                  disabled={pending}
                />
                {orgErrors.city ? (
                  <p className="mt-1 text-xs text-destructive">{orgErrors.city}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Office address</label>
              <input
                className={cn(inputCls, "!pl-3")}
                value={org.address}
                onChange={(e) => setOrgValue("address", e.target.value)}
                disabled={pending}
              />
              {orgErrors.address ? (
                <p className="mt-1 text-xs text-destructive">{orgErrors.address}</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Verification documents</h2>
            <p className="text-sm text-muted-foreground">
              Re-upload required documents (previous files will be replaced).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FileUpload id="resubmit-trade" label="Trade license" field="tradeLicense" required />
              <FileUpload id="resubmit-memo" label="Memorandum" field="memorandum" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FileUpload id="resubmit-vat" label="VAT certificate" field="vatCertificate" />
              <FileUpload id="resubmit-other" label="Other" field="other" />
            </div>
            {docError ? <p className="text-xs text-destructive">{docError}</p> : null}
          </section>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("resubmit.submit")}
          </button>
        </form>
      </main>
    </div>
  );
}
