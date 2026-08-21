"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Clock3, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, user, organizations, logout } = useAuth();
  const primaryOrg = organizations[0]?.organization;

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const status = primaryOrg?.status ?? "PENDING";

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">
                {primaryOrg?.name ?? "Corporate"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {status === "APPROVED" ? "Welcome to your workspace" : "Organization pending approval"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                {status === "APPROVED"
                  ? "Your organization is approved. Event planning tools will appear here next."
                  : "Your application is under review. You’ll get full access after an admin approves your organization (typically 1–2 business days)."}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "font-semibold",
                    status === "APPROVED" && "text-emerald-500",
                    status === "PENDING" && "text-amber-500",
                    status === "REJECTED" && "text-destructive",
                    status === "SUSPENDED" && "text-destructive",
                  )}
                >
                  {status}
                </span>
              </div>

              {status === "PENDING" ? (
                <p className="mt-4 text-xs text-muted-foreground">
                  Need help?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Contact support from the main site
                  </Link>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
