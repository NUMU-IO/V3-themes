"use client";
import { Link } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { type SectionRenderProps } from "./_shared";

/**
 * Modern hero — faithful port of the V2 in-tree ModernHero
 * (numu-egyptian-bazaar/src/themes/modern/sections/hero/ModernHero.tsx),
 * re-plumbed on the V3 SDK. All Tailwind classNames are kept verbatim; the
 * only changes are the SDK `Link` (was react-router) and reading settings off
 * `instance.settings` instead of `section.settings`.
 */
const ModernHero = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const badge = s.badge_text ?? "وصل حديثاً";
  const headline = s.headline ?? "اكتشف أحلى المنتجات بأفضل الأسعار";
  const subtitle =
    s.subtitle ??
    "تشكيلة مميزة من الملابس والإكسسوارات بتوصيل لكل مصر. جودة عالية وأسعار مناسبة.";
  const ctaText = s.cta_text ?? "تسوق الآن";
  const ctaLink = s.cta_link ?? "/products";
  const secondaryText = s.secondary_text ?? "تصفح الفئات";
  const secondaryLink = s.secondary_link ?? "/products?category=clothing";
  const heroImage = s.hero_image_url as string | undefined;

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] overflow-hidden">
      {/* Background image with gradient overlay */}
      {heroImage ? (
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/50 to-black/70" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary)/0.15)] via-[hsl(var(--hero-bg))] to-[hsl(var(--primary)/0.08)]" />
      )}

      {/* Content */}
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full py-16 md:py-24">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center md:text-right"
          >
            {badge && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-block px-5 py-2 rounded-full bg-primary/15 text-primary text-sm font-bold mb-6 backdrop-blur-sm border border-primary/20"
              >
                {badge}
              </motion.span>
            )}

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
              style={{
                color: heroImage ? "white" : "hsl(var(--foreground))",
                textShadow: heroImage
                  ? "0 2px 20px rgba(0,0,0,0.3)"
                  : "none",
              }}
            >
              {headline}
            </h1>

            <p
              className="text-base md:text-lg mb-8 max-w-lg leading-relaxed"
              style={{
                color: heroImage
                  ? "rgba(255,255,255,0.85)"
                  : "hsl(var(--muted-foreground))",
              }}
            >
              {subtitle}
            </p>

            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <Link
                to={ctaLink}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl store-gradient text-white font-bold text-base hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {ctaText}
                <ArrowLeft size={18} />
              </Link>
              {secondaryText && (
                <Link
                  to={secondaryLink}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 font-bold text-base transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    borderColor: heroImage
                      ? "rgba(255,255,255,0.4)"
                      : "hsl(var(--primary))",
                    color: heroImage
                      ? "white"
                      : "hsl(var(--primary))",
                    backgroundColor: "transparent",
                  }}
                >
                  {secondaryText}
                </Link>
              )}
            </div>
          </motion.div>

          {/* Right side — decorative element on non-image heroes */}
          {!heroImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="hidden md:flex items-center justify-center"
            >
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-primary/5" />
                <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary/20 to-transparent" />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Decorative blurs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
};

export default ModernHero;
