/**
 * "Load more" for the shelf.
 *
 * The host server-renders the first slice of a listing and gives the theme no
 * way to ask for the next one: `/api/products` takes a `limit` and nothing
 * else — no page, no offset — even though the platform endpoint behind it
 * paginates. On a shop with a few dozen books that does not matter. On one
 * with a few thousand it means a shopper can see the first 48 and no more,
 * which is the whole catalogue as far as they can tell.
 *
 * So the button asks for a LONGER list and keeps the part it did not already
 * have.
 *
 * ponytail: every press refetches the whole prefix, so the cost grows with the
 * depth a shopper reaches, and it stops at CAP books. Upgrade when
 * `/api/products` forwards `page` — then this becomes one page-sized request
 * and the slice below goes away.
 *
 * ⚠ These products come from the raw platform route, not from the SDK, so
 * their money arrives as MAJOR-unit STRINGS and stock hides in `is_in_stock`.
 * They are normalised to the shape the rest of the theme already trusts.
 */

import { useCallback, useState } from "react";
import { useShop, type Product } from "@numueg/theme-sdk";
import { asArray, asNumber, asRecord, asString } from "./shared";

const CAP = 480;

function normalize(entry: unknown): Product {
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

export interface MoreProducts {
  products: Product[];
  loading: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
}

export function useMoreProducts(seed: Product[], pageSize: number): MoreProducts {
  const shop = useShop();
  const [extra, setExtra] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const shown = seed.length + extra.length;
  // A short first page IS the whole shop, so the button never appears on a
  // shelf of twelve books — only where there is plainly more behind it.
  const full = seed.length >= pageSize;

  const loadMore = useCallback(() => {
    const storeId = String(shop?.id ?? "");
    if (!storeId || loading || done || shown === 0) return;
    const limit = Math.min(shown + pageSize, CAP);
    setLoading(true);
    void fetch(`/api/products?store_id=${encodeURIComponent(storeId)}&limit=${limit}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const body = asRecord(json);
        const inner = asRecord(body.data ?? body);
        const items = asArray(inner.items ?? body.data ?? json).map(normalize);
        const seen = new Set(seed.map((p) => String(p.id)));
        const tail = items.filter((p) => p.id && !seen.has(String(p.id)));
        setExtra(tail);
        // Nothing new, a short page, or the ceiling reached: the button retires
        // rather than sitting there promising books it cannot fetch.
        setDone(tail.length <= extra.length || items.length < limit || limit >= CAP);
      })
      .catch(() => setDone(true))
      .finally(() => setLoading(false));
  }, [shop?.id, loading, done, shown, pageSize, seed, extra.length]);

  return {
    products: extra.length > 0 ? [...seed, ...extra] : seed,
    loading,
    canLoadMore: full && !done,
    loadMore,
  };
}
