"use client";
import { Link } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Editorial hero — faithful port of V2 themes/editorial/sections/hero/EdHero.tsx.
 * Bold green full-bleed band, oversized uppercase headline, optional image side.
 */
export default function EdHero({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const headline = asString(s.headline) || "Discover the latest\nfashion trends";
  const subtitle =
    asString(s.subtitle) || "A curated collection of the finest global brands";
  const ctaText = asString(s.cta_text) || "Shop the Collection";
  const ctaLink = asString(s.cta_link) || "/products";
  const heroImage = asString(s.hero_image_url);

  return (
    <section className="relative overflow-hidden bg-[hsl(var(--ed-green))]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh] items-center">
          {/* Copy side */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="py-12 md:py-20"
          >
            <h1 className="ed-hero-title text-white mb-6">
              {headline}
            </h1>
            <p className="text-white/70 text-base md:text-lg mb-8 max-w-sm">
              {subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={ctaLink}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[hsl(var(--ed-dark))] font-bold text-xs uppercase tracking-[0.15em] hover:bg-white/90 transition-colors"
              >
                {ctaText} <ArrowLeft size={16} />
              </Link>
            </div>
          </motion.div>

          {/* Image side */}
          {heroImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden md:block relative h-full"
            >
              <img
                src={heroImage}
                alt=""
                className="w-full h-full object-contain"
              />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
