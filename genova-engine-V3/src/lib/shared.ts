/**
 * Genova — shared section infrastructure.
 *
 * Kept deliberately small. It grows one helper at a time as sections need
 * them (WP1 adds chrome/collection helpers, WP3 the image helpers, …) rather
 * than being ported wholesale from another theme — a helper written before its
 * first caller exists is a helper written against a guess.
 */

// Tolerant value guards from @numueg/theme-kit (React-free, so they are safe in
// the SSR worker). Import + re-export so sections have one import site.
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
export {
  asArray,
  asBool,
  asImageAlt,
  asImageUrl,
  asNumber,
  asString,
  localized,
  readBlocks,
};

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
 * host ships empty templates and there is no real catalogue to render.
 *
 * Every piece of fixture content in this theme is gated on it, so an installed
 * store with an empty setting shows the tasteful default (or nothing) and never
 * a stock photo of someone else's jeans. Provided by main.tsx.
 */
export const DemoContext = createContext<boolean>(false);
export const useDemo = (): boolean => useContext(DemoContext);

/**
 * Host-provided page context.
 *
 * ⚠ Route-dependent. The storefront pre-fetches different keys into `page.data`
 * per route — `collections`, for example, ships on `/`, `/products`,
 * `/products/[slug]`, `/collections`, `/collections/[slug]` and `/search`, and
 * is ABSENT on `/cart`, `/about`, `/contact`, `/account`, `/pages/*`,
 * `/policies/*`, `/blogs/*`, `/checkout` and 404. Anything in global chrome
 * that reads this must fetch its own data when the page ships none, or it will
 * look perfect on the homepage and vanish on half the site.
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
 * The header overlays the page in white only when there is actually something
 * behind it. Keying that off `template === "home"` was wrong in both
 * directions: a merchant who deletes the hero from home gets a white-on-white
 * header floating over the next section, and a landing page built with a hero
 * on another template never gets the overlay it was designed for.
 *
 * Computed in main.tsx from the resolved body — first section only, since a
 * hero further down the page is not behind the header.
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
 * recurse into nested blocks. `readBlocks` hands back only the settings bag,
 * which is enough for a flat list and useless for the two nested structures
 * this theme's chrome is built on: `nav_item → nav_child` in the header and
 * `column → link` in the footer.
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
 * The store's collections, on EVERY route.
 *
 * `useCollections()` reads `page.data.collections`, which the host pre-fetches
 * only on catalog routes (`/`, `/products`, `/products/[slug]`, `/collections`,
 * `/collections/[slug]`, `/search`). On `/cart`, `/about`, `/contact`,
 * `/account`, `/pages/*`, `/policies/*`, `/blogs/*`, `/checkout` and 404 it
 * ships nothing — so a header dropdown or footer Shop column that reads it
 * looks perfect on the homepage and is empty on half the site. This is the
 * single most common "works here, blank there" bug in the engine.
 *
 * The SDK's `fetchIfMissing` escape hatch does not reliably close it: until
 * 0.13.x it read `data.collections` while `/api/collections` answers the
 * platform envelope `{ success, data: [...] }`, so it fetched and committed an
 * EMPTY list. Themes federate against whatever SDK the HOST serves, so we
 * cannot assume the fixed version is live. Fetching here and accepting every
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
 * The typed contract is `{ name, slug, image_url }` (confirmed against the
 * API's `CategoryResponse`), but `useStoreCollections` also hands back raw JSON
 * it fetched itself, and older payloads used Shopify-style `title`/`handle`.
 * Accepting both costs three `??`s and removes a whole class of "the menu is
 * there but every label is blank" bug.
 */
export function collectionFields(c: unknown): { id: string; name: string; slug: string; image: string } {
  const r = (c ?? {}) as Record<string, unknown>;
  return {
    id: asString(r.id),
    name: asString(r.name) || asString(r.title),
    slug: asString(r.slug) || asString(r.handle) || asString(r.id),
    image: asString(r.image_url) || asImageUrl(r.image),
  };
}

