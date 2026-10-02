"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthBrandHeader } from "@/components/auth-brand-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { otpSchema } from "@/features/auth/schemas";
import { verifyCorporateOtp } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError, toastApiError } from "@/lib/api/errors";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const { establishSession } = useAuth();

  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);

    if (!userId) {
      setError("Missing user id. Please register or sign in again.");
      return;
    }

    const parsed = otpSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.code?.[0]);
      return;
    }

    setPending(true);
    try {
      const data = await verifyCorporateOtp({
        userId,
        code: parsed.data.code,
      });
      establishSession({
        accessToken: data.accessToken,
        user: data.user,
        organizations: data.organizations,
      });
      toast.success(data.message || "Email verified");
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.length) {
        const codeErr = err.fieldErrors.find(
          (fe) => fe.field === "code" || fe.field.endsWith(".code"),
        );
        setError(codeErr?.message ?? err.fieldErrors[0].message);
        return;
      }
      if (err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500) {
        setError(err.message);
        return;
      }
      toast.error(toastApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Verify your email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              OTP email is not enabled yet. Enter <span className="font-semibold text-foreground">0</span> to verify.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium text-foreground">
              OTP code
            </label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="0"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(undefined);
              }}
              disabled={pending}
              className={cn(
                "h-11 w-full rounded-lg border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            />
            {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          </div>

          <button
            type="submit"
            disabled={pending}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-colors",
              "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {pending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              <>
                Verify & continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background px-4 py-8">
      <ThemeToggle className="fixed top-4 right-4 z-20" />
      <AuthBrandHeader />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <VerifyOtpForm />
      </Suspense>
    </div>
  );
}
