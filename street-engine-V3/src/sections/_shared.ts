import type { SectionInstance } from "@numueg/theme-sdk";

/** Props every Street section receives from `main.tsx`. */
export interface StSectionProps {
  instance: SectionInstance;
  sectionId: string;
}

/** Merchant settings arrive as `unknown`; these narrow without throwing. */
export function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() !== "" ? v : fallback;
}

export function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/**
 * An image setting is either a plain URL string or the customizer's
 * `ImageValue` object (`{ url, transform }`). Reading `.url` blindly on a
 * string, or rendering the object, both produce a broken image.
 */
export function asImageUrl(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "url" in v) {
    const url = (v as { url?: unknown }).url;
    return typeof url === "string" ? url : "";
  }
  return "";
}

/** Pick copy for the visitor's language. Arabic is a first-class default here. */
export function localized(
  locale: string | undefined,
  en: string,
  ar: string,
): string {
  return (locale || "").toLowerCase().startsWith("ar") ? ar : en;
}

/** First usable image on a product, whatever shape the payload used. */
export function productImage(product: unknown): string {
  const p = product as
    | { images?: Array<string | { url?: string }>; image_url?: string }
    | null
    | undefined;
  if (!p) return "";
  if (typeof p.image_url === "string" && p.image_url) return p.image_url;
  const first = p.images?.[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof first.url === "string") {
    return first.url;
  }
  return "";
}
