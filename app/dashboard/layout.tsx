"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { WorkspaceShell } from "@/components/workspace/app-shell";
import { useLocale } from "@/features/i18n/locale-context";
import { can, type PermissionAction } from "@/features/team/permissions";

const WORKSPACE_ONLY = [
  "/dashboard/team",
  "/dashboard/budget",
  "/dashboard/events",
  "/dashboard/approvals",
  "/dashboard/venues",
  "/dashboard/marketplace",
  "/dashboard/notifications",
];

const ROUTE_PERMISSIONS: { prefix: string; action: PermissionAction }[] = [
  { prefix: "/dashboard/approvals", action: "viewApprovals" },
  { prefix: "/dashboard/budget", action: "viewBudget" },
  { prefix: "/dashboard/events", action: "viewEvents" },
  { prefix: "/dashboard/venues", action: "viewVenues" },
  { prefix: "/dashboard/marketplace", action: "viewMarketplace" },
  { prefix: "/dashboard/team", action: "viewTeam" },
  { prefix: "/dashboard/settings", action: "viewSettings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const { isReady, isAuthenticated, organizations } = useAuth();
  const status = organizations[0]?.organization?.status;
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const isApproved = status === "APPROVED";

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    if (!isApproved && WORKSPACE_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      router.replace("/dashboard");
    }
  }, [isReady, isAuthenticated, isApproved, pathname, router]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !isApproved) return;
    const match = ROUTE_PERMISSIONS.find(
      (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
    );
    if (match && !can(role, match.action)) {
      router.replace("/dashboard");
    }
  }, [isReady, isAuthenticated, isApproved, pathname, role, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        {t("dashboard.loading")}
      </div>
    );
  }

  if (isApproved) {
    return <WorkspaceShell>{children}</WorkspaceShell>;
  }

  return <>{children}</>;
}
