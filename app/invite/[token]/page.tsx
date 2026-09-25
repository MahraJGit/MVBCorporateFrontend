"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OrganizationLogo } from "@/components/organization-logo";
import { SignupPhoneField } from "@/components/signup-phone-field";
import { useAuth } from "@/features/auth/auth-context";
import { loginCorporate } from "@/features/auth/api";
import {
  acceptInvite,
  previewInvite,
  registerViaInvite,
  roleLabel,
} from "@/features/team/api";
import type { InvitePreviewResponse } from "@/features/team/types";
import { ApiError, applyApiFieldErrors, toastApiError } from "@/lib/api/errors";
import { e164ToApiParts } from "@/lib/phone";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Value } from "react-phone-number-input";

const inputCls =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { isReady, isAuthenticated, user, refreshMe, establishSession } = useAuth();
  const [preview, setPreview] = useState<InvitePreviewResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [join, setJoin] = useState({
    firstName: "",
    lastName: "",
    phoneE164: undefined as Value | undefined,
    password: "",
  });

  useEffect(() => {
    if (!token) return;
    void previewInvite(token)
      .then((res) => setPreview(res.data))
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("invite.invalid"));
      })
      .finally(() => setLoading(false));
  }, [token]);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const res = await acceptInvite(token);
      await refreshMe();
      toast.success(res.message);
      router.replace("/dashboard");
    } catch (err) {
      toastApiError(err, t("invite.acceptError"));
    } finally {
      setAccepting(false);
    }
  };

  const handleRegisterJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !preview) return;
    setFieldErrors({});

    const phoneParts = e164ToApiParts(join.phoneE164);
    if (!phoneParts) {
      setFieldErrors({ phone: t("invite.phoneInvalid") });
      toast.error(t("invite.phoneInvalid"));
      return;
    }

    setAccepting(true);
    try {
      const res = await registerViaInvite({
        token,
        firstName: join.firstName,
        lastName: join.lastName,
        phone: phoneParts.phone,
        phoneCountryCode: phoneParts.phoneCountryCode,
        password: join.password,
      });
      toast.success(res.message);
      const login = await loginCorporate({
        email: preview.email,
        password: join.password,
      });
      if ("accessToken" in login && login.accessToken) {
        establishSession({
          accessToken: login.accessToken,
          user: login.user,
          organizations: login.organizations,
        });
        router.replace("/dashboard");
        return;
      }
      router.replace(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        toast.message(t("invite.alreadyHasAccount"));
        return;
      }
      const mapped = applyApiFieldErrors(err, setFieldErrors, [
        "firstName",
        "lastName",
        "phone",
        "phoneCountryCode",
        "password",
        "token",
      ]);
      if (mapped && err instanceof ApiError && err.fieldErrors?.length) {
        toast.error(err.fieldErrors.map((fe) => fe.message).join(" · "));
      } else {
        toastApiError(err, t("invite.acceptError"));
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading || !isReady) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("invite.loading")}
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-bold">{t("invite.invalidTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? t("invite.invalid")}</p>
          <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
            {t("invite.goLogin")}
          </Link>
        </div>
      </div>
    );
  }

  const emailMismatch =
    isAuthenticated &&
    user?.email &&
    user.email.trim().toLowerCase() !== preview.email.trim().toLowerCase();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <OrganizationLogo
            logoUrl={preview.organization.logoUrl}
            name={preview.organization.name}
            className="h-12 w-12"
          />
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("invite.title")}</h1>
            <p className="text-sm text-muted-foreground">{preview.organization.name}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("invite.email")}</dt>
            <dd className="font-medium">{preview.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("invite.role")}</dt>
            <dd className="font-medium">{roleLabel(preview.role)}</dd>
          </div>
        </dl>

        {!isAuthenticated ? (
          preview.accountExists ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">{t("invite.signInPrompt")}</p>
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t("invite.signIn")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegisterJoin} className="mt-6 space-y-3" noValidate>
              <p className="text-sm text-muted-foreground">{t("invite.createAccountPrompt")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    className={cn(inputCls)}
                    placeholder={t("invite.firstName")}
                    required
                    value={join.firstName}
                    onChange={(e) => {
                      setJoin((p) => ({ ...p, firstName: e.target.value }));
                      clearFieldError("firstName");
                    }}
                    disabled={accepting}
                    aria-invalid={Boolean(fieldErrors.firstName)}
                  />
                  {fieldErrors.firstName ? (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.firstName}</p>
                  ) : null}
                </div>
                <div>
                  <input
                    className={cn(inputCls)}
                    placeholder={t("invite.lastName")}
                    required
                    value={join.lastName}
                    onChange={(e) => {
                      setJoin((p) => ({ ...p, lastName: e.target.value }));
                      clearFieldError("lastName");
                    }}
                    disabled={accepting}
                    aria-invalid={Boolean(fieldErrors.lastName)}
                  />
                  {fieldErrors.lastName ? (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.lastName}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <SignupPhoneField
                  value={join.phoneE164}
                  onChange={(value) => {
                    setJoin((p) => ({ ...p, phoneE164: value }));
                    clearFieldError("phone");
                    clearFieldError("phoneCountryCode");
                  }}
                  disabled={accepting}
                  aria-invalid={Boolean(fieldErrors.phone || fieldErrors.phoneCountryCode)}
                />
                {fieldErrors.phone || fieldErrors.phoneCountryCode ? (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrors.phone || fieldErrors.phoneCountryCode}
                  </p>
                ) : null}
              </div>
              <div>
                <input
                  type="password"
                  className={cn(inputCls)}
                  placeholder={t("invite.password")}
                  required
                  minLength={8}
                  value={join.password}
                  onChange={(e) => {
                    setJoin((p) => ({ ...p, password: e.target.value }));
                    clearFieldError("password");
                  }}
                  disabled={accepting}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                {fieldErrors.password ? (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t("invite.passwordHint")}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={accepting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("invite.joinWorkspace")}
              </button>
            </form>
          )
        ) : emailMismatch ? (
          <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {t("invite.emailMismatch", { email: preview.email })}
          </p>
        ) : (
          <button
            type="button"
            disabled={accepting}
            onClick={() => void handleAccept()}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("invite.accept")}
          </button>
        )}
      </div>
    </div>
  );
}
