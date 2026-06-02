"use client";
import { useState } from "react";
import { Link } from "@numueg/theme-sdk";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Tech Wave promo banner — faithful port of the V2 in-tree
 * numu-egyptian-bazaar/src/themes/tech-wave/sections/promo-banner/TechWavePromoBanner.tsx
 * (neon glass card, accent badge, neon CTA, framed product image),
 * re-plumbed on the V3 SDK.
 *
 * V2 fell back to a bundled PLACEHOLDER_HERO image when no image was set; in
 * V3 there's no such asset, so we render a neon-gradient placeholder with a
 * bag icon (matching the Vionne promo-banner port) when the image is missing
 * or fails to load.
 */
const TechWavePromoBanner = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const badge = asString(s.badge_text);
  const headline = asString(s.headline) || "عرض خاص";
  const subtitle = asString(s.subtitle) || "تسوق أحدث تشكيلاتنا";
  const ctaText = asString(s.cta_text) || "تسوق الآن";
  const ctaLink = asString(s.cta_link) || "/products";
  const imageUrl = asString(s.image_url);

  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(!imageUrl);

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div
          className="tw-card rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 0 20px hsl(195 100% 50% / 0.08)" }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-10">
            <div className="flex-1 text-center md:text-right">
              {badge && (
                <span className="tw-badge-accent px-3 py-1 rounded-lg text-xs font-bold mb-3 inline-block">
                  {badge}
                </span>
              )}
              <h3 className="text-2xl md:text-3xl font-black mb-2 text-[hsl(var(--foreground))]">
                {headline}
              </h3>
              <p className="text-[hsl(var(--muted-foreground))] text-sm mb-4">
                {subtitle}
              </p>
              <Link
                to={ctaLink}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl tw-neon-btn text-sm relative z-[1]"
              >
                {ctaText}
                <ArrowLeft size={16} />
              </Link>
            </div>
            <div className="relative w-48 h-48 md:w-56 md:h-56 tw-img-frame rounded-xl overflow-hidden shrink-0">
              {imageError ? (
                <div className="w-full h-full store-gradient flex items-center justify-center">
                  <ShoppingBag className="h-16 w-16 text-white/60" />
                </div>
              ) : (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 vn-shimmer" />
                  )}
                  <img
                    src={imageUrl}
                    alt=""
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    onLoad={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechWavePromoBanner;
