"use client";
import { useState } from "react";
import { Link, useLocale } from "@numueg/theme-sdk";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import {
  applyImageTransform,
  asImageTransform,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";

/** Read an image-picker value's URL. The editor stores it as a plain URL string
 *  (legacy / no-transform) or as `{ url, alt?, transform }` once a focal/zoom/
 *  rotation is set. asString() can't see the object's url, so resolve it here. */
function imagePickerUrl(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string") {
    return (v as { url: string }).url;
  }
  return "";
}

/**
 * Luxury Minimal promo-banner — faithful port of the V2 LuxPromoBanner
 * (bordered split panel: image left / centered-right content with badge,
 * headline, subtitle, filled CTA). V2 className strings kept verbatim.
 * Re-plumbed on the V3 SDK `Link`.
 */
export default function LuxPromoBanner({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const badge = asString(s.badge_text) || localized(locale, "Limited Offer", "عرض محدود");
  const headline =
    asString(s.headline) ||
    localized(locale, "25% Off All Accessories", "خصم ٢٥٪ على كل الإكسسوارات");
  const subtitle =
    asString(s.subtitle) ||
    localized(locale, "Offer ends this month. Don't miss out!", "العرض ساري لنهاية الشهر. متفوتش الفرصة!");
  const ctaText = asString(s.cta_text) || localized(locale, "Shop Now", "تسوق الآن");
  const ctaLink = asString(s.cta_link) || "/products?category=accessories";
  const imageUrl = imagePickerUrl(s.image_url) || asString(s.image_url);
  // Non-destructive focal/zoom/rotation. Undefined → image renders unchanged.
  const imageTransform = asImageTransform(s.image_url);

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
                  style={applyImageTransform(imageTransform, "cover")}
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
