/**
 * Recently viewed — a small trail of book pages, kept in the shopper's own
 * browser.
 *
 * Zero merchant setup and zero backend: each book page records a slim snapshot
 * under one key, newest first, capped. The book page renders the trail (minus
 * the book being viewed) as a shelf, which recovers interest from shoppers who
 * bounce between titles deciding.
 *
 * The snapshot is point-in-time, so it deliberately stores no stock or variant
 * data: cards built from it resolve the live detail payload before adding.
 * localStorage is guarded everywhere — private modes that throw must never
 * break the book page, and the server has no window at all.
 */

import { useEffect, useState } from "react";
import type { Product } from "@numueg/theme-sdk";
import { productImages } from "./shared";

const KEY = "pw-recently-viewed";
const MAX = 8;

export interface RecentEntry {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  /** MAJOR units, like `product.price`. */
  price: number;
  compareAt?: number;
  currency?: string;
  author?: string;
}

function read(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Record a book-page visit. Call from an effect. */
export function recordRecentlyViewed(product: Product, author: string): void {
  if (typeof window === "undefined") return;
  try {
    const entry: RecentEntry = {
      id: String(product.id),
      slug: product.slug,
      name: product.name,
      image: productImages(product)[0],
      price: product.price ?? 0,
      compareAt: product.compare_at_price,
      currency: product.currency,
      author: author || undefined,
    };
    const list = [entry, ...read().filter((e) => e.id !== entry.id)].slice(0, MAX);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — skip silently */
  }
}

/** The trail without one book. Empty on the server and the first client render. */
export function useRecentlyViewed(excludeId: string): RecentEntry[] {
  const [items, setItems] = useState<RecentEntry[]>([]);
  useEffect(() => {
    setItems(read().filter((e) => e.id !== excludeId));
  }, [excludeId]);
  return items;
}

/** Enough of a `Product` for the book card; variants resolve on click. */
export function entryAsProduct(entry: RecentEntry): Product {
  return {
    id: entry.id,
    slug: entry.slug ?? entry.id,
    name: entry.name,
    price: entry.price,
    compare_at_price: entry.compareAt,
    currency: entry.currency ?? "",
    images: entry.image ? [{ id: entry.image, url: entry.image }] : [],
    variants: [],
    in_stock: true,
    brand: entry.author,
  } as unknown as Product;
}
