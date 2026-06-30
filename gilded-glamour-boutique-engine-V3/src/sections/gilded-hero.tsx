"use client";

import { useRef } from "react";
import { HeroMedia, Link, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  asImageAlt,
  asImageTransform,
  asImageUrl,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * gilded-hero — faithful V3 port of the V2 GildedHero
 * (numu-egyptian-bazaar/src/themes/gilded-glamour-boutique/sections/hero/GildedHero.tsx).
 *
 * Full-screen parallax hero (`md:h-screen min-h-[80vh]`). The merchant hero image
 * renders `object-cover` — it FILLS the hero, cropped to the merchant's focal point
 * (Adjust) — so the gold→ink gradient only shows as a fallback until an image is set;
 * a dark `bg-foreground/40` overlay keeps the white text legible. One `<picture>`
 * art-directs the image: on mobile it fills a 4:5 portrait box (the mobile image when
 * set, else the desktop image cover-cropped to that 4:5 box); full-screen on desktop.
 * Centered content: a Montserrat
 * uppercase wide-tracked H1, an uppercase letter-spaced subtitle, and a gold-fill
 * CTA that scales on hover. Stagger delays 0.2 / 0.5 / 0.8s, matching V2 verbatim.
 *
 * Engine-wired: useResolvedSettings (global tokens + dynamic sources + draft
 * preview), bilingual defaults via localized(), InlineEditable on every
 * section-level text field, and non-destructive image transforms.
 */
export default function GildedHero({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();

  const headline =
    asString(s.headline) || localized(locale, "THE NEW EMPIRE", "الإمبراطورية الجديدة");
  const subtitle =
    asString(s.subtitle) ||
    localized(
      locale,
      "Curated Excellence & Timeless Precision",
      "تميّز منتقى بعناية وإتقان لا يعرف الزمن",
    );
  const ctaText = asString(s.cta_text) || localized(locale, "Discover Collection", "اكتشف التشكيلة");
  const ctaLink = asString(s.cta_link) || "/products";

  const heroImageUrl = asImageUrl(s.hero_image_url) || undefined;
  // Mobile art is default-ON for gilded (its hero was designed dual-image);
  // the merchant can switch it off to reuse the desktop image on phones.
  const mobileEnabled = s.use_mobile_image !== false;
  const heroImageMobile = mobileEnabled ? asImageUrl(s.hero_image_mobile) || undefined : undefined;
  // Hero image fills via object-cover: a mobile image frames the 4:5 box cleanly;
  // with none, the desktop image is cover-cropped to 4:5 (merchant sets a mobile
  // image for tighter framing) — matches the merchant's "fill the hero" expectation.
  const heroAlt = asImageAlt(s.hero_image_url);
  // Non-destructive image transforms (focal/zoom/rotation). With no saved
  // transform asImageTransform → undefined, so the image renders unchanged.
  const heroImageTransform = asImageTransform(s.hero_image_url);
  const heroImageMobileTransform = asImageTransform(s.hero_image_mobile);
  const enableParallax = s.enable_parallax !== false;

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      data-gilded-section={sectionId}
      className="relative w-full overflow-hidden bg-foreground md:min-h-[80vh] md:h-screen"
    >
      {/* Gold→ink gradient background (kept as-is). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--gold-dark)), hsl(var(--foreground)))",
        }}
      />

      {/* Unified hero image — one <picture> (art direction) replaces the former
          dual-<img>: portrait 4:5 on mobile, full-screen on desktop. Parallax
          rides the same layer. */}
      <motion.div
        style={enableParallax ? { y } : undefined}
        className="relative aspect-[4/5] md:aspect-auto md:h-screen w-full"
      >
        {heroImageUrl && (
          <HeroMedia
            src={heroImageUrl}
            alt={heroAlt}
            transform={heroImageTransform}
            mobileSrc={heroImageMobile}
            mobileTransform={heroImageMobileTransform}
            fit="cover"
            mobileAspect="4/5"
            priority
            className="w-full h-full"
          />
        )}
      </motion.div>

      {/* Dark overlay (kept as-is). */}
      <div className="absolute inset-0 bg-foreground/40 pointer-events-none" />

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full h-full text-center px-4"
      >
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-[0.04em] sm:tracking-[0.08em] text-card uppercase"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} />
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-4 sm:mt-6 text-[10px] sm:text-sm md:text-base tracking-[0.15em] sm:tracking-[0.3em] uppercase text-card/90 font-light px-2"
        >
          <InlineEditable
            sectionId={sectionId}
            settingKey="subtitle"
            value={subtitle}
            multiline
          />
        </motion.p>
        {ctaText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-8 sm:mt-10"
          >
            <Link
              to={ctaLink}
              className="inline-block px-6 sm:px-10 py-3 sm:py-4 bg-gold text-foreground text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold hover:scale-[1.04] transition-all duration-200 ease-out"
            >
              <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
            </Link>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
