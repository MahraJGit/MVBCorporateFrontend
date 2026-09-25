"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, Users } from "lucide-react";
import { MarketplaceEstimatePanel } from "@/components/marketplace/marketplace-estimate-panel";
import { MarketplaceReviewsSection } from "@/components/marketplace/marketplace-reviews-section";
import { useCurrency } from "@/features/currency/currency-context";
import { useLocale } from "@/features/i18n/locale-context";
import { getPublicMarketplaceServiceBySlug } from "@/features/marketplace/api";
import type { PublicMarketplaceService } from "@/features/marketplace/types";
import {
  activeAddOns,
  activePackages,
  getServiceFromPrice,
  serviceCoverSrc,
  servicePricingModelLabel,
} from "@/features/marketplace/utils";
import { toastApiError } from "@/lib/api/errors";

export default function MarketplaceDetailPage() {
  const { t } = useLocale();
  const { formatDisplayPrice } = useCurrency();
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId")?.trim() ?? "";
  const calendarItemId = searchParams.get("calendarItemId")?.trim() ?? "";
  const replaceLineId = searchParams.get("replaceLineId")?.trim() ?? "";
  const slug = params.slug;

  const [service, setService] = useState<PublicMarketplaceService | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void getPublicMarketplaceServiceBySlug(slug)
      .then(setService)
      .catch((err) => {
        setService(null);
        toastApiError(err, t("marketplace.detailLoadError"));
      })
      .finally(() => setLoading(false));
  }, [slug, t]);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("marketplace.loading")}
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="font-medium">{t("marketplace.notFound")}</p>
        <Link href="/dashboard/marketplace" className="mt-4 inline-block text-sm text-primary">
          {t("marketplace.backToMarketplace")}
        </Link>
      </div>
    );
  }

  const price = getServiceFromPrice(service);
  const packages = activePackages(service);
  const addOns = activeAddOns(service);
  const location =
    [service.baseCity, service.countryCode].filter(Boolean).join(", ") ||
    (service.citiesServed?.length ? service.citiesServed.slice(0, 3).join(", ") : null);
  const backQs = new URLSearchParams();
  if (calendarItemId) backQs.set("calendarItemId", calendarItemId);
  else if (eventId) backQs.set("eventId", eventId);
  const backHref = backQs.size
    ? `/dashboard/marketplace?${backQs.toString()}`
    : "/dashboard/marketplace";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("marketplace.backToMarketplace")}
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={serviceCoverSrc(service)}
              alt={service.title}
              className="aspect-[16/9] w-full object-cover"
            />
            <div className="p-5 sm:p-6">
              <h1 className="text-2xl font-bold">{service.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {service.category?.name ? `${service.category.name} · ` : ""}
                {servicePricingModelLabel(service.pricingModel)}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    {location}
                  </span>
                ) : null}
                {service.guestMin || service.guestMax ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    {t("marketplace.guestsRange", {
                      min: service.guestMin ?? "?",
                      max: service.guestMax ?? "?",
                    })}
                  </span>
                ) : null}
              </div>

              {service.description ? (
                <section className="mt-6">
                  <h2 className="mb-2 text-sm font-semibold">{t("marketplace.about")}</h2>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </section>
              ) : null}

              {packages.length > 0 ? (
                <section className="mt-6">
                  <h2 className="mb-2 text-sm font-semibold">{t("marketplace.packages")}</h2>
                  <ul className="space-y-2">
                    {packages.map((pkg) => (
                      <li
                        key={pkg.id}
                        className="rounded-xl border border-border px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-medium">{pkg.name}</span>
                          <span className="shrink-0 font-semibold text-primary">
                            {formatDisplayPrice(Number(pkg.price) || 0, service.currency)}
                            {service.pricingModel === "PER_GUEST" ? (
                              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                {t("marketplace.perGuest")}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {pkg.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">{pkg.description}</p>
                        ) : null}
                        {(pkg.menuRules?.length ?? 0) > 0 ? (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {pkg.menuRules!.map((rule) => (
                              <li
                                key={`${pkg.id}-${rule.course}-${rule.chooseCount}`}
                                className="rounded-full bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {t("marketplace.courseRule", {
                                  count: rule.chooseCount,
                                  course: rule.course,
                                })}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {addOns.length > 0 ? (
                <section className="mt-6">
                  <h2 className="mb-2 text-sm font-semibold">{t("marketplace.addOns")}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {addOns.map((addOn) => (
                      <li
                        key={addOn.id}
                        className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-sm"
                      >
                        {addOn.name}
                        <span className="ml-2 text-primary">
                          {formatDisplayPrice(Number(addOn.price) || 0, service.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {service.vendor?.vendorName ? (
                <section className="mt-6 rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">{t("marketplace.hostedBy")}</p>
                  <p className="mt-0.5 font-semibold">{service.vendor.vendorName}</p>
                </section>
              ) : null}
            </div>
          </div>

          <MarketplaceReviewsSection serviceId={service.id} />
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            {price.amount != null ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t("marketplace.fromLabel")}
                </p>
                <p className="mt-0.5 text-lg font-bold text-primary">
                  {formatDisplayPrice(price.amount, price.currency)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {servicePricingModelLabel(service.pricingModel)}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {t("marketplace.priceOnRequest")}
              </p>
            )}

            <MarketplaceEstimatePanel
              service={service}
              eventId={eventId || undefined}
              calendarItemId={calendarItemId || undefined}
              replaceLineId={replaceLineId || undefined}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
