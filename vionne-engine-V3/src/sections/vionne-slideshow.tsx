"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import { asImageUrl, asString, type SectionRenderProps } from "./_shared";

const HEIGHT_DESKTOP: Record<string, string> = {
  small: "min-h-[400px] md:min-h-[450px]",
  medium: "min-h-[500px] md:min-h-[550px]",
  large: "min-h-[550px] md:min-h-[600px]",
  full: "min-h-screen",
};

interface Slide {
  image: string;
  headline: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

const SWIPE_THRESHOLD = 60;

const VionneSlideshow = ({ instance }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const autoplay = s.autoplay !== false;
  const interval = Math.max(2, Number(s.interval ?? 10)) * 1000;
  const heightClass = HEIGHT_DESKTOP[asString(s.height, "large")] ?? HEIGHT_DESKTOP.large;

  const alignment = asString(s.text_alignment, "start") as "start" | "center";

  // Merchant-uploaded slide images arrive as `{ url, alt }` objects; pull the
  // URL via asImageUrl so they render (raw object → broken image, the "green
  // blob" the merchant saw). Text coerced so a bound field can't crash a slide.
  // Subtitle uses one shared class for every slide, so sizing stays uniform.
  const slides: Slide[] = [];
  for (let i = 1; i <= 3; i++) {
    const image = asImageUrl(s[`slide_${i}_image`]);
    const headline = asString(s[`slide_${i}_headline`]);
    if (!image && !headline) continue;
    slides.push({
      image,
      headline,
      subtitle: asString(s[`slide_${i}_subtitle`]),
      ctaText: asString(s[`slide_${i}_cta_text`]),
      ctaLink: asString(s[`slide_${i}_cta_link`], "/products"),
    });
  }

  const [current, setCurrent] = useState(0);
  const count = slides.length || 1;

  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + count) % count), [count]);

  useEffect(() => {
    if (!autoplay || count <= 1) return;
    const t = window.setInterval(next, interval);
    return () => window.clearInterval(t);
  }, [autoplay, interval, count, next]);

  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  if (slides.length === 0) {
    return (
      <section className={`relative w-full ${heightClass} bg-muted flex items-center justify-center`}>
        <p className="vn-eyebrow text-muted-foreground">Add slides in the theme editor</p>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured slides"
      className={`relative w-full ${heightClass} overflow-hidden bg-[var(--vn-band)]`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {slides.map((sl, i) => {
        const isActive = i === current;
        const isFirst = i === 0;
        return (
          <div
            key={i}
            // `inert` (HTML5) hides the subtree from sequential focus AND
            // assistive tech without needing tabIndex={-1} on every Link.
            // aria-hidden alone leaves CTAs focusable.
            {...(!isActive ? { inert: "" as unknown as undefined } : {})}
            className={`vn-slide ${isActive ? "is-active" : ""}`}
          >
            {sl.image ? (
              <img
                src={sl.image}
                alt={sl.headline || `Slide ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover"
                // First slide is the LCP; eager + high priority. Others
                // are below the fold visually (CSS-stacked) and can wait.
                loading={isFirst ? "eager" : "lazy"}
                fetchPriority={isFirst ? "high" : "low"}
                decoding={isFirst ? "sync" : "async"}
              />
            ) : (
              <div className="absolute inset-0 vn-shimmer" />
            )}
            <div className="vn-slide-overlay" />
            <div
              className={`absolute z-10 flex flex-col px-6 md:px-10 ${
                alignment === "center"
                  ? "inset-x-0 bottom-12 md:bottom-16 items-center text-center"
                  : "start-0 bottom-10 md:bottom-14 max-w-[640px] items-start text-start"
              }`}
            >
              {sl.headline && (
                <h2
                  className="vn-heading text-white text-3xl md:text-5xl lg:text-6xl"
                >
                  {sl.headline}
                </h2>
              )}
              {sl.subtitle && (
                <p
                  className="text-white/85 text-sm md:text-base mt-3 max-w-xl"
                >
                  {sl.subtitle}
                </p>
              )}
              {sl.ctaText && (
                <Link
                  to={sl.ctaLink || "/products"}
                  className="vn-btn vn-btn-outline-light mt-6"
                >
                  {sl.ctaText}
                </Link>
              )}
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`vn-slide-dot ${i === current ? "is-active" : ""}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default VionneSlideshow;
