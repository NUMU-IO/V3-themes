"use client";

import {
  Link,
  Money,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { ShoppingBag, SlidersHorizontal } from "lucide-react";
import { asNumber, asString, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/** First image URL for a product, strict-null safe. */
function firstImage(p: Product): string | null {
  const img = p.images?.[0];
  return img?.url ?? null;
}

/**
 * Empire product card — the souk-print look from V2 EmpProductCard:
 * hard 2px dark border, offset hover lift (`emp-card-hover`), image
 * zoom on hover, a SALE tag when discounted, the name in the heading
 * face, and an amber price chip. Reused by the grid, related rail,
 * search results, and featured collection so the catalogue feels
 * consistent everywhere.
 */
export function EmpProductCard({ product }: { product: Product }) {
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
      className="group block emp-card-hover rounded-2xl overflow-hidden border-2 border-[var(--emp-dark)] bg-[var(--emp-cream)]"
    >
      <div className="relative overflow-hidden bg-white aspect-[3/4] border-b-2 border-[var(--emp-dark)]">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover emp-img-zoom"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--emp-cream)]">
            <ShoppingBag size={32} className="text-[var(--emp-dark)]/20" aria-hidden="true" />
          </div>
        )}
        {product.tags?.[0] && (
          <span className="absolute top-3 start-3 emp-label px-3 py-1 bg-[var(--emp-amber)] text-[var(--emp-dark)] border-2 border-[var(--emp-dark)] rounded-full text-[10px] shadow-[2px_2px_0_var(--emp-dark)]">
            {product.tags[0]}
          </span>
        )}
        {hasDiscount && (
          <span className="absolute top-3 end-3 emp-label px-3 py-1 bg-red-500 text-white border-2 border-[var(--emp-dark)] rounded-full text-[10px] shadow-[2px_2px_0_var(--emp-dark)]">
            SALE
          </span>
        )}
      </div>
      <div className="px-3 sm:px-4 py-3 space-y-2">
        <h3 className="emp-heading text-sm sm:text-base text-[var(--emp-dark)] line-clamp-2 leading-tight">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="emp-label text-[11px] px-2.5 py-1 bg-[var(--emp-amber)] text-[var(--emp-dark)] rounded-full border-2 border-[var(--emp-dark)] whitespace-nowrap">
            <Money amount={price} currency={product.currency} />
          </span>
          {hasDiscount && (
            <span className="text-[11px] text-[var(--emp-gray)] line-through">
              <Money amount={compareAt} currency={product.currency} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * emp-product-grid — listing-page body for the `products` / `collection`
 * templates. Reads `useProducts()` (storefront pre-fetches the catalogue
 * into page context) and renders the souk card grid under a dark hero
 * strip, ported from V2 EmpProductsPage.
 *
 * Settings: title, subtitle, columns_desktop, columns_mobile,
 * max_items (0 = all), empty_state_text.
 */
export default function EmpProductGrid({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products, loading } = useProducts();

  const title = asString(s.title) || "SHOP ALL";
  const subtitle = asString(s.subtitle) || "The full edit, in one place.";
  const colsDesktop = Math.max(1, Math.min(6, asNumber(s.columns_desktop, 4)));
  const colsMobile = Math.max(1, Math.min(3, asNumber(s.columns_mobile, 2)));
  const maxItems = asNumber(s.max_items, 0);
  const emptyState =
    asString(s.empty_state_text) || "Nothing here yet — check back soon.";

  const displayed: Product[] =
    maxItems > 0 ? products.slice(0, maxItems) : products;

  const gridStyle = {
    "--emp-cols-mobile": colsMobile,
    "--emp-cols-desktop": colsDesktop,
  } as React.CSSProperties;

  const gridClass =
    "grid gap-3 sm:gap-4 md:gap-6 grid-cols-[repeat(var(--emp-cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--emp-cols-desktop),minmax(0,1fr))]";

  return (
    <section
      className="bg-[var(--emp-cream)] min-h-screen"
      data-emp-section={sectionId}
    >
      {/* Hero strip */}
      <div className="bg-[var(--emp-dark)] py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="emp-heading text-2xl sm:text-4xl md:text-6xl text-[var(--emp-amber)]">
            <InlineEditable
              sectionId={sectionId}
              settingKey="title"
              value={title}
            />
          </h1>
          <p className="text-[var(--emp-cream)]/50 text-xs sm:text-sm mt-2 md:mt-3">
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
                className="rounded-2xl bg-[var(--emp-dark)]/5 aspect-[3/4] animate-pulse"
              />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <SlidersHorizontal
              size={48}
              className="mx-auto text-[var(--emp-amber)] mb-4"
              aria-hidden="true"
            />
            <p className="emp-heading text-xl text-[var(--emp-dark)]">
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
              <EmpProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
