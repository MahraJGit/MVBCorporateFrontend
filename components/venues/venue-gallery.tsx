"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getMediaProxyUrl } from "@/features/venues/media-url";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function VenueGallery({
  images,
  venueName,
}: {
  images: string[];
  venueName: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  if (!images.length) return null;

  const urls = images.map((src) => getMediaProxyUrl(src));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("venues.gallery")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("venues.photosCount", { count: urls.length })}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {urls.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "relative h-28 w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-36 sm:w-52",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={t("venues.galleryImageAlt", { index: i + 1, name: venueName })}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {active != null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setActive(null)}
            aria-label={t("venues.closeGallery")}
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[active]}
            alt={venueName}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
