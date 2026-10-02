"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Building2, Loader2 } from "lucide-react";
import { getCorporatePresignedViewUrl } from "@/features/organization/api";
import { cn } from "@/lib/utils";

export function OrganizationLogo({
  logoUrl,
  name,
  className,
  iconClassName,
  imageClassName,
  /** `box` fills a fixed frame; `content` sizes to the image up to max constraints. */
  fit = "box",
}: {
  logoUrl?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
  fit?: "box" | "content";
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(logoUrl));

  useEffect(() => {
    if (!logoUrl?.trim()) {
      setSrc(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void getCorporatePresignedViewUrl(logoUrl)
      .then((viewUrl) => {
        if (!cancelled) setSrc(viewUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const isContent = fit === "content";

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
        isContent && "w-fit",
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin text-muted-foreground", iconClassName)} />
      ) : src ? (
        isContent ? (
          <Image
            src={src}
            alt={`${name} logo`}
            width={200}
            height={80}
            className={cn(
              "h-full w-auto max-w-full object-contain",
              imageClassName,
            )}
            unoptimized
          />
        ) : (
          <Image
            src={src}
            alt={`${name} logo`}
            fill
            className={cn("object-cover", imageClassName)}
            unoptimized
          />
        )
      ) : (
        <Building2 className={cn("text-muted-foreground", iconClassName)} />
      )}
    </div>
  );
}
