import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Icon-only mark (`venue-logo.svg`). */
const MARK_SIZE = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

/** Full wordmark with “MyVenueBooking” text (`logo-venue.svg`). */
const WORDMARK_SIZE = {
  sm: "h-6 w-auto",
  md: "h-8 w-auto",
  lg: "h-9 w-auto",
} as const;

type VenueBrandLogoProps = {
  className?: string;
  size?: keyof typeof MARK_SIZE;
  /** `mark` = icon only; `wordmark` = logo + MyVenueBooking text. */
  variant?: "mark" | "wordmark";
  /** When set, wraps the logo in a link (e.g. dashboard home). */
  href?: string;
  priority?: boolean;
};

export function VenueBrandLogo({
  className,
  size = "md",
  variant = "mark",
  href,
  priority = false,
}: VenueBrandLogoProps) {
  const isWordmark = variant === "wordmark";
  const img = (
    <Image
      src={isWordmark ? "/logo-venue.svg" : "/venue-logo.svg"}
      alt="MyVenueBooking"
      width={isWordmark ? 162 : 32}
      height={isWordmark ? 32 : 32}
      priority={priority}
      className={cn(
        "shrink-0 object-contain object-left",
        isWordmark ? WORDMARK_SIZE[size] : MARK_SIZE[size],
        className,
      )}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {img}
      </Link>
    );
  }

  return img;
}
