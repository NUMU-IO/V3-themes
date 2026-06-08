"use client";
import { useRef } from "react";
import { Link, useLocale } from "@numueg/theme-sdk";
import { motion, useScroll, useTransform } from "framer-motion";
import { asString, localized, type SectionRenderProps } from "./_shared";

const GildedPromoBanner = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const heading = asString(s.headline) || localized(locale, "WHERE HERITAGE MEETS THE FUTURE", "حيث يلتقي التراث بالمستقبل");
  const body =
    asString(s.subtitle) ||
    localized(
      locale,
      "Every thread tells a story, every silhouette commands a room, and every piece is destined to become an heirloom.",
      "كل خيط بيحكي حكاية، وكل تصميم بيخطف الأنظار، وكل قطعة مقدّر لها تبقى إرث يتوارث.",
    );
  const ctaText = asString(s.cta_text);
  const ctaLink = asString(s.cta_link) || "/products";

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.3"],
  });

  const clipPath = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]
  );

  return (
    <section className="py-16 md:py-24 lg:py-40">
      <div className="container mx-auto px-4 text-center">
        <div
          ref={ref}
          className="relative text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold tracking-[0.04em] sm:tracking-[0.08em] uppercase break-words"
        >
          <span className="text-muted-foreground/50 select-none">{heading}</span>
          <motion.span
            style={{ clipPath }}
            className="absolute inset-0 text-[hsl(var(--gold))]"
          >
            {heading}
          </motion.span>
        </div>
        {body && (
          <p className="mt-6 md:mt-8 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {body}
          </p>
        )}
        {ctaText && (
          <Link
            to={ctaLink}
            className="inline-block mt-6 md:mt-8 px-6 sm:px-8 py-2.5 sm:py-3 border border-[hsl(var(--gold))] text-foreground text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.15em] uppercase font-medium hover:bg-[hsl(var(--gold))] hover:text-foreground transition-all duration-300"
          >
            {ctaText}
          </Link>
        )}
      </div>
    </section>
  );
};

export default GildedPromoBanner;
