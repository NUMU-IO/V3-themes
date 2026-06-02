"use client";
import { Link } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal hero — faithful port of the V2 LuxHero
 * (numu-egyptian-bazaar/src/themes/luxury-minimal/sections/hero/LuxHero.tsx):
 * split 2-col layout, image left / content right, all className strings kept
 * verbatim. Re-plumbed on the V3 SDK `Link`.
 */
export default function LuxHero({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};

  const headline = asString(s.headline) || "اكتشف فن الأناقة الراقية";
  const subtitle =
    asString(s.subtitle) ||
    "تشكيلة مميزة من الملابس والإكسسوارات بتصميم عصري وجودة عالية";
  const ctaText = asString(s.cta_text) || "تسوق الآن";
  const ctaLink = asString(s.cta_link) || "/products";
  const heroImageUrl = asString(s.hero_image_url);
  const badgeText = asString(s.badge_text) || "مجموعة جديدة";

  return (
    <section className="relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[70vh] items-center">
          {/* Left: Image */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="hidden md:block h-full"
          >
            <div className="h-full bg-[hsl(var(--lux-gray))]">
              {heroImageUrl && (
                <img
                  src={heroImageUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="py-16 md:py-20 md:pr-16"
          >
            {badgeText && (
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6">
                {badgeText}
              </p>
            )}
            {headline && (
              <h1 className="lux-heading text-3xl md:text-4xl text-foreground mb-6 leading-relaxed">
                {headline}
              </h1>
            )}
            {subtitle && (
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-sm">
                {subtitle}
              </p>
            )}
            {ctaText && (
              <Link to={ctaLink} className="inline-flex items-center gap-2 lux-btn">
                {ctaText} <ArrowLeft size={14} />
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
