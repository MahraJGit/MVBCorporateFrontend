"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrganizationLogo } from "@/components/organization-logo";
import { FormSelect } from "@/components/form-select";
import { DatePickerField } from "@/components/date-picker-field";
import { OrgBillingCards } from "@/components/payments/org-billing-cards";
import { useAuth } from "@/features/auth/auth-context";
import {
  COMPANY_SIZE_OPTIONS,
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  FISCAL_MONTH_OPTIONS,
  INDUSTRY_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/features/organization/form-options";
import {
  fetchOrganizationProfile,
  updateOrganizationProfile,
  uploadOrganizationLogo,
} from "@/features/organization/api";
import { organizationProfileSchema } from "@/features/organization/schemas";
import { ApiError, toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const inputCls =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const textareaCls =
  "flex min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function toDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, organizations, refreshMe } = useAuth();
  const membership = organizations[0];
  const canEdit = membership?.role === "OWNER";
  const isApproved = membership?.organization?.status === "APPROVED";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    legalEntityName: "",
    vatTrnNumber: "",
    tradeLicenseNumber: "",
    tradeLicenseExpiry: "",
    about: "",
    billingEmail: "",
    billingAddress: "",
    preferredCurrency: "AED",
    timezone: "Asia/Dubai",
    fiscalYearStartMonth: 1,
    industry: "",
    companySize: "",
    website: "",
    country: "",
    city: "",
    address: "",
  });

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    void fetchOrganizationProfile()
      .then((res) => {
        if (cancelled) return;
        const org = res.data.organization;
        setLogoUrl(org.logoUrl ?? null);
        setForm({
          name: org.name ?? "",
          legalEntityName: org.legalEntityName ?? "",
          vatTrnNumber: org.vatTrnNumber ?? "",
          tradeLicenseNumber: org.tradeLicenseNumber ?? "",
          tradeLicenseExpiry: toDateInput(org.tradeLicenseExpiry),
          about: org.about ?? "",
          billingEmail: org.billingEmail ?? "",
          billingAddress: org.billingAddress ?? "",
          preferredCurrency: org.preferredCurrency ?? "AED",
          timezone: org.timezone ?? "Asia/Dubai",
          fiscalYearStartMonth: org.fiscalYearStartMonth ?? 1,
          industry: org.industry ?? "",
          companySize: org.companySize ?? "",
          website: org.website ?? "",
          country: org.country ?? "",
          city: org.city ?? "",
          address: org.address ?? "",
        });
      })
      .catch((err) => toastApiError(err, "Could not load organization profile."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const setFieldValue = (key: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setField =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFieldValue(key, e.target.value);
    };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Logo must be an image file.");
      return;
    }

    setLogoUploading(true);
    try {
      const uploaded = await uploadOrganizationLogo(file);
      setLogoUrl(uploaded.data.url);
      await updateOrganizationProfile({ logoUrl: uploaded.data.url });
      await refreshMe();
      toast.success("Logo updated.");
    } catch (err) {
      toastApiError(err, "Could not upload logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const parsed = organizationProfileSchema.safeParse(form);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(flat)) {
        if (v?.[0]) next[k] = v[0];
      }
      setErrors(next);
      return;
    }

    setSaving(true);
    try {
      await updateOrganizationProfile({
        name: parsed.data.name,
        legalEntityName: parsed.data.legalEntityName || null,
        vatTrnNumber: parsed.data.vatTrnNumber || null,
        tradeLicenseNumber: parsed.data.tradeLicenseNumber,
        tradeLicenseExpiry: parsed.data.tradeLicenseExpiry || null,
        about: parsed.data.about || null,
        billingEmail: parsed.data.billingEmail || null,
        billingAddress: parsed.data.billingAddress || null,
        preferredCurrency: parsed.data.preferredCurrency,
        timezone: parsed.data.timezone,
        fiscalYearStartMonth: parsed.data.fiscalYearStartMonth,
        industry: parsed.data.industry || null,
        companySize: parsed.data.companySize || null,
        website: parsed.data.website || null,
        country: parsed.data.country || null,
        city: parsed.data.city || null,
        address: parsed.data.address || null,
        logoUrl,
      });
      await refreshMe();
      toast.success("Company profile saved.");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.length) {
        const next: Record<string, string> = {};
        for (const fe of err.fieldErrors) {
          if (fe.field && fe.message) next[fe.field] = fe.message;
        }
        setErrors(next);
      } else {
        toastApiError(err, "Could not save profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const content = (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Company profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization branding, compliance details, and billing preferences.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {!canEdit ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
              Only the organization owner can edit the company profile.
            </p>
          ) : null}

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Branding
              </h2>
              <div className="flex items-center gap-4">
                <OrganizationLogo
                  logoUrl={logoUrl}
                  name={form.name || "Organization"}
                  className="h-16 w-16"
                  iconClassName="h-7 w-7"
                />
                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent",
                    (!canEdit || logoUploading) && "pointer-events-none opacity-60",
                  )}
                >
                  {logoUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Change logo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={!canEdit || logoUploading}
                    onChange={(e) => void handleLogoChange(e)}
                  />
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">About</label>
                <textarea
                  className={textareaCls}
                  value={form.about}
                  onChange={setField("about")}
                  disabled={!canEdit || saving}
                  placeholder="Brief description of your organization"
                />
                {errors.about ? <p className="mt-1 text-xs text-destructive">{errors.about}</p> : null}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Company details
              </h2>
              <Field label="Display name" error={errors.name}>
                <input className={inputCls} value={form.name} onChange={setField("name")} disabled={!canEdit || saving} />
              </Field>
              <Field label="Legal entity name" error={errors.legalEntityName}>
                <input className={inputCls} value={form.legalEntityName} onChange={setField("legalEntityName")} disabled={!canEdit || saving} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Trade license number" error={errors.tradeLicenseNumber}>
                  <input className={inputCls} value={form.tradeLicenseNumber} onChange={setField("tradeLicenseNumber")} disabled={!canEdit || saving} />
                </Field>
                <Field label="License expiry" error={errors.tradeLicenseExpiry}>
                  <DatePickerField
                    value={form.tradeLicenseExpiry}
                    onChange={(v) => setFieldValue("tradeLicenseExpiry", v)}
                    disabled={!canEdit || saving}
                    placeholder="Select expiry date"
                    aria-invalid={Boolean(errors.tradeLicenseExpiry)}
                  />
                </Field>
              </div>
              <Field label="VAT / TRN number" error={errors.vatTrnNumber}>
                <input className={inputCls} value={form.vatTrnNumber} onChange={setField("vatTrnNumber")} disabled={!canEdit || saving} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Industry" error={errors.industry}>
                  <FormSelect
                    value={form.industry}
                    onValueChange={(v) => setFieldValue("industry", v)}
                    options={INDUSTRY_OPTIONS}
                    placeholder="Select industry"
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(errors.industry)}
                  />
                </Field>
                <Field label="Company size" error={errors.companySize}>
                  <FormSelect
                    value={form.companySize}
                    onValueChange={(v) => setFieldValue("companySize", v)}
                    options={COMPANY_SIZE_OPTIONS}
                    placeholder="Select size"
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(errors.companySize)}
                  />
                </Field>
              </div>
              <Field label="Website" error={errors.website}>
                <input className={inputCls} value={form.website} onChange={setField("website")} disabled={!canEdit || saving} placeholder="https://example.com" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Country" error={errors.country}>
                  <FormSelect
                    value={form.country}
                    onValueChange={(v) => setFieldValue("country", v)}
                    options={COUNTRY_OPTIONS}
                    placeholder="Select country"
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(errors.country)}
                  />
                </Field>
                <Field label="City" error={errors.city}>
                  <input className={inputCls} value={form.city} onChange={setField("city")} disabled={!canEdit || saving} />
                </Field>
              </div>
              <Field label="Office address" error={errors.address}>
                <input className={inputCls} value={form.address} onChange={setField("address")} disabled={!canEdit || saving} />
              </Field>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Billing & operations
              </h2>
              <Field label="Billing email" error={errors.billingEmail}>
                <input className={inputCls} type="email" value={form.billingEmail} onChange={setField("billingEmail")} disabled={!canEdit || saving} placeholder="finance@company.com" />
              </Field>
              <Field label="Billing address" error={errors.billingAddress}>
                <textarea className={textareaCls} value={form.billingAddress} onChange={setField("billingAddress")} disabled={!canEdit || saving} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Currency" error={errors.preferredCurrency}>
                  <FormSelect
                    value={form.preferredCurrency}
                    onValueChange={(v) => setFieldValue("preferredCurrency", v)}
                    options={CURRENCY_OPTIONS}
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(errors.preferredCurrency)}
                  />
                </Field>
                <Field label="Timezone" error={errors.timezone}>
                  <FormSelect
                    value={form.timezone}
                    onValueChange={(v) => setFieldValue("timezone", v)}
                    options={TIMEZONE_OPTIONS}
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(errors.timezone)}
                  />
                </Field>
                <Field label="Fiscal year starts" error={errors.fiscalYearStartMonth}>
                  <FormSelect
                    value={String(form.fiscalYearStartMonth)}
                    onValueChange={(v) => setFieldValue("fiscalYearStartMonth", Number(v))}
                    options={FISCAL_MONTH_OPTIONS}
                    disabled={!canEdit || saving}
                    aria-invalid={Boolean(errors.fiscalYearStartMonth)}
                  />
                </Field>
              </div>
            </section>

            {canEdit ? (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </button>
            ) : null}
          </form>
        )}

        {isApproved ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Company cards
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved on the organization billing account. Finance uses these to settle held bookings on Stripe.
              </p>
            </div>
            <OrgBillingCards canManage={canEdit} />
          </section>
        ) : null}
    </>
  );

  if (isApproved) {
    return <div className="mx-auto max-w-3xl">{content}</div>;
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{content}</main>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
