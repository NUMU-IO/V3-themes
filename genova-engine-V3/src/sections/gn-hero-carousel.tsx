/**
 * gn-hero-carousel — the campaign poster at the top of the homepage.
 *
 * Reference behaviour: a large image-led carousel filling most of the first
 * viewport, small NUMBERED pagination bottom-end (1 · 2 · 3), no prev/next
 * arrows, autoplay, keyboard, swipe, and a clean crossfade or slide. The header
 * sits on top of it.
 *
 * Three things this must not get wrong:
 *
 *  - **LCP.** The first slide is almost always the page's largest paintable
 *    element. It renders eagerly with `fetchpriority="high"`; every other slide
 *    is lazy. Getting this backwards costs a second of LCP on mobile.
 *  - **CLS.** The frame has a fixed height from CSS (never from the image), and
 *    slides are absolutely stacked, so switching slides cannot reflow anything.
 *  - **Motion off.** With `enableAnimations` off or reduced-motion on, autoplay
 *    stops and slide 1 renders FINISHED — visible, not a hidden pre-state
 *    waiting for a transition that will never run.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "@numueg/theme-sdk";
import { asBool, asImageAlt, asImageUrl, asNumber, asString } from "@numueg/theme-kit";
import {
  cx,
  readBlockNodes,
  useDemo,
  useInsideEditor,
  useMotionOn,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";

interface Slide {
  id: string;
  image: string;
  imageMobile: string;
  alt: string;
  eyebrow: string;
  headline: string;
  subline: string;
  ctaText: string;
  ctaLink: string;
  light: boolean;
  /** Optional per-slide overrides. Empty = use the light/dark preset. */
  textColor: string;
  ctaBg: string;
  ctaFg: string;
}

/**
 * Marketplace-preview slides. Gated on `useDemo()`, which is true ONLY in the
 * "Try theme" preview — an installed store with no slides configured shows the
 * editor prompt instead, never a stock photo of someone else's denim.
 */
const DEMO_SLIDES: Slide[] = [
  {
    id: "demo-1",
    image: "",
    imageMobile: "",
    alt: "",
    eyebrow: "Summer 26",
    headline: "Built for the way you actually wear denim",
    subline: "",
    ctaText: "Shop now",
    ctaLink: "/products",
    light: true,
    textColor: "",
    ctaBg: "",
    ctaFg: "",
  },
];

