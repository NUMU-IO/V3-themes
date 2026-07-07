"use client";
/**
 * _recently-viewed — tiny localStorage trail of visited PDPs (A8).
 *
 * Zero merchant setup, zero backend: each PDP visit records a slim snapshot
 * (id/slug/name/image/price/currency) under one key, newest first, capped at
 * 8. The PDP renders the trail (minus the product being viewed) as a
 * "Recently viewed" rail — recovering cross-item interest for shoppers who
 * bounce between products deciding.
 *
 * localStorage is guarded everywhere: privacy modes that throw must never
 * break the PDP.
 */
import { useEffect, useState } from "react";
import type { Product } from "@numueg/theme-sdk";
import { productCurrency, productImage } from "./_shared";

const KEY = "vn-recently-viewed";
const MAX = 8;

export interface RecentlyViewedEntry {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  price: number;
  currency?: string;
}

function read(): RecentlyViewedEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Record a PDP visit (call from an effect). Newest first, deduped, capped. */
export function recordRecentlyViewed(product: Product): void {
  try {
    const entry: RecentlyViewedEntry = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: productImage(product),
      price: product.variants?.[0]?.price ?? product.price ?? 0,
      currency: productCurrency(product) ?? product.currency,
    };
    const list = [entry, ...read().filter((e) => e.id !== product.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — skip silently */
  }
}

/** The trail, excluding one id (the product being viewed). Empty until mount. */
export function useRecentlyViewed(excludeId: string | undefined): RecentlyViewedEntry[] {
  const [items, setItems] = useState<RecentlyViewedEntry[]>([]);
  useEffect(() => {
    setItems(read().filter((e) => e.id !== excludeId));
  }, [excludeId]);
  return items;
}
