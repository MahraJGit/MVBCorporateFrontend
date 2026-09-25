"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarRange,
  Check,
  FileText,
  Globe2,
  Loader2,
  MapPin,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DatePickerField, parseIsoDate } from "@/components/date-picker-field";
import { FormSelect } from "@/components/form-select";
import { formatMoney } from "@/features/budget/api";
import type { OrgFiscalBudget } from "@/features/budget/types";
import type { CorporateEvent } from "@/features/events/types";
import {
  listCitiesByCountryCode,
  listCountries,
  type CatalogCity,
  type CatalogCountry,
} from "@/features/locations/api";
import { roleLabel } from "@/features/team/api";
import type { TeamMember } from "@/features/team/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type EventFormValues = {
  title: string;
  requirements: string;
  objectives: string;
  locationCountryCode: string;
  locationPreference: string;
  estimatedAttendees: string;
  allocatedAmount: string;
  budgetCategoryId: string;
  proposedStartAt: string;
  proposedEndAt: string;
  teamMemberIds: string[];
};

export function emptyEventFormValues(
  defaults?: Partial<Pick<EventFormValues, "locationCountryCode" | "budgetCategoryId">>,
): EventFormValues {
  return {
    title: "",
    requirements: "",
    objectives: "",
    locationCountryCode: defaults?.locationCountryCode ?? "",
    locationPreference: "",
    estimatedAttendees: "",
    allocatedAmount: "",
    budgetCategoryId: defaults?.budgetCategoryId ?? "",
    proposedStartAt: "",
    proposedEndAt: "",
    teamMemberIds: [],
  };
}

export function eventToFormValues(
  event: CorporateEvent,
  defaults?: Partial<Pick<EventFormValues, "locationCountryCode">>,
): EventFormValues {
  const toDateInput = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const amount = Math.round(Number(event.allocatedAmount));

  return {
    title: event.title,
    requirements: event.requirements ?? "",
    objectives: event.objectives ?? "",
    locationCountryCode: defaults?.locationCountryCode ?? "",
    locationPreference: event.locationPreference ?? "",
    estimatedAttendees:
      event.estimatedAttendees != null ? String(event.estimatedAttendees) : "",
    allocatedAmount: Number.isFinite(amount) ? String(amount) : "",
    budgetCategoryId: event.budgetCategoryId ?? "",
    proposedStartAt: toDateInput(event.proposedStartAt),
    proposedEndAt: toDateInput(event.proposedEndAt),
    teamMemberIds: (event.teamMembers ?? [])
      .filter((m) => m.role !== "LEAD")
      .map((m) => m.corporateUser.id),
  };
}

