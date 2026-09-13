/**
 * A product's DETAIL payload, fetched on demand and shared.
 *
 * A product does not arrive the same shape everywhere: the server-rendered
 * listing reports `variants: []` and the related-products route omits the key
 * entirely. Only the detail route says whether a book has editions to choose
 * from, and carries its options and full gallery. Quick-add and quick look
 * both resolve through here ON CLICK — a shelf of 48 books costs zero requests
 * until a shopper acts — and share one cache, so a look followed by an add is
 * one request.
 *
 * ⚠ MONEY UNITS. The raw detail route serialises variant money as MAJOR-unit
 * strings ("250.00"), while every product the SDK hands this theme carries
 * variant money in CENTS. The payload is normalised to the SDK shape here,
 * once, so the edition picker has exactly one convention to trust.
 */

import { useEffect, useState } from "react";
import type { Product, ProductVariant } from "@numueg/theme-sdk";
import { asArray, asNumber, asRecord, asString } from "./shared";

const cache = new Map<string, Product>();
const inflight = new Map<string, Promise<Product | null>>();

function toNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : 0;
}

const majorToCents = (value: unknown): number => Math.round(toNumber(value) * 100);

function normalize(raw: Record<string, unknown>): Product {
  const variants = asArray(raw.variants).map((entry, i) => {
    const v = asRecord(entry);
    const tracks = v.track_inventory !== false;
    const stock = asNumber(v.inventory_quantity, 0);
    return {
      ...v,
      id: asString(v.id),
      position: asNumber(v.position, i),
      option_values: asRecord(v.option_values ?? v.options) as Record<string, string>,
      price: majorToCents(v.price),
      compare_at_price: v.compare_at_price == null ? null : majorToCents(v.compare_at_price),
      inventory_quantity: stock,
      is_in_stock: typeof v.is_in_stock === "boolean" ? v.is_in_stock : !tracks || stock > 0,
    } as ProductVariant;
  });

  return {
    ...raw,
    id: asString(raw.id),
    name: asString(raw.name),
    slug: asString(raw.slug),
    price: toNumber(raw.price),
    compare_at_price: raw.compare_at_price == null ? undefined : toNumber(raw.compare_at_price),
    currency: asString(raw.currency) || asString(raw.price_currency),
    in_stock: (raw.in_stock ?? raw.is_in_stock) !== false,
    variants,
  } as unknown as Product;
}

/** Null on any failure, so callers degrade instead of blocking. */
export function fetchProductDetail(productId: string): Promise<Product | null> {
  const hit = cache.get(productId);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(productId);
  if (pending) return pending;

  const task = fetch(`/api/storefront/products/${encodeURIComponent(productId)}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => {
      const body = asRecord(json);
      // Accept both the bare product and the platform `{ data: … }` envelope.
      const inner = body.data && typeof body.data === "object" ? asRecord(body.data) : body;
      if (!asString(inner.id)) return null;
      const product = normalize(inner);
      cache.set(productId, product);
      return product;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(productId);
    });

  inflight.set(productId, task);
  return task;
}

export function useProductDetail(productId: string): { product: Product | null; failed: boolean } {
  const [state, setState] = useState(() => ({
    product: cache.get(productId) ?? null,
    failed: false,
  }));

  useEffect(() => {
    let live = true;
    void fetchProductDetail(productId).then((product) => {
      if (live) setState({ product, failed: !product });
    });
    return () => {
      live = false;
    };
  }, [productId]);

  return state;
}
