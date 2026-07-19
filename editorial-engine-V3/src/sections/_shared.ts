// Shared guards from @numueg/theme-kit (import+re-export: local binding + public export).
import { localized, asString, asNumber, asBool, asArray } from "@numueg/theme-kit";
export { localized, asString, asNumber, asBool, asArray };

import { createContext, useContext } from "react";
import { useThemeSettings, type SectionInstance } from "@numueg/theme-sdk";

/**
 * Merchant "Enable motion & reveal animations" Layout global. Default ON;
 * sections gate their entrance/reveal motion on this so the toggle actually
 * does something (it was a silent no-op fleet-wide before Manshet).
 * Independent of prefers-reduced-motion, which is always honored in CSS.
 */
export function useAnimationsEnabled(): boolean {
  const settings = useThemeSettings();
  const globals = (settings.global_settings ?? {}) as Record<string, unknown>;
  return globals.enableAnimations !== false;
}

import { useEffect, useState } from "react";

/**
 * True when running inside the customizer iframe (or with ?editor=1).
 * SSR-safe: false on the server and first client paint, flips after mount.
 * Sections use it to show configuration placeholders in the editor canvas
 * for content that would render nothing on a live store (empty lookbook,
 * no testimonials) — otherwise the merchant adds the section and sees a
 * blank canvas with no hint of what to fill in.
 */
export function useInsideEditor(): boolean {
  const [inEditor, setInEditor] = useState(false);
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("editor")) {
        setInEditor(true);
        return;
      }
    } catch {
      /* defensive */
    }
    setInEditor(window.parent !== window);
  }, []);
  return inEditor;
}

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
    /** Visitor's search query — the storefront /search route stashes it as
     *  `query`; `q` kept as a defensive alias. */
    query?: string;
    q?: string;
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


/**
 * Merchant-assigned product label (backend `product.label`, denormalized
 * bilingual text). Returns the locale-appropriate badge text or "" when the
 * product carries no label — callers gate rendering on a non-empty string so
 * unlabeled products render exactly as before.
 */
export function merchantLabelText(product: unknown, locale: string | undefined): string {
  const label = (
    product as { label?: { key?: string; text_en?: string; text_ar?: string } | null }
  )?.label;
  if (!label || !label.key) return "";
  const isAr = (locale || "").toLowerCase().startsWith("ar");
  return (isAr ? label.text_ar || label.text_en : label.text_en) || "";
}



interface RawBlock {
  type?: string;
  disabled?: boolean;
  settings?: Record<string, unknown>;
  // Nested blocks (blocks-in-blocks) — e.g. a footer `column` block holding
  // child `link` blocks. The customizer's recursive BlockInstance CRUD writes
  // these so readBlockNodes can drill down.
  blocks?: Record<string, RawBlock>;
  block_order?: string[];
}

/** A resolved block node: its own settings + (optionally) its nested blocks. */
export interface BlockNode {
  type?: string;
  disabled?: boolean;
  settings: Record<string, unknown>;
  blocks?: Record<string, RawBlock>;
  block_order?: string[];
}

/**
 * Read a section's blocks of a given type, in editor order, skipping
 * disabled ones. The customizer's block CRUD writes `instance.blocks` +
 * `instance.block_order`, so chrome components (header nav, footer columns)
 * MUST read from there — reading `instance.settings.<list>` silently ignores
 * everything the merchant adds in the editor. Returns each block's `settings`
 * bag (use asString / asImageUrl on the fields). Empty array when the section
 * has no blocks of that type → the caller falls back to its V2 defaults.
 * (Mirror of gilded / empire _shared.readBlocks.)
 */
export function readBlocks(
  instance: SectionInstance,
  type: string,
): Record<string, unknown>[] {
  const inst = instance as unknown as {
    blocks?: Record<string, RawBlock>;
    block_order?: string[];
  };
  const blocks = inst.blocks ?? {};
  const order =
    inst.block_order && inst.block_order.length > 0
      ? inst.block_order
      : Object.keys(blocks);
  return order
    .map((id) => blocks[id])
    .filter((b): b is RawBlock => !!b && b.type === type && !b.disabled)
    .map((b) => b.settings ?? {});
}

/**
 * Like readBlocks, but returns the full block NODE (settings + its own nested
 * blocks/block_order) so callers can recurse. Accepts a SectionInstance OR a
 * nested block node as the parent — e.g. a footer `column` block whose child
 * `link` blocks are read with readBlockNodes(column, "link"). Order + disabled
 * handling matches readBlocks. Empty when the parent has no blocks of `type` →
 * the caller falls back to its legacy/flat settings or V2 defaults.
 */
