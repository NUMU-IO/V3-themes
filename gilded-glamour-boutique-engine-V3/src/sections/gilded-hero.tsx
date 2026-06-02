"use client";
import { useRef } from "react";
import { Link } from "@numueg/theme-sdk";
import { motion, useScroll, useTransform } from "framer-motion";
import { asString, type SectionRenderProps } from "./_shared";

const GildedHero = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};

  const headline = asString(s.headline) || "THE NEW EMPIRE";
  const subtitle = asString(s.subtitle) || "Curated Excellence & Timeless Precision";
  const ctaText = asString(s.cta_text) || "Discover Collection";
  const ctaLink = asString(s.cta_link) || "/products";
  const heroImageUrl = asString(s.hero_image_url) || undefined;
  const heroImageUrlMobile = asString(s.hero_image_mobile) || undefined;
  // When the merchant uploads a mobile-specific image, treat it as
  // intentionally portrait-cropped art and render it cover-fit in a tall
  // container. When they only have a desktop image, fall back to natural
  // aspect on mobile so a wide banner isn't crushed/cropped.
  const mobileImage = heroImageUrlMobile || heroImageUrl;
  const hasMobileArt = Boolean(heroImageUrlMobile);
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
      className="relative w-full overflow-hidden bg-foreground md:min-h-[80vh] md:h-screen"
    >
      {/* Mobile background.
          - If the merchant uploaded a mobile-specific image, render it
            cover-fit in a tall portrait container — they've designed art
            for this aspect, so cropping is what they want.
          - Otherwise the desktop image renders in-flow at its natural
            aspect, so wide banners aren't cropped or letterboxed. */}
      <div className="relative md:hidden">
        {hasMobileArt ? (
          <div className="aspect-[4/5] w-full overflow-hidden">
            <img
              src={mobileImage}
              alt={headline}
              className="w-full h-full object-contain"
            />
          </div>
        ) : mobileImage ? (
          <img
            src={mobileImage}
            alt={headline}
            className="block w-full h-auto"
          />
        ) : (
          <div
            className="aspect-[4/5] w-full"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--gold-dark)), hsl(var(--foreground)))",
            }}
          />
        )}
        <div className="absolute inset-0 bg-foreground/40 pointer-events-none" />
      </div>

      {/* Desktop parallax background — full-bleed cover with scroll-linked translate. */}
      <motion.div
        style={enableParallax ? { y } : undefined}
        className="hidden md:block absolute inset-0"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--gold-dark)), hsl(var(--foreground)))",
          }}
        />
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt=""
            aria-hidden="true"
            className="relative w-full h-full object-contain"
          />
        ) : null}
        <div className="absolute inset-0 bg-foreground/40" />
      </motion.div>

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
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-4 sm:mt-6 text-[10px] sm:text-sm md:text-base tracking-[0.15em] sm:tracking-[0.3em] uppercase text-card/90 font-light px-2"
        >
          {subtitle}
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
              className="inline-block px-6 sm:px-10 py-3 sm:py-4 bg-[hsl(var(--gold))] text-foreground text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase font-semibold hover:scale-[1.04] transition-all duration-200 ease-out"
            >
              {ctaText}
            </Link>
          </motion.div>
        )}
      </motion.div>
    </section>
  );
};

export default GildedHero;
