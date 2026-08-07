// Shared guards from @numueg/theme-kit (import+re-export: local binding + public export).
import { asArray, asBool, asImageAlt, asImageUrl, asNumber, asString, localized, readBlocks } from "@numueg/theme-kit";
export { asArray, asBool, asImageAlt, asImageUrl, asNumber, asString, localized, readBlocks };

import { createContext, useContext, useEffect, useState } from "react";
import {
  useCollections,
  useShop,
  useThemeSettings,
  type Collection,
  type SectionInstance,
} from "@numueg/theme-sdk";

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
 * The store's collections, on EVERY route.
 *
 * `useCollections()` reads `page.data.collections`, which the host pre-fetches
 * only on catalog routes — `/`, `/products`, `/products/[slug]`,
 * `/collections`, `/collections/[slug]`, `/search`. On `/cart`, `/about`,
 * `/contact`, `/account`, `/pages/*`, `/policies/*`, `/blogs/*`, `/checkout`
 * and 404 it ships nothing, so the header's COLLECTIONS dropdown, the mobile
 * drawer's collection grid and the footer's Shop column all silently vanished
 * on exactly those pages. Measured on the live store: 11 collections in the
 * payload on the first group, 0 on the second.
 *
 * The SDK's own `fetchIfMissing` escape hatch does NOT close the gap: it reads
 * `data.collections` off the response, while `/api/collections` answers the
 * platform envelope `{ success, data: [...] }`. That lookup is `undefined`, so
 * the hook fetches and then commits an EMPTY list — the same blank menu, now
 * with a network round trip. Fixed at the source too (see the SDK hook), but
 * themes federate against whatever SDK the host serves, so the theme cannot
 * depend on that fix having shipped. This helper does the fetch itself and
 * accepts every envelope shape, which keeps the chrome correct on any host.
 */
