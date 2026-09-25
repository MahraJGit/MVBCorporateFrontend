"use client";

import Link from "next/link";
import { useCurrency } from "@/features/currency/currency-context";
import { useLocale } from "@/features/i18n/locale-context";
import type { PublicMarketplaceService } from "@/features/marketplace/types";
import {
  getServiceFromPrice,
  serviceCoverSrc,
  servicePricingModelLabel,
} from "@/features/marketplace/utils";

type Props = {
  service: PublicMarketplaceService;
  eventId?: string;
  calendarItemId?: string;
  replaceLineId?: string;
};

export function MarketplaceServiceCard({
  service,
  eventId,
  calendarItemId,
  replaceLineId,
}: Props) {
  const { t } = useLocale();
  const { formatDisplayPrice } = useCurrency();
  const price = getServiceFromPrice(service);
  const location =
    service.baseCity ||
    (service.citiesServed?.length ? service.citiesServed.slice(0, 2).join(", ") : null);
  const qs = new URLSearchParams();
  if (calendarItemId) qs.set("calendarItemId", calendarItemId);
  else if (eventId) qs.set("eventId", eventId);
  if (replaceLineId) qs.set("replaceLineId", replaceLineId);
  const href = qs.size
    ? `/dashboard/marketplace/${encodeURIComponent(service.slug)}?${qs.toString()}`
    : `/dashboard/marketplace/${encodeURIComponent(service.slug)}`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={serviceCoverSrc(service)}
          alt={service.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {service.category?.name ? (
          <span className="absolute left-3 top-3 rounded-full border border-border/60 bg-background/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground backdrop-blur">
            {service.category.name}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-base font-semibold">{service.title}</h3>
        <p className="text-xs text-muted-foreground">
          {service.vendor?.vendorName || t("marketplace.vendorFallback")}
          {location ? ` · ${location}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {servicePricingModelLabel(service.pricingModel)}
        </p>
        <p className="mt-auto pt-2 text-sm font-semibold text-primary">
          {price.amount != null
            ? `${t("marketplace.fromLabel")} ${formatDisplayPrice(price.amount, price.currency)}`
            : t("marketplace.priceOnRequest")}
        </p>
      </div>
    </Link>
  );
}