export function readBlockNodes(parent: unknown, type: string): BlockNode[] {
  const p = (parent ?? {}) as {
    blocks?: Record<string, RawBlock>;
    block_order?: string[];
  };
  const blocks = p.blocks ?? {};
  const order =
    p.block_order && p.block_order.length > 0
      ? p.block_order
      : Object.keys(blocks);
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

/** Poster image URL stored alongside a `video_picker` value (`{ url, poster }`). */
export function asVideoPoster(v: unknown): string {
  if (v && typeof v === "object" && "poster" in v) {
    return asImageUrl((v as { poster?: unknown }).poster);
  }
  return "";
}

/**
 * Resolve a `video_picker` value into something renderable. The editor stores
 * it as `{ url, poster }` (or a legacy plain URL string), and merchants paste a
 * link from wherever their content lives — a direct MP4/WebM file, or a
 * YouTube / Vimeo / Instagram / TikTok / Facebook page URL. A native `<video>`
 * only plays direct files, so we map each social URL to its embeddable iframe
 * form instead. Returns `null` when the value is empty or from an unrecognized
 * host so the caller can fall back to the poster image (never a blank tile).
 */
export type VideoEmbed =
  | { kind: "file"; src: string; poster?: string }
  | { kind: "iframe"; src: string; provider: string; poster?: string };

const _VIDEO_FILE_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;

export function resolveVideoEmbed(raw: unknown): VideoEmbed | null {
  const url = asImageUrl(raw).trim();
  if (!url) return null;
  const poster = asVideoPoster(raw) || undefined;

  // Direct media file (or inline/blob) → native <video>.
  if (
    _VIDEO_FILE_RE.test(url) ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return { kind: "file", src: url, poster };
  }

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const iframe = (src: string, provider: string): VideoEmbed => ({
    kind: "iframe",
    src,
    provider,
    poster,
  });

  // YouTube — watch / youtu.be / shorts / embed. loop needs playlist=<id>.
  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be"
  ) {
    let id = "";
    if (host === "youtu.be") id = u.pathname.split("/").filter(Boolean)[0] ?? "";
    else if (u.pathname.startsWith("/shorts/")) id = u.pathname.split("/")[2] ?? "";
    else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2] ?? "";
    else id = u.searchParams.get("v") ?? "";
    if (!id) return null;
    const q = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      loop: "1",
      playlist: id,
      controls: "0",
      playsinline: "1",
      modestbranding: "1",
      rel: "0",
    });
    return iframe(`https://www.youtube-nocookie.com/embed/${id}?${q.toString()}`, "youtube");
  }

  // Vimeo — background=1 gives a chromeless autoplay-muted-loop, ideal for reels.
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!/^\d+$/.test(id)) return null;
    const q = new URLSearchParams({
      autoplay: "1",
      muted: "1",
      loop: "1",
      background: "1",
    });
    return iframe(`https://player.vimeo.com/video/${id}?${q.toString()}`, "vimeo");
  }

  // Instagram — reel / post / tv.
  if (host === "instagram.com") {
    const m = u.pathname.match(/\/(reels?|p|tv)\/([^/]+)/);
    if (!m) return null;
    const kind = m[1] === "reels" ? "reel" : m[1];
    return iframe(`https://www.instagram.com/${kind}/${m[2]}/embed`, "instagram");
  }

  // TikTok.
  if (host === "tiktok.com") {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (!m) return null;
    return iframe(`https://www.tiktok.com/embed/v2/${m[1]}`, "tiktok");
  }

  // Facebook / fb.watch — the official video plugin accepts the original href,
  // so we don't need to parse the (opaque) id out of the URL.
  if (host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch") {
    const q = new URLSearchParams({
      href: url,
      show_text: "false",
      autoplay: "true",
      mute: "1",
    });
    return iframe(`https://www.facebook.com/plugins/video.php?${q.toString()}`, "facebook");
  }

  return null;
}


// ── Non-destructive image transform (focal / zoom / rotation) ────────────────
// Now provided by the SDK (@numueg/theme-sdk >= 0.11.0) instead of a local
// copy that had to be hand-synced with the merchant-hub editor and 13 other
// themes. Re-exported from here so every section keeps importing it from
// "./_shared" unchanged. The SDK build is pinned against the previous local
// implementation by a parity suite, so this swap is render-identical.
export {
  applyImageTransform,
  asImageTransform,
  type ImageTransform,
} from "@numueg/theme-sdk";

/**
 * Product image URL across the API's TWO shapes: catalog products carry
 * `images: [{url}]` objects while the related-products endpoint returns
 * `images: ["https://…"]` plain strings (plus legacy `image_url` /
 * `first_image_url` fields on some rows). Reading `.images[0].url` blind
 * rendered blank cards for related items.
 */
export function productImage(p: unknown): string | undefined {
  const obj = p as Record<string, unknown> | null | undefined;
  if (!obj) return undefined;
  const imgs = obj.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0] as unknown;
    if (typeof first === "string") return first;
    const url = (first as { url?: unknown })?.url;
    if (typeof url === "string") return url;
  }
  for (const k of ["image_url", "first_image_url", "image"]) {
    const v = obj[k];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

/** Product currency across shapes (`currency` vs related's `price_currency`). */
export function productCurrency(p: unknown): string | undefined {
  const obj = p as Record<string, unknown> | null | undefined;
  const v = obj?.currency ?? obj?.price_currency;
  return typeof v === "string" ? v : undefined;
}
