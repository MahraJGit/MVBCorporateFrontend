"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarRange,
  FileText,
  Loader2,
  Store,
  Target,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { DatePickerField, parseIsoDate } from "@/components/date-picker-field";
import { FormSelect } from "@/components/form-select";
import {
  cancelCalendarItem,
  calendarStatusLabel,
  createCalendarItem,
  promoteCalendarItem,
  removeCalendarService,
  removeCalendarVenue,
  updateCalendarItem,
} from "@/features/calendar/api";
import type { CorporateCalendarItem } from "@/features/calendar/types";
import { formatMoney, getCurrentBudget } from "@/features/budget/api";
import type { OrgFiscalBudget } from "@/features/budget/types";
import { t } from "@/lib/i18n";
import { toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateInputToStartIso(value: string) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000`).toISOString();
}

function dateInputToEndIso(value: string) {
  if (!value) return null;
  return new Date(`${value}T23:59:59.999`).toISOString();
}

const fieldCls = cn(
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors",
  "placeholder:text-muted-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

const fieldWithIconCls = cn(fieldCls, "pl-10");

const textareaCls = cn(
  "min-h-[96px] w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm text-foreground shadow-sm transition-colors",
  "placeholder:text-muted-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

function FieldLabel({
  htmlFor,
  children,
  hint,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {children}
        {required ? <span className="ms-0.5 text-destructive">*</span> : null}
      </label>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

function IconInput({
  id,
  icon: Icon,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input id={id} className={cn(fieldWithIconCls, className)} {...props} />
    </div>
  );
}

type Props = {
  mode: "create" | "detail";
  item?: CorporateCalendarItem | null;
  defaultStartKey?: string | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (item: CorporateCalendarItem) => void;
  onDeleted?: (id: string) => void;
};

export function CalendarPlanPanel({
  mode,
  item,
  defaultStartKey,
  canEdit,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const router = useRouter();
  const [budget, setBudget] = useState<OrgFiscalBudget | null>(null);
  const [title, setTitle] = useState(item?.title ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [start, setStart] = useState(
    toDateInput(item?.plannedStartAt) || defaultStartKey || "",
  );
  const [end, setEnd] = useState(
    toDateInput(item?.plannedEndAt) || defaultStartKey || "",
  );
  const [attendees, setAttendees] = useState(
    item?.estimatedAttendees != null ? String(item.estimatedAttendees) : "",
  );
  const [categoryId, setCategoryId] = useState(item?.budgetCategoryId ?? "");
  const [busy, setBusy] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [alloc, setAlloc] = useState(
    item?.estimatedTotal != null
      ? String(Math.ceil(Number(item.estimatedTotal)))
      : "",
  );

  useEffect(() => {
    void getCurrentBudget()
      .then((res) => {
        setBudget(res.data);
        setCategoryId((current) => {
          if (current) return current;
          return res.data?.categories?.[0]?.id ?? "";
        });
      })
      .catch(() => setBudget(null));
  }, []);

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setNotes(item.notes ?? "");
    setStart(toDateInput(item.plannedStartAt));
    setEnd(toDateInput(item.plannedEndAt));
    setAttendees(
      item.estimatedAttendees != null ? String(item.estimatedAttendees) : "",
    );
    setCategoryId(item.budgetCategoryId ?? "");
    setAlloc(
      item.estimatedTotal != null
        ? String(Math.ceil(Number(item.estimatedTotal)))
        : "",
    );
  }, [item]);

  useEffect(() => {
    if (item || !defaultStartKey) return;
    setStart((current) => current || defaultStartKey);
    setEnd((current) => current || defaultStartKey);
  }, [defaultStartKey, item]);

  const categories = budget?.categories ?? [];
  const isPlanned = !item || item.status === "PLANNED";
  const editable = canEdit && isPlanned;
  const currency = budget?.currency ?? item?.currency ?? "AED";

  const estimateTotal = useMemo(() => {
    if (!item) return 0;
    return Number(item.estimatedTotal ?? 0);
  }, [item]);

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.id,
        label: `${c.name} · ${formatMoney(
          Number(c.remainingAmount ?? c.allocatedAmount),
          currency,
        )}`,
      })),
    [categories, currency],
  );

  const save = async () => {
    if (!title.trim() || title.trim().length < 3) {
      toast.error(t("calendar.titleRequired"));
      return;
    }
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        notes: notes.trim() || null,
        plannedStartAt: dateInputToStartIso(start),
        plannedEndAt: dateInputToEndIso(end || start),
        locationPreference: null,
        estimatedAttendees: attendees ? Number(attendees) : null,
        fiscalBudgetId: budget?.id ?? null,
        budgetCategoryId: categoryId || null,
      };
      const res = item
        ? await updateCalendarItem(item.id, body)
        : await createCalendarItem(body);
      toast.success(res.message);
      onSaved(res.data);
    } catch (err) {
      toastApiError(err, t("calendar.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const cancelItem = async () => {
    if (!item) return;
    if (!window.confirm(t("calendar.cancelConfirm"))) return;
    setBusy(true);
    try {
      const res = await cancelCalendarItem(item.id);
      toast.success(res.message);
      onDeleted?.(item.id);
      onClose();
    } catch (err) {
      toastApiError(err, t("calendar.cancelError"));
    } finally {
      setBusy(false);
    }
  };

  const promote = async () => {
    if (!item || !budget) {
      toast.error(t("calendar.needBudgetToPromote"));
      return;
    }
    if (!categoryId) {
      toast.error(t("calendar.needCategoryToPromote"));
      return;
    }
    const amount = Number(alloc);
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error(t("calendar.needAllocation"));
      return;
    }
    setPromoting(true);
    try {
      const res = await promoteCalendarItem(item.id, {
        fiscalBudgetId: budget.id,
        budgetCategoryId: categoryId,
        allocatedAmount: Math.floor(amount),
        title: title.trim() || item.title,
        requirements: notes.trim() || item.notes,
      });
      toast.success(res.message);
      onSaved(res.data.calendarItem);
      router.push(`/dashboard/events/${res.data.eventId}`);
    } catch (err) {
      toastApiError(err, t("calendar.promoteError"));
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="flex h-full max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-3xl border border-border/80 bg-card shadow-[0_24px_60px_-32px_rgba(0,0,0,0.45)]">
      <div className="relative overflow-hidden border-b border-border/70">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-sky-500/12 via-transparent to-primary/5" />
        <div className="relative flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-400">
              {mode === "create" ? t("calendar.newPlan") : t("calendar.planDetails")}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
              {item?.title?.trim() || t("calendar.newPlan")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "create"
                ? t("calendar.newPlanHint")
                : t("calendar.planDetailsHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/80 bg-background/80 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={t("calendar.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {item ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400">
              {calendarStatusLabel(item.status)}
            </span>
            {item.linkedEventId ? (
              <Link
                href={`/dashboard/events/${item.linkedEventId}`}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/5"
              >
                {t("calendar.openEvent")}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        ) : null}

        <Section
          icon={FileText}
          title={t("calendar.basicsTitle")}
          description={t("calendar.basicsHint")}
        >
          <div>
            <FieldLabel htmlFor="plan-title" required>
              {t("calendar.title")}
            </FieldLabel>
            <IconInput
              id="plan-title"
              icon={Target}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!editable}
              placeholder={t("calendar.titlePlaceholder")}
            />
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <FieldLabel>{t("calendar.start")}</FieldLabel>
              <DatePickerField
                value={start}
                onChange={(value) => {
                  setStart(value);
                  if (!end || (end && value && end < value)) setEnd(value);
                }}
                disabled={!editable}
                placeholder={t("events.pickDate")}
                className="rounded-xl"
              />
            </div>
            <div>
              <FieldLabel>{t("calendar.end")}</FieldLabel>
              <DatePickerField
                value={end}
                onChange={setEnd}
                minDate={parseIsoDate(start) ?? undefined}
                disabled={!editable}
                placeholder={t("events.pickDate")}
                className="rounded-xl"
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="plan-attendees" hint={t("calendar.optional")}>
              {t("calendar.attendees")}
            </FieldLabel>
            <IconInput
              id="plan-attendees"
              icon={Users}
              type="number"
              min={1}
              inputMode="numeric"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              disabled={!editable}
              placeholder={t("calendar.attendeesPlaceholder")}
            />
          </div>
        </Section>

        <Section
          icon={Banknote}
          title={t("calendar.budgetTitle")}
          description={t("calendar.budgetHint")}
        >
          {categories.length ? (
            <div>
              <FieldLabel>{t("calendar.budgetCategory")}</FieldLabel>
              <FormSelect
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={!editable}
                options={categoryOptions}
                placeholder={t("calendar.chooseCategory")}
              />
            </div>
          ) : (
            <p className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              {t("calendar.noBudgetHint")}
            </p>
          )}

          <div>
            <FieldLabel htmlFor="plan-notes" hint={t("calendar.optional")}>
              {t("calendar.notes")}
            </FieldLabel>
            <textarea
              id="plan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!editable}
              rows={3}
              className={textareaCls}
              placeholder={t("calendar.notesPlaceholder")}
            />
          </div>
        </Section>

        {item ? (
          <Section
            icon={Store}
            title={t("calendar.estimates")}
            description={t("calendar.estimatesHint")}
          >
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5" />
                {t("calendar.estimateTotal")}
              </div>
              <p className="text-base font-semibold tabular-nums">
                {formatMoney(estimateTotal, item.currency)}
              </p>
            </div>

            {(item.itemVenues?.length || item.itemServices?.length) ? (
              <ul className="space-y-2">
                {item.itemVenues?.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {row.venue.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatMoney(Number(row.estimatedCost ?? 0), item.currency)}
                        {row.availabilityStatus
                          ? ` · ${row.availabilityStatus}`
                          : ""}
                      </p>
                    </div>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() =>
                          void removeCalendarVenue(item.id, row.id)
                            .then((res) => {
                              toast.success(res.message);
                              onSaved(res.data);
                            })
                            .catch((err) =>
                              toastApiError(err, t("calendar.removeError")),
                            )
                        }
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t("calendar.removeEstimate")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
                {item.itemServices?.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {row.service.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatMoney(Number(row.estimatedCost ?? 0), item.currency)}
                        {row.availabilityStatus
                          ? ` · ${row.availabilityStatus}`
                          : ""}
                      </p>
                    </div>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() =>
                          void removeCalendarService(item.id, row.id)
                            .then((res) => {
                              toast.success(res.message);
                              onSaved(res.data);
                            })
                            .catch((err) =>
                              toastApiError(err, t("calendar.removeError")),
                            )
                        }
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t("calendar.removeEstimate")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                {t("calendar.noEstimates")}
              </p>
            )}

            {editable ? (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/venues?calendarItemId=${encodeURIComponent(item.id)}`}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {t("calendar.addVenue")}
                </Link>
                <Link
                  href={`/dashboard/marketplace?calendarItemId=${encodeURIComponent(item.id)}`}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Store className="h-3.5 w-3.5" />
                  {t("calendar.addService")}
                </Link>
              </div>
            ) : null}
          </Section>
        ) : null}

        {item && isPlanned && canEdit ? (
          <Section
            icon={ArrowUpRight}
            title={t("calendar.promoteTitle")}
            description={t("calendar.promoteHint")}
            className="border-primary/25 bg-primary/5"
          >
            <div>
              <FieldLabel htmlFor="plan-alloc" required>
                {t("calendar.allocation")}
              </FieldLabel>
              <div className="relative">
                <Banknote className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="plan-alloc"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={alloc}
                  onChange={(e) => setAlloc(e.target.value)}
                  className={fieldWithIconCls}
                  placeholder={t("calendar.allocationPlaceholder", {
                    currency,
                  })}
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  {currency}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={promoting || !budget}
              onClick={() => void promote()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-60"
            >
              {promoting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("calendar.promote")}
            </button>
          </Section>
        ) : null}
      </div>

      {editable ? (
        <div className="flex flex-wrap gap-2 border-t border-border/70 bg-background/50 px-4 py-3 sm:px-5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {item ? t("calendar.save") : t("calendar.create")}
          </button>
          {item ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelItem()}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-destructive/30 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-60"
            >
              {t("calendar.cancelPlan")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
