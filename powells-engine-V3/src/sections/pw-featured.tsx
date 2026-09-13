/**
 * pw-featured — a row of book tiles beside one promo banner.
 *
 * "Newly released", "Reduced", "From one collection": a heading, a handful of
 * books as white tiles, and a banner that sells a single offer with its own
 * image and button. The banner only renders when the merchant gives it a title
 * or an image — this section never invents an offer for a real store.
 */

import { useMemo } from "react";
import { Image, Link, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asImageAlt,
  asImageUrl,
  asNumber,
  asString,
  isInlineImage,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { pickBooks, type BookSource } from "../lib/pick-books";
import { Twinkle } from "../lib/ornaments";

export default function PwFeatured({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const { products } = useProducts({ limit: 48, fetchIfMissing: true });

  const source = (asString(s.source) || "newest") as BookSource;
  const limit = asNumber(s.limit, 3);
  const collection = asString(s.collection);
  const picks = useMemo(
    () => pickBooks(products, source, collection, limit),
    [products, source, collection, limit],
  );

  const heading = asString(s.heading);
  const promoTitle = asString(s.promo_title);
  const promoEyebrow = asString(s.promo_eyebrow);
  const promoImage = asImageUrl(s.promo_image);
  const promoAlt = asImageAlt(s.promo_image) || promoTitle;
  const promoButton = asString(s.promo_button) || t("featured.shop_now", "Shop now");
  const promoLink = asString(s.promo_link) || "/products";
  const showPromo = asBool(s.show_promo, true) && Boolean(promoTitle || promoImage);

  if (picks.length === 0 && !showPromo) return null;

  return (
    <section className="pw-section pw-featured">
      <div className={showPromo ? "pw-featured-grid has-promo" : "pw-featured-grid"}>
        <div className="pw-featured-books">
          {heading && (
            <h2 className="pw-featured-title">
              {ornaments && <Twinkle size={22} />}
              {heading}
            </h2>
          )}
          <div className="pw-tiles-row">
            {picks.map((product) => (
              <ProductCard key={product.id} product={product} variant="tile" showQuickAdd={false} />
            ))}
          </div>
        </div>

        {showPromo && (
          <Link to={promoLink} className={promoImage ? "pw-promo has-image" : "pw-promo"}>
            {promoImage && <Image src={promoImage} alt={promoAlt} responsive={!isInlineImage(promoImage)} loading="lazy" />}
            <span className="pw-promo-copy">
              {promoEyebrow && <span className="pw-promo-eyebrow">{promoEyebrow}</span>}
              {promoTitle && <span className="pw-promo-title">{promoTitle}</span>}
              <span className="pw-btn pw-btn-primary pw-promo-btn">{promoButton}</span>
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
