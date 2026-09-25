"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Loader2,
  MapPin,
  Maximize2,
  Sparkles,
  Users,
} from "lucide-react";
import { VenueEstimatePanel } from "@/components/venues/venue-estimate-panel";
import { VenueGallery } from "@/components/venues/venue-gallery";
import { VenueReviewsSection } from "@/components/venues/venue-reviews-section";
import { useCurrency } from "@/features/currency/currency-context";
import { useLocale } from "@/features/i18n/locale-context";
import { getPublicVenue } from "@/features/venues/api";
import type { PublicVenue } from "@/features/venues/types";
import {
  decimalToNumber,
  getVenueAmenityPriceInfo,
  getVenueDisplayPrice,
  isPropertyStyleVenueType,
  parseVenuePropertyAttributes,
  pricingModelLabel,
  venueCoverSrc,
} from "@/features/venues/utils";
import { toastApiError } from "@/lib/api/errors";

export default function VenueDetailPage() {
  const { t } = useLocale();
  const { formatDisplayPrice } = useCurrency();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId")?.trim() ?? "";
  const calendarItemId = searchParams.get("calendarItemId")?.trim() ?? "";
  const replaceLineId = searchParams.get("replaceLineId")?.trim() ?? "";
  const id = params.id;

  const [venue, setVenue] = useState<PublicVenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    void getPublicVenue(id)
      .then(setVenue)
      .catch((err) => {
        setError(true);
        toastApiError(err, t("venues.detailLoadError"));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const priceInfo = useMemo(
    () => (venue ? getVenueDisplayPrice(venue) : null),
    [venue],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("venues.loading")}
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
        <h1 className="text-xl font-bold">{t("venues.notFound")}</h1>
        <p className="text-sm text-muted-foreground">{t("venues.notFoundDesc")}</p>
        <Link
          href="/dashboard/venues"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("venues.backToVenues")}
        </Link>
      </div>
    );
  }

  const coverUrl = venueCoverSrc(venue);
  const galleryImages = venue.gallery?.length ? venue.gallery : [];
  const currency = venue.pricing?.currency ?? "AED";
  const fullAddress = [venue.address, venue.city].filter(Boolean).join(", ");
  const lat = Number(venue.latitude);
  const lng = Number(venue.longitude);
  const hasCoords =
    !Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0);
  const mapEmbedUrl = hasCoords
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    : null;
  const isProperty = isPropertyStyleVenueType(
    venue.venueType?.name,
    venue.venueType?.slug,
  );
  const propertyAttrs = parseVenuePropertyAttributes(venue.customAttributes);
  const hasPropertyDetails =
    isProperty &&
    (propertyAttrs.floorArea || propertyAttrs.bedrooms || propertyAttrs.bathrooms);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/dashboard/venues"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("venues.backToVenues")}
      </Link>

      <section className="relative overflow-hidden rounded-2xl border border-border">
        <div className="relative h-[240px] sm:h-[320px] md:h-[380px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={venue.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-8">
            {venue.venueType?.name ? (
              <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur">
                {venue.venueType.name}
              </span>
            ) : null}
            <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              {venue.name}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85">
              {fullAddress ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {fullAddress}
                </span>
              ) : null}
              {venue.capacityMin || venue.capacityMax ? (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  {t("venues.guestsRange", {
                    min: venue.capacityMin ?? "?",
                    max: venue.capacityMax ?? "?",
                  })}
                </span>
              ) : null}
              {priceInfo ? (
                <span className="font-semibold text-primary">
                  {formatDisplayPrice(priceInfo.price, priceInfo.currency)} {priceInfo.label}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {galleryImages.length > 0 ? (
        <VenueGallery images={galleryImages} venueName={venue.name} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("venues.about")}
            </h2>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {venue.description?.trim() || t("venues.noDescription")}
              </p>
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {venue.pricing && priceInfo ? (
              <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("venues.pricing")}</p>
                  <p className="font-semibold">
                    {pricingModelLabel(venue.pricing.modelType)}
                  </p>
                  <p className="text-sm text-primary">
                    {formatDisplayPrice(priceInfo.price, priceInfo.currency)} {priceInfo.label}
                  </p>
                  {venue.pricing.taxRate ? (
                    <p className="text-xs text-muted-foreground">
                      {t("venues.taxPercent", {
                        rate: decimalToNumber(venue.pricing.taxRate),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {venue.capacityMin || venue.capacityMax ? (
              <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("venues.capacity")}</p>
                  <p className="font-semibold">
                    {t("venues.guestsRange", {
                      min: venue.capacityMin ?? "?",
                      max: venue.capacityMax ?? "?",
                    })}
                  </p>
                </div>
              </div>
            ) : null}

            {fullAddress ? (
              <div className="flex gap-3 rounded-2xl border border-border bg-card p-4 sm:col-span-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("venues.location")}</p>
                  <p className="font-semibold">{fullAddress}</p>
                </div>
              </div>
            ) : null}
          </div>

          {hasPropertyDetails ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t("venues.propertyDetails")}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {propertyAttrs.floorArea != null ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <Maximize2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("venues.floorArea")}</p>
                      <p className="font-semibold">{propertyAttrs.floorArea} m²</p>
                    </div>
                  </div>
                ) : null}
                {propertyAttrs.bedrooms != null ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <BedDouble className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("venues.bedrooms")}</p>
                      <p className="font-semibold">{propertyAttrs.bedrooms}</p>
                    </div>
                  </div>
                ) : null}
                {propertyAttrs.bathrooms != null ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                    <Bath className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t("venues.bathrooms")}</p>
                      <p className="font-semibold">{propertyAttrs.bathrooms}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {(venue.amenities?.length ?? 0) > 0 ? (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("venues.amenities")}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {venue.amenities!.map((a) => {
                  const amenityPrice = getVenueAmenityPriceInfo(a);
                  return (
                    <li
                      key={a.id}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground"
                    >
                      {a.catalog?.name ?? t("venues.amenity")}
                      {amenityPrice ? (
                        <span className="ml-2 text-primary">
                          {formatDisplayPrice(amenityPrice.amount, currency)}{" "}
                          <span className="text-muted-foreground">{amenityPrice.suffix}</span>
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-primary">{t("venues.included")}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {venue.vendor?.businessName ? (
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">{t("venues.hostedBy")}</p>
              <p className="mt-1 font-semibold">{venue.vendor.businessName}</p>
            </section>
          ) : null}

          <VenueReviewsSection venueId={venue.id} />

          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("venues.location")}</h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {mapEmbedUrl ? (
                <iframe
                  src={mapEmbedUrl}
                  className="h-[240px] w-full border-0 sm:h-[280px]"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${venue.name} location`}
                />
              ) : (
                <div className="flex min-h-[200px] items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  {t("venues.mapNotAvailable")}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-4 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            {priceInfo ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t("venues.fromLabel")}
                </p>
                <p className="mt-0.5 text-lg font-bold text-primary">
                  {formatDisplayPrice(priceInfo.price, priceInfo.currency)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {priceInfo.label}
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {t("venues.pricingOnRequest")}
              </p>
            )}

            <VenueEstimatePanel
              venue={venue}
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
