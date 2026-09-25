"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, PiggyBank, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-context";
import {
  activateBudget,
  addBudgetCategory,
  createBudget,
  deleteBudget,
  deleteBudgetCategory,
  formatMoney,
  getCurrentBudget,
  listBudgets,
  returnUnusedBudgetCategory,
  updateBudget,
  updateBudgetCategory,
} from "@/features/budget/api";
import type { OrgFiscalBudget } from "@/features/budget/types";
import { useLocale } from "@/features/i18n/locale-context";
import { toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const inputCls =
  "flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const BUDGET_ADMIN = new Set(["OWNER", "FINANCE_APPROVER"]);

type CategoryDraft = { key: string; name: string; allocatedAmount: string };

function emptyCategory(): CategoryDraft {
  return { key: `${Date.now()}-${Math.random()}`, name: "", allocatedAmount: "" };
}

export default function BudgetPage() {
  const { t } = useLocale();
  const { organizations } = useAuth();
  const role = organizations[0]?.role ?? "COLLABORATOR";
  const canManage = BUDGET_ADMIN.has(role);
  const currency = organizations[0]?.organization?.preferredCurrency ?? "AED";

  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<OrgFiscalBudget | null>(null);
  const [all, setAll] = useState<OrgFiscalBudget[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [busy, setBusy] = useState(false);
  const [catName, setCatName] = useState("");
  const [catAmount, setCatAmount] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatAmount, setEditCatAmount] = useState("");
  const [form, setForm] = useState({
    fiscalYear: String(new Date().getFullYear()),
    totalAmount: "",
    notes: "",
    activate: true,
  });
  const [createCategories, setCreateCategories] = useState<CategoryDraft[]>([
    emptyCategory(),
  ]);
  const [editForm, setEditForm] = useState({ totalAmount: "", notes: "" });

  const refresh = useCallback(async () => {
    const [cur, list] = await Promise.all([getCurrentBudget(), listBudgets()]);
    setCurrent(cur.data);
    setAll(list.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh()
      .catch((err) => toastApiError(err, t("budget.loadError")))
      .finally(() => setLoading(false));
  }, [refresh, t]);

  useEffect(() => {
    if (!current || editingBudget) return;
    setEditForm({
      totalAmount: String(Number(current.totalAmount) || ""),
      notes: current.notes ?? "",
    });
  }, [current, editingBudget]);

  const createCategorySum = useMemo(
    () =>
      createCategories.reduce(
        (sum, c) => sum + (Number(c.allocatedAmount) > 0 ? Number(c.allocatedAmount) : 0),
        0,
      ),
    [createCategories],
  );

  const resetCreateForm = () => {
    setForm({
      fiscalYear: String(new Date().getFullYear()),
      totalAmount: "",
      notes: "",
      activate: true,
    });
    setCreateCategories([emptyCategory()]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(form.totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error(t("budget.validationTotal"));
      return;
    }

    const categories = createCategories
      .map((c) => ({
        name: c.name.trim(),
        allocatedAmount: Number(c.allocatedAmount),
      }))
      .filter((c) => c.name || c.allocatedAmount);

    if (categories.length < 1) {
      toast.error(t("budget.categoriesRequired"));
      return;
    }
    if (categories.some((c) => !c.name || !(c.allocatedAmount > 0))) {
      toast.error(t("budget.categoriesInvalid"));
      return;
    }
    if (createCategorySum > total + 1e-9) {
      toast.error(t("budget.categoriesExceedTotal"));
      return;
    }

    setBusy(true);
    try {
      await createBudget({
        fiscalYear: Number(form.fiscalYear),
        totalAmount: total,
        notes: form.notes.trim() || undefined,
        activate: form.activate,
        currency,
        categories,
      });
      toast.success(t("budget.created"));
      setShowCreate(false);
      resetCreateForm();
      await refresh();
    } catch (err) {
      toastApiError(err, t("budget.createError"));
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    const total = Number(editForm.totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error(t("budget.validationTotal"));
      return;
    }
    setBusy(true);
    try {
      await updateBudget(current.id, {
        totalAmount: total,
        notes: editForm.notes.trim() || null,
      });
      toast.success(t("budget.updated"));
      setEditingBudget(false);
      await refresh();
    } catch (err) {
      toastApiError(err, t("budget.updateError"));
    } finally {
      setBusy(false);
    }
  };

  const startEditCategory = (cat: OrgFiscalBudget["categories"][number]) => {
    setEditingCategoryId(cat.id);
    setEditCatName(cat.name);
    setEditCatAmount(String(Number(cat.allocatedAmount) || ""));
  };

  const handleSaveCategory = async () => {
    if (!current || !editingCategoryId) return;
    if (!editCatName.trim() || !(Number(editCatAmount) > 0)) {
      toast.error(t("budget.categoriesInvalid"));
      return;
    }
    setBusy(true);
    try {
      await updateBudgetCategory(current.id, editingCategoryId, {
        name: editCatName.trim(),
        allocatedAmount: Number(editCatAmount),
      });
      toast.success(t("budget.categoryUpdated"));
      setEditingCategoryId(null);
      await refresh();
    } catch (err) {
      toastApiError(err, t("budget.categoryError"));
    } finally {
      setBusy(false);
    }
  };

  const handleReturnUnused = async (cat: OrgFiscalBudget["categories"][number]) => {
    if (!current) return;
    const unused = Math.max(0, Number(cat.remainingAmount ?? 0));
    if (
      !window.confirm(
        t("budget.returnUnusedConfirm", {
          amount: formatMoney(unused, current.currency),
          name: cat.name,
        }),
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await returnUnusedBudgetCategory(current.id, cat.id);
      toast.success(
        t("budget.categoryUnusedReturned", {
          amount: formatMoney(res.returnedAmount, res.currency || current.currency),
        }),
      );
      if (res.budget) setCurrent(res.budget);
      else await refresh();
    } catch (err) {
      toastApiError(err, t("budget.categoryError"));
    } finally {
      setBusy(false);
    }
  };

  const handleReturnAndDelete = async (cat: OrgFiscalBudget["categories"][number]) => {
    if (!current) return;
    if (current.categories.length <= 1) {
      toast.error(t("budget.cannotDeleteLastCategory"));
      return;
    }
    const amount = Number(cat.allocatedAmount);
    if (
      !window.confirm(
        t("budget.returnAndDeleteConfirm", {
          amount: formatMoney(amount, current.currency),
          name: cat.name,
        }),
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await deleteBudgetCategory(current.id, cat.id);
      toast.success(
        t("budget.categoryReturned", {
          amount: formatMoney(
            res.returnedAmount ?? amount,
            res.currency || current.currency,
          ),
        }),
      );
      if (res.budget) setCurrent(res.budget);
      else await refresh();
    } catch (err) {
      toastApiError(err, t("budget.categoryError"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("budget.loading")}
      </div>
    );
  }

  const canEditCurrent =
    canManage && current && current.status !== "CLOSED";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("budget.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("budget.description")}</p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setEditingBudget(false);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {showCreate ? t("budget.cancel") : t("budget.newBudget")}
          </button>
        ) : null}
      </div>

      {showCreate && canManage ? (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="font-semibold">{t("budget.newBudget")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("budget.fiscalYear")}</label>
              <input
                className={inputCls}
                type="number"
                required
                min={2000}
                max={2100}
                value={form.fiscalYear}
                onChange={(e) => setForm((p) => ({ ...p, fiscalYear: e.target.value }))}
                disabled={busy}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("budget.totalAmount")} ({currency})
              </label>
              <input
                className={inputCls}
                type="number"
                required
                min={1}
                step={1}
                value={form.totalAmount}
                onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))}
                disabled={busy}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("budget.notes")}</label>
            <input
              className={inputCls}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              disabled={busy}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{t("budget.categories")}</p>
                <p className="text-xs text-muted-foreground">{t("budget.categoriesHint")}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium hover:bg-accent"
                onClick={() => setCreateCategories((rows) => [...rows, emptyCategory()])}
                disabled={busy}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("budget.addCategory")}
              </button>
            </div>

            <ul className="space-y-2">
              {createCategories.map((row) => (
                <li key={row.key} className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <input
                    className={inputCls}
                    placeholder={t("budget.categoryName")}
                    value={row.name}
                    required
                    onChange={(e) =>
                      setCreateCategories((rows) =>
                        rows.map((r) =>
                          r.key === row.key ? { ...r, name: e.target.value } : r,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                  <input
                    className={inputCls}
                    type="number"
                    min={1}
                    step={1}
                    required
                    placeholder={t("budget.categoryAmount")}
                    value={row.allocatedAmount}
                    onChange={(e) =>
                      setCreateCategories((rows) =>
                        rows.map((r) =>
                          r.key === row.key
                            ? { ...r, allocatedAmount: e.target.value }
                            : r,
                        ),
                      )
                    }
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive disabled:opacity-40"
                    disabled={busy || createCategories.length <= 1}
                    onClick={() =>
                      setCreateCategories((rows) => rows.filter((r) => r.key !== row.key))
                    }
                    aria-label={t("budget.removeCategory")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>

            <p className="text-xs text-muted-foreground">
              {t("budget.categorySum", {
                sum: formatMoney(createCategorySum, currency),
                total: form.totalAmount
                  ? formatMoney(Number(form.totalAmount) || 0, currency)
                  : "—",
              })}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activate}
              onChange={(e) => setForm((p) => ({ ...p, activate: e.target.checked }))}
              disabled={busy}
            />
            {t("budget.activateNow")}
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("budget.save")}
          </button>
        </form>
      ) : null}

      {!current ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <PiggyBank className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{t("budget.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("budget.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("budget.activeFy", { year: current.fiscalYear })}
                </p>
                {!editingBudget ? (
                  <>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {formatMoney(current.totalAmount, current.currency)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("budget.committed")}:{" "}
                      {formatMoney(current.committedAmount ?? 0, current.currency)} ·{" "}
                      {t("budget.remaining")}:{" "}
                      <span className="font-semibold text-emerald-600">
                        {formatMoney(current.remainingAmount ?? 0, current.currency)}
                      </span>
                      {" · "}
                      {t("budget.unallocated")}:{" "}
                      <span className="font-semibold text-foreground">
                        {formatMoney(
                          current.unallocatedAmount ??
                            Number(current.totalAmount) -
                              current.categories.reduce(
                                (s, c) => s + Number(c.allocatedAmount),
                                0,
                              ),
                          current.currency,
                        )}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("budget.unallocatedHint")}
                    </p>
                    {current.notes ? (
                      <p className="mt-2 text-sm text-muted-foreground">{current.notes}</p>
                    ) : null}
                  </>
                ) : (
                  <form onSubmit={handleUpdateBudget} className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        {t("budget.totalAmount")} ({current.currency})
                      </label>
                      <input
                        className={cn(inputCls, "max-w-xs")}
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={editForm.totalAmount}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, totalAmount: e.target.value }))
                        }
                        disabled={busy}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t("budget.notes")}</label>
                      <input
                        className={inputCls}
                        value={editForm.notes}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, notes: e.target.value }))
                        }
                        disabled={busy}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t("budget.saveChanges")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm"
                        onClick={() => setEditingBudget(false)}
                      >
                        {t("budget.cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    current.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {current.status}
                </span>
                {canEditCurrent && !editingBudget ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() => {
                      setEditingBudget(true);
                      setShowCreate(false);
                      setEditForm({
                        totalAmount: String(Number(current.totalAmount) || ""),
                        notes: current.notes ?? "",
                      });
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("budget.edit")}
                  </button>
                ) : null}
                {canManage ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                    onClick={async () => {
                      if (!window.confirm(t("budget.confirmDelete"))) return;
                      try {
                        await deleteBudget(current.id);
                        toast.success(t("budget.deleted"));
                        setEditingBudget(false);
                        await refresh();
                      } catch (err) {
                        toastApiError(err, t("budget.deleteError"));
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("budget.delete")}
                  </button>
                ) : null}
              </div>
            </div>

            {!editingBudget ? (
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((Number(current.committedAmount ?? 0) /
                        Number(current.totalAmount || 1)) *
                        100) ||
                        0,
                    )}%`,
                  }}
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{t("budget.categories")}</h2>
                <p className="text-xs text-muted-foreground">{t("budget.categoriesHint")}</p>
              </div>
            </div>

            {current.categories.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t("budget.noCategoriesRequired")}
              </p>
            ) : (
              <ul className="space-y-2">
                {current.categories.map((cat) => (
                  <li
                    key={cat.id}
                    className="rounded-xl border border-border px-3 py-2.5"
                  >
                    {editingCategoryId === cat.id ? (
                      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto_auto]">
                        <input
                          className={inputCls}
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          disabled={busy}
                        />
                        <input
                          className={inputCls}
                          type="number"
                          min={1}
                          step={1}
                          value={editCatAmount}
                          onChange={(e) => setEditCatAmount(e.target.value)}
                          disabled={busy}
                        />
                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                          disabled={busy}
                          onClick={() => void handleSaveCategory()}
                        >
                          {t("budget.saveChanges")}
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border"
                          disabled={busy}
                          onClick={() => setEditingCategoryId(null)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("budget.allocated")}:{" "}
                            {formatMoney(cat.allocatedAmount, current.currency)} ·{" "}
                            {t("budget.committed")}:{" "}
                            {formatMoney(cat.committedAmount ?? 0, current.currency)} ·{" "}
                            {t("budget.remaining")}:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                Number(cat.remainingAmount ?? cat.allocatedAmount) <= 0
                                  ? "text-destructive"
                                  : "text-emerald-600",
                              )}
                            >
                              {formatMoney(
                                cat.remainingAmount ?? Number(cat.allocatedAmount),
                                current.currency,
                              )}
                            </span>
                          </p>
                        </div>
                        {canEditCurrent ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-primary"
                              onClick={() => startEditCategory(cat)}
                              aria-label={t("budget.editCategory")}
                              title={t("budget.editCategory")}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {Number(cat.remainingAmount ?? 0) >= 1 &&
                            Number(cat.committedAmount ?? 0) >= 1 ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                                title={t("budget.returnUnused")}
                                onClick={() => void handleReturnUnused(cat)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                {t("budget.returnUnused")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                              disabled={current.categories.length <= 1}
                              title={
                                current.categories.length <= 1
                                  ? t("budget.cannotDeleteLastCategory")
                                  : t("budget.returnAndDelete")
                              }
                              onClick={() => void handleReturnAndDelete(cat)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("budget.returnAndDelete")}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEditCurrent ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                <input
                  className={inputCls}
                  placeholder={t("budget.categoryName")}
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  step={1}
                  placeholder={t("budget.categoryAmount")}
                  value={catAmount}
                  onChange={(e) => setCatAmount(e.target.value)}
                />
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-3 text-sm hover:bg-accent"
                  onClick={async () => {
                    if (!catName.trim() || !(Number(catAmount) > 0)) {
                      toast.error(t("budget.categoriesInvalid"));
                      return;
                    }
                    try {
                      await addBudgetCategory(current.id, {
                        name: catName.trim(),
                        allocatedAmount: Number(catAmount),
                      });
                      toast.success(t("budget.categoryAdded"));
                      setCatName("");
                      setCatAmount("");
                      await refresh();
                    } catch (err) {
                      toastApiError(err, t("budget.categoryError"));
                    }
                  }}
                >
                  {t("budget.addCategory")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {all.some((b) => b.status !== "ACTIVE") ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("budget.otherBudgets")}</h2>
          {all
            .filter((b) => !current || b.id !== current.id)
            .map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    FY {b.fiscalYear} · {formatMoney(b.totalAmount, b.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.status}
                    {b.categories?.length
                      ? ` · ${b.categories.length} ${t("budget.categoriesShort")}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {canManage && b.status === "DRAFT" ? (
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={async () => {
                        try {
                          await activateBudget(b.id);
                          toast.success(t("budget.activated"));
                          await refresh();
                        } catch (err) {
                          toastApiError(err, t("budget.activateError"));
                        }
                      }}
                    >
                      {t("budget.activate")}
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm text-destructive hover:underline"
                      onClick={async () => {
                        if (!window.confirm(t("budget.confirmDelete"))) return;
                        try {
                          await deleteBudget(b.id);
                          toast.success(t("budget.deleted"));
                          await refresh();
                        } catch (err) {
                          toastApiError(err, t("budget.deleteError"));
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("budget.delete")}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
