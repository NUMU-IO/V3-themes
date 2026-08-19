/**
 * Product review aggregate.
 *
 * D7 says the theme never fabricates a rating, and that holds — but D7 is about
 * the STORE-WIDE strip, where no aggregate endpoint exists. Per-product is a
 * different matter: `/api/storefront/products/{id}/reviews` is a real host route
 * that proxies the backend's approved-reviews endpoint and answers
 * `{ items, stats: { average, count, distribution } }`.
 *
 * So the PDP's star row is REAL. And when `count` is 0 the row does not render
 * at all — an empty five-star rating on a product nobody has reviewed is a
 * claim, not a placeholder.
 *
 * The route is null-safe by design (any upstream miss returns the empty
 * aggregate rather than an error), so a failure here degrades to "no rating
 * shown", never to a broken PDP.
 */

import { useEffect, useState } from "react";

export interface ReviewSummary {
  average: number;
  count: number;
}

const cache = new Map<string, ReviewSummary>();

export function useReviewSummary(productId: string | undefined): ReviewSummary | null {
  const [summary, setSummary] = useState<ReviewSummary | null>(
    productId ? (cache.get(productId) ?? null) : null,
  );

  useEffect(() => {
    if (!productId || cache.has(productId)) return;
    let alive = true;
    // limit=1 — only the aggregate is wanted here; the list would be a wasted
    // payload on every PDP view.
    fetch(`/api/storefront/products/${encodeURIComponent(productId)}/reviews?limit=1`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        const stats = (json?.stats ?? json?.data?.stats ?? {}) as Record<string, unknown>;
        const average = Number(stats.average ?? 0);
        const count = Number(stats.count ?? 0);
        const value: ReviewSummary = {
          average: Number.isFinite(average) ? average : 0,
          count: Number.isFinite(count) ? count : 0,
        };
        cache.set(productId, value);
        setSummary(value);
      })
      .catch(() => {
        // Cache the miss so a failing endpoint is not retried on every mount.
        const empty = { average: 0, count: 0 };
        cache.set(productId, empty);
        if (alive) setSummary(empty);
      });
    return () => {
      alive = false;
    };
  }, [productId]);

  return summary;
}
