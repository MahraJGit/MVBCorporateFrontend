"use client";

import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { useCurrency } from "@/features/currency/currency-context";
import { useLocale } from "@/features/i18n/locale-context";
import type { PublicVenue } from "@/features/venues/types";
import { getVenueDisplayPrice, venueCoverSrc } from "@/features/venues/utils";

export function VenueCard({
  venue,
  eventId,
  calendarItemId,
  replaceLineId,
}: {
  venue: PublicVenue;
  eventId?: string;
  calendarItemId?: string;
  replaceLineId?: string;
}) {
  const { t } = useLocale();
  const { formatDisplayPrice } = useCurrency();
  const priceInfo = getVenueDisplayPrice(venue);
  const location = [venue.city, venue.address].filter(Boolean).join(" · ") || "—";
  const capacity =
    venue.capacityMin || venue.capacityMax
      ? t("venues.guestsRange", {
          min: venue.capacityMin ?? "?",
          max: venue.capacityMax ?? "?",
        })
      : null;
  const qs = new URLSearchParams();
  if (calendarItemId) qs.set("calendarItemId", calendarItemId);
  else if (eventId) qs.set("eventId", eventId);
  if (replaceLineId) qs.set("replaceLineId", replaceLineId);
  const href = qs.size
    ? `/dashboard/venues/${venue.id}?${qs.toString()}`
    : `/dashboard/venues/${venue.id}`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={venueCoverSrc(venue)}
          alt={venue.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {venue.venueType?.name ? (
          <span className="absolute left-3 top-3 rounded-full border border-border/60 bg-background/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground backdrop-blur">
            {venue.venueType.name}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-foreground">{venue.name}</h3>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-2">{location}</span>
        </p>
        {capacity ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {capacity}
          </p>
        ) : null}
        <p className="mt-auto pt-2 text-sm font-semibold text-primary">
          {priceInfo
            ? `${formatDisplayPrice(priceInfo.price, priceInfo.currency)} ${priceInfo.label}`
            : t("venues.pricingOnRequest")}
        </p>
      </div>
    </Link>
  );
}
