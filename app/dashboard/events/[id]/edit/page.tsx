"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  EventForm,
  eventToFormValues,
  type EventFormValues,
} from "@/components/events/event-form";
import { useAuth } from "@/features/auth/auth-context";
import { getCurrentBudget } from "@/features/budget/api";
import type { OrgFiscalBudget } from "@/features/budget/types";
import { getEvent, putEventTeam, updateEvent } from "@/features/events/api";
import type { CorporateEvent } from "@/features/events/types";
import { listTeam } from "@/features/team/api";
import type { TeamMember } from "@/features/team/types";
import { toastApiError } from "@/lib/api/errors";
import { t } from "@/lib/i18n";

const CREATE_ROLES = new Set(["OWNER", "EVENT_MANAGER"]);

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { organizations, user } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const canEdit = CREATE_ROLES.has(role);

  const [event, setEvent] = useState<CorporateEvent | null>(null);
  const [budget, setBudget] = useState<OrgFiscalBudget | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [eventRes, budgetRes, teamRes] = await Promise.all([
      getEvent(params.id),
      getCurrentBudget(),
      listTeam().catch(() => null),
    ]);
    setEvent(eventRes.data);
    setBudget(budgetRes.data);
    setTeamMembers(teamRes?.data.members ?? []);
  }, [params.id]);

  useEffect(() => {
    setLoading(true);
    void load()
      .catch((err) => toastApiError(err, t("events.detailLoadError")))
      .finally(() => setLoading(false));
  }, [load]);

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-muted-foreground">{t("events.createRoleHint")}</p>
        <Link
          href={`/dashboard/events/${params.id}`}
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          {t("events.backToEvent")}
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

  if (!event || !budget) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-medium">{t("events.notFound")}</p>
        <Link
          href="/dashboard/events"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          {t("events.backToEvents")}
        </Link>
      </div>
    );
  }

  const isEditable = event.status === "DRAFT" || event.status === "REJECTED";
  const canAct =
    role === "OWNER" || event.createdBy.id === user?.id;

  if (!isEditable || !canAct) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <p className="font-medium">{t("events.cannotEdit")}</p>
        <p className="text-sm text-muted-foreground">{t("events.cannotEditDesc")}</p>
        <Link
          href={`/dashboard/events/${event.id}`}
          className="inline-block text-sm text-primary hover:underline"
        >
          {t("events.backToEvent")}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (values: EventFormValues) => {
    setSubmitting(true);
    try {
      await updateEvent(event.id, {
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
      });

      const teamPayload = [
        {
          corporateUserId: event.createdBy.id,
          role: "LEAD" as const,
        },
        ...values.teamMemberIds
          .filter((id) => id !== event.createdBy.id)
          .map((id) => ({
            corporateUserId: id,
            role: "MEMBER" as const,
          })),
      ];
      await putEventTeam(event.id, teamPayload);

      toast.success(t("events.updated"));
      router.push(`/dashboard/events/${event.id}`);
    } catch (err) {
      toastApiError(err, t("events.updateError"));
    } finally {
      setSubmitting(false);
    }
  };

  const orgCountry = organizations[0]?.organization?.country ?? undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <Link
        href={`/dashboard/events/${event.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("events.backToEvent")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("events.editEvent")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("events.editEventDesc")}</p>
      </div>

      <EventForm
        mode="edit"
        budget={budget}
        teamMembers={teamMembers}
        currentUserId={user?.id}
        defaultCountryCode={orgCountry || undefined}
        initialValues={eventToFormValues(event, {
          locationCountryCode: orgCountry || "",
        })}
        submitting={submitting}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/dashboard/events/${event.id}`)}
      />
    </div>
  );
}
