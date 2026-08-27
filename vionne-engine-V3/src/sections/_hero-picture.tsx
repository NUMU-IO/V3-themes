"use client";

import { useEffect, useRef } from "react";
import { applyImageTransform, type ImageTransform } from "@numueg/theme-sdk";
import { imgSrc, imgSrcSet } from "./_shared";

/**
 * `<VionneHero>` — the slideshow's art-directed hero image.
 *
 * ## Why this exists instead of the SDK's `<HeroMedia>`
 *
 * `HeroMedia` resolves the desktop↔mobile swap in JavaScript (`matchMedia`),
 * and on a server-rendered storefront that is three separate problems:
 *
 * 1. **The wrong bitmap paints on phones.** The SSR worker has no viewport, so
 *    the server always emits the DESKTOP source. On the client the very first
 *    render already computes the mobile one, so React's before/after values
 *    agree and it commits no attribute update — and hydration does not repair a
 *    mismatched `src`/`srcSet`. The desktop image stuck. The SDK grew a
 *    hydration-repair effect for this in 0.13.3, but a theme federates against
 *    whatever SDK the HOST serves and production serves 0.13.1, so the theme
 *    had to work around it by remounting the `<img>` after hydration.
 *
 * 2. **That remount is a visible flash.** Changing the `key` destroys and
 *    recreates the element, so the hero blanks for a frame before the mobile
 *    bitmap paints — right on top of the LCP element.
 *
 * 3. **Phones downloaded the desktop hero anyway.** The SSR markup pointed at
 *    it, so the browser began fetching it during parse; the post-hydration
 *    remount then fetched the mobile one. Measured on vionneeg.com at 412px:
 *    the desktop hero (24.6 KB at 768w) plus a 77.9 KB 1920w "alternate
 *    pre-warm" were downloaded and never shown — ~135 KB of pure waste on the
 *    single most bandwidth-sensitive request of the page.
 *
 * A native `<picture>` with a `media`-scoped `<source>` has none of these. The
 * browser picks the right candidate **while parsing the HTML**, before any
 * script runs, which means: correct bitmap on the first paint, no hydration
 * involvement at all, no remount, and exactly ONE hero download. It also
 * matches the host's `<link rel="preload" as="image" media=…>` byte for byte,
 * so the preload is credited rather than discarded.
 *
 * ## The reason the SDK avoided `<picture>`
 *
 * A native `<picture>` does not always re-pick its source when an *embedded*
 * preview resizes its iframe — which is exactly what the theme editor's
 * Desktop/Mobile toggle does. `useRepick` below closes that hole with a
 * `matchMedia` listener that forces the element to re-evaluate, so the editor
 * toggle stays deterministic while shoppers get the native path.
 *
 * ## Smooth swapping
 *
 * Crossing the breakpoint changes two things: the bitmap and (when the merchant
 * framed the two images differently) the focal framing. Both are handled so the
 * transition reads as a settle rather than a cut:
 *
 *  - **Framing** is expressed as CSS custom properties consumed by
 *    `.vn-hero-img` in theme.css, which has its own `@media` rule for the
 *    mobile values and a transition on `object-position` / `transform`. So a
 *    resize eases the crop instead of jumping it, with no JS in the loop.
 *  - **Bitmap** swaps are instant *if the other rendition is already cached*.
 *    `preloadAlternate` warms it — but only on a viewport that can actually
 *    cross the breakpoint (a resizable desktop window), and at a width that
 *    viewport would really request. A phone can never become 768px wide, so it
 *    pre-warms nothing. That is where most of the 135 KB above went.
 */

/** Hero srcSet ladder. MUST stay a subset of the host's `images.deviceSizes`
 *  ([640,768,1024,1280,1920]) — /_next/image returns 400 for anything else —
 *  and MUST equal the host's `PRELOAD_WIDTHS` or the preload is not credited. */
const HERO_WIDTHS = [640, 768, 1024, 1280, 1920] as const;
/** Tailwind `md`. Must equal the host preload's media split (767/768). */
const BREAKPOINT = 768;
/** `<img src>` fallback for a browser that ignores srcSet. */
const DESKTOP_BASE_WIDTH = 1920;

const MOBILE_MEDIA = `(max-width: ${BREAKPOINT - 1}px)`;
/** Width a desktop window would request right after growing past the split. */
const ALT_DESKTOP_WARM_WIDTH = 1280;
/** Width a shrinking desktop window would request for the mobile rendition. */
const ALT_MOBILE_WARM_WIDTH = 768;

/**
 * Framing (focal point / zoom / rotation) as CSS custom properties.
 *
 * `applyImageTransform` returns real CSS properties, which cannot be swapped by
 * a media query from an inline style — an inline `object-position` always beats
 * the stylesheet. Emitting the values as variables lets theme.css choose which
 * pair applies at the current width and transition between them.
 */
function framingVars(
  t: ImageTransform | null | undefined,
  suffix: "" | "-m",
): Record<string, string> {
  const css = applyImageTransform(t, "cover") as Record<string, string | undefined>;
  const out: Record<string, string> = {};
  if (css.transform) out[`--vn-hero-tf${suffix}`] = css.transform;
  if (css.transformOrigin) out[`--vn-hero-to${suffix}`] = css.transformOrigin;
  if (css.objectPosition) out[`--vn-hero-op${suffix}`] = css.objectPosition;
  return out;
}

