/**
 * Review data.
 *
 * The platform exposes reviews PER PRODUCT only —
 * `GET /api/storefront/products/{id}/reviews` → `{items, stats:{average, count,
 * distribution}}`. There is no store-wide review feed, which shapes what a
 * homepage review section can honestly do:
 *
 *   - on a PDP, read the product in context (one request, exact data);
 *   - on the homepage, sample a BOUNDED set of products and merge. The
 *     aggregate is then "across these N products", not "across the store", and
 *     the section labels it that way rather than implying a store-wide score it
 *     cannot compute.
 *
 * The proxy is null-safe by design (any miss returns an empty list), so nothing
 * here needs to defend against a failed fetch beyond ignoring it.
 */

import { useEffect, useState } from "react";

export interface Review {
  id: string;
  rating: number;
  title?: string;
  body?: string;
  author?: string;
  created_at?: string;
  verified?: boolean;
  productId: string;
  productName?: string;
  productSlug?: string;
}

export interface ReviewStats {
  average: number;
  count: number;
}

interface Fetched {
  reviews: Review[];
  stats: ReviewStats;
  loading: boolean;
}

function normalise(raw: unknown, productId: string): Review[] {
  const items = Array.isArray(raw) ? raw : [];
  return items
    .map((r, i) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        id: String(o.id ?? `${productId}-${i}`),
        rating: Number(o.rating ?? 0),
        title: typeof o.title === "string" ? o.title : undefined,
        body: typeof o.body === "string" ? o.body : undefined,
        author: typeof o.author_name === "string" ? o.author_name
          : typeof o.author === "string" ? o.author
          : undefined,
        created_at: typeof o.created_at === "string" ? o.created_at : undefined,
        verified: Boolean(o.is_verified ?? o.verified),
        productId,
      };
    })
    .filter((r) => r.rating > 0);
}

async function fetchOne(productId: string): Promise<{ reviews: Review[]; stats: ReviewStats }> {
  try {
    const res = await fetch(
      `/api/storefront/products/${encodeURIComponent(productId)}/reviews?limit=20`,
      { credentials: "include" },
    );
    if (!res.ok) return { reviews: [], stats: { average: 0, count: 0 } };
    const json = await res.json();
    const data = json?.data ?? json ?? {};
    return {
      reviews: normalise(data.items, productId),
      stats: {
        average: Number(data.stats?.average ?? 0),
        count: Number(data.stats?.count ?? 0),
      },
    };
  } catch {
    return { reviews: [], stats: { average: 0, count: 0 } };
  }
}

/**
 * Reviews for a set of products, merged.
 *
 * Pass one id on a PDP; pass a bounded sample on the homepage. `ids` is joined
 * into the dependency key so a changing array identity doesn't re-fetch on
 * every render — a mistake that turns a 6-product sample into a request storm.
 */
export function useProductReviews(ids: string[], enabled = true): Fetched {
  const [state, setState] = useState<Fetched>({
    reviews: [],
    stats: { average: 0, count: 0 },
    loading: true,
  });
  const key = ids.join(",");

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setState({ reviews: [], stats: { average: 0, count: 0 }, loading: false });
      return;
    }
    let cancelled = false;
    Promise.all(ids.map(fetchOne)).then((results) => {
      if (cancelled) return;
      const reviews = results.flatMap((r) => r.reviews);
      // Weighted mean, not a mean of means — averaging averages over-weights a
      // product with two reviews against one with two hundred.
      const totalCount = results.reduce((n, r) => n + r.stats.count, 0);
      const weighted = results.reduce((n, r) => n + r.stats.average * r.stats.count, 0);
      setState({
        reviews,
        stats: {
          average: totalCount > 0 ? weighted / totalCount : 0,
          count: totalCount,
        },
        loading: false,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return state;
}

/** Rounded to halves, the granularity a star row can actually show. */
export function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}
