/**
 * tn-shop-the-look — one styled photo with product hotspots on it.
 *
 * The dots are real `<button>`s with `aria-expanded`, not decorated divs. This
 * is the section most often shipped as an un-focusable overlay: it looks
 * identical in a screenshot and is completely unusable with a keyboard.
 *
 * Positions are percentages measured from the START edge (`inset-inline-start`
 * / `top`), so a dot placed over a jacket in English is still over the jacket
 * in Arabic. Using `left` here is the classic RTL bug — every hotspot mirrors
 * to the wrong garment.
 *
 * Below the image the same hotspots render as an ordinary list of product
 * links. That is not a fallback: on a phone, tapping a 24px dot to reveal a
 * card that covers the photo is worse than reading the two products, and the
 * list is also what a crawler and a screen reader get.
 */

import { useState } from "react";
import { Link, useLocale, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import {
  asImageAlt,
  asImageUrl,
  asNumber,
  asString,
  cx,
  productCurrency,
  productImages,
  productName,
  readBlockNodes,
  useDemo,
  useInsideEditor,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { Price } from "../lib/price";

const FALLBACK_LOOK = "https://cdn.numueg.app/theme-assets/teen/shop-the-look.jpg";

interface Hotspot {
  key: string;
  x: number;
  y: number;
  product?: Product;
  label: string;
  link: string;
}

export default function TnShopTheLook({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();
  const demo = useDemo();
  const insideEditor = useInsideEditor();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // The hotspot picker stores an id; the product body has to come from
  // somewhere. `fetchIfMissing` because this section is placed on the homepage,
  // which does ship products — but merchants also drop it on `/about`, which
  // does not.
  const { products } = useProducts({ limit: 100, fetchIfMissing: true });
  const byId = new Map(products.map((p) => [String(p.id), p]));

  const image = asImageUrl(s.image) || (demo ? FALLBACK_LOOK : "");
  const mobile = asImageUrl(s.image_mobile) || image;
  const alt = asString(s.image_alt) || asImageAlt(s.image) || "";

  const spots: Hotspot[] = readBlockNodes(instance, "hotspot").map((node, i) => {
    const product = byId.get(asString(node.settings.product));
    return {
      key: `spot-${i}`,
      x: asNumber(node.settings.x, 50),
      y: asNumber(node.settings.y, 50),
      product,
      label: product ? productName(product, locale) : asString(node.settings.label),
      link: product
        ? `/products/${product.slug ?? product.id}`
        : asString(node.settings.link, "/products"),
    };
  });

  const usable = spots.filter((sp) => sp.label);

  if (!image) {
    return insideEditor ? (
      <section className="tn-container tn-section">
        <div className="tn-editor-note">
          <p className="tn-label">{t("editor.look_note_title", "Shop the look needs a photo")}</p>
          <p className="tn-footer-text">
            {t(
              "editor.look_note",
              "Add a styled image, then place a hotspot over each product in it.",
            )}
          </p>
        </div>
      </section>
    ) : null;
  }

  return (
    <section className="tn-section">
      <div className="tn-container">
        {asString(s.heading) ? <h2 className="tn-look-title">{asString(s.heading)}</h2> : null}

        <div className="tn-look">
          <picture className="tn-look-media">
            <source media="(max-width: 749px)" srcSet={mobile} />
            <img src={image} alt={alt} loading="lazy" decoding="async" />
          </picture>

          {usable.map((sp, i) => {
            const open = openIndex === i;
            return (
              <div
                key={sp.key}
                className="tn-look-spot"
                style={{ insetInlineStart: `${sp.x}%`, top: `${sp.y}%` }}
              >
                <button
                  type="button"
                  className={cx("tn-look-dot", open && "is-open")}
                  aria-expanded={open}
                  aria-label={t("look.show_product", "Show {{name}}").replace("{{name}}", sp.label)}
                  onClick={() => setOpenIndex(open ? null : i)}
                />
                {open && sp.product ? (
                  <Link to={sp.link} className="tn-look-card">
                    {productImages(sp.product)[0] ? (
                      <img
                        src={productImages(sp.product)[0].url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <span className="tn-look-card-body">
                      <span className="tn-look-card-name">{sp.label}</span>
                      <Price
                        amount={sp.product.price}
                        compareAt={sp.product.compare_at_price}
                        currency={productCurrency(sp.product)}
                      />
                    </span>
                  </Link>
                ) : open ? (
                  <Link to={sp.link} className="tn-look-card is-plain">
                    <span className="tn-look-card-name">{sp.label}</span>
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* The same products as an ordinary list: keyboard-friendly, crawlable,
            and the better interaction on a phone. */}
        {usable.length > 0 && (
          <ul className="tn-look-list">
            {usable.map((sp) => (
              <li key={`${sp.key}-list`}>
                <Link to={sp.link} className="tn-look-listlink">
                  {sp.label}
                  {sp.product ? (
                    <Price
                      amount={sp.product.price}
                      compareAt={sp.product.compare_at_price}
                      currency={productCurrency(sp.product)}
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
