"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  asImageUrl,
  asImageTransform,
  applyImageTransform,
  asString,
  localized,
  readBlocks,
  useDemo,
  type SectionRenderProps,
} from "./_shared";

/**
 * emp-hero — faithful V3 port of the V2 Empire hero
 * (numu-egyptian-bazaar/src/themes/empire/sections/hero/EmpHero.tsx):
 * a full-screen BLACK image slideshow with an auto-advancing carousel,
 * a dark bottom gradient, centered-bottom white uppercase headline +
 * tracked subtitle, a rounded-full white-outline CTA, dot indicators and
 * prev/next arrows. This is Empire's signature — premium editorial, not the
 * playful split layout it inherited from the Bazar structural clone.
 *
 * Slides come from the merchant's `hero_image_url` plus any `slide` blocks
 * (image + headline + subtitle). With a single image it renders as a still
 * hero (chrome hidden). In marketplace-preview (demo) it shows showcase
 * fallback slides so the theme looks alive before configuration.
 */

const FALLBACK_SLIDES = [
  { image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80", title: "DISCOVER THE NEW COLLECTION", sub: "Shop the latest drop" },
  { image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80", title: "FEATURED PRODUCTS", sub: "Discover what's new" },
  { image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80", title: "LATEST ARRIVALS", sub: "Shop the collection" },
];

interface Slide {
  image: string;
  title: string;
  sub: string;
  transform?: ReturnType<typeof asImageTransform>;
}

const EmpHero = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const demo = useDemo();

  const headline = asString(s.headline) || localized(locale, "Discover the New Collection", "اكتشف التشكيلة الجديدة");
  const subtitle =
    asString(s.subtitle) || asString(s.subline) || localized(locale, "Shop the latest drop", "تسوّق أحدث وصل");
  const ctaText = asString(s.cta_text) || localized(locale, "Shop Now", "تسوّق الآن");
  const ctaLink = asString(s.cta_link) || "/products";
  const heroImage = asImageUrl(s.hero_image_url) || asImageUrl(s.image_url);
  const heroTransform =
    asImageTransform(s.hero_image_url) || asImageTransform(s.image_url);

  // Extra slides via repeatable `slide` blocks (image / headline / subtitle).
  const slideBlocks = readBlocks(instance, "slide").map((b) => ({
    image: asImageUrl(b.image) || asImageUrl(b.image_url),
    title: asString(b.headline) || headline,
    sub: asString(b.subtitle) || subtitle,
    transform: asImageTransform(b.image) || asImageTransform(b.image_url),
  }));

  // Build the slide set: merchant hero (+ extra blocks). Demo preview falls
  // back to the showcase slides so the carousel isn't empty pre-config.
  let slides: Slide[] = [];
  if (heroImage) slides.push({ image: heroImage, title: headline, sub: subtitle, transform: heroTransform });
  slides.push(...slideBlocks.filter((b) => b.image));
  if (slides.length === 0) {
    slides = demo
      ? FALLBACK_SLIDES.map((f) => ({ ...f }))
      : [{ image: "", title: headline, sub: subtitle }];
  }

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const count = slides.length;

  const goTo = useCallback((idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);
  const next = useCallback(() => {
    setDirection(1);
    setCurrent((p) => (p + 1) % count);
  }, [count]);
  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((p) => (p - 1 + count) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, count]);

  const slide = slides[Math.min(current, count - 1)];
  const multi = count > 1;

  const variants = {
    enter: (dir: number) => ({ opacity: 0, scale: 1.05, x: dir > 0 ? 60 : -60 }),
    center: { opacity: 1, scale: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, scale: 0.98, x: dir > 0 ? -60 : 60 }),
  };

  return (
    <section
      className="relative h-[100vh] min-h-[600px] max-h-[900px] overflow-hidden bg-black"
      data-emp-section={sectionId}
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {slide.image ? (
            <img
              src={slide.image}
              alt=""
              className="w-full h-full object-cover"
              style={applyImageTransform(slide.transform, "cover")}
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-black" />
          )}
          {/* Dark bottom gradient (emp-hero-overlay) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </motion.div>
      </AnimatePresence>

      {/* Content — centered at the bottom, V2 Empire signature */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-end pb-16 md:pb-24 text-center px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-white font-black text-4xl md:text-6xl lg:text-7xl uppercase tracking-tight leading-[0.95] mb-3">
              {slide.title}
            </h1>
            <p className="text-white/70 text-sm md:text-base uppercase tracking-widest mb-8">
              {slide.sub}
            </p>
            <Link
              to={ctaLink}
              className="inline-block px-10 py-3.5 border-2 border-white text-white text-sm font-semibold uppercase tracking-wider rounded-full hover:bg-white hover:text-black transition-all duration-300"
            >
              {ctaText}
            </Link>
          </motion.div>
        </AnimatePresence>

        {multi && (
          <div className="flex items-center gap-2 mt-10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === current ? "bg-white scale-110" : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {multi && (
        <>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute end-4 md:end-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight size={28} className="rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="absolute start-4 md:start-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={28} className="rtl:rotate-180" />
          </button>
        </>
      )}
    </section>
  );
};

export default EmpHero;