type Props = {
  mode: "create" | "edit";
  budget: OrgFiscalBudget;
  teamMembers: TeamMember[];
  currentUserId?: string;
  defaultCountryCode?: string;
  initialValues?: EventFormValues;
  submitting?: boolean;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

const fieldCls = cn(
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-colors",
  "placeholder:text-muted-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

const fieldWithIconCls = cn(fieldCls, "pl-10");

const textareaCls = cn(
  "min-h-[100px] w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm text-foreground shadow-sm transition-colors",
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
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
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

export function EventForm({
  mode,
  budget,
  teamMembers,
  currentUserId,
  defaultCountryCode,
  initialValues,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<EventFormValues>(
    () => initialValues ?? emptyEventFormValues({ locationCountryCode: defaultCountryCode }),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof EventFormValues, string>>>({});
  const [countries, setCountries] = useState<CatalogCountry[]>([]);
  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [resolvedCityCountry, setResolvedCityCountry] = useState(false);

  useEffect(() => {
    if (initialValues) setForm(initialValues);
  }, [initialValues]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCountries(true);
    void listCountries({ activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        setCountries(rows.filter((c) => c.isActive));
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve country for an existing city name (edit mode).
  useEffect(() => {
    if (resolvedCityCountry) return;
    if (!form.locationPreference || form.locationCountryCode) {
      setResolvedCityCountry(true);
      return;
    }
    if (loadingCountries || countries.length === 0) return;

    let cancelled = false;
    const preferred = (defaultCountryCode || "").trim().toUpperCase();
    const ordered = preferred
      ? [
          ...countries.filter((c) => c.code.toUpperCase() === preferred),
          ...countries.filter((c) => c.code.toUpperCase() !== preferred),
        ]
      : countries;

    void (async () => {
      for (const country of ordered) {
        try {
          const rows = await listCitiesByCountryCode(country.code, { activeOnly: true });
          if (cancelled) return;
          const match = rows.find(
            (city) =>
              city.isActive &&
              city.name.toLowerCase() === form.locationPreference.toLowerCase(),
          );
          if (match) {
            setForm((prev) => ({
              ...prev,
              locationCountryCode: country.code,
              locationPreference: match.name,
            }));
            setCities(rows.filter((c) => c.isActive));
            setResolvedCityCountry(true);
            return;
          }
        } catch {
          // try next country
        }
      }
      if (!cancelled) setResolvedCityCountry(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    countries,
    defaultCountryCode,
    form.locationCountryCode,
    form.locationPreference,
    loadingCountries,
    resolvedCityCountry,
  ]);

  useEffect(() => {
    const code = form.locationCountryCode.trim().toUpperCase();
    if (!code) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    void listCitiesByCountryCode(code, { activeOnly: true })
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((c) => c.isActive);
        setCities(active);
        setForm((prev) => {
          if (!prev.locationPreference) return prev;
          const stillValid = active.some(
            (c) => c.name.toLowerCase() === prev.locationPreference.toLowerCase(),
          );
          if (stillValid) {
            const exact = active.find(
              (c) => c.name.toLowerCase() === prev.locationPreference.toLowerCase(),
            );
            return exact && exact.name !== prev.locationPreference
              ? { ...prev, locationPreference: exact.name }
              : prev;
          }
          return { ...prev, locationPreference: "" };
        });
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.locationCountryCode]);

  const companyRemaining = Math.max(
    0,
    Math.floor(Number(budget.remainingAmount ?? 0)),
  );

  const selectedCategory = useMemo(
    () => budget.categories.find((c) => c.id === form.budgetCategoryId) ?? null,
    [budget.categories, form.budgetCategoryId],
  );

  /** Drafts/rejected are not committed — do not add headroom (would inflate the cap). */
  const categoryRemaining = selectedCategory
    ? Math.max(
        0,
        Math.floor(Number(selectedCategory.remainingAmount ?? selectedCategory.allocatedAmount)),
      )
    : 0;

  const maxAllocation = selectedCategory
    ? Math.min(companyRemaining, categoryRemaining)
    : companyRemaining;

  const hasCategories = budget.categories.length > 0;

  const categoryOptions = useMemo(
    () =>
      budget.categories.map((c) => {
        const remaining = Math.max(
          0,
          Math.floor(Number(c.remainingAmount ?? c.allocatedAmount)),
        );
        return {
          value: c.id,
          label: `${c.name} · ${formatMoney(remaining, budget.currency)} ${t("budget.remaining").toLowerCase()}`,
        };
      }),
    [budget.categories, budget.currency],
  );

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: c.name,
      })),
    [countries],
  );

  const cityOptions = useMemo(
    () =>
      cities.map((c) => ({
        value: c.name,
        label: c.name,
      })),
    [cities],
  );

  const selectableTeam = useMemo(
    () => teamMembers.filter((m) => m.corporateUser.id !== currentUserId),
    [teamMembers, currentUserId],
  );

  useEffect(() => {
    if (!hasCategories) return;
    if (form.budgetCategoryId) return;
    if (budget.categories.length === 1) {
      setForm((prev) => ({ ...prev, budgetCategoryId: budget.categories[0].id }));
    }
  }, [budget.categories, form.budgetCategoryId, hasCategories]);

  const set =
    (key: keyof EventFormValues) =>
    (value: string | string[]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    };

  const toggleMember = (userId: string) => {
    setForm((prev) => {
      const has = prev.teamMemberIds.includes(userId);
      return {
        ...prev,
        teamMemberIds: has
          ? prev.teamMemberIds.filter((id) => id !== userId)
          : [...prev.teamMemberIds, userId],
      };
    });
  };

  const validate = () => {
    const next: Partial<Record<keyof EventFormValues, string>> = {};
    if (form.title.trim().length < 3) {
      next.title = t("events.validationTitle");
    }
    if (!form.budgetCategoryId) {
      next.budgetCategoryId = t("events.validationCategory");
    }
    const amount = Number(form.allocatedAmount);
    if (
      !form.allocatedAmount ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      !Number.isInteger(amount)
    ) {
      next.allocatedAmount = t("events.validationAmountInt");
    } else if (amount > maxAllocation) {
      next.allocatedAmount = t("events.validationAmountMax", {
        max: formatMoney(maxAllocation, budget.currency),
      });
    }
    if (!form.locationCountryCode) {
      next.locationCountryCode = t("events.validationCountry");
    }
    if (!form.locationPreference) {
      next.locationPreference = t("events.validationLocation");
    } else if (
      cities.length > 0 &&
      !cities.some((c) => c.name === form.locationPreference)
    ) {
      next.locationPreference = t("events.validationLocation");
    }
    if (form.proposedStartAt && form.proposedEndAt) {
      const start = parseIsoDate(form.proposedStartAt);
      const end = parseIsoDate(form.proposedEndAt);
      if (start && end && end < start) {
        next.proposedEndAt = t("events.validationDateRange");
      }
    }
    if (form.estimatedAttendees) {
      const n = Number(form.estimatedAttendees);
      if (!Number.isInteger(n) || n < 1) {
        next.estimatedAttendees = t("events.validationAttendees");
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCategories) return;
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-primary/15 bg-linear-to-br from-primary/8 via-card to-card px-5 py-4 sm:px-6">
        <p className="text-sm font-medium text-foreground">
          {t("events.budgetHint", {
            remaining: formatMoney(maxAllocation, budget.currency),
            year: budget.fiscalYear,
          })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "create" ? t("events.createFlowHint") : t("events.editFlowHint")}
        </p>
      </div>

      {!hasCategories ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4 text-sm">
          <p className="font-medium text-foreground">{t("events.needCategories")}</p>
          <p className="mt-1 text-muted-foreground">{t("events.needCategoriesDesc")}</p>
          <Link
            href="/dashboard/budget"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("events.goToBudget")}
          </Link>
        </div>
      ) : null}

      <Section
        icon={FileText}
        title={t("events.sectionBasics")}
        description={t("events.sectionBasicsDesc")}
      >
        <div>
          <FieldLabel htmlFor="event-title" required>
            {t("events.eventTitle")}
          </FieldLabel>
          <IconInput
            id="event-title"
            icon={FileText}
            required
            minLength={3}
            maxLength={200}
            placeholder={t("events.titlePlaceholder")}
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(errors.title)}
            className={errors.title ? "border-destructive" : undefined}
          />
          {errors.title ? (
            <p className="mt-1.5 text-xs text-destructive">{errors.title}</p>
          ) : null}
        </div>

        <div>
          <FieldLabel htmlFor="event-requirements">{t("events.requirements")}</FieldLabel>
          <textarea
            id="event-requirements"
            className={textareaCls}
            placeholder={t("events.requirementsPlaceholder")}
            value={form.requirements}
            onChange={(e) => set("requirements")(e.target.value)}
            disabled={submitting}
            maxLength={5000}
          />
        </div>

        <div>
          <FieldLabel htmlFor="event-objectives">{t("events.objectives")}</FieldLabel>
          <div className="relative">
            <Target className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-muted-foreground" />
            <textarea
              id="event-objectives"
              className={cn(textareaCls, "min-h-21 pl-10")}
              placeholder={t("events.objectivesPlaceholder")}
              value={form.objectives}
              onChange={(e) => set("objectives")(e.target.value)}
              disabled={submitting}
              maxLength={5000}
            />
          </div>
        </div>
      </Section>

      <Section
        icon={Banknote}
        title={t("events.sectionBudget")}
        description={t("events.sectionBudgetDesc")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel required>{t("events.category")}</FieldLabel>
            <FormSelect
              value={form.budgetCategoryId}
              onValueChange={(v) => set("budgetCategoryId")(v)}
              options={categoryOptions}
              placeholder={t("events.chooseCategory")}
              disabled={submitting || !hasCategories}
              icon={Banknote}
              aria-invalid={Boolean(errors.budgetCategoryId)}
            />
            {errors.budgetCategoryId ? (
              <p className="mt-1.5 text-xs text-destructive">{errors.budgetCategoryId}</p>
            ) : null}
          </div>

          <div>
            <FieldLabel htmlFor="event-amount" required>
              {t("events.allocatedAmount")}
            </FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-xs font-semibold tracking-wide text-muted-foreground">
                {budget.currency}
              </span>
              <input
                id="event-amount"
                type="number"
                required
                min={1}
                step={1}
                inputMode="numeric"
                max={maxAllocation || undefined}
                placeholder="0"
                value={form.allocatedAmount}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    set("allocatedAmount")("");
                    return;
                  }
                  const asInt = String(Math.max(0, Math.trunc(Number(raw)) || 0));
                  set("allocatedAmount")(asInt === "0" && raw !== "0" ? "" : asInt);
                }}
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === "," || e.key === "e" || e.key === "E" || e.key === "+") {
                    e.preventDefault();
                  }
                }}
                disabled={submitting || !hasCategories}
                aria-invalid={Boolean(errors.allocatedAmount)}
                className={cn(
                  fieldCls,
                  "pl-14 tabular-nums",
                  errors.allocatedAmount && "border-destructive",
                )}
              />
            </div>
            {errors.allocatedAmount ? (
              <p className="mt-1.5 text-xs text-destructive">{errors.allocatedAmount}</p>
            ) : selectedCategory ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("events.allocationAvailableCategory", {
                  category: selectedCategory.name,
                  amount: formatMoney(maxAllocation, budget.currency),
                  company: formatMoney(companyRemaining, budget.currency),
                })}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("events.allocationAvailable", {
                  amount: formatMoney(maxAllocation, budget.currency),
                })}
              </p>
            )}
            {selectedCategory && categoryRemaining <= 0 ? (
              <p className="mt-1.5 text-xs text-destructive">
                {t("events.categoryBudgetExhausted", {
                  category: selectedCategory.name,
                })}
              </p>
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        icon={CalendarRange}
        title={t("events.sectionSchedule")}
        description={t("events.sectionScheduleDesc")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>{t("events.start")}</FieldLabel>
            <DatePickerField
              value={form.proposedStartAt}
              onChange={(v) => set("proposedStartAt")(v)}
              disabled={submitting}
              placeholder={t("events.pickDate")}
            />
          </div>
          <div>
            <FieldLabel>{t("events.end")}</FieldLabel>
            <DatePickerField
              value={form.proposedEndAt}
              onChange={(v) => set("proposedEndAt")(v)}
              disabled={submitting}
              placeholder={t("events.pickDate")}
              minDate={parseIsoDate(form.proposedStartAt) ?? undefined}
              aria-invalid={Boolean(errors.proposedEndAt)}
            />
            {errors.proposedEndAt ? (
              <p className="mt-1.5 text-xs text-destructive">{errors.proposedEndAt}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel required>{t("events.country")}</FieldLabel>
            <FormSelect
              value={form.locationCountryCode}
              onValueChange={(v) => {
                setForm((prev) => ({
                  ...prev,
                  locationCountryCode: v,
                  locationPreference: "",
                }));
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.locationCountryCode;
                  delete next.locationPreference;
                  return next;
                });
              }}
              options={countryOptions}
              placeholder={
                loadingCountries ? t("events.loadingLocations") : t("events.chooseCountry")
              }
              disabled={submitting || loadingCountries || countryOptions.length === 0}
              icon={Globe2}
              aria-invalid={Boolean(errors.locationCountryCode)}
            />
            {errors.locationCountryCode ? (
              <p className="mt-1.5 text-xs text-destructive">{errors.locationCountryCode}</p>
            ) : countryOptions.length === 0 && !loadingCountries ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("events.noCountriesConfigured")}
              </p>
            ) : null}
          </div>
          <div>
            <FieldLabel required>{t("events.location")}</FieldLabel>
            <FormSelect
              value={form.locationPreference}
              onValueChange={(v) => set("locationPreference")(v)}
              options={cityOptions}
              placeholder={
                !form.locationCountryCode
                  ? t("events.chooseCountryFirst")
                  : loadingCities
                    ? t("events.loadingLocations")
                    : t("events.chooseCity")
              }
              disabled={
                submitting ||
                !form.locationCountryCode ||
                loadingCities ||
                cityOptions.length === 0
              }
              icon={MapPin}
              aria-invalid={Boolean(errors.locationPreference)}
            />
            {errors.locationPreference ? (
              <p className="mt-1.5 text-xs text-destructive">{errors.locationPreference}</p>
            ) : form.locationCountryCode && !loadingCities && cityOptions.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("events.noCitiesConfigured")}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="event-attendees">{t("events.attendees")}</FieldLabel>
          <IconInput
            id="event-attendees"
            icon={Users}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="50"
            value={form.estimatedAttendees}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                set("estimatedAttendees")("");
                return;
              }
              set("estimatedAttendees")(String(Math.max(0, Math.trunc(Number(raw)) || 0)));
            }}
            disabled={submitting}
            aria-invalid={Boolean(errors.estimatedAttendees)}
            className={cn(
              "tabular-nums",
              errors.estimatedAttendees && "border-destructive",
            )}
          />
          {errors.estimatedAttendees ? (
            <p className="mt-1.5 text-xs text-destructive">{errors.estimatedAttendees}</p>
          ) : null}
        </div>
      </Section>

      <Section
        icon={Users}
        title={t("events.sectionTeam")}
        description={t("events.sectionTeamDesc")}
      >
        {currentUserId ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-3.5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {t("events.leadBadge")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t("events.youAreLead")}</p>
              <p className="text-xs text-muted-foreground">{t("events.leadHint")}</p>
            </div>
          </div>
        ) : null}

        {selectableTeam.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
            {t("events.noTeamMembers")}
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {selectableTeam.map((member) => {
              const id = member.corporateUser.id;
              const selected = form.teamMemberIds.includes(id);
              const name = `${member.corporateUser.firstName} ${member.corporateUser.lastName}`.trim();
              return (
                <li key={member.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => toggleMember(id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/8 ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-accent/60",
                      "disabled:opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {selected ? (
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      ) : (
                        (name.charAt(0) || "?").toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {roleLabel(member.role)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-card/80 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
        <button
          type="submit"
          disabled={submitting || !hasCategories}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60 sm:flex-none"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? t("events.saveDraftContinue") : t("events.saveChanges")}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            {t("events.cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
