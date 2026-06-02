"use client";
import { useState } from "react";
import { Link } from "@numueg/theme-sdk";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal promo-banner — faithful port of the V2 LuxPromoBanner
 * (bordered split panel: image left / centered-right content with badge,
 * headline, subtitle, filled CTA). V2 className strings kept verbatim.
 * Re-plumbed on the V3 SDK `Link`.
 */
export default function LuxPromoBanner({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const badge = asString(s.badge_text) || "عرض محدود";
  const headline = asString(s.headline) || "خصم ٢٥٪ على كل الإكسسوارات";
  const subtitle = asString(s.subtitle) || "العرض ساري لنهاية الشهر. متفوتش الفرصة!";
  const ctaText = asString(s.cta_text) || "تسوق الآن";
  const ctaLink = asString(s.cta_link) || "/products?category=accessories";
  const imageUrl = asString(s.image_url);

  const [imageError, setImageError] = useState(false);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="border border-foreground/10 overflow-hidden">
          <div className="flex flex-col md:flex-row items-stretch">
            {/* Image */}
            <div className="w-full md:w-2/5 aspect-[4/3] md:aspect-auto bg-[hsl(var(--muted))]">
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-foreground/5">
                  <ShoppingBag className="h-16 w-16 text-foreground/20" />
                </div>
              )}
            </div>
            {/* Content */}
            <div className="flex-1 flex flex-col justify-center p-8 md:p-12 text-center md:text-right">
              {badge && (
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4 block">
                  {badge}
                </span>
              )}
              <h3 className="text-2xl md:text-3xl font-light tracking-tight mb-3">{headline}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md md:me-0 md:ms-auto">{subtitle}</p>
              <div>
                <Link
                  to={ctaLink}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-background text-xs uppercase tracking-[0.2em] font-medium hover:opacity-80 transition-opacity"
                >
                  {ctaText}
                  <ArrowLeft size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
