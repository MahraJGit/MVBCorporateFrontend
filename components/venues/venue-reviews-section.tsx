"use client";

import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import {
  getVenueReviews,
  getVenueReviewSummary,
  type VenueReview,
  type VenueReviewSummary,
} from "@/features/venues/reviews-api";
import { useLocale } from "@/features/i18n/locale-context";
import { cn } from "@/lib/utils";

function reviewerName(review: VenueReview) {
  if (review.reviewer?.name?.trim()) return review.reviewer.name.trim();
  const first = review.reviewer?.firstName?.trim() ?? "";
  const last = review.reviewer?.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Guest";
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

export function VenueReviewsSection({ venueId }: { venueId: string }) {
  const { t } = useLocale();
  const [summary, setSummary] = useState<VenueReviewSummary | null>(null);
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      getVenueReviewSummary(venueId).catch(() => null),
      getVenueReviews(venueId, 1, 8).catch(() => null),
    ])
      .then(([sum, list]) => {
        if (cancelled) return;
        setSummary(sum);
        setReviews(list?.data ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("venues.reviewsLoading")}
      </div>
    );
  }

  const count = summary?.count ?? reviews.length;
  if (!count) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
        {t("venues.noReviews")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("venues.reviews")}</h2>
        <div className="flex items-center gap-2 text-sm">
          {summary?.averageRating != null ? (
            <>
              <Stars rating={summary.averageRating} />
              <span className="font-semibold tabular-nums">
                {summary.averageRating.toFixed(1)}
              </span>
            </>
          ) : null}
          <span className="text-muted-foreground">
            {t("venues.reviewCount", { count })}
          </span>
        </div>
      </div>

      <ul className="space-y-3">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{reviewerName(review)}</p>
              <Stars rating={review.rating} />
            </div>
            {review.comment ? (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                {review.comment}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
