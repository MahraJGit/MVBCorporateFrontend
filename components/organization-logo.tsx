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
}: {
  logoUrl?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
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

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary",
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin text-primary-foreground", iconClassName)} />
      ) : src ? (
        <Image
          src={src}
          alt={`${name} logo`}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <Building2 className={cn("text-primary-foreground", iconClassName)} />
      )}
    </div>
  );
}
