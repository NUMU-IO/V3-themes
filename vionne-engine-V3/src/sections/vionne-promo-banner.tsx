"use client";
import { useEffect, useState } from "react";
import { Link, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { applyImageTransform, asImageTransform, asImageUrl, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

export default function PromoBanner({ instance, sectionId }: SectionRenderProps) {
  const locale = useLocale();
  const s = useResolvedSettings(instance);
  const badge = asString(s.badge_text);
  const headline = asString(s.headline) || localized(locale, "Special Offer", "عرض خاص");
  const subtitle = asString(s.subtitle) || localized(locale, "Shop our latest collection", "اكتشفي أحدث تشكيلة");
  const ctaText = asString(s.cta_text) || localized(locale, "Shop Now", "تسوّقي دلوقتي");
  const ctaLink = asString(s.cta_link) || "/products";
  // image_picker stores either a plain URL (legacy) or an `{ url, transform }`
  // object (once the merchant uses Adjust/focal). asString returns "" for the
  // object shape, which flipped imageError on and showed the placeholder bag
  // even though an image was set — use asImageUrl so both shapes render.
  const imageUrl = asImageUrl(s.image_url);
  const imageTransform = asImageTransform(s.image_url);

  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(!imageUrl);

  // `imageError`/`imageLoading` are seeded from `useState` on FIRST render only.
  // In the live editor the section re-renders (applyDraft) when the merchant
  // picks an image — without this the stale `imageError` stayed `true` and the
  // placeholder bag kept showing even though `image_url` was now set (the image
  // "not being set" bug). Re-sync both whenever the resolved URL changes.
  useEffect(() => {
    if (imageUrl) {
      setImageError(false);
      setImageLoading(true);
    } else {
      setImageError(true);
      setImageLoading(false);
    }
  }, [imageUrl]);

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="relative rounded-2xl overflow-hidden bg-primary/5 border border-primary/20">
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 md:p-10">
            <div className="flex-1 text-center md:text-right">
              {badge && (
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                  <InlineEditable sectionId={sectionId} settingKey="badge_text" value={badge} />
                </span>
              )}
              <h3 className="text-2xl md:text-3xl font-black mb-2 text-foreground">
                <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} />
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
              </p>
              <Link to={ctaLink} className="vn-btn vn-btn-filled shadow-md">
                <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
                <ArrowLeft size={16} className="rtl:rotate-180" />
              </Link>
            </div>
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-lg shrink-0">
              {imageError ? (
                <div className="w-full h-full store-gradient flex items-center justify-center">
                  <ShoppingBag className="h-16 w-16 text-white/60" />
                </div>
              ) : (
                <>
                  {imageLoading && (
                    <div className="absolute inset-0 bg-muted animate-pulse rounded-2xl" />
                  )}
                  <img
                    src={imageUrl}
                    alt=""
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      imageLoading ? "opacity-0" : "opacity-100"
                    }`}
                    style={applyImageTransform(imageTransform, "cover")}
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
}
