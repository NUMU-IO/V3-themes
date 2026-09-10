/**
 * Store data the SDK does not surface yet.
 *
 * Two things this theme needs are already served by the storefront and have no
 * SDK hook: a product's real reviews, and the merchant's actual payment
 * methods. Both have a public proxy route, so the theme reads them itself
 * through `useCachedResource` (SWR-style dedupe + cross-instance sync) rather
 * than waiting on an SDK release that would have to ship to all sixteen themes.
 *
 * When the SDK grows `useReviews` / `useCheckoutConfig`, delete this file and
 * swap the imports — the shapes below are deliberately the ones those hooks
 * would return.
 *
 * Both fetches are null-safe by design: the proxies return an empty payload on
 * any upstream miss, and every consumer here degrades to "no reviews" or "the
 * default payment options" rather than throwing. A storefront must not go down
 * because a review count did not load.
 */

import { useCachedResource } from "@numueg/theme-sdk";

export interface ReviewItem {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  author_name?: string | null;
  created_at?: string | null;
}

export interface ReviewStats {
  average: number;
  count: number;
  /** rating (1-5) → how many reviews gave it. */
  distribution: Record<string, number>;
}

export interface ReviewsPayload {
  items: ReviewItem[];
  stats: ReviewStats;
}

const EMPTY_REVIEWS: ReviewsPayload = {
  items: [],
  stats: { average: 0, count: 0, distribution: {} },
};

/**
 * The API wraps every response as `{ data: … }`, and the storefront proxy
 * passes the body through verbatim — so a caller has to survive both the
 * wrapped and the bare shape.
 */
function unwrap<T>(body: unknown, fallback: T): T {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  const inner = record.data;
  if (inner && typeof inner === "object") return inner as T;
  return record as T;
}

/** Approved reviews plus the aggregate the PDP's star line needs. */
export function useProductReviews(productId: string | null | undefined, limit = 20) {
  const { data, isLoading } = useCachedResource<ReviewsPayload>(
    productId ? `pw:reviews:${productId}:${limit}` : null,
    async (signal) => {
      const res = await fetch(
        `/api/storefront/products/${encodeURIComponent(String(productId))}/reviews?limit=${limit}`,
        { signal },
      );
      if (!res.ok) return EMPTY_REVIEWS;
      return unwrap<ReviewsPayload>(await res.json(), EMPTY_REVIEWS);
    },
    { initialData: EMPTY_REVIEWS },
  );

  const payload = data ?? EMPTY_REVIEWS;
  return {
    reviews: payload.items ?? [],
    stats: payload.stats ?? EMPTY_REVIEWS.stats,
    loading: isLoading,
  };
}

export interface PaymentMethod {
  code: string;
  label: string;
  description?: string | null;
}

export interface CheckoutConfig {
  payment_methods: PaymentMethod[];
  enabled_payment_methods: string[];
  currency?: string | null;
  saved_cards_enabled?: boolean;
}

const EMPTY_CONFIG: CheckoutConfig = { payment_methods: [], enabled_payment_methods: [] };

/** Human labels for the older `enabled_payment_methods: string[]` shape. */
const METHOD_LABELS: Record<string, string> = {
  cod: "Cash on delivery",
  card: "Pay by card",
  paymob: "Pay by card",
  kashier: "Pay by card",
  fawry: "Fawry",
  fawaterak: "Fawaterak",
  instapay: "InstaPay",
  vodafone_cash: "Vodafone Cash",
  bank_transfer: "Bank transfer",
};

/**
 * The merchant's real payment options.
 *
 * The backend contract is mid-migration: older deployments return
 * `enabled_payment_methods: string[]`, newer ones add
 * `payment_methods: [{code,label}]`. The proxy passes both through
 * unchanged, so this normalises to one list and the checkout renders whatever
 * the store actually has switched on instead of a hardcoded pair.
 */
export function useCheckoutConfig() {
  const { data, isLoading } = useCachedResource<CheckoutConfig>(
    "pw:checkout-config",
    async (signal) => {
      const res = await fetch("/api/storefront/checkout-config", { signal });
      if (!res.ok) return EMPTY_CONFIG;
      return unwrap<CheckoutConfig>(await res.json(), EMPTY_CONFIG);
    },
    { initialData: EMPTY_CONFIG },
  );

  const config = data ?? EMPTY_CONFIG;
  const rich = config.payment_methods ?? [];
  const methods: PaymentMethod[] =
    rich.length > 0
      ? rich
      : (config.enabled_payment_methods ?? []).map((code) => ({
          code,
          label: METHOD_LABELS[code] ?? code,
        }));

  return { methods, currency: config.currency ?? null, loading: isLoading };
}
