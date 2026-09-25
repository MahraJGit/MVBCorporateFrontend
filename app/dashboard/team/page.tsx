"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Loader2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FormSelect } from "@/components/form-select";
import { useAuth } from "@/features/auth/auth-context";
import { useLocale } from "@/features/i18n/locale-context";
import {
  inviteTeamMember,
  listTeam,
  removeMember,
  revokeInvite,
  roleLabel,
  updateMemberRole,
} from "@/features/team/api";
import {
  ORG_ROLES,
  PERMISSION_ACTIONS,
  ROLE_PERMISSIONS,
  type PermissionAction,
} from "@/features/team/permissions";
import {
  ASSIGNABLE_ORG_ROLES,
  type OrgMemberRole,
  type TeamInvite,
  type TeamMember,
} from "@/features/team/types";
import { toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const inputCls =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function TeamPage() {
  const { user, organizations } = useAuth();
  const { t } = useLocale();
  const isOwner = organizations[0]?.role === "OWNER";
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMemberRole>("COLLABORATOR");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const roleOptions = ASSIGNABLE_ORG_ROLES.map((r) => ({
    value: r,
    label: roleLabel(r),
  }));

  const refresh = useCallback(async () => {
    const res = await listTeam();
    setMembers(res.data.members);
    setInvites(res.data.invites);
  }, []);

  useEffect(() => {
    void refresh()
      .catch((err) => toastApiError(err, t("team.loadError")))
      .finally(() => setLoading(false));
  }, [refresh, t]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await inviteTeamMember({ email: email.trim(), role });
      toast.success(res.message);
      if (res.data.type === "invite" && res.data.inviteUrl) {
        try {
          await navigator.clipboard.writeText(res.data.inviteUrl);
          toast.message(t("team.inviteLinkCopied"));
        } catch {
          toast.message(res.data.inviteUrl);
        }
      }
      setEmail("");
      setRole("COLLABORATOR");
      await refresh();
    } catch (err) {
      toastApiError(err, t("team.inviteError"));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, nextRole: OrgMemberRole) => {
    setBusyId(memberId);
    try {
      await updateMemberRole(memberId, nextRole);
      toast.success(t("team.roleUpdated"));
      await refresh();
    } catch (err) {
      toastApiError(err, t("team.roleError"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!window.confirm(t("team.confirmRemove"))) return;
    setBusyId(memberId);
    try {
      await removeMember(memberId);
      toast.success(t("team.memberRemoved"));
      await refresh();
    } catch (err) {
      toastApiError(err, t("team.removeError"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setBusyId(inviteId);
    try {
      await revokeInvite(inviteId);
      toast.success(t("team.inviteRevoked"));
      await refresh();
    } catch (err) {
      toastApiError(err, t("team.revokeError"));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("team.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("team.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("team.description")}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPermissions((v) => !v)}
          aria-expanded={showPermissions}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          <Info className="h-4 w-4 text-primary" />
          {showPermissions ? t("team.hideRoleInfo") : t("team.showRoleInfo")}
          {showPermissions ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {showPermissions ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("team.permissionsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("team.permissionsDescription")}
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-180 text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="sticky inset-s-0 bg-muted/40 px-4 py-3 font-medium">
                    {t("team.colAction")}
                  </th>
                  {ORG_ROLES.map((r) => (
                    <th key={r} className="px-3 py-3 text-center font-medium">
                      {roleLabel(r)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_ACTIONS.map((action: PermissionAction) => (
                  <tr key={action} className="border-t border-border">
                    <td className="sticky inset-s-0 bg-background px-4 py-2.5 font-medium text-foreground">
                      {t(`team.perm.${action}`)}
                    </td>
                    {ORG_ROLES.map((r) => {
                      const allowed = ROLE_PERMISSIONS[r][action];
                      return (
                        <td key={r} className="px-3 py-2.5 text-center">
                          <span
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full",
                              allowed
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-muted text-muted-foreground/50",
                            )}
                            title={allowed ? t("team.allowed") : t("team.denied")}
                            aria-label={allowed ? t("team.allowed") : t("team.denied")}
                          >
                            {allowed ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                            ) : (
                              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isOwner ? (
        <form
          onSubmit={handleInvite}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">{t("team.inviteTitle")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <input
              type="email"
              required
              className={inputCls}
              placeholder={t("team.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviting}
            />
            <FormSelect
              value={role}
              onValueChange={(v) => setRole(v as OrgMemberRole)}
              options={roleOptions}
              disabled={inviting}
            />
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("team.sendInvite")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t("team.inviteHint")}</p>
        </form>
      ) : (
        <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {t("team.ownerOnly")}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("team.members")} ({members.length})
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("team.colName")}</th>
                <th className="px-4 py-3 font-medium">{t("team.colRole")}</th>
                <th className="px-4 py-3 font-medium">{t("team.colStatus")}</th>
                {isOwner ? <th className="px-4 py-3 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.corporateUser.id === user?.id;
                const canManage = isOwner && !isSelf && m.role !== "OWNER";
                return (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {m.corporateUser.firstName} {m.corporateUser.lastName}
                        {isSelf ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({t("team.you")})
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.corporateUser.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <FormSelect
                          value={m.role}
                          onValueChange={(v) =>
                            void handleRoleChange(m.id, v as OrgMemberRole)
                          }
                          options={roleOptions}
                          disabled={busyId === m.id}
                        />
                      ) : (
                        <span className="font-medium">{roleLabel(m.role)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          m.joinedAt
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600",
                        )}
                      >
                        {m.joinedAt ? t("team.active") : t("team.pending")}
                      </span>
                    </td>
                    {isOwner ? (
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <button
                            type="button"
                            disabled={busyId === m.id}
                            onClick={() => void handleRemove(m.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            aria-label={t("team.remove")}
                          >
                            {busyId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("team.pendingInvites")} ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(invite.role)} · {t("team.expires")}{" "}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-2">
                    {invite.inviteUrl ? (
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs text-muted-foreground hover:bg-accent"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(invite.inviteUrl!);
                            toast.success(t("team.inviteLinkCopied"));
                          } catch {
                            toast.message(invite.inviteUrl);
                          }
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t("team.copyLink")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === invite.id}
                      onClick={() => void handleRevoke(invite.id)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {busyId === invite.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {t("team.revoke")}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