export function useStoreCollections(): Collection[] {
  // SSR-provided list first — free, already in the payload, no request.
  const { collections: fromPage } = useCollections();
  const shop = useShop();
  const [fetched, setFetched] = useState<Collection[]>([]);

  const havePage = fromPage.length > 0;
  const storeId = shop?.id;

  useEffect(() => {
    if (havePage || !storeId) return;
    let cancelled = false;
    fetch(`/api/collections?store_id=${encodeURIComponent(storeId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        // Three shapes in the wild: the platform envelope `{ data: [...] }`,
        // the SDK's documented `{ collections: [...] }`, and a bare array.
        const raw = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.collections)
              ? json.collections
              : Array.isArray(json?.data?.items)
                ? json.data.items
                : [];
        setFetched(raw as Collection[]);
      })
      .catch(() => {
        // A miss leaves the menu exactly as it is today — never a crash.
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [havePage, storeId]);

  return havePage ? fromPage : fetched;
}

/**
 * Chrome config that survives a template being added later.
 *
 * THE BUG THIS FIXES — header/footer are global chrome, but this theme renders
 * them per-template (no `section_groups`), so each template holds its own copy
 * of the section. When a theme UPDATE introduces a new template, the platform
 * seeds it straight from the bundle preset
 * (`theme_v3_presets.generate_initial_v3_customization` builds each template
 * from `presets.templates[*].sections` verbatim), and chrome entries in a
 * preset are intentionally bare — `{"type":"vionne-footer","settings":{}}`.
 *
 * The result, measured on the live store the day `faq` shipped: 15 of 16
 * templates carried the merchant's authored `col-shop` / `col-help` footer
 * columns, and the brand-new `faq` template carried NONE. So the footer fell
 * through to the theme's built-in defaults on exactly one page and rendered the
 * merchant's columns everywhere else — one component, two appearances, which is
 * precisely what a shopper notices.
 *
 * This is not vionne-specific and not faq-specific: it happens to every theme,
 * every time a new template ships, for every chrome block type.
 *
 * The fix: when THIS template's chrome instance carries no blocks of the type
 * we're about to read, borrow them from a sibling template's instance of the
 * same section type. The theme already borrows chrome SECTIONS this way when a
 * route has no template at all (`selectChromeSections` in main.tsx); this
 * extends the same idea to the chrome's own configuration.
 *
 * Deliberately only fires when this instance has NOTHING of that block type —
 * a merchant who has genuinely customised one page's footer keeps their edit.
 *
 * @param instance      the chrome section being rendered
 * @param sectionType   its type, e.g. "vionne-footer"
 * @param blockType     the block type about to be read, e.g. "column"
 * @returns the section to read blocks from — `instance` itself when it is
 *          configured, otherwise a sibling that is
 */
export function useInheritedChrome(
  instance: SectionInstance,
  sectionType: string,
  blockType: string,
): SectionInstance {
  const themeSettings = useThemeSettings();
  if (readBlockNodes(instance, blockType).length > 0) return instance;

  const templates = (themeSettings.templates ?? {}) as Record<
    string,
    { sections?: Record<string, unknown> } | undefined
  >;
  for (const tpl of Object.values(templates)) {
    for (const sec of Object.values(tpl?.sections ?? {})) {
      const s = sec as { type?: string } | null;
      if (s?.type !== sectionType) continue;
      if (readBlockNodes(sec, blockType).length > 0) return sec as SectionInstance;
    }
  }
  return instance;
}

/**
 * The merchant's free-shipping threshold, in MAJOR units. 0 = not configured.
 *
 * It lives on the CART section's settings, but three surfaces outside the cart
 * need it — the mini-cart drawer, the FAQ's shipping answer, and anything else
 * that promises free delivery — and a second hardcoded copy is how a store ends
 * up advertising two different numbers. Read cross-section from the published
 * customization so every surface quotes the same figure the bag counts to.
 */
export function useFreeShippingThreshold(): number {
  const themeSettings = useThemeSettings();
  const templates = themeSettings.templates ?? {};
  for (const tpl of Object.values(templates)) {
    const sections =
      (tpl as { sections?: Record<string, { type?: string; settings?: Record<string, unknown> }> })
        ?.sections ?? {};
    for (const sec of Object.values(sections)) {
      if (sec?.type === "vionne-cart") {
        const v = Number(sec.settings?.free_shipping_threshold ?? 0);
        if (v > 0) return v;
      }
    }
  }
  return 0;
}

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

// ── Responsive image delivery ────────────────────────────────────────────────
//
// Merchant images are stored at upload resolution — Vionne's product shots are
// 1440×1920 — and every section rendered them raw. Measured on the live home
// page: 7,493 KiB of images, with a 1440×1920 product shot painted into a
// 233×311 slot (648 KiB wasted on ONE image) and a 1440×1457 upload painted
// into a 44×59 thumbnail (545 KiB wasted).
//
// The host already owns the fix: `/api/image-transform` validates the source
// host, then 302s to Next's optimizer, which resizes AND negotiates WebP/AVIF
// off the request's `Accept` header. The hero used it; nothing else did.
//
// `focalSrc` (SDK) is the canonical URL builder for that route — reused here so
// the query-string shape stays in one place. Focal/aspect params are
// deliberately NOT passed: the route honours them only when Cloudflare Image
// Resizing is enabled, and `applyImageTransform`'s CSS framing is the
// correctness baseline either way. Passing them would only fragment the cache.
import { focalSrc } from "@numueg/theme-sdk";

/**
 * The ONLY widths the optimizer will serve.
 *
 * `/api/image-transform` forwards `w` verbatim to `/_next/image`, which rejects
 * any width outside `images.deviceSizes ∪ images.imageSizes` with a 400. The
 * storefront configures deviceSizes [640,768,1024,1280,1920] and imageSizes
 * [64,128,256,384] (numu-storefront/next.config.ts), so this list is exactly
 * their union. Requesting an "obvious" width like 200 or 300 silently breaks
 * the image — always pick from here.
 */
export const IMG_WIDTHS = [64, 128, 256, 384, 640, 768, 1024, 1280, 1920] as const;

/** Smallest allowed width that still covers `want` (largest if none does). */
function snapWidth(want: number): number {
  for (const w of IMG_WIDTHS) if (w >= want) return w;
  return IMG_WIDTHS[IMG_WIDTHS.length - 1];
}

/**
 * Hosts `/api/image-transform` will relay.
 *
 * MUST stay a subset of `DEFAULT_HOSTS` in
 * numu-storefront/src/app/api/image-transform/route.ts. The proxy answers 403
 * for any other host, so sending it a URL from somewhere else does not degrade
 * — it produces a BROKEN IMAGE.
 *
 * That is not hypothetical: this theme's own `theme.json` presets seed the
 * image-comparison section with `https://picsum.photos/...` placeholders, and
 * the marketplace "Try theme" preview renders exactly those. Routing every
 * `<img>` through the proxy unconditionally would have 403'd them and shipped a
 * demo full of broken images — while every real merchant image (which always
 * lives on the platform CDN or R2) worked fine, so it would have been invisible
 * in normal QA.
 */
const PROXY_IMAGE_HOSTS = [
  "numueg.app",
  "r2.dev",
  "r2.cloudflarestorage.com",
  "imagedelivery.net",
];

// ⚠️ `numu.io` is deliberately ABSENT even though it is a platform domain and
// appears in the storefront's `next.config.ts > images.remotePatterns` and in
// `bundle-allowlist.ts`. The image proxy's OWN allowlist (`DEFAULT_HOSTS`) does
// not list it, and that list is the gate that runs first — so a `*.numu.io`
// image sent through the proxy 403s and renders broken, where a plain
// `src={url}` loaded it fine. Latent today (no store serves images from
// numu.io), which is precisely why it would have shipped unnoticed.
//
// The alternative fix is to add `numu.io` to `DEFAULT_HOSTS` in
// numu-storefront/src/app/api/image-transform/route.ts, which would make all
// three lists agree. That is the tidier end state, but it widens a shared
// security allowlist for zero present benefit, so it is left as a deliberate
// decision rather than folded into a performance pass.

/**
 * Can this source go through the transform proxy at all?
 *
 * False for: empty, `data:` (bytes are already local), `blob:` (an in-flight
 * editor upload — proxying it 400s and the merchant sees a broken image
 * mid-edit), and any host the proxy would 403. Those all fall back to the raw
 * URL, i.e. exactly today's behaviour.
 */
function transformable(url: string | null | undefined): url is string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return false;
  // Relative → a host-served asset; the proxy passes those through.
  if (url.startsWith("/")) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PROXY_IMAGE_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

/** A single proxied source at (at least) `width` CSS px. */
export function imgSrc(url: string | null | undefined, width: number): string {
  if (!transformable(url)) return url || "";
  return focalSrc(url, { width: snapWidth(width) });
}

/**
 * A `srcSet` covering `widths`, for pairing with a `sizes` attribute. Returns
 * undefined (not "") for untransformable sources so the caller can spread it
 * and have React omit the attribute entirely.
 */
export function imgSrcSet(
  url: string | null | undefined,
  widths: readonly number[],
): string | undefined {
  if (!transformable(url)) return undefined;
  const ladder = [...new Set(widths.map(snapWidth))].sort((a, b) => a - b);
  return ladder.map((w) => `${focalSrc(url, { width: w })} ${w}w`).join(", ");
}

/**
 * Everything an `<img>` needs for responsive delivery, ready to spread.
 *
 *   <img {...responsiveImg(url, PRODUCT_CARD_IMG)} alt={…} className={…} />
 *
 * `src` is the smallest ladder rung so a browser that ignores `srcSet` still
 * gets a sane payload rather than the 1440px original.
 */
export function responsiveImg(
  url: string | null | undefined,
  preset: { widths: readonly number[]; sizes: string },
): { src: string; srcSet?: string; sizes?: string } {
  const srcSet = imgSrcSet(url, preset.widths);
  return {
    src: imgSrc(url, preset.widths[0]),
    ...(srcSet ? { srcSet, sizes: preset.sizes } : {}),
  };
}

/** 2-up on phones, 4-up on desktop — the PLP / featured-collection grid. */
export const PRODUCT_CARD_IMG = {
  widths: [256, 384, 640, 768],
  sizes: "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
} as const;

/** Fixed-width cards in a horizontally scrolling track (UGC, collection strip). */
export const CARD_TRACK_IMG = {
  widths: [256, 384, 640],
  sizes: "(min-width: 768px) 260px, (min-width: 640px) 240px, 210px",
} as const;

/** The 44×44 tagged-product chip on a UGC card. 128 covers 2× DPR. */
export const CHIP_IMG = {
  widths: [64, 128],
  sizes: "44px",
} as const;

/** Full-bleed editorial / lifestyle imagery inside a container. */
export const EDITORIAL_IMG = {
  widths: [640, 768, 1024, 1280, 1920],
  sizes: "(min-width: 1280px) 50vw, (min-width: 768px) 60vw, 100vw",
} as const;

/** PDP main gallery frame — big, but never 1440px on a phone. */
export const PDP_MAIN_IMG = {
  widths: [384, 640, 768, 1024, 1280],
  sizes: "(min-width: 1024px) 50vw, 100vw",
} as const;

/** PDP thumbnail rail + cart line items. */
export const THUMB_IMG = {
  widths: [128, 256],
  sizes: "96px",
} as const;

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
