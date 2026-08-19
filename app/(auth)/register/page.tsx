"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
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
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const STEPS = [
  { id: 1, label: "Account" },
  { id: 2, label: "Organization" },
  { id: 3, label: "Documents" },
  { id: 4, label: "Review" },
] as const;

type FileEntry = { name: string; size: number };

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const [account, setAccount] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [org, setOrg] = useState({
    companyName: "",
    tradeLicenseNumber: "",
    industry: "",
    companySize: "",
    website: "",
    country: "",
    city: "",
    address: "",
  });

  const [docs, setDocs] = useState<{
    tradeLicense: FileEntry | null;
    memorandum: FileEntry | null;
    vatCertificate: FileEntry | null;
    other: FileEntry | null;
  }>({
    tradeLicense: null,
    memorandum: null,
    vatCertificate: null,
    other: null,
  });

  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);

  const setAcc = (key: keyof typeof account) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAccount((p) => ({ ...p, [key]: e.target.value }));

  const setOrgField = (key: keyof typeof org) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setOrg((p) => ({ ...p, [key]: e.target.value }));

  const handleFile = (key: keyof typeof docs) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setDocs((p) => ({ ...p, [key]: { name: f.name, size: f.size } }));
  };

  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };
  const next = () => goTo(Math.min(step + 1, 4));
  const prev = () => goTo(Math.max(step - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setTimeout(() => setPending(false), 1500);
  };

  const inputCls = cn(
    "h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
    "disabled:cursor-not-allowed disabled:opacity-60",
  );

  const selectCls = cn(
    "h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground transition-colors appearance-none",
    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
    "disabled:cursor-not-allowed disabled:opacity-60",
  );

  const FileUpload = useCallback(
    ({ id, label, field, required }: { id: string; label: string; field: keyof typeof docs; required?: boolean }) => {
      const file = docs[field];
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
                <span className="text-[10px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB — click to replace</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">PDF, JPG, PNG (max 10 MB)</span>
              </>
            )}
          </label>
          <input id={id} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile(field)} disabled={pending} />
        </div>
      );
    },
    [docs, pending],
  );

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right max-w-[55%] truncate">{value || "—"}</span>
    </div>
  );

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-8">
      <ThemeToggle className="fixed top-4 right-4 z-20" />

      {/* Logo */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Building2 className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground leading-tight">MyVenueBooking</p>
          <p className="text-[11px] text-muted-foreground">Corporate Portal</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-between px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                type="button"
                onClick={() => s.id < step && goTo(s.id)}
                disabled={s.id > step}
                className="flex flex-col items-center gap-1 disabled:cursor-default"
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                    step > s.id
                      ? "border-primary bg-primary text-primary-foreground scale-100"
                      : step === s.id
                        ? "border-primary bg-primary/10 text-primary scale-110"
                        : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <span className={cn("text-[10px] font-medium transition-colors", step >= s.id ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("mb-4 h-0.5 flex-1 mx-1.5 rounded-full transition-colors duration-500", step > s.id ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Animated form container */}
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
                {/* ── Step 1: Account ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Create your account</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">Personal details of the organization admin</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-foreground">First name</label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input id="firstName" type="text" placeholder="John" value={account.firstName} onChange={setAcc("firstName")} disabled={pending} className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-foreground">Last name</label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input id="lastName" type="text" placeholder="Doe" value={account.lastName} onChange={setAcc("lastName")} disabled={pending} className={inputCls} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">Work email</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="email" type="email" placeholder="you@company.com" value={account.email} onChange={setAcc("email")} disabled={pending} className={inputCls} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">Phone number</label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="phone" type="tel" placeholder="+971 50 000 0000" value={account.phone} onChange={setAcc("phone")} disabled={pending} className={inputCls} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">Password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={account.password} onChange={setAcc("password")} disabled={pending} className={cn(inputCls, "pr-10")} />
                        <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" disabled={pending}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-foreground">Confirm password</label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={account.confirmPassword} onChange={setAcc("confirmPassword")} disabled={pending} className={cn(inputCls, "pr-10")} />
                        <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" disabled={pending}>
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Organization ── */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Organization details</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">Tell us about your company</p>
                    </div>

                    <div>
                      <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-foreground">Organization name</label>
                      <div className="relative">
                        <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="companyName" type="text" placeholder="Acme Corporation" value={org.companyName} onChange={setOrgField("companyName")} disabled={pending} className={inputCls} />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="tradeLicenseNumber" className="mb-1 block text-sm font-medium text-foreground">Trade license number</label>
                      <div className="relative">
                        <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="tradeLicenseNumber" type="text" placeholder="TL-12345678" value={org.tradeLicenseNumber} onChange={setOrgField("tradeLicenseNumber")} disabled={pending} className={inputCls} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="industry" className="mb-1 block text-sm font-medium text-foreground">Industry</label>
                        <div className="relative">
                          <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <select id="industry" value={org.industry} onChange={setOrgField("industry")} disabled={pending} className={selectCls}>
                            <option value="">Select</option>
                            <option value="technology">Technology</option>
                            <option value="finance">Finance & Banking</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="education">Education</option>
                            <option value="realestate">Real Estate</option>
                            <option value="hospitality">Hospitality</option>
                            <option value="government">Government</option>
                            <option value="retail">Retail</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="companySize" className="mb-1 block text-sm font-medium text-foreground">Company size</label>
                        <div className="relative">
                          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <select id="companySize" value={org.companySize} onChange={setOrgField("companySize")} disabled={pending} className={selectCls}>
                            <option value="">Select</option>
                            <option value="1-10">1–10</option>
                            <option value="11-50">11–50</option>
                            <option value="51-200">51–200</option>
                            <option value="201-500">201–500</option>
                            <option value="501+">501+</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="website" className="mb-1 block text-sm font-medium text-foreground">
                        Website <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="website" type="url" placeholder="https://acme.com" value={org.website} onChange={setOrgField("website")} disabled={pending} className={inputCls} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="country" className="mb-1 block text-sm font-medium text-foreground">Country</label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <select id="country" value={org.country} onChange={setOrgField("country")} disabled={pending} className={selectCls}>
                            <option value="">Select</option>
                            <option value="AE">UAE</option>
                            <option value="SA">Saudi Arabia</option>
                            <option value="BH">Bahrain</option>
                            <option value="QA">Qatar</option>
                            <option value="KW">Kuwait</option>
                            <option value="OM">Oman</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="city" className="mb-1 block text-sm font-medium text-foreground">City</label>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input id="city" type="text" placeholder="Dubai" value={org.city} onChange={setOrgField("city")} disabled={pending} className={inputCls} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="address" className="mb-1 block text-sm font-medium text-foreground">Office address</label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id="address" type="text" placeholder="Business Bay, Office 123" value={org.address} onChange={setOrgField("address")} disabled={pending} className={inputCls} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Documents ── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Verification documents</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">Upload documents for organization verification</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <FileUpload id="doc-trade" label="Trade license" field="tradeLicense" required />
                      <FileUpload id="doc-memo" label="Memorandum" field="memorandum" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FileUpload id="doc-vat" label="VAT certificate" field="vatCertificate" />
                      <FileUpload id="doc-other" label="Other document" field="other" />
                    </div>

                    <div className="rounded-lg bg-accent/40 p-3">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Accepted: PDF, JPG, PNG (max 10 MB each). Our team reviews documents within 1–2 business days.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Review ── */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Review & submit</h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">Verify your details before submitting</p>
                    </div>

                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Account</h3>
                          <button type="button" onClick={() => goTo(1)} className="text-[10px] text-primary hover:underline">Edit</button>
                        </div>
                        <ReviewRow label="Name" value={`${account.firstName} ${account.lastName}`} />
                        <ReviewRow label="Email" value={account.email} />
                        <ReviewRow label="Phone" value={account.phone} />
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Organization</h3>
                          <button type="button" onClick={() => goTo(2)} className="text-[10px] text-primary hover:underline">Edit</button>
                        </div>
                        <ReviewRow label="Company" value={org.companyName} />
                        <ReviewRow label="License #" value={org.tradeLicenseNumber} />
                        <ReviewRow label="Industry" value={org.industry} />
                        <ReviewRow label="Size" value={org.companySize} />
                        <ReviewRow label="Location" value={[org.city, org.country].filter(Boolean).join(", ")} />
                      </div>

                      <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">Documents</h3>
                          <button type="button" onClick={() => goTo(3)} className="text-[10px] text-primary hover:underline">Edit</button>
                        </div>
                        <ReviewRow label="Trade license" value={docs.tradeLicense?.name || "Not uploaded"} />
                        <ReviewRow label="Memorandum" value={docs.memorandum?.name || "Not uploaded"} />
                        <ReviewRow label="VAT cert." value={docs.vatCertificate?.name || "—"} />
                        <ReviewRow label="Other" value={docs.other?.name || "—"} />
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <input type="checkbox" id="terms" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input bg-card text-primary accent-primary" disabled={pending} />
                      <label htmlFor="terms" className="text-xs leading-snug text-muted-foreground cursor-pointer">
                        I confirm all information is accurate and agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                      </label>
                    </div>

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        After submission, our team will review your application. You&apos;ll receive an email once approved (typically 1–2 business days).
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-6 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prev}
                  disabled={pending}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors",
                    "hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={next}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors",
                    "hover:bg-primary/90",
                  )}
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={pending || !agreed}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors",
                    "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  {pending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  ) : (
                    <>Submit application <ArrowRight className="h-3.5 w-3.5" /></>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