/**
 * Force a `<picture>` to re-evaluate its `<source media>` when the *container*
 * resizes rather than the top-level window — the theme editor's Desktop/Mobile
 * toggle. Chrome re-picks on a real window resize on its own; an iframe resize
 * is the case that historically did not, which is why the SDK went to
 * `matchMedia` in the first place.
 *
 * Re-assigning `img.sizes` invalidates the selected candidate and makes the
 * browser run source selection again. It is a no-op when the browser had
 * already re-picked, so this is a safety net, not the mechanism.
 */
function useRepick(ref: React.RefObject<HTMLImageElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(MOBILE_MEDIA);
    const repick = () => {
      const el = ref.current;
      if (!el) return;
      const s = el.sizes;
      el.sizes = "";
      el.sizes = s;
    };
    mq.addEventListener?.("change", repick);
    return () => mq.removeEventListener?.("change", repick);
  }, [ref, active]);
}

/**
 * Pre-warm the off-breakpoint rendition so a resize paints from cache.
 *
 * Gated on the viewport being able to cross the breakpoint at all. A phone
 * cannot, so it warms nothing — which is the whole point: the old unconditional
 * warm was fetching a 1920w desktop hero onto a 412px screen. Runs after load
 * and at low priority so it never competes with the LCP image.
 */
function useWarmAlternate(
  desktopUrl: string | undefined,
  mobileUrl: string | undefined,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !desktopUrl || !mobileUrl) return;
    if (typeof window === "undefined" || typeof window.Image !== "function") return;
    // Only a window that can be dragged across the split benefits. `(pointer:
    // fine)` is the honest proxy for "resizable browser window"; phones and
    // tablets report `coarse` and never cross it.
    if (!window.matchMedia?.("(pointer: fine)").matches) return;

    let cancelled = false;
    const warm = () => {
      if (cancelled) return;
      const goingMobile = window.matchMedia(MOBILE_MEDIA).matches;
      const url = goingMobile
        ? imgSrc(desktopUrl, ALT_DESKTOP_WARM_WIDTH)
        : imgSrc(mobileUrl, ALT_MOBILE_WARM_WIDTH);
      if (!url) return;
      const im = new window.Image();
      im.onerror = () => {};
      try {
        (im as unknown as { fetchPriority?: string }).fetchPriority = "low";
      } catch {
        /* unsupported — the request is still idle-scheduled */
      }
      im.decoding = "async";
      im.src = url;
    };

    // After load, then idle. The hero is the LCP element; nothing here may run
    // before it has painted.
    const schedule = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback;
      if (typeof ric === "function") ric(warm);
      else window.setTimeout(warm, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
    };
  }, [desktopUrl, mobileUrl, enabled]);
}

export interface VionneHeroProps {
  /** Desktop (and single-image) source. */
  src: string;
  alt: string;
  /** Desktop focal/zoom/rotation from the editor. */
  transform?: ImageTransform | null;
  /** Optional mobile art-direction source. Omit for a single responsive image. */
  mobileSrc?: string;
  /** Mobile framing. Falls back to the desktop framing when unset. */
  mobileTransform?: ImageTransform | null;
  /** Above the fold? Drives eager loading + fetchPriority. */
  priority?: boolean;
  /** Pre-warm the off-breakpoint rendition on resizable viewports. */
  preloadAlternate?: boolean;
  className?: string;
}

export function VionneHero({
  src,
  alt,
  transform,
  mobileSrc,
  mobileTransform,
  priority = false,
  preloadAlternate = true,
  className = "",
}: VionneHeroProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const hasMobile = !!mobileSrc;

  useRepick(imgRef, hasMobile);
  useWarmAlternate(src, mobileSrc, preloadAlternate && hasMobile);

  const style = {
    width: "100%",
    height: "100%",
    display: "block",
    ...framingVars(transform, ""),
    // Only emit the mobile pair when the merchant actually framed the mobile
    // image; theme.css falls back to the desktop variable otherwise, so an
    // unframed mobile hero inherits the desktop crop exactly as before.
    ...(hasMobile ? framingVars(mobileTransform ?? transform, "-m") : {}),
  } as React.CSSProperties;

  // `imgSrcSet` returns undefined for a source the host's image proxy would
  // 403 (the marketplace demo's picsum/unsplash placeholders). In that case the
  // raw URL is used verbatim and there is no <source> to art-direct with —
  // exactly what a plain <img> would have done.
  const desktopSet = imgSrcSet(src, HERO_WIDTHS);
  const mobileSet = hasMobile ? imgSrcSet(mobileSrc, HERO_WIDTHS) : undefined;

  return (
    <picture>
      {mobileSet && <source media={MOBILE_MEDIA} srcSet={mobileSet} sizes="100vw" />}
      <img
        ref={imgRef}
        src={imgSrc(src, DESKTOP_BASE_WIDTH)}
        {...(desktopSet ? { srcSet: desktopSet, sizes: "100vw" } : {})}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={`vn-hero-img ${className}`}
        style={style}
      />
    </picture>
  );
}
