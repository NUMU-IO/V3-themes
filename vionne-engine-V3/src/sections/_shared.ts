import type { CSSProperties } from "react";
import { createContext, useContext } from "react";
import type { SectionInstance } from "@numueg/theme-sdk";

export interface SectionRenderProps {
  instance: SectionInstance;
  sectionId: string;
}

/**
 * "Demo mode" — true only in the marketplace "Try theme" preview, where the
 * host ships empty templates. Sections gate preview-only demo content (e.g. the
 * slideshow's showcase slides) on it so a real installed store (demo=false)
 * never shows demo fixtures. Provided by main.tsx via DemoContext.Provider.
 */
export const DemoContext = createContext<boolean>(false);
export const useDemo = (): boolean => useContext(DemoContext);

/**
 * Host-provided page context (Phase 4.4b parity). The storefront's
 * /pages/[handle] route passes the resolved CMS page record as
 * `ctx.page = { type:"page", handle, title, data:{ page:{...} } }`. Vionne has
 * no `page` template AND renders global chrome on every route, so the host's
 * empty-detection backstop can't fire on a content page — instead ThemeApp
 * reads this context and renders the real CMS title + body. Null elsewhere.
 */
export interface MountPageData {
  type?: string;
  handle?: string;
  title?: string;
  data?: {
    page?: {
      handle?: string;
      title?: string | null;
      body?: string | null;
      title_i18n?: Record<string, string> | null;
      body_i18n?: Record<string, string> | null;
      seo?: unknown;
    };
  };
}
export const PageDataContext = createContext<MountPageData | null>(null);
export const usePageData = (): MountPageData | null =>
  useContext(PageDataContext);

/**
 * ENG-3: pick the locale-appropriate default. Merchant-entered values still
 * win because callers do `asString(s.x) || localized(locale, en, ar)`.
 * Drives only the empty-state DEFAULT copy a section renders when the merchant
 * hasn't typed a value — under `?locale=ar` (RTL) Arabic shows, else English.
 */
export function localized(locale: string | undefined, en: string, ar: string): string {
  return (locale || "").toLowerCase().startsWith("ar") ? ar : en;
}

export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Read an image-picker value. The editor stores image_picker settings as
 * either a plain URL string (legacy) or an `{ url, alt }` object (current).
 * Always returns a usable URL string — without this, sections that did
 * `src={s.image}` rendered `[object Object]` once a merchant uploaded an
 * image (the object shape), so the picture silently never appeared.
 */
export function asImageUrl(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const r = v as Record<string, unknown>;
    if (typeof r.url === "string") return r.url;
    if (typeof r.src === "string") return r.src;
  }
  return fallback;
}

/** Alt text for an image-picker value (only present on the object shape). */
export function asImageAlt(v: unknown, fallback = ""): string {
  if (v && typeof v === "object") {
    const r = v as Record<string, unknown>;
    if (typeof r.alt === "string") return r.alt;
  }
  return fallback;
}


// ── Non-destructive image transform (focal / zoom / rotation) — Phase 2 ──────
// Mirror of merchant-hub imageTransform.ts (and bazar _shared). Keep
// applyImageTransform in sync so the editor preview == the storefront render.
// Identity-safe: with no transform it returns {}, so images render unchanged.
export interface ImageTransform {
  v: 1;
  focal?: { x: number; y: number };
  zoom?: number;
  rotation?: number;
  fit?: "cover" | "contain";
}
const _clampImgT = (n: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
export function asImageTransform(v: unknown): ImageTransform | undefined {
  if (v && typeof v === "object" && "transform" in v) {
    const t = (v as { transform?: unknown }).transform;
    if (t && typeof t === "object") return t as ImageTransform;
  }
  return undefined;
}
export function applyImageTransform(
  t: ImageTransform | undefined | null,
  fit: "cover" | "contain" = "cover",
): CSSProperties {
  if (!t) return {};
  const fx = Math.round(_clampImgT(t.focal?.x ?? 0.5, 0, 1) * 1e4) / 100;
  const fy = Math.round(_clampImgT(t.focal?.y ?? 0.5, 0, 1) * 1e4) / 100;
  const zoom = _clampImgT(t.zoom ?? 1, 1, 4);
  const rot = ((t.rotation ?? 0) % 360 + 360) % 360;
  const effFit = t.fit ?? fit;
  const style: CSSProperties = {
    transform: `scale(${zoom}) rotate(${rot}deg)`,
    transformOrigin: `${fx}% ${fy}%`,
    objectFit: effFit,
  };
  if (effFit === "cover") style.objectPosition = `${fx}% ${fy}%`;
  return style;
}
