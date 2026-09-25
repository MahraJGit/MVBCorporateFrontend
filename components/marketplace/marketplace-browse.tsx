"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, Loader2, MapPin, Search, Store, Users } from "lucide-react";
import { FormSelect } from "@/components/form-select";
import { MarketplaceServiceCard } from "@/components/marketplace/marketplace-service-card";
import {
  listCitiesByCountryCode,
  listCountries,
  type CatalogCity,
  type CatalogCountry,
} from "@/features/locations/api";
import {
  listPublicMarketplaceServices,
  listServiceCategories,
} from "@/features/marketplace/api";
import type { PublicMarketplaceService, ServiceCategory } from "@/features/marketplace/types";
import { useLocale } from "@/features/i18n/locale-context";
import { toastApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

const fieldCls = cn(
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors",
  "placeholder:text-muted-foreground",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
);

export function MarketplaceBrowse() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId")?.trim() ?? "";
  const calendarItemId = searchParams.get("calendarItemId")?.trim() ?? "";
  const replaceLineId = searchParams.get("replaceLineId")?.trim() ?? "";

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const searchFromUrl = searchParams.get("search")?.trim() ?? "";
  const countryFromUrl = searchParams.get("countryCode")?.trim().toUpperCase() ?? "";
  const cityFromUrl = searchParams.get("city")?.trim() ?? "";
  const guestsFromUrl = searchParams.get("guests")?.trim() ?? "";
  const categoryId = searchParams.get("categoryId")?.trim() ?? "";
  const sortBy =
    (searchParams.get("sortBy") as "createdAt" | "title" | "basePrice") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

  const [search, setSearch] = useState(searchFromUrl);
  const [guests, setGuests] = useState(guestsFromUrl);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [countries, setCountries] = useState<CatalogCountry[]>([]);
  const [cities, setCities] = useState<CatalogCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [services, setServices] = useState<PublicMarketplaceService[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearch(searchFromUrl);
    setGuests(guestsFromUrl);
  }, [searchFromUrl, guestsFromUrl]);

  useEffect(() => {
    void listServiceCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    void listCountries({ activeOnly: true })
      .then((rows) => setCountries(rows.filter((c) => c.isActive)))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!countryFromUrl) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setLoadingCities(true);
    void listCitiesByCountryCode(countryFromUrl, { activeOnly: true })
      .then((rows) => {
        if (!cancelled) setCities(rows.filter((c) => c.isActive));
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
  }, [countryFromUrl]);

  const pushParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value?.trim()) sp.set(key, value.trim());
        else sp.delete(key);
      }
      const qs = sp.toString();
      router.push(qs ? `/dashboard/marketplace?${qs}` : "/dashboard/marketplace");
    },
    [router, searchParams],
  );

  useEffect(() => {
    setLoading(true);
    const guestsNum = guestsFromUrl ? Number(guestsFromUrl) : undefined;
    void listPublicMarketplaceServices({
      page,
      limit: PAGE_SIZE,
      search: searchFromUrl || undefined,
      countryCode: countryFromUrl || undefined,
      city: cityFromUrl || undefined,
      guests: guestsNum && guestsNum > 0 ? guestsNum : undefined,
      categoryId: categoryId || undefined,
      sortBy,
      sortOrder,
    })
      .then((res) => {
        setServices(res.data ?? []);
        setTotalPages(res.meta?.totalPages ?? 1);
      })
      .catch((err) => {
        setServices([]);
        toastApiError(err, t("marketplace.loadError"));
      })
      .finally(() => setLoading(false));
  }, [
    page,
    searchFromUrl,
    countryFromUrl,
    cityFromUrl,
    guestsFromUrl,
    categoryId,
    sortBy,
    sortOrder,
    t,
  ]);

  const countryOptions = useMemo(
    () => [
      { value: "__all__", label: t("marketplace.anyCountry") },
      ...countries.map((c) => ({ value: c.code, label: c.name })),
    ],
    [countries, t],
  );
  const cityOptions = useMemo(
    () => [
      { value: "__all__", label: t("marketplace.anyCity") },
      ...cities.map((c) => ({ value: c.name, label: c.name })),
    ],
    [cities, t],
  );

  const applyFilters = () => {
    pushParams({
      search: search || undefined,
      guests: guests || undefined,
      page: undefined,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("marketplace.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("marketplace.description")}</p>
        {calendarItemId ? (
          <p className="mt-2 rounded-xl border border-sky-500/25 bg-sky-500/5 px-3 py-2 text-sm text-sky-800 dark:text-sky-300">
            {t("marketplace.planningForPlan")}
          </p>
        ) : eventId ? (
          <p className="mt-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            {t("marketplace.planningForEvent")}
          </p>
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cn(fieldCls, "pl-10")}
              placeholder={t("marketplace.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
          </div>

          <FormSelect
            value={countryFromUrl || "__all__"}
            onValueChange={(code) =>
              pushParams({
                countryCode: code === "__all__" ? undefined : code || undefined,
                city: undefined,
                page: undefined,
              })
            }
            options={countryOptions}
            placeholder={t("marketplace.chooseCountry")}
            icon={Globe2}
          />

          <FormSelect
            value={cityFromUrl || "__all__"}
            onValueChange={(city) =>
              pushParams({
                city: city === "__all__" ? undefined : city || undefined,
                page: undefined,
              })
            }
            options={cityOptions}
            placeholder={
              !countryFromUrl
                ? t("marketplace.chooseCountryFirst")
                : loadingCities
                  ? t("marketplace.loadingLocations")
                  : t("marketplace.chooseCity")
            }
            disabled={!countryFromUrl || loadingCities || cities.length === 0}
            icon={MapPin}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Users className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              className={cn(fieldCls, "pl-10 tabular-nums")}
              placeholder={t("marketplace.guestsPlaceholder")}
              value={guests}
              onChange={(e) => setGuests(e.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
          </div>

          <FormSelect
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(value) => {
              const [nextBy, nextOrder] = value.split("-") as [
                "createdAt" | "title" | "basePrice",
                "asc" | "desc",
              ];
              pushParams({
                sortBy: nextBy === "createdAt" ? undefined : nextBy,
                sortOrder: nextOrder === "desc" ? undefined : nextOrder,
                page: undefined,
              });
            }}
            options={[
              { value: "createdAt-desc", label: t("marketplace.sortNewest") },
              { value: "title-asc", label: t("marketplace.sortNameAsc") },
              { value: "title-desc", label: t("marketplace.sortNameDesc") },
              { value: "basePrice-asc", label: t("marketplace.sortPriceAsc") },
            ]}
            placeholder={t("marketplace.sortNewest")}
          />

          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("marketplace.applyFilters")}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => pushParams({ categoryId: undefined, page: undefined })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              !categoryId
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {t("marketplace.allCategories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                pushParams({
                  categoryId: cat.id === categoryId ? undefined : cat.id,
                  page: undefined,
                })
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                categoryId === cat.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {loading ? t("marketplace.loading") : t("marketplace.resultsHint")}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("marketplace.loading")}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <Store className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-foreground">{t("marketplace.empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("marketplace.emptyDesc")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <MarketplaceServiceCard
              key={service.id}
              service={service}
              eventId={eventId || undefined}
              calendarItemId={calendarItemId || undefined}
              replaceLineId={replaceLineId || undefined}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => pushParams({ page: String(page - 1) })}
            className="h-9 rounded-xl border border-border px-3 text-sm disabled:opacity-40"
          >
            {t("marketplace.prev")}
          </button>
          <span className="text-sm text-muted-foreground">
            {t("marketplace.pageOf", { page, total: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => pushParams({ page: String(page + 1) })}
            className="h-9 rounded-xl border border-border px-3 text-sm disabled:opacity-40"
          >
            {t("marketplace.next")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
