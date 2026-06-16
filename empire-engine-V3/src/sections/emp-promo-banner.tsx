"use client";

import { Link, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import {
  applyImageTransform,
  asImageTransform,
  asImageUrl,
  asString,
  localized,
  useDemo,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=70";

/**
 * emp-promo-banner — faithful V3 port of V2 EmpPromoBanner
 * (numu-egyptian-bazaar/src/themes/empire/sections/promo-banner/EmpPromoBanner.tsx).
 *
 * A single BLACK `rounded-xl` panel (`bg-black text-white`) holding a small
 * square product image on the start and the offer copy on the end: an
 * optional pill BADGE, a `font-black` headline, a muted subtitle, and a
 * WHITE rounded-full CTA with a trailing arrow. NOT the grayscale
 * two-card editorial layout it inherited from the Bazar clone.
 *
 * KEEPS the V3 image-fit (`object-cover` + applyImageTransform).
 *
 * Settings: badge_text, headline, subtitle, cta_text, cta_link, image_url.
 */
const EmpPromoBanner = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const demo = useDemo();
  const locale = useLocale();

  const badge = asString(s.badge_text);
  const headline = asString(s.headline) || localized(locale, "Special Offer", "عرض خاص");
  const subtitle =
    asString(s.subtitle) || localized(locale, "Shop our latest collection", "تسوّق أحدث تشكيلة");
  const ctaText = asString(s.cta_text) || localized(locale, "Shop Now", "تسوّق الآن");
  const ctaLink = asString(s.cta_link) || "/products";
  const configuredImage = asImageUrl(s.image_url);
  const imageTransform = asImageTransform(s.image_url);
  const imageUrl = configuredImage || (demo ? FALLBACK_IMAGE : "");

  return (
    <section className="py-8" data-emp-section={sectionId}>
      <div className="container mx-auto px-4">
        <div className="relative rounded-xl overflow-hidden bg-black text-white">
          <div className="flex flex-col md:flex-row items-center gap-6 p-8 md:p-12">
            {/* Image */}
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-xl overflow-hidden shrink-0 bg-white/10 relative">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  style={applyImageTransform(imageTransform, "cover")}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-16 w-16 text-white/30" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 text-center md:text-end">
              {badge && (
                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold mb-3 uppercase tracking-wider">
                  <InlineEditable sectionId={sectionId} settingKey="badge_text" value={badge} />
                </span>
              )}
              <h3 className="text-2xl md:text-3xl font-black mb-2">
                <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} />
              </h3>
              <p className="text-white/50 text-sm mb-5">
                <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
              </p>
              <Link
                to={ctaLink}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-black font-semibold text-xs uppercase tracking-wider rounded-full hover:bg-white/90 transition-colors"
              >
                <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
                <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmpPromoBanner;
