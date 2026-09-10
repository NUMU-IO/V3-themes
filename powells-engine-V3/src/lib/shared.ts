/**
 * Powell's — shared section infrastructure.
 *
 * Small on purpose, grown one helper at a time as a section actually needs
 * one. A helper written before its first caller is a helper written against a
 * guess, and in this engine the guesses that hurt are about payload SHAPE.
 */

// Tolerant value guards from @numueg/theme-kit (React-free, so they are safe
// inside the SSR worker). Re-exported so sections have one import site.
import {
  asArray,
  asBool,
  asImageAlt,
  asImageUrl,
  asNumber,
  asRecord,
  asString,
  localized,
  readBlocks,
} from "@numueg/theme-kit";
export {
  asArray,
  asBool,
  asImageAlt,
  asImageUrl,
  asNumber,
  asRecord,
  asString,
  localized,
  readBlocks,
};

import { createContext, useContext, useEffect, useState } from "react";
import { useThemeSettings, type Product, type SectionInstance } from "@numueg/theme-sdk";
import type { RawBlock } from "@numueg/theme-kit";

/** Join class names, dropping falsy entries. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Every section component receives exactly this. */
export interface SectionRenderProps {
  instance: SectionInstance;
  sectionId: string;
}

/**
 * "Demo mode" — true ONLY in the marketplace "Try theme" preview, where the
 * host ships empty templates and there is no real catalogue behind the page.
 *
 * Every piece of fixture content is gated on it, so an installed store with an
 * empty setting shows the designed default (or nothing) and never a stand-in.
 * This is NOT "is this a test store" and NOT `useInsideEditor()`.
 */
export const DemoContext = createContext<boolean>(false);
export const useDemo = (): boolean => useContext(DemoContext);

/**
 * Host-provided page context.
 *
 * ⚠ Route-dependent, and this is the engine's most common bug. The storefront
 * pre-fetches different keys into `page.data` per route: `collections` ships on
 * `/`, `/products`, `/products/[slug]`, `/collections`, `/collections/[slug]`
 * and `/search`, and is ABSENT on `/cart`, `/checkout`, `/account`, `/pages/*`
 * and 404. Anything in global chrome that reads this must fetch its own data
 * when the page ships none, or it looks perfect on the homepage and vanishes
 * on half the live site.
 */
export interface MountPageData {
  type?: string;
  handle?: string;
  title?: string;
  data?: {
    page?: {
      title?: string;
      title_i18n?: Record<string, string>;
      body?: string;
      body_i18n?: Record<string, string>;
    };
    [key: string]: unknown;
  };
}

export const PageDataContext = createContext<MountPageData | null>(null);
export const usePageData = (): MountPageData | null => useContext(PageDataContext);

/** A resolved block node: its own settings AND its nested blocks. */
export interface BlockNode {
  type?: string;
  disabled?: boolean;
  settings: Record<string, unknown>;
  blocks?: Record<string, RawBlock>;
  block_order?: string[];
}

/**
 * Like theme-kit's `readBlocks`, but returns the whole NODE so callers can
 * recurse. `readBlocks` hands back only the settings bag, which is enough for
 * a flat list and useless for the nested structures this theme's chrome is
 * built on: `nav_item → nav_child`, and `column → link` in the footer.
 */
export function readBlockNodes(parent: unknown, type: string): BlockNode[] {
  const p = (parent ?? {}) as { blocks?: Record<string, RawBlock>; block_order?: string[] };
  const blocks = p.blocks ?? {};
  const order = p.block_order && p.block_order.length > 0 ? p.block_order : Object.keys(blocks);
  return order
    .map((id) => blocks[id])
    .filter((b): b is RawBlock => !!b && b.type === type && !b.disabled)
    .map((b) => ({
      type: b.type,
      disabled: b.disabled,
      settings: b.settings ?? {},
      blocks: b.blocks,
      block_order: b.block_order,
    }));
}

/**
 * Are we rendering inside the V3 customizer's preview iframe?
 *
 * Used for editor-only affordances — a sample cart line so the merchant can
 * style the filled state — which must NEVER appear on a live storefront.
 *
 * Returns false during SSR and on the first client render, then settles. That
 * is deliberate: it keeps server and client markup identical, which is the
 * precondition for hydration, and it is why anything gated on this must be
 * ADDITIVE, never a layout the page depends on.
 */
export function useInsideEditor(): boolean {
  const [inside, setInside] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setInside(window.self !== window.top);
    } catch {
      // Cross-origin frame access throws — which itself means we are framed.
      setInside(true);
    }
  }, []);
  return inside;
}

/** Should the hand-drawn marginalia render? Merchant global, default on. */
export function useOrnaments(): boolean {
  const settings = useThemeSettings();
  return (settings.global_settings ?? {}).show_ornaments !== false;
}

/**
 * The product's images, deduplicated, first one first.
 *
 * `Product.images` is sometimes a string array and sometimes an array of
 * `{ url }` records depending on which endpoint filled it, and `image` /
 * `image_url` are two more spellings the same payload uses. Every caller in
 * this theme goes through here rather than picking one spelling and being
 * right on the PDP and blank in the cart.
 */
export function productImages(product: Product | null | undefined): string[] {
  if (!product) return [];
  const out: string[] = [];
  const push = (v: unknown) => {
    const url = typeof v === "string" ? v : asImageUrl(v);
    if (url && !out.includes(url)) out.push(url);
  };
  const p = product as unknown as Record<string, unknown>;
  push(p.image);
  push(p.image_url);
  for (const entry of asArray(p.images)) push(entry);
  return out;
}

/**
 * Is this an inline image (a data: or blob: URI) rather than a CDN URL?
 *
 * The SDK's `<Image>` builds its srcSet by appending `?w=320` to the src. On a
 * CDN URL that is exactly right; on a `data:` URI it appends the query string
 * to the PAYLOAD and the browser renders a broken image. Callers pass
 * `responsive={!isInlineImage(src)}` so an inline image still renders.
 *
 * (The guard belongs in the SDK's `buildSrcSet` — until it lands there, every
 * theme that meets a data URI needs this.)
 */
export function isInlineImage(src: string | null | undefined): boolean {
  return typeof src === "string" && (src.startsWith("data:") || src.startsWith("blob:"));
}

/**
 * The author line.
 *
 * Books are the whole point of this theme, so "by <author>" is not optional
 * chrome. NUMU has no author column — `brand` is where a bookseller puts it
 * (the field the Meta feed and Product JSON-LD also read), with a `books.author`
 * metafield as the more explicit home once the bookstore sector preset is
 * applied. Falls back to nothing rather than printing "by undefined".
 */
export function productAuthor(
  product: Product | null | undefined,
  metafields?: Record<string, unknown> | null,
): string {
  if (!product) return "";
  const fromMeta = asString(asRecord(metafields ?? {})["books.author"]);
  if (fromMeta) return fromMeta;
  const p = product as unknown as Record<string, unknown>;
  return asString(p.brand) || asString(p.vendor);
}
