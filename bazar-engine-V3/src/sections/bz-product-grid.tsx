"use client";

import {
  Link,
  Money,
  useLocale,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { ShoppingBag, SlidersHorizontal } from "lucide-react";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/** First image URL for a product, strict-null safe. */
function firstImage(p: Product): string | null {
  const img = p.images?.[0];
  return img?.url ?? null;
}

/**
 * Bazar product card — the souk-print look from V2 BzProductCard:
 * hard 2px dark border, offset hover lift (`bz-card-hover`), image
 * zoom on hover, a SALE tag when discounted, the name in the heading
 * face, and an amber price chip. Reused by the grid, related rail,
 * search results, and featured collection so the catalogue feels
 * consistent everywhere.
 */
export function BzProductCard({ product }: { product: Product }) {
  const locale = useLocale();
  const slugOrId = product.slug || product.id;
  const image = firstImage(product);
  const price = typeof product.price === "number" ? product.price : 0;
  const compareAt =
    typeof product.compare_at_price === "number"
      ? product.compare_at_price
      : null;
  const hasDiscount = compareAt != null && compareAt > price;

  return (
    <Link
      to={`/products/${slugOrId}`}
      className="group block bz-card-hover rounded-2xl overflow-hidden border-2 border-[var(--bz-dark)] bg-[var(--bz-cream)]"
    >
      <div className="relative overflow-hidden bg-white aspect-[3/4] border-b-2 border-[var(--bz-dark)]">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover bz-img-zoom"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--bz-cream)]">
            <ShoppingBag size={32} className="text-[var(--bz-dark)]/20" aria-hidden="true" />
          </div>
        )}
        {product.tags?.[0] && (
          <span className="absolute top-3 start-3 bz-label px-3 py-1 bg-[var(--bz-amber)] text-[var(--bz-dark)] border-2 border-[var(--bz-dark)] rounded-full text-[10px] shadow-[2px_2px_0_var(--bz-dark)]">
            {product.tags[0]}
          </span>
        )}
        {hasDiscount && (
          <span className="absolute top-3 end-3 bz-label px-3 py-1 bg-red-500 text-white border-2 border-[var(--bz-dark)] rounded-full text-[10px] shadow-[2px_2px_0_var(--bz-dark)]">
            {localized(locale, "SALE", "تخفيض")}
          </span>
        )}
      </div>
      <div className="px-3 sm:px-4 py-3 space-y-2">
        <h3 className="bz-heading text-sm sm:text-base text-[var(--bz-dark)] line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bz-label text-[11px] px-2.5 py-1 bg-[var(--bz-amber)] text-[var(--bz-dark)] rounded-full border-2 border-[var(--bz-dark)] whitespace-nowrap">
            <Money amount={price} currency={product.currency} />
          </span>
          {hasDiscount && (
            <span className="text-[11px] text-[var(--bz-gray)] line-through">
              <Money amount={compareAt} currency={product.currency} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * bz-product-grid — listing-page body for the `products` / `collection`
 * templates. Reads `useProducts()` (storefront pre-fetches the catalogue
 * into page context) and renders the souk card grid under a dark hero
 * strip, ported from V2 BzProductsPage.
 *
 * Settings: title, subtitle, columns_desktop, columns_mobile,
 * max_items (0 = all), empty_state_text.
 */
export default function BzProductGrid({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products, loading } = useProducts();
  const locale = useLocale();

  const title = asString(s.title) || localized(locale, "SHOP ALL", "تسوّق الكل");
  const subtitle = asString(s.subtitle) || localized(locale, "The full edit, in one place.", "كل التشكيلة في مكان واحد.");
  const colsDesktop = Math.max(1, Math.min(6, asNumber(s.columns_desktop, 4)));
  const colsMobile = Math.max(1, Math.min(3, asNumber(s.columns_mobile, 2)));
  const maxItems = asNumber(s.max_items, 0);
  const emptyState =
    asString(s.empty_state_text) || localized(locale, "Nothing here yet — check back soon.", "لسه مفيش حاجة هنا — ارجع تاني قريب.");

  const displayed: Product[] =
    maxItems > 0 ? products.slice(0, maxItems) : products;

  const gridStyle = {
    "--bz-cols-mobile": colsMobile,
    "--bz-cols-desktop": colsDesktop,
  } as React.CSSProperties;

  const gridClass =
    "grid gap-3 sm:gap-4 md:gap-6 grid-cols-[repeat(var(--bz-cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--bz-cols-desktop),minmax(0,1fr))]";

  return (
    <section
      className="bg-[var(--bz-cream)] min-h-screen"
      data-bz-section={sectionId}
    >
      {/* Hero strip */}
      <div className="bg-[var(--bz-dark)] py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="bz-heading text-2xl sm:text-4xl md:text-6xl text-[var(--bz-amber)]">
            <InlineEditable
              sectionId={sectionId}
              settingKey="title"
              value={title}
            />
          </h1>
          <p className="text-[var(--bz-cream)]/50 text-xs sm:text-sm mt-2 md:mt-3">
            <InlineEditable
              sectionId={sectionId}
              settingKey="subtitle"
              value={subtitle}
              multiline
            />
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {loading && products.length === 0 ? (
          <div className={gridClass} style={gridStyle}>
            {[...Array(colsDesktop * 2)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[var(--bz-dark)]/5 aspect-[3/4] animate-pulse"
              />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <SlidersHorizontal
              size={48}
              className="mx-auto text-[var(--bz-amber)] mb-4"
              aria-hidden="true"
            />
            <p className="bz-heading text-xl text-[var(--bz-dark)]">
              <InlineEditable
                sectionId={sectionId}
                settingKey="empty_state_text"
                value={emptyState}
                multiline
              />
            </p>
          </div>
        ) : (
          <div className={gridClass} style={gridStyle}>
            {displayed.map((p) => (
              <BzProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
