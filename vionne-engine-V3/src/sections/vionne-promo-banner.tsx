"use client";
import { useEffect, useState } from "react";
import { Link, useCart, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { applyImageTransform, asImageTransform, asImageUrl, asString, localized, responsiveImg, EDITORIAL_IMG, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { multibuyHeadline, multibuyOffers, promoPagePath, useActivePromotions } from "./_promotions";

/**
 * Promotional banner.
 *
 * Two modes:
 *
 * • `manual` (default) — exactly the old behaviour: five typed-in fields.
 *   Existing instances keep rendering unchanged.
 *
 * • `auto` — binds to the store's live multibuy promotion. The headline and
 *   price are GENERATED from the rule, so the banner cannot advertise a
 *   number the checkout won't honour, and it disappears by itself the moment
 *   the offer ends. That is the whole point: the previous version was typed
 *   copy ("3 for EGP 650") that nothing else on the platform knew about — the
 *   cart and checkout charged full price.
 *
 * The section renders PIXELS ONLY. Every number here comes from the engine
 * via `/api/storefront/promotions`; the theme never computes a discount.
 * Acceptance test, both directions: delete this section and the offer still
 * prices correctly at cart + checkout; delete the promotion and this banner
 * disappears on its own.
 */
export default function PromoBanner({ instance, sectionId }: SectionRenderProps) {
  const locale = useLocale();
  const s = useResolvedSettings(instance);
  const { cart } = useCart();

  const mode = asString(s.offer_mode) || "manual";
  const isAuto = mode === "auto";
  const size = asString(s.size) || "standard";
  const isTall = size === "tall";

  // Hooks must run before any early return (rules of hooks) — `useActivePromotions`
  // is a no-op server-side and resolves on hydrate.
  const promos = useActivePromotions(promoPagePath(), locale);
  const currency = cart?.currency || "EGP";

  // Editor detection, effect-gated so SSR/hydration stays clean. `useDemo()`
  // is not usable here — it reports marketplace-preview context, not the
  // customizer.
  const [inEditor, setInEditor] = useState(false);
  useEffect(() => {
    try {
      setInEditor(/[?&](editor=v3|preview=true)/.test(window.location.search));
    } catch {
      /* SSR / sandboxed — stay false */
    }
  }, []);

  // Pick the offer to advertise. `offer_promotion_id` pins a specific one for
  // stores running several at once; otherwise the first active multibuy wins.
  const pinnedId = asString(s.offer_promotion_id);
  const offers = isAuto ? multibuyOffers(promos?.auto_discounts) : [];
  const offer =
    offers.find((o) => !pinnedId || o.promotionId === pinnedId) ?? offers[0];

  const badge = asString(s.badge_text) || (isAuto ? localized(locale, "Mix & Match & Save", "اختاري واوفري") : "");
  const autoHeadline = offer ? multibuyHeadline(offer, locale, currency) : "";
  const manualHeadline = asString(s.headline);
  // In AUTO mode the headline is GENERATED, full stop.
  //
  // It used to be `manual || generated`, which quietly defeated the entire
  // point of auto mode: the live banner carried a typed "3 for EGP 650" that
  // won over the rule, so re-pricing or ending the promotion left the store
  // advertising a number checkout would refuse to honour — exactly the failure
  // this section's own docblock promises it prevents. A merchant who wants
  // custom wording switches the section to Manual, where nothing is generated
  // and nothing can go stale. The generated string is identical when the typed
  // one was accurate, so this is a no-op until the offer changes.
  const headline = isAuto
    ? autoHeadline || manualHeadline
    : manualHeadline || localized(locale, "Special Offer", "عرض خاص");
  const subtitle = asString(s.subtitle) || (isAuto ? "" : localized(locale, "Shop our latest collection", "اكتشفي أحدث تشكيلة"));
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

  // ── Auto mode with no live offer ────────────────────────────────────────
  // On the storefront: render NOTHING. A banner that outlives its promotion
  // is a lie, and this is the failure the whole workstream exists to remove.
  // In the editor: a dashed placeholder, so the merchant sees why it's blank
  // instead of thinking the section is broken.
  if (isAuto && !offer) {
    if (!inEditor) return null;
    return (
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl border-2 border-dashed border-primary/30 p-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              {localized(locale, "No active multibuy offer", "مفيش عرض باقة شغّال")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {localized(
                locale,
                "Create one in Marketing → Discounts, or switch this section to Manual.",
                "اعملي واحد من التسويق ← الخصومات، أو حوّلي القسم لوضع يدوي.",
              )}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={isTall ? "py-10" : "py-6"}>
      <div className="container mx-auto px-4">
        <div className="relative rounded-2xl overflow-hidden bg-primary/5 border border-primary/20">
          <div
            className={`flex flex-col md:flex-row items-center gap-6 ${
              isTall ? "p-8 md:p-14 md:min-h-[22rem]" : "p-6 md:p-10"
            }`}
          >
            <div className="flex-1 text-center md:text-right">
              {badge && (
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-3">
                  <InlineEditable sectionId={sectionId} settingKey="badge_text" value={badge} />
                </span>
              )}
              <h3
                className={`font-black mb-2 text-foreground ${
                  isTall ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"
                }`}
              >
                <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} />
              </h3>
              {subtitle && (
                <p
                  className={`text-muted-foreground mb-4 ${
                    isTall ? "text-base md:text-lg" : "text-sm"
                  }`}
                >
                  <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
                </p>
              )}
              <Link to={ctaLink} className="vn-btn vn-btn-filled shadow-md">
                <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
                <ArrowLeft size={16} className="rtl:rotate-180" />
              </Link>
            </div>
            <div
              className={`relative rounded-2xl overflow-hidden shadow-lg shrink-0 ${
                isTall
                  ? "w-64 h-64 md:w-80 md:h-80"
                  : "w-48 h-48 md:w-56 md:h-56"
              }`}
            >
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
                    {...responsiveImg(imageUrl, EDITORIAL_IMG)}
                    alt=""
                    loading="lazy"
                    decoding="async"
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
