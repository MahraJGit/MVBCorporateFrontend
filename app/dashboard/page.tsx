"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrganizationLogo } from "@/components/organization-logo";
import { WorkspaceCalendar } from "@/components/events/workspace-calendar";
import { useAuth } from "@/features/auth/auth-context";
import { useLocale } from "@/features/i18n/locale-context";
import { MAX_ORG_SUBMISSIONS } from "@/features/auth/types";
import { cn } from "@/lib/utils";
import { plural } from "@/lib/i18n";
import { useRouter } from "next/navigation";

const CREATE_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { user, organizations, logout } = useAuth();
  const primaryOrg = organizations[0]?.organization;
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const canCreate = CREATE_ROLES.has(role);

  const status = primaryOrg?.status ?? "PENDING";
  const submissionCount = primaryOrg?.submissionCount ?? 1;
  const canResubmit =
    status === "REJECTED" && submissionCount < MAX_ORG_SUBMISSIONS;
  const remainingAttempts = Math.max(0, MAX_ORG_SUBMISSIONS - submissionCount);
  const isApproved = status === "APPROVED";

  let title = t("dashboard.pendingTitle");
  let description = t("dashboard.pendingDescription");

  if (status === "APPROVED") {
    title = t("dashboard.approvedTitle");
    description = t("dashboard.approvedDescription");
  } else if (status === "REJECTED") {
    title = t("dashboard.rejectedTitle");
    description = canResubmit
      ? t("dashboard.rejectedDescriptionResubmit")
      : t("dashboard.rejectedDescriptionSupport");
  } else if (status === "SUSPENDED") {
    title = t("dashboard.suspendedTitle");
    description = t("dashboard.suspendedDescription");
  }

  const statusCard = (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            status === "REJECTED" || status === "SUSPENDED"
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary",
          )}
        >
          {status === "REJECTED" || status === "SUSPENDED" ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Clock3 className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
              <span className="text-muted-foreground">{t("dashboard.statusLabel")}</span>
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
            {status !== "APPROVED" ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
                <span className="text-muted-foreground">{t("dashboard.attemptsLabel")}</span>
                <span className="font-semibold text-foreground">
                  {submissionCount}/{MAX_ORG_SUBMISSIONS}
                </span>
              </div>
            ) : null}
          </div>

          {status === "REJECTED" && primaryOrg?.rejectedReason ? (
            <div className="mt-4 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                {t("dashboard.adminFeedback")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                {primaryOrg.rejectedReason}
              </p>
            </div>
          ) : null}

          {status === "SUSPENDED" && primaryOrg?.rejectedReason ? (
            <div className="mt-4 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {primaryOrg.rejectedReason}
              </p>
            </div>
          ) : null}

          {canResubmit ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/resubmit"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" />
                {t("dashboard.resubmitApplication")}
              </Link>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.submissionsRemaining", {
                  count: remainingAttempts,
                  plural: plural(remainingAttempts),
                })}
              </p>
            </div>
          ) : null}

          {status === "PENDING" ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {t("dashboard.attemptUnderReview", {
                count: submissionCount,
                max: MAX_ORG_SUBMISSIONS,
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isApproved) {
    return (
      <div key={locale} className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("dashboard.calendarHint")}</p>
          {canCreate ? (
            <Link
              href="/dashboard/events/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t("events.newEvent")}
            </Link>
          ) : null}
        </div>
        <WorkspaceCalendar />
      </div>
    );
  }

  return (
    <div key={locale} className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <OrganizationLogo
              logoUrl={primaryOrg?.logoUrl}
              name={primaryOrg?.name ?? "Corporate"}
              className="h-8 w-8"
              iconClassName="h-4 w-4"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {primaryOrg?.name ?? "Corporate"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher compact className="hidden w-36 sm:block" />
            {status !== "SUSPENDED" ? (
              <Link
                href="/dashboard/settings"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Settings className="h-3.5 w-3.5" /> {t("dashboard.profile")}
              </Link>
            ) : null}
            <ThemeToggle />
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> {t("dashboard.signOut")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">{statusCard}</main>
    </div>
  );
}
