/**
 * "Load more" and the real book count for the shelf.
 *
 * The host server-renders the first slice of a listing. Everything past it
 * comes from the storefront's `/api/products`, which forwards `page`,
 * `category_id` and `limit` (clamped to 100) to the platform and returns the
 * platform's `total`.
 *
 * Two things the shelf used to get wrong, both fixed here:
 * - "Show more" asked for one ever-longer list with no `category_id`, so on a
 *   collection page it appended books from OTHER collections, and the 100 cap
 *   meant nothing past book 100 could ever be reached. It now asks for the
 *   next page of the same collection.
 * - The count beside the sort read the number of books LOADED (the "How many
 *   books to load" setting), so every big collection said "48 books". It now
 *   reads the collection's own `product_count`, or the shop's `total` on the
 *   all-books page.
 *
 * ⚠ These products come from the raw platform route, not from the SDK, so
 * their money arrives as MAJOR-unit STRINGS and stock hides in `is_in_stock`.
 * They are normalised to the shape the rest of the theme already trusts.
 */

import { useCallback, useEffect, useState } from "react";
import { useShop, type Product } from "@numueg/theme-sdk";
import { asArray, asNumber, asRecord, asString } from "./shared";

export function normalizeListingProduct(entry: unknown): Product {
  const raw = asRecord(entry);
  const price = asNumber(raw.price, Number(asString(raw.price)) || 0);
  const compareAt = raw.compare_at_price;
  return {
    ...raw,
    id: asString(raw.id),
    name: asString(raw.name),
    slug: asString(raw.slug),
    price,
    compare_at_price: compareAt == null ? undefined : Number(asString(compareAt)) || asNumber(compareAt, 0),
    currency: asString(raw.currency) || asString(raw.price_currency),
    in_stock: (raw.in_stock ?? raw.is_in_stock) !== false,
  } as unknown as Product;
}

function listingUrl(storeId: string, limit: number, page: number, categoryId?: string): string {
  const qs = new URLSearchParams({ store_id: storeId, limit: String(limit) });
  if (page > 1) qs.set("page", String(page));
  if (categoryId) qs.set("category_id", categoryId);
  return `/api/products?${qs.toString()}`;
}

/** `{ items, total }` out of the `{ success, data: { items, total } }` envelope. */
function readListing(json: unknown): { items: Product[]; total: number } {
  const body = asRecord(json);
  const inner = asRecord(body.data ?? body);
  return {
    items: asArray(inner.items ?? body.data ?? json).map(normalizeListingProduct),
    total: asNumber(inner.total, 0),
  };
}

export interface MoreProducts {
  products: Product[];
  loading: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
}

export function useMoreProducts(seed: Product[], pageSize: number, categoryId?: string): MoreProducts {
  const shop = useShop();
  const [extra, setExtra] = useState<Product[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // A short first page IS the whole listing, so the button never appears on a
  // shelf of twelve books — only where there is plainly more behind it.
  const full = seed.length >= pageSize;

  const loadMore = useCallback(() => {
    const storeId = String(shop?.id ?? "");
    if (!storeId || loading || done || seed.length === 0) return;
    setLoading(true);
    void fetch(listingUrl(storeId, pageSize, nextPage, categoryId))
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const { items } = readListing(json);
        const seen = new Set([...seed, ...extra].map((p) => String(p.id)));
        const fresh = items.filter((p) => p.id && !seen.has(String(p.id)));
        setExtra((prev) => [...prev, ...fresh]);
        setNextPage((p) => p + 1);
        // A short page, or nothing new: the listing is exhausted.
        setDone(items.length < pageSize || fresh.length === 0);
      })
      .catch(() => setDone(true))
      .finally(() => setLoading(false));
  }, [shop?.id, loading, done, seed, extra, pageSize, nextPage, categoryId]);

  return {
    products: extra.length > 0 ? [...seed, ...extra] : seed,
    loading,
    canLoadMore: full && !done,
    loadMore,
  };
}

/**
 * How many books the listing really holds.
 *
 * `known` is the collection's `product_count` from the page data (correct on
 * the server render). Without one — the all-books page — the shop's total is
 * asked for once with a one-item request, and only when the first page came
 * back full; a short first page already is the whole count.
 */
export function useListingTotal(known: number, loaded: number, pageSize: number, enabled: boolean): number {
  const shop = useShop();
  const [fetched, setFetched] = useState(0);
  const storeId = String(shop?.id ?? "");
  const shouldFetch = enabled && known <= 0 && loaded >= pageSize && Boolean(storeId);

  useEffect(() => {
    if (!shouldFetch) return;
    let live = true;
    void fetch(listingUrl(storeId, 1, 1))
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (live) setFetched(readListing(json).total);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [shouldFetch, storeId]);

  return Math.max(known > 0 ? known : fetched, loaded);
}
