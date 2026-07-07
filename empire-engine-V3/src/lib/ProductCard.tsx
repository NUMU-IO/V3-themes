import { useState } from "react";
import {
  useCart,
  useLocale,
  useLocalization,
  useShop,
  type Product,
} from "@numueg/theme-sdk";
import { openCart } from "./cartUI";

/** Storefront products may carry a merchant-assigned label badge (bilingual,
 *  text-only) that the SDK's Product type doesn't model yet. */
type ProductExtras = Product & {
  label?: { key?: string; text_en?: string; text_ar?: string } | null;
};

/**
 * Empire product card — monochrome, square media with a hover "quick add"
 * pill, a category badge (top-start) and a discount badge (accent blue,
 * top-end). Shared by the featured rail and the products grid so the card
 * looks identical everywhere. Writes to the live SDK cart and pops the drawer.
 */
export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { formatMoney } = useLocalization();
  const shop = useShop();
  const locale = useLocale();
  const [pending, setPending] = useState(false);

  const image = product.images?.[0];
  const currency = product.currency || shop?.currency;
  // Coerce — some endpoints return price/compare_at_price as strings, which
  // breaks numeric comparison (lexicographic) and arithmetic.
  const priceNum = Number(product.price) || 0;
  const compareNum = Number(product.compare_at_price) || 0;
  const price = formatMoney(priceNum, currency);
  const hasCompare = compareNum > priceNum;
  const compareAt = hasCompare ? formatMoney(compareNum, currency) : null;
  const discountPct = hasCompare
    ? Math.round((1 - priceNum / compareNum) * 100)
    : 0;
  const categoryBadge = product.tags?.[0] || product.category;
  // Merchant-assigned label (bilingual, text-only) — wins the top-start badge
  // slot over the automatic category badge when present.
  const p = product as ProductExtras;
  const isArabicLocale =
    typeof locale === "string" && locale.toLowerCase().startsWith("ar");
  const merchantLabel =
    p.label && p.label.key
      ? (isArabicLocale
          ? p.label.text_ar || p.label.text_en
          : p.label.text_en) || ""
      : "";
  const variantId = product.variants?.[0]?.id;
  const href = `/products/${product.slug}`;

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (pending || !product.in_stock) return;
    setPending(true);
    try {
      await addItem(product.id, variantId, 1);
      openCart();
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="empire-card">
      <div className="empire-card__media">
        <a href={href} aria-label={product.name}>
          {image?.url ? (
            <img
              src={image.url}
              alt={image.alt || product.name}
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="empire-card__placeholder" aria-hidden="true" />
          )}
        </a>
        {merchantLabel ? (
          <span className="empire-badge">{merchantLabel}</span>
        ) : categoryBadge ? (
          <span className="empire-badge">{categoryBadge}</span>
        ) : null}
        {discountPct > 0 ? (
          <span className="empire-badge empire-badge--blue">-{discountPct}%</span>
        ) : null}
        {product.in_stock ? (
          <button
            className="empire-card__add"
            type="button"
            disabled={pending}
            onClick={handleAdd}
          >
            {pending ? "..." : "أضف للسلة"}
          </button>
        ) : (
          <span className="empire-card__add" style={{ opacity: 1 }}>
            نفذ المخزون
          </span>
        )}
      </div>
      <a href={href} className="empire-card__body">
        <h3 className="empire-card__name">{product.name}</h3>
        <p className="empire-card__price">
          {price}
          {compareAt ? (
            <span className="empire-card__compare">{compareAt}</span>
          ) : null}
        </p>
      </a>
    </article>
  );
}
