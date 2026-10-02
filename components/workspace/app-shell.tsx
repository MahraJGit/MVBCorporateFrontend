"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrganizationLogo } from "@/components/organization-logo";
import { useAuth } from "@/features/auth/auth-context";
import { useLocale } from "@/features/i18n/locale-context";
import { useNotificationUnread } from "@/features/notifications/use-unread";
import {
  navVisibleForRole,
  type NavPermission,
} from "@/features/team/permissions";
import { roleLabel } from "@/features/team/api";
import { cn } from "@/lib/utils";

const NAV: {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  permission: NavPermission;
}[] = [
  {
    href: "/dashboard",
    labelKey: "nav.overview",
    icon: LayoutDashboard,
    exact: true,
    permission: "viewOverview",
  },
  {
    href: "/dashboard/budget",
    labelKey: "nav.budget",
    icon: PiggyBank,
    permission: "viewBudget",
  },
  {
    href: "/dashboard/events",
    labelKey: "nav.events",
    icon: CalendarDays,
    permission: "viewEvents",
  },
  {
    href: "/dashboard/venues",
    labelKey: "nav.venues",
    icon: Building2,
    permission: "viewVenues",
  },
  {
    href: "/dashboard/marketplace",
    labelKey: "nav.marketplace",
    icon: Store,
    permission: "viewMarketplace",
  },
  {
    href: "/dashboard/team",
    labelKey: "nav.team",
    icon: Users,
    permission: "viewTeam",
  },
  {
    href: "/dashboard/approvals",
    labelKey: "nav.approvals",
    icon: CheckSquare,
    permission: "viewApprovals",
  },
  {
    href: "/dashboard/notifications",
    labelKey: "nav.notifications",
    icon: Bell,
    permission: "always",
  },
  {
    href: "/dashboard/settings",
    labelKey: "nav.settings",
    icon: Settings,
    permission: "viewSettings",
  },
];

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, organizations, logout } = useAuth();
  const { t, locale } = useLocale();
  const org = organizations[0]?.organization;
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const [mobileOpen, setMobileOpen] = useState(false);
  const { unread } = useNotificationUnread();

  const visibleNav = useMemo(
    () => NAV.filter((item) => navVisibleForRole(role, item.permission)),
    [role],
  );

  const navLink = (item: (typeof NAV)[number]) => {
    const active = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
        {item.href === "/dashboard/notifications" && unread > 0 ? (
          <span className="rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
    );
  };

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 flex-col items-center gap-3 border-b border-border px-4 py-5 text-center">
        <OrganizationLogo
          logoUrl={org?.logoUrl}
          name={org?.name ?? "Corporate"}
          className="h-20 w-50"
          iconClassName="h-9 w-9"
          imageClassName="object-contain"
        />
        <div className="min-w-0 w-full">
          <p className="truncate text-sm font-semibold text-foreground">
            {org?.name ?? "Corporate"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-primary/80">
            {roleLabel(role)}
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNav.map(navLink)}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border p-3">
        <div className="space-y-3">
          <LanguageSwitcher labeled />
          <CurrencySwitcher labeled />
        </div>
        <div className="flex items-center justify-between gap-2 px-0.5">
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("dashboard.signOut")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-svh bg-background lg:flex">
      {/* Sticky so it stays visible while main content scrolls */}
      <aside className="sticky top-0 z-30 hidden h-svh w-60 shrink-0 border-e border-border lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t("nav.closeMenu")}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 inset-s-0 flex w-64 flex-col border-e border-border bg-background shadow-xl">
            <div className="flex shrink-0 justify-end p-2">
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                onClick={() => setMobileOpen(false)}
                aria-label={t("nav.closeMenu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{sidebar}</div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            onClick={() => setMobileOpen(true)}
            aria-label={t("nav.openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{org?.name}</p>
        </header>
        <main key={locale} className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
