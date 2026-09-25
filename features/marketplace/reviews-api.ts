import { apiGet } from "@/lib/api/client";

export type MarketplaceServiceReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer?: {
    id?: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export type MarketplaceServiceReviewSummary = {
  averageRating: number | null;
  count: number;
};

type SuccessEnvelope<T> = {
  status?: string;
  message?: string;
  data: T;
};

function unwrap<T>(json: SuccessEnvelope<T>): T {
  return json.data;
}

export async function getMarketplaceServiceReviewSummary(serviceId: string) {
  const json = await apiGet<SuccessEnvelope<MarketplaceServiceReviewSummary>>(
    `/api/reviews/marketplace-services/${encodeURIComponent(serviceId)}/summary`,
  );
  return unwrap(json);
}

export async function getMarketplaceServiceReviews(
  serviceId: string,
  page = 1,
  limit = 8,
) {
  const json = await apiGet<
    SuccessEnvelope<{
      data: MarketplaceServiceReview[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>
  >(
    `/api/reviews/marketplace-services/${encodeURIComponent(serviceId)}?page=${page}&limit=${limit}`,
  );
  return unwrap(json);
}
