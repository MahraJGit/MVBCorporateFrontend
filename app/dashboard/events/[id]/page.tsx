"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Pencil,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import { formatMoney } from "@/features/budget/api";
import {
  cancelEvent,
  eventBookingStatusLabel,
  eventStatusLabel,
  getEvent,
  lineBookingStatusLabel,
  removeEventService,
  removeEventVenue,
  submitEvent,
} from "@/features/events/api";
import type {
  CorporateEvent,
  CorporateLineBookingStatus,
} from "@/features/events/types";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CREATE_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

function formatPreferredWindow(
  start?: string | null,
  end?: string | null,
): string | null {
  if (!start) return null;
  const s = new Date(start);
  if (!Number.isFinite(s.getTime())) return null;
  const startLabel = s.toLocaleDateString();
  if (!end) return startLabel;
  const e = new Date(end);
  if (!Number.isFinite(e.getTime())) return startLabel;
  const endLabel = e.toLocaleDateString();
  return endLabel === startLabel ? startLabel : `${startLabel} → ${endLabel}`;
}

function availabilityClass(status?: string | null) {
  switch (status) {
    case "OK":
      return "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400";
    case "WARNING":
      return "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400";
    case "UNAVAILABLE":
      return "border-destructive/30 bg-destructive/5 text-destructive";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

/** Once a line is booked the pre-approval soft check is stale — hide it. */
function isLineBooked(status?: CorporateLineBookingStatus) {
  return status === "CONFIRMED" || status === "REQUESTED" || status === "HELD";
}

function lineBookingChipClass(status?: CorporateLineBookingStatus) {
  switch (status) {
    case "HELD":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "CONFIRMED":
      return "bg-emerald-500/10 text-emerald-600";
    case "REQUESTED":
      return "bg-sky-500/10 text-sky-600";
    case "FAILED":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function intentSummary(intent?: Record<string, unknown> | null): string | null {
  if (!intent || typeof intent !== "object") return null;
  const parts: string[] = [];
  const slot = intent.preferredSlot;
  if (slot && typeof slot === "object" && !Array.isArray(slot)) {
    const s = slot as {
      startTime?: unknown;
      endTime?: unknown;
      name?: unknown;
      label?: unknown;
      date?: unknown;
    };
    if (typeof s.startTime === "string" && typeof s.endTime === "string") {
      const title =
        (typeof s.label === "string" && s.label) ||
        (typeof s.name === "string" && s.name) ||
        "";
      const range = `${s.startTime} – ${s.endTime}`;
      const datePrefix = typeof s.date === "string" && s.date ? `${s.date} · ` : "";
      parts.push(datePrefix + (title ? `${title} (${range})` : range));
    }
  }
  if (typeof intent.packageName === "string" && intent.packageName) {
    parts.push(intent.packageName);
  }
  if (Array.isArray(intent.amenities)) {
    for (const entry of intent.amenities) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as { packageName?: unknown };
      if (typeof row.packageName === "string" && row.packageName) {
        parts.push(row.packageName);
      }
    }
  }
  if (typeof intent.guests === "number" && intent.guests > 0) {
    parts.push(`${intent.guests} guests`);
  }
  if (typeof intent.durationHours === "number" && intent.durationHours > 0) {
    parts.push(`${intent.durationHours}h`);
  }
  if (typeof intent.durationDays === "number" && intent.durationDays > 0) {
    parts.push(`${intent.durationDays}d`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { organizations, user } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";

  const [event, setEvent] = useState<CorporateEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await getEvent(params.id);
    setEvent(res.data);
  }, [params.id]);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("events.detailLoadError")))
      .finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("events.loading")}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-medium">{t("events.notFound")}</p>
        <Link href="/dashboard/events" className="mt-4 inline-block text-sm text-primary">
          {t("events.backToEvents")}
        </Link>
      </div>
    );
  }

  const canAct =
    CREATE_ROLES.has(role) &&
    (role === "OWNER" || event.createdBy.id === user?.id);

  const isEditable = event.status === "DRAFT" || event.status === "REJECTED";
  const canPlanAfterApproval = canAct && event.status === "APPROVED";
  const canOpenBookings =
    event.status === "APPROVED" &&
    (canAct || role === "OWNER" || role === "FINANCE_APPROVER");
  const browseVenuesHref = `/dashboard/venues?eventId=${encodeURIComponent(event.id)}`;
  const browseMarketplaceHref = `/dashboard/marketplace?eventId=${encodeURIComponent(event.id)}`;

  const allLines = [...(event.eventVenues ?? []), ...(event.eventServices ?? [])];
  const plannedTotal = allLines.reduce(
    (sum, row) => sum + (row.estimatedCost ? Number(row.estimatedCost) : 0),
    0,
  );
  const totalLines = allLines.length;
  const bookedLines = allLines.filter(
    (row) =>
      row.bookingStatus === "CONFIRMED" ||
      row.bookingStatus === "REQUESTED" ||
      row.bookingStatus === "HELD",
  ).length;
  const heldLines = allLines.filter((row) => row.bookingStatus === "HELD").length;
  const confirmedLines = allLines.filter(
    (row) => row.bookingStatus === "CONFIRMED",
  ).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMoney(event.allocatedAmount, event.currency)}
              {event.budgetCategory?.name ? ` · ${event.budgetCategory.name}` : ""}
              {event.fiscalBudget ? ` · FY ${event.fiscalBudget.fiscalYear}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                event.status === "APPROVED" && "bg-emerald-500/10 text-emerald-600",
                event.status === "PENDING_APPROVAL" && "bg-amber-500/10 text-amber-600",
                (event.status === "REJECTED" || event.status === "CANCELLED") &&
                  "bg-destructive/10 text-destructive",
                event.status === "DRAFT" && "bg-muted text-muted-foreground",
              )}
            >
              {eventStatusLabel(event.status)}
            </span>
            {canAct && isEditable ? (
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("events.editEvent")}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="text-xs text-muted-foreground">{t("events.finance")}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-medium">
              {event.financeApprovedAt ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/40" />
              )}
              {event.financeApprovedAt
                ? t("events.approved")
                : t("events.waiting")}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3 text-sm">
            <p className="text-xs text-muted-foreground">{t("events.management")}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-medium">
              {event.managementApprovedAt ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground/40" />
              )}
              {event.managementApprovedAt
                ? t("events.approved")
                : t("events.waiting")}
            </p>
          </div>
        </div>

        {event.rejectedReason ? (
          <p className="mt-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {event.rejectedReason}
          </p>
        ) : null}

        {event.requirements ? (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">{t("events.requirements")}</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {event.requirements}
            </p>
          </section>
        ) : null}

        {event.objectives ? (
          <section className="mt-4">
            <h2 className="mb-2 text-sm font-semibold">{t("events.objectives")}</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {event.objectives}
            </p>
          </section>
        ) : null}

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          {event.locationPreference ? (
            <div>
              <dt className="text-xs text-muted-foreground">{t("events.location")}</dt>
              <dd className="font-medium">{event.locationPreference}</dd>
            </div>
          ) : null}
          {event.estimatedAttendees ? (
            <div>
              <dt className="text-xs text-muted-foreground">{t("events.attendees")}</dt>
              <dd className="font-medium">{event.estimatedAttendees}</dd>
            </div>
          ) : null}
          {event.proposedStartAt ? (
            <div>
              <dt className="text-xs text-muted-foreground">{t("events.start")}</dt>
              <dd className="font-medium">
                {new Date(event.proposedStartAt).toLocaleDateString()}
              </dd>
            </div>
          ) : null}
          {event.proposedEndAt ? (
            <div>
              <dt className="text-xs text-muted-foreground">{t("events.end")}</dt>
              <dd className="font-medium">
                {new Date(event.proposedEndAt).toLocaleDateString()}
              </dd>
            </div>
          ) : null}
        </dl>

        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("events.plannedResources")}</h2>
            {canAct && (isEditable || canPlanAfterApproval) ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={browseVenuesHref}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  {t("events.browseVenues")}
                </Link>
                <Link
                  href={browseMarketplaceHref}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Store className="h-3.5 w-3.5" />
                  {t("events.browseMarketplace")}
                </Link>
              </div>
            ) : null}
          </div>

          {plannedTotal > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {t("events.plannedEstimate", {
                  amount: formatMoney(plannedTotal, event.currency),
                })}
              </p>
              {plannedTotal > Number(event.allocatedAmount) + 1e-9 ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  {t("events.plannedExceedsAllocation", {
                    planned: formatMoney(plannedTotal, event.currency),
                    allocated: formatMoney(event.allocatedAmount, event.currency),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {!event.eventVenues?.length && !event.eventServices?.length ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              {t("events.noPlannedResources")}
            </p>
          ) : (
            <ul className="space-y-2">
              {event.eventVenues?.map((row) => {
                const windowLabel = formatPreferredWindow(
                  row.preferredStartAt,
                  row.preferredEndAt,
                );
                const intent = intentSummary(row.bookingIntent);
                return (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/dashboard/venues/${row.venue.id}?eventId=${encodeURIComponent(event.id)}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.venue.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t("events.resourceVenue")}
                      {row.venue.city ? ` · ${row.venue.city}` : ""}
                    </p>
                    {windowLabel ? (
                      <p className="text-xs text-muted-foreground">
                        {t("events.preferredWindow")}: {windowLabel}
                      </p>
                    ) : null}
                    {intent ? (
                      <p className="text-xs text-muted-foreground">
                        {t("events.bookingIntent")}: {intent}
                      </p>
                    ) : null}
                    {row.estimatedCost ? (
                      <p className="text-xs font-medium">
                        {formatMoney(row.estimatedCost, event.currency)}
                      </p>
                    ) : null}
                    {event.status === "APPROVED" ? (
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            lineBookingChipClass(row.bookingStatus),
                          )}
                        >
                          {lineBookingStatusLabel(row.bookingStatus)}
                        </span>
                        {row.bookingStatus === "FAILED" && row.bookingError ? (
                          <span className="text-[11px] text-destructive">
                            {row.bookingError}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {row.availabilityMessage && !isLineBooked(row.bookingStatus) ? (
                      <p
                        className={cn(
                          "inline-flex max-w-full items-start gap-1.5 rounded-lg border px-2 py-1 text-[11px] leading-snug",
                          availabilityClass(row.availabilityStatus),
                        )}
                      >
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          <span className="font-medium">
                            {t("events.softAvailability")}:{" "}
                          </span>
                          {row.availabilityMessage}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {canAct && isEditable ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await removeEventVenue(event.id, row.id);
                          toast.success(res.message);
                          setEvent(res.data);
                        } catch (err) {
                          toastApiError(err, t("events.removeResourceError"));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                      aria-label={t("events.removeResource")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              );
              })}
              {event.eventServices?.map((row) => {
                const windowLabel = formatPreferredWindow(
                  row.preferredStartAt,
                  row.preferredEndAt,
                );
                const intent = intentSummary(row.bookingIntent);
                return (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/dashboard/marketplace/${encodeURIComponent(row.service.slug)}?eventId=${encodeURIComponent(event.id)}`}
                      className="font-medium hover:text-primary"
                    >
                      {row.service.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {t("events.resourceService")}
                      {row.service.baseCity ? ` · ${row.service.baseCity}` : ""}
                    </p>
                    {windowLabel ? (
                      <p className="text-xs text-muted-foreground">
                        {t("events.preferredWindow")}: {windowLabel}
                      </p>
                    ) : null}
                    {intent ? (
                      <p className="text-xs text-muted-foreground">
                        {t("events.bookingIntent")}: {intent}
                      </p>
                    ) : null}
                    {row.estimatedCost ? (
                      <p className="text-xs font-medium">
                        {formatMoney(row.estimatedCost, event.currency)}
                      </p>
                    ) : null}
                    {event.status === "APPROVED" ? (
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            lineBookingChipClass(row.bookingStatus),
                          )}
                        >
                          {lineBookingStatusLabel(row.bookingStatus)}
                        </span>
                        {row.bookingStatus === "FAILED" && row.bookingError ? (
                          <span className="text-[11px] text-destructive">
                            {row.bookingError}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    {row.availabilityMessage && !isLineBooked(row.bookingStatus) ? (
                      <p
                        className={cn(
                          "inline-flex max-w-full items-start gap-1.5 rounded-lg border px-2 py-1 text-[11px] leading-snug",
                          availabilityClass(row.availabilityStatus),
                        )}
                      >
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          <span className="font-medium">
                            {t("events.softAvailability")}:{" "}
                          </span>
                          {row.availabilityMessage}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {canAct && isEditable ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await removeEventService(event.id, row.id);
                          toast.success(res.message);
                          setEvent(res.data);
                        } catch (err) {
                          toastApiError(err, t("events.removeResourceError"));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="text-destructive hover:text-destructive/80 disabled:opacity-50"
                      aria-label={t("events.removeResource")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              );
              })}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("events.team")}</h2>
            {canAct && isEditable ? (
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("events.manageTeam")}
              </Link>
            ) : null}
          </div>
          {event.teamMembers?.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {event.teamMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                    {m.corporateUser.firstName.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {m.corporateUser.firstName} {m.corporateUser.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {m.role}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              {t("events.noEventTeam")}
            </p>
          )}
        </section>

        {event.status === "APPROVED" ? (
          <div className="mt-6 space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{t("events.bookings")}</h2>
              <span className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium">
                {eventBookingStatusLabel(event.bookingStatus)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {event.paymentStatus === "AWAITING_PAYMENT"
                ? heldLines > 0 && confirmedLines > 0
                  ? t("events.paymentPartialHint")
                  : t("events.paymentDueHint")
                : bookedLines === totalLines && totalLines > 0
                  ? t("events.allBookedHint")
                  : t("events.confirmBookingsCta", {
                      booked: String(bookedLines),
                      total: String(totalLines),
                    })}
            </p>
            {canOpenBookings && totalLines > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/events/${event.id}/reserve`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                >
                  <CalendarCheck className="h-4 w-4" />
                  {t("events.hubReserve")}
                </Link>
                <Link
                  href={`/dashboard/events/${event.id}/requests`}
                  className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent"
                >
                  {t("events.hubRequests")}
                </Link>
                <Link
                  href={`/dashboard/events/${event.id}/pay`}
                  className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-accent"
                >
                  {t("events.hubPay")}
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {canAct && isEditable ? (
          <div className="mt-6 space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">{t("events.submitHint")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await submitEvent(event.id);
                    toast.success(res.message);
                    await refresh();
                  } catch (err) {
                    toastApiError(err, t("events.submitError"));
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("events.submitForApproval")}
              </button>
              <Link
                href={`/dashboard/events/${event.id}/edit`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("events.editEvent")}
              </Link>
            </div>
          </div>
        ) : null}

        {canAct &&
        (event.status === "DRAFT" ||
          event.status === "PENDING_APPROVAL" ||
          event.status === "REJECTED") ? (
          <div className="mt-3">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(t("events.confirmCancel"))) return;
                setBusy(true);
                try {
                  await cancelEvent(event.id);
                  toast.success(t("events.cancelled"));
                  router.push("/dashboard/events");
                } catch (err) {
                  toastApiError(err, t("events.cancelError"));
                } finally {
                  setBusy(false);
                }
              }}
              className="text-sm text-destructive hover:underline disabled:opacity-50"
            >
              {t("events.cancelEvent")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
