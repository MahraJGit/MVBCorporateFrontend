"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthBrandHeader } from "@/components/auth-brand-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { loginSchema } from "@/features/auth/schemas";
import { loginCorporate } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError, toastApiError } from "@/lib/api/errors";
import type { LoginTokensResponse } from "@/features/auth/types";

function isLoginWithTokens(data: unknown): data is LoginTokensResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "accessToken" in data &&
    typeof (data as LoginTokensResponse).accessToken === "string"
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const { establishSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  
  const inputCls = cn(
    "h-11 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
    "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
    "disabled:cursor-not-allowed disabled:opacity-60",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }

    setPending(true);
    try {
      const data = await loginCorporate(parsed.data);

      if ("requireOtp" in data && data.requireOtp && data.userId) {
        router.push(`/verify-otp?userId=${encodeURIComponent(data.userId)}`);
        return;
      }

      if (isLoginWithTokens(data)) {
        establishSession({
          accessToken: data.accessToken,
          user: data.user,
          organizations: data.organizations,
        });
        toast.success(data.message || "Signed in successfully");
        const safeNext =
          nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
            ? nextPath
            : "/dashboard";
        router.replace(safeNext);
        return;
      }

      toast.error("Unexpected login response");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.length) {
        const next: Partial<Record<"email" | "password", string>> = {};
        for (const fe of err.fieldErrors) {
          const field = fe.field.replace(/^body\./, "");
          if (field === "email" || field === "password") next[field] = fe.message;
        }
        if (Object.keys(next).length) {
          setFieldErrors(next);
          return;
        }
      }
      toast.error(toastApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-8">
      <ThemeToggle className="fixed top-4 right-4 z-20" />

      <AuthBrandHeader />

      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your corporate account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                Work email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((f) => ({ ...f, email: undefined }));
                  }}
                  disabled={pending}
                  aria-invalid={!!fieldErrors.email}
                  className={inputCls}
                />
              </div>
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  disabled={pending}
                  aria-invalid={!!fieldErrors.password}
                  className={cn(inputCls, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={pending}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={pending}
              className={cn(
                "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-colors",
                "hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {pending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  Sign in <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register your organization
          </Link>
        </p>
      </div>
    </div>
  );
}
