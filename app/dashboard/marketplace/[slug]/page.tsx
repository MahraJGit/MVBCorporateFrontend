"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MarketplaceDetailPage from "./page-inner";
import { t } from "@/lib/i18n";

export default function MarketplaceDetailRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("marketplace.loading")}
        </div>
      }
    >
      <MarketplaceDetailPage />
    </Suspense>
  );
}
