/**
 * Teen — shared section infrastructure.
 *
 * Kept deliberately small and grown one helper at a time, as each section
 * actually needs one. A helper written before its first caller exists is a
 * helper written against a guess — and in this engine the guesses that hurt
 * are about payload SHAPE, which you only learn by rendering real data.
 *
 * WP0 ships the contexts, the guards and the two capability hooks. Data
 * helpers (`useStoreCollections`, `productImages`, `useFocusTrap`, …) land with
 * the WP that first calls them.
 */

// Tolerant value guards from @numueg/theme-kit (React-free, so they are safe
// inside the SSR worker). Imported and re-exported so sections have one import
// site rather than two.
import {
  asArray,
  asBool,
  asImageAlt,
  asImageUrl,
  asNumber,
  asString,
  localized,
  readBlocks,
} from "@numueg/theme-kit";
export { asArray, asBool, asImageAlt, asImageUrl, asNumber, asString, localized, readBlocks };

import { createContext, useContext, useEffect, useState } from "react";
import {
  useCollections,
  useShop,
  useThemeSettings,
  type Collection,
  type SectionInstance,
} from "@numueg/theme-sdk";
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
 * Every piece of fixture content in this theme is gated on it, so an installed
 * store with an empty setting shows the designed default (or nothing at all)
 * and never a stock photo. Provided by main.tsx from the mount ctx.
 *
 * This is NOT "is this a test store" and it is NOT `useInsideEditor()` — those
 * are three different questions and conflating them is how fixture imagery
 * reaches a real shopper.
 */
export const DemoContext = createContext<boolean>(false);
export const useDemo = (): boolean => useContext(DemoContext);

/**
 * Host-provided page context.
 *
 * ⚠ Route-dependent, and this is the engine's single most common bug. The
 * storefront pre-fetches different keys into `page.data` per route:
 * `collections` ships on `/`, `/products`, `/products/[slug]`, `/collections`,
 * `/collections/[slug]` and `/search`, and is ABSENT on `/cart`, `/about`,
 * `/contact`, `/account`, `/pages/*`, `/policies/*`, `/blogs/*`, `/checkout`
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

/**
 * Does THIS template open with a full-bleed hero?
 *
 * Teen's header is a floating white capsule. Over a hero image it needs no
 * background of its own; over a white page it needs its hairline border and to
 * sit in the flow rather than on top of the content.
 *
 * Keying that off `template === "home"` is wrong in both directions: a merchant
 * who deletes the hero from home gets a capsule floating over the next
 * section's copy, and a campaign landing page built with a hero on another
 * template never gets the overlay it was drawn for. main.tsx computes it from
 * the resolved body — FIRST section only, because a hero further down the page
 * is not behind the header.
 */
export const HeroContext = createContext<boolean>(false);
export const useTemplateOpensWithHero = (): boolean => useContext(HeroContext);

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
 * recurse. `readBlocks` hands back only the settings bag, which is enough for a
 * flat list and useless for the nested structures Teen's chrome is built on:
 * `nav_item → nav_child` in the header and `column → link` in the footer.
 *
 * Accepts a section instance OR a nested block node as the parent, so a footer
 * column's links are just `readBlockNodes(column, "link")`.
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
 * Used for editor-only affordances — an empty-state hint where a merchant has
 * configured nothing yet — which must NEVER appear on a live storefront.
 *
 * Returns false during SSR and on the first client render, then settles. That
 * is deliberate (it keeps server and client markup identical, which is the
 * precondition for hydration), and it is why anything gated on this must be
 * ADDITIVE — never a layout the page depends on.
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

/**
 * Is motion allowed right now?
 *
 * Two independent switches, and both must win: the merchant's
 * `enableAnimations` global and the shopper's OS `prefers-reduced-motion`.
 * CSS handles the blanket transition/animation kill (see theme.css); this hook
 * is for the JS side — autoplay timers, IntersectionObserver reveals, carousel
 * intervals — which CSS cannot stop.
 *
 * ⚠ When this returns false the content must render in its FINISHED state.
 * Genova shipped a reveal whose disabled branch returned early and left every
 * element at `opacity: 0`, so switching animations OFF blanked the page. If a
 * hook sets a "pre" state, the off-branch must actively CLEAR it, not skip.
 */
