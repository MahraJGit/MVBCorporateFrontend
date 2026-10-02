import { VenueBrandLogo } from "@/components/venue-brand-logo";
import { cn } from "@/lib/utils";

export function AuthBrandHeader({ className }: { className?: string }) {
  return (
    <div className={cn("mb-8 flex flex-col items-center gap-1.5", className)}>
      <VenueBrandLogo variant="wordmark" size="lg" priority />
    </div>
  );
}