/**
 * A product's image URLs, in order, from any of the shapes that reach a theme.
 *
 * The catalog endpoints return `images: [{url, alt, position}]`, but
 * `useRelatedProducts` and a few cached payloads hand back a bare `string[]`,
 * and some rows carry only `image_url`. A card that reads `p.images[0].url`
 * renders a grey plate for every related product — which looks like a broken
 * CDN rather than a shape mismatch, so it tends to get debugged in the wrong
 * place entirely.
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
 * Chrome configuration that survives a template being added later.
 *
 * THE BUG THIS FIXES — header/footer are global chrome, but BYOT themes render
 * them per-template (most stores have no `section_groups`), so every template
 * holds its own copy of the section. When a theme UPDATE introduces a new
 * template, the platform seeds it straight from the bundle preset
 * (`theme_v3_presets.generate_initial_v3_customization` builds each template
 * from `presets.templates[*].sections` verbatim) and chrome entries in a preset
 * are intentionally bare — `{"type":"gn-footer","settings":{}}`.
 *
 * Nothing copies the merchant's authored header/footer into the new template.
 * So the new page renders THEME DEFAULTS while every existing page renders the
 * MERCHANT'S config: one component, two appearances — exactly what a shopper
 * notices. This is platform-wide, every theme, every new template.
 *
 * The fix: when this template's chrome instance carries no blocks of the type
 * we're about to read, borrow them from a sibling template's instance of the
 * same section type. Only fires when this instance has NOTHING of that type, so
 * a merchant who genuinely customised one page's footer keeps their edit.
 *
 * Consequence worth knowing: once chrome inherits merchant config, adding a link
 * to a theme DEFAULT can never reach a store that has authored blocks — it has
 * to be written into their blocks instead.
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

/**
 * Are we rendering inside the V3 customizer's preview iframe?
 *
 * Used to show editor-only affordances (an empty-state hint where a merchant
 * has configured nothing yet) that must NEVER appear on a live storefront.
 * Returns false during SSR and on the first client render, then settles — so
 * anything gated on it must be additive, never a layout the page depends on.
 */
export function useInsideEditor(): boolean {
  const [inside, setInside] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setInside(window.self !== window.top);
    } catch {
      // Cross-origin frame access throws — which itself means we're framed.
      setInside(true);
    }
  }, []);
  return inside;
}

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
 * Elements hidden with `visibility: hidden` report zero size, so the query is
 * filtered on `offsetParent` — a closed drawer contributes nothing.
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
    // Tab walks into the page behind the overlay — the drawer only ever
    // appeared to work because it focuses its own close button separately.
    if (!container.contains(document.activeElement)) {
      const first = focusables()[0];
      // Fall back to the container itself so focus is at least inside the
      // dialog even when it has no focusable children yet.
      if (first) first.focus();
      else {
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
      // BOTH directions need the "focus escaped the container" guard. Only the
      // Shift branch had it, so when focus was outside, `current === last` was
      // never true and forward-Tab was never prevented — the trap leaked in the
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
 * Extracted because the two sheet implementations had drifted: quick-add had
 * both, the PLP filter sheet had neither — so on a phone the page scrolled
 * behind an open "modal" and Escape did nothing, while `aria-modal="true"`
 * promised assistive tech otherwise. One hook, so a third sheet cannot drift
 * the same way.
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

/**
 * The merchant's free-shipping threshold, in MAJOR units. 0 = not configured.
 *
 * It is authored on the CART section, but the mini-cart drawer needs the same
 * number — and a second hardcoded copy is exactly how a store ends up promising
 * two different figures on two surfaces. Read cross-section from the published
 * customization so every surface quotes the one the bag actually counts to.
 */
export function useFreeShippingThreshold(): number {
  const themeSettings = useThemeSettings();
  const templates = (themeSettings.templates ?? {}) as Record<
    string,
    { sections?: Record<string, unknown> | unknown[] } | undefined
  >;
  for (const tpl of Object.values(templates)) {
    const secs = tpl?.sections;
    const list = Array.isArray(secs) ? secs : Object.values(secs ?? {});
    for (const sec of list) {
      const s = sec as { type?: string; settings?: Record<string, unknown> } | null;
      if (s?.type !== "gn-cart") continue;
      const n = Number(s.settings?.free_shipping_threshold ?? 0);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 0;
}

/**
 * Is motion allowed right now?
 *
 * TWO independent switches, and either one turns motion off: the merchant's
 * `enableAnimations` global and the visitor's OS `prefers-reduced-motion`.
 *
 * ⚠ Anything gated on this must render the FINISHED state when it returns
 * false — never a hidden pre-state. A reveal that only becomes visible via an
 * animation leaves a blank page for every visitor with reduced motion on.
 *
 * CSS handles the blanket cases (see the motion-off block in theme.css); this
 * hook is for the JS-side ones — autoplay timers, scroll animations — that CSS
 * cannot reach.
 */
/**
 * True below the desktop breakpoint — where the burger replaces the nav.
 *
 * Used to move the search control between the header's two icon groups. One
 * button, re-parented; NOT two rendered buttons with `display: none`, which
 * would put a second control with the same accessible name in the a11y tree.
 *
 * Safe against hydration mismatch because this theme's SSR is inert: the host
 * ships no theme markup and the bundle mounts client-side, so the first paint
 * is already a client render.
 */
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return compact;
}

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