export function useMotionOn(): boolean {
  const settings = useThemeSettings();
  const enabled = (settings.global_settings ?? {}).enableAnimations !== false;
  const [systemOk, setSystemOk] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setSystemOk(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return enabled && systemOk;
}

/**
 * Viewport predicate for the reference's own breakpoints (D12).
 *
 * `mobile` ≤749 and `tablet` 750–989 are the two boundaries where Teen changes
 * LAYOUT rather than just spacing: the nav collapses into the drawer, the
 * catalog grid drops to two columns, the footer becomes an accordion and the
 * PDP purchase controls restack. Anything purely visual should be a media
 * query in theme.css instead — this hook costs a client-only settle.
 *
 * Returns false on the server and on first paint, then settles. Same additive
 * rule as `useInsideEditor`.
 */
export function useViewportUnder(px: number): boolean {
  const [under, setUnder] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${px}px)`);
    const sync = () => setUnder(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [px]);
  return under;
}

/** ≤749px — the reference's primary mobile boundary. */
export const useIsMobile = (): boolean => useViewportUnder(749);
/** ≤989px — mobile + tablet, i.e. "not the desktop layout". */
export const useIsCompact = (): boolean => useViewportUnder(989);

/**
 * Has the page scrolled past `threshold`?
 *
 * The capsule header floats transparently over the hero and gains its white
 * fill + hairline the moment anything scrolls under it. Doing that in CSS would
 * need `position: sticky` plus a scroll-driven animation that Safari still does
 * not support, so it is a passive scroll listener — cheap, and the only state
 * it writes is a boolean, so it re-renders at most twice per page.
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setScrolled(window.scrollY > threshold);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, [threshold]);
  return scrolled;
}

/* ═════════════════════════════════════════════════════════════════════════
   Data helpers
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * The store's collections, on EVERY route.
 *
 * `useCollections()` reads `page.data.collections`, which the host pre-fetches
 * only on catalog routes. On `/cart`, `/about`, `/contact`, `/account`,
 * `/pages/*`, `/policies/*`, `/blogs/*`, `/checkout` and 404 it ships nothing —
 * so a header drawer or a footer Shop column that reads it looks perfect on the
 * homepage and is empty on half the site. This is the single most common
 * "works here, blank there" bug in the engine.
 *
 * The SDK's `fetchIfMissing` escape hatch does not reliably close it: until
 * 0.13.x it read `data.collections` while `/api/collections` answers the
 * platform envelope `{ success, data: [...] }`, so it fetched and committed an
 * EMPTY list. Themes federate against whatever SDK the HOST serves, so the
 * fixed version cannot be assumed live. Fetching here and accepting every
 * envelope shape keeps the chrome correct on any host.
 */
export function useStoreCollections(): Collection[] {
  // Page-provided list first — free, already in the payload, no request.
  const { collections: fromPage } = useCollections();
  const shop = useShop();
  const [fetched, setFetched] = useState<Collection[]>([]);

  const havePage = fromPage.length > 0;
  const storeId = shop?.id;

  useEffect(() => {
    if (havePage || !storeId) return;
    let cancelled = false;
    fetch(`/api/collections?store_id=${encodeURIComponent(storeId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        // Four shapes in the wild: the platform envelope `{ data: [...] }`, the
        // SDK's documented `{ collections: [...] }`, a paginated
        // `{ data: { items: [...] } }`, and a bare array.
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
      // A miss leaves the menu exactly as it is — never a crash.
      .catch(() => {
        if (!cancelled) setFetched([]);
      });
    return () => {
      cancelled = true;
    };
  }, [havePage, storeId]);

  return havePage ? fromPage : fetched;
}

/**
 * Read the display fields off a collection.
 *
 * The typed contract is `{ name, slug, image_url }` (the API's
 * `CategoryResponse`), but `useStoreCollections` also hands back raw JSON it
 * fetched itself, and older payloads used Shopify-style `title`/`handle`.
 * Accepting both costs three `??`s and removes a whole class of "the menu is
 * there but every label is blank" bug.
 *
 * `count` matters more here than in most themes: the reference puts an orange
 * item-count pill on every collection card and in the drawer's featured card.
 * It is not always present, so callers must treat 0 as "don't show the pill",
 * never as "0 items".
 */
export function collectionFields(c: unknown): {
  id: string;
  name: string;
  slug: string;
  image: string;
  count: number;
} {
  const r = (c ?? {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    name: asString(r.name) || asString(r.title),
    slug: asString(r.slug) || asString(r.handle) || asString(r.id),
    image: asString(r.image_url) || asImageUrl(r.image),
    count: asNumber(r.products_count) || asNumber(r.product_count) || asNumber(r.count),
  };
}

/**
 * A product's image URLs, in order, from any of the shapes that reach a theme.
 *
 * The catalog endpoints return `images: [{url, alt, position}]`, but
 * `useRelatedProducts` and some cached payloads hand back a bare `string[]`,
 * and a few rows carry only `image_url`. A card that reads `p.images[0].url`
 * renders an empty plate for every related product — which looks like a broken
 * CDN rather than a shape mismatch, so it gets debugged in the wrong place.
 *
 * Teen needs at least TWO images per product for the hover swap, so this
 * returning a full ordered list rather than one URL is load-bearing, not
 * convenience.
 */
export function productImages(p: unknown): { url: string; alt: string }[] {
  const r = (p ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(r.images) ? r.images : [];
  const out = raw
    .map((img) => {
      if (typeof img === "string") return { url: img, alt: "" };
      const o = (img ?? {}) as Record<string, unknown>;
      return { url: asString(o.url) || asString(o.src), alt: asString(o.alt) };
    })
    .filter((i) => i.url);
  if (out.length > 0) return out;
  const single = asString(r.image_url) || asImageUrl(r.image);
  return single ? [{ url: single, alt: "" }] : [];
}

/**
 * A product's currency code.
 *
 * Catalog products carry `currency`; `useRelatedProducts` items carry
 * `price_currency`. Reading only one gives half the grid the store default and
 * the other half nothing — which shows up as a missing symbol on exactly the
 * rails a shopper sees last.
 */
export function productCurrency(p: unknown): string | undefined {
  const r = (p ?? {}) as Record<string, unknown>;
  return asString(r.currency) || asString(r.price_currency) || undefined;
}

/** Locale-aware product name — `attributes.name_ar` when the store is Arabic. */
export function productName(p: unknown, locale: string | undefined): string {
  const r = (p ?? {}) as Record<string, unknown>;
  const attrs = (r.attributes ?? {}) as Record<string, unknown>;
  if (locale?.toLowerCase().startsWith("ar")) {
    const ar = asString(attrs.name_ar);
    if (ar) return ar;
  }
  return asString(r.name) || asString(r.title);
}

/**
 * Build a wa.me link from whatever the merchant typed.
 *
 * They will type `01012345678`, `+20 101 234 5678`, or paste a whole wa.me URL.
 * All three have to work, because a broken WhatsApp link on an Egyptian store
 * is a lost order, and the merchant has no way to tell it is broken.
 * Egyptian local numbers start `01` — drop the leading 0 and prefix 20.
 */
export function waLink(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/[^\d]/g, "");
  if (!digits) return "";
  const intl = digits.startsWith("0") ? `20${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

/* ═════════════════════════════════════════════════════════════════════════
   Overlay behaviour
   ═════════════════════════════════════════════════════════════════════════ */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

/**
 * Trap Tab inside an open overlay and restore focus on close.
 *
 * `aria-modal="true"` is a promise to assistive tech, not an enforcement
 * mechanism — a sighted keyboard user tabs straight out of an "open" drawer and
 * lands on the page behind it, invisibly. This closes the loop: Tab from the
 * last focusable wraps to the first, Shift+Tab from the first wraps to the
 * last, and whatever had focus before the overlay opened gets it back.
 *
 * Elements hidden with `visibility: hidden` report no offsetParent, so a closed
 * drawer contributes nothing to the list.
 */
export function useFocusTrap(active: boolean, ref: { current: HTMLElement | null }): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const container = ref.current;
    if (!container) return;

    const previous = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // MOVE FOCUS IN. Without this the trigger keeps focus, so the very first
    // Tab walks into the page behind the overlay.
    if (!container.contains(document.activeElement)) {
      const first = focusables()[0];
      if (first) first.focus();
      else {
        // Fall back to the container so focus is at least inside the dialog
        // even when it has no focusable children yet.
        container.setAttribute("tabindex", "-1");
        container.focus();
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      // BOTH directions need the "focus escaped the container" guard. With it
      // only on the Shift branch, `current === last` is never true once focus
      // is outside, so forward-Tab is never prevented — the trap leaks in the
      // one direction people actually press.
      const outside = !container.contains(current);
      if (e.shiftKey && (current === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [active, ref]);
}

/**
 * Escape-to-close + body scroll lock for an open overlay.
 *
 * One hook, used by every sheet in the theme, because these two behaviours
 * drift apart the moment they are written twice: on Genova the quick-add sheet
 * had both and the PLP filter sheet had neither, so on a phone the page
 * scrolled behind an open "modal" and Escape did nothing while
 * `aria-modal="true"` promised assistive tech otherwise.
 */
export function useOverlayBehaviour(active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [active, onClose]);
}

/* ═════════════════════════════════════════════════════════════════════════
   Chrome inheritance
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Borrow chrome blocks from a sibling template when THIS instance has none.
 *
 * THE BUG THIS FIXES — header/footer are global chrome, but BYOT themes render
 * them per-template (most stores have no `section_groups`), so every template
 * holds its own copy of the section. When a theme UPDATE introduces a new
 * template, the platform seeds it straight from the bundle preset
 * (`theme_v3_presets.generate_initial_v3_customization` builds each template
 * from `presets.templates[*].sections` verbatim) and chrome entries in a preset
 * are intentionally bare — `{"type":"tn-footer","settings":{}}`.
 *
 * Nothing copies the merchant's authored header/footer into the new template.
 * So the new page renders THEME DEFAULTS while every existing page renders the
 * MERCHANT'S config: one component, two appearances — exactly what a shopper
 * notices. This is platform-wide, every theme, every new template.
 *
 * Only fires when this instance has NOTHING of that block type, so a merchant
 * who genuinely customised one page's footer keeps their edit.
 *
 * Consequence worth knowing before you use it: once chrome inherits merchant
 * config, adding a link to a theme DEFAULT can never reach a store that has
 * authored blocks — it has to be written into their blocks instead.
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
    { sections?: Record<string, unknown> | unknown[] } | undefined
  >;
  for (const tpl of Object.values(templates)) {
    const sections = tpl?.sections;
    const list = Array.isArray(sections) ? sections : Object.values(sections ?? {});
    for (const sec of list) {
      if ((sec as { type?: string } | null)?.type !== sectionType) continue;
      if (readBlockNodes(sec, blockType).length > 0) return sec as SectionInstance;
    }
  }
  return instance;
}