export default function GnHeroCarousel({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const demo = useDemo();
  const insideEditor = useInsideEditor();
  const motionOn = useMotionOn();
  const regionId = useId();

  const authored: Slide[] = readBlockNodes(instance, "slide").map((node, i) => {
    const b = node.settings;
    return {
      id: `slide-${i}`,
      image: asImageUrl(b.image),
      imageMobile: asImageUrl(b.image_mobile),
      alt: asImageAlt(b.image, asString(b.headline)),
      eyebrow: asString(b.eyebrow),
      headline: asString(b.headline),
      subline: asString(b.subline),
      ctaText: asString(b.cta_text),
      ctaLink: asString(b.cta_link, "/products"),
      light: asString(b.text_color, "light") !== "dark",
      textColor: asString(b.custom_text_color),
      ctaBg: asString(b.cta_bg_color),
      ctaFg: asString(b.cta_text_color),
    };
  });

  const slides = authored.length > 0 ? authored : demo ? DEMO_SLIDES : [];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      // Wrap in both directions — `-1 % n` is negative in JS.
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const autoplay = asBool(s.autoplay, true) && motionOn && count > 1 && !paused;
  const interval = Math.max(3, asNumber(s.interval, 6)) * 1000;

  useEffect(() => {
    if (!autoplay) return;
    const id = setTimeout(() => go(index + 1), interval);
    return () => clearTimeout(id);
  }, [autoplay, index, interval, go]);

  // Nothing configured. The prompt is for the MERCHANT and must never reach a
  // shopper — `gn-editorial-banner` and `gn-instagram-grid` both gate theirs on
  // `useInsideEditor()` and this one did not, so a seeded store with no slides
  // rendered "ADD A SLIDE TO THIS SECTION" above the fold on the live home page.
  // Off the editor: render nothing at all rather than an empty band.
  if (count === 0) {
    return insideEditor ? (
      <section className="gn-hero gn-hero-empty" aria-label={t("hero.label", "Campaign")}>
        <div className="gn-container gn-hero-empty-inner">
          <p className="gn-label">{t("hero.empty", "Add a slide to this section")}</p>
        </div>
      </section>
    ) : null;
  }

  const height = asString(s.height, "full");
  const transition = asString(s.transition, "fade");
  const textPosition = asString(s.text_position, "bottom-start");
  const overlay = asNumber(s.overlay_opacity, 25) / 100;

  return (
    <section
      className={cx("gn-hero", `is-${height}`, `is-${transition}`)}
      aria-roledescription="carousel"
      aria-label={t("hero.label", "Campaign")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(dx) < 40) return;
        go(dx < 0 ? index + 1 : index - 1);
      }}
    >
      <div
        className="gn-hero-frame"
        id={regionId}
        aria-live={autoplay ? "off" : "polite"}
        style={
          transition === "slide"
            ? { ["--gn-hero-offset" as string]: `${-index * 100}%` }
            : undefined
        }
      >
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.id}
              className={cx("gn-hero-slide", active && "is-active", slide.light && "is-light")}
              // Inactive slides are hidden from AT, and their only focusable
              // child (the CTA) is taken out of the tab order below.
              //
              // Deliberately NOT using `inert`: React 18 warns on it as an
              // unknown non-boolean attribute while React 19 treats it as a
              // real boolean, and a federated theme runs against whichever
              // React the HOST serves. aria-hidden + tabIndex behave the same
              // on both.
              aria-hidden={active ? undefined : true}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              // Per-slide colour overrides, as custom properties so the CSS
              // keeps one source of truth and an unset value simply falls back
              // to the light/dark preset. Hero copy sits on PHOTOGRAPHY, which
              // is the one place a fixed palette genuinely cannot know what is
              // legible — so this is merchant-controlled even though the rest
              // of the theme is not (plan D1).
              style={
                slide.textColor || slide.ctaBg || slide.ctaFg
                  ? ({
                      ...(slide.textColor
                        ? { ["--gn-hero-text" as string]: slide.textColor }
                        : {}),
                      ...(slide.ctaBg ? { ["--gn-hero-cta-bg" as string]: slide.ctaBg } : {}),
                      ...(slide.ctaFg ? { ["--gn-hero-cta-fg" as string]: slide.ctaFg } : {}),
                    })
                  : undefined
              }
            >
              {slide.image ? (
                <picture>
                  {slide.imageMobile && (
                    <source media="(max-width: 768px)" srcSet={slide.imageMobile} />
                  )}
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    // Slide 1 is the LCP element on almost every visit.
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding={i === 0 ? "sync" : "async"}
                    // Lowercase via a spread, NOT the camelCase `fetchPriority`
                    // prop. React 19 understands the camelCase form but React 18
                    // rejects it as an unknown prop and DROPS the attribute —
                    // silently losing the LCP hint — while warning in the SSR
                    // worker. A federated theme runs against whatever React the
                    // host serves, so only the real HTML attribute name is safe
                    // on both.
                    {...(i === 0 ? { fetchpriority: "high" } : {})}
                  />
                </picture>
              ) : (
                <div className="gn-hero-placeholder" aria-hidden="true" />
              )}

              {overlay > 0 && slide.image && (
                <div
                  className="gn-hero-scrim"
                  aria-hidden="true"
                  style={{ opacity: overlay }}
                />
              )}

              {(slide.eyebrow || slide.headline || slide.subline || slide.ctaText) && (
                <div className={cx("gn-hero-copy", `is-${textPosition}`)}>
                  {slide.eyebrow && <p className="gn-label gn-hero-eyebrow">{slide.eyebrow}</p>}
                  {slide.headline &&
                    (i === 0 ? (
                      <h1 className="gn-hero-headline">{slide.headline}</h1>
                    ) : (
                      // Only ONE <h1> per page — later slides are <p> styled the
                      // same, so heading order stays valid however many slides
                      // a merchant adds.
                      <p className="gn-hero-headline">{slide.headline}</p>
                    ))}
                  {slide.subline && <p className="gn-hero-subline">{slide.subline}</p>}
                  {slide.ctaText && (
                    <Link
                      to={slide.ctaLink}
                      className="gn-btn gn-hero-cta gn-on-media"
                      tabIndex={active ? undefined : -1}
                    >
                      {slide.ctaText}
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {asBool(s.show_pagination, true) && count > 1 && (
        <div className="gn-hero-pagination" role="tablist" aria-label={t("hero.slides", "Slides")}>
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-controls={regionId}
              className={cx("gn-hero-dot", "gn-on-media", i === index && "is-active")}
              onClick={() => go(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
