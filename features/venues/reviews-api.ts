import { apiGet } from "@/lib/api/client";

export type VenueReview = {
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

export type VenueReviewSummary = {
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

export async function getVenueReviewSummary(venueId: string) {
  const json = await apiGet<SuccessEnvelope<VenueReviewSummary>>(
    `/api/reviews/venues/${encodeURIComponent(venueId)}/summary`,
  );
  return unwrap(json);
}

export async function getVenueReviews(venueId: string, page = 1, limit = 8) {
  const json = await apiGet<
    SuccessEnvelope<{
      data: VenueReview[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>
  >(
    `/api/reviews/venues/${encodeURIComponent(venueId)}?page=${page}&limit=${limit}`,
  );
  return unwrap(json);
}
