"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  EventForm,
  emptyEventFormValues,
  type EventFormValues,
} from "@/components/events/event-form";
import { useAuth } from "@/features/auth/auth-context";
import { getCurrentBudget } from "@/features/budget/api";
import type { OrgFiscalBudget } from "@/features/budget/types";
import { createEvent } from "@/features/events/api";
import { listTeam } from "@/features/team/api";
import type { TeamMember } from "@/features/team/types";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";

const CREATE_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

export default function NewEventPage() {
  const router = useRouter();
  const { organizations, user } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const canCreate = CREATE_ROLES.has(role);

  const [budget, setBudget] = useState<OrgFiscalBudget | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void Promise.all([getCurrentBudget(), listTeam().catch(() => null)])
      .then(([budgetRes, teamRes]) => {
        setBudget(budgetRes.data);
        setTeamMembers(teamRes?.data.members ?? []);
      })
      .catch((err) => toastApiError(err, t("budget.loadError")))
      .finally(() => setLoading(false));
  }, []);

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-muted-foreground">{t("events.createRoleHint")}</p>
        <Link
          href="/dashboard/events"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          {t("events.backToEvents")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("events.loading")}
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <p className="font-medium">{t("events.needBudget")}</p>
        <p className="text-sm text-muted-foreground">{t("events.needBudgetDesc")}</p>
        <Link
          href="/dashboard/budget"
          className="inline-block text-sm text-primary hover:underline"
        >
          {t("events.goToBudget")}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (values: EventFormValues) => {
    setSubmitting(true);
    try {
      const res = await createEvent({
        fiscalBudgetId: budget.id,
        budgetCategoryId: values.budgetCategoryId,
        title: values.title.trim(),
        requirements: values.requirements.trim() || null,
        objectives: values.objectives.trim() || null,
        locationPreference: values.locationPreference.trim(),
        estimatedAttendees: values.estimatedAttendees
          ? Number(values.estimatedAttendees)
          : null,
        allocatedAmount: Math.trunc(Number(values.allocatedAmount)),
        proposedStartAt: values.proposedStartAt
          ? new Date(values.proposedStartAt).toISOString()
          : null,
        proposedEndAt: values.proposedEndAt
          ? new Date(values.proposedEndAt).toISOString()
          : null,
        teamMemberIds: values.teamMemberIds,
        submit: false,
      });
      toast.success(res.message || t("events.draftSaved"));
      router.push(`/dashboard/events/${res.data.id}`);
    } catch (err) {
      toastApiError(err, t("events.createError"));
    } finally {
      setSubmitting(false);
    }
  };

  const orgCountry = organizations[0]?.organization?.country ?? undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("events.backToEvents")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("events.newEvent")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("events.newEventDesc")}</p>
      </div>

      <EventForm
        mode="create"
        budget={budget}
        teamMembers={teamMembers}
        currentUserId={user?.id}
        defaultCountryCode={orgCountry || undefined}
        initialValues={emptyEventFormValues({
          locationCountryCode: orgCountry || "",
        })}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/dashboard/events")}
      />
    </div>
  );
}
