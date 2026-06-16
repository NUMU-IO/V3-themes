"use client";

import { useMemo, useState } from "react";
import {
  Link,
  Money,
  useCart,
  useLocale,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { Search, ShoppingCart, X } from "lucide-react";
import {
  applyImageTransform,
  asNumber,
  asString,
  localized,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

/** First image URL for a product, strict-null safe. */
function firstImage(p: Product): string | null {
  const img = p.images?.[0];
  return img?.url ?? null;
}

/** Non-destructive focal/zoom transform for the first image (V3 image-fit). */
function firstImageTransform(p: Product) {
  const img = p.images?.[0] as unknown as { transform?: unknown } | undefined;
  if (img && typeof img === "object" && img.transform && typeof img.transform === "object") {
    return img.transform as Parameters<typeof applyImageTransform>[0];
  }
  return undefined;
}

/**
 * EmpProductCard — faithful V3 port of V2 EmpProductCard
 * (numu-egyptian-bazaar/src/components/store/empire/EmpProductCard.tsx,
 * driven by BaseProductCard). The Empire look:
 *   - image in a `rounded-lg bg-secondary` `aspect-square` frame that
 *     zooms on hover (`group-hover:scale-105`)
 *   - category badge top-left (BLACK chip), discount badge top-right
 *     (electric-BLUE chip)
 *   - a hover-reveal full-width BLACK "ADD TO CART" bar (desktop)
 *   - name in `font-medium text-sm` that turns blue on hover, NO rating
 *   - bold price + muted strikethrough original
 *
 * KEEPS the V3 image-fit improvement: `object-cover` +
 * applyImageTransform("cover") so the photo fills the square frame
 * (V2 used object-contain; cover is the wanted V3 behaviour).
 *
 * Reused by the grid, related rail, search results and featured
 * collection so the catalogue looks identical everywhere.
 */
export function EmpProductCard({ product }: { product: Product }) {
  const locale = useLocale();
  const { addItem } = useCart();
  const slugOrId = product.slug || product.id;
  const image = firstImage(product);
  const transform = firstImageTransform(product);

  const price = typeof product.price === "number" ? product.price : 0;
  const compareAt =
    typeof product.compare_at_price === "number" ? product.compare_at_price : null;
  const hasDiscount = compareAt != null && compareAt > price;
  const discountPercent = hasDiscount
    ? Math.round(((compareAt - price) / compareAt) * 100)
    : 0;
  const categoryBadge = product.tags?.[0] || product.category;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only add directly when there's nothing to choose; variant products
    // route to the PDP instead (matches V2 useQuickAdd's requiresSelection).
    if (product.options && product.options.length > 0) {
      window.location.assign(`/products/${slugOrId}`);
      return;
    }
    void addItem(product.id, undefined, 1).catch(() => {});
  };

  return (
    <div className="group" data-testid="storefront-product-card">
      <Link
        to={`/products/${slugOrId}`}
        className="block relative overflow-hidden rounded-lg bg-secondary aspect-square"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={applyImageTransform(transform, "cover")}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <ShoppingCart size={28} className="text-muted-foreground/30" aria-hidden="true" />
          </div>
        )}

        {/* Category badge — top-left, BLACK */}
        {categoryBadge && (
          <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
            {categoryBadge}
          </span>
        )}
        {/* Discount badge — top-right, electric BLUE */}
        {hasDiscount && (
          <span className="absolute top-3 right-3 bg-[hsl(var(--emp-blue))] text-white text-[10px] font-bold px-2.5 py-1 rounded">
            -{discountPercent}%
          </span>
        )}

        {/* Hover-reveal quick-add bar (desktop) — BLACK */}
        <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0 transition-all duration-300 hidden md:block">
          <button
            type="button"
            onClick={handleQuickAdd}
            className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white text-xs font-semibold uppercase tracking-wider"
            aria-label={localized(locale, "Add to Cart", "أضف للسلة")}
          >
            <ShoppingCart size={14} aria-hidden="true" />
            {localized(locale, "Add to Cart", "أضف للسلة")}
          </button>
        </div>
      </Link>

      <div className="mt-3">
        <Link to={`/products/${slugOrId}`}>
          <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-snug hover:text-[hsl(var(--emp-blue))] transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-bold text-sm">
            <Money amount={price} currency={product.currency} />
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              <Money amount={compareAt} currency={product.currency} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * emp-product-grid — listing-page body for the `products` / `collection`
 * templates. Faithful V3 port of V2 EmpProductsPage (BaseProductsPage with
 * Empire styles): an `emp-display-sm` page title, an `emp-input` search box,
 * a scrollable row of `emp-chip` category filters, a product-count
 * `emp-label`, then the Empire card grid (2 / 3 / 4 cols).
 *
 * Categories come from the product set's distinct `category` values (the
 * SDK doesn't ship a category list); selecting one filters client-side.
 *
 * Settings: title, search_placeholder, all_label, columns_desktop,
 * columns_mobile, max_items (0 = all), empty_state_text.
 */
export default function EmpProductGrid({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products, loading } = useProducts();
  const locale = useLocale();

  const title = asString(s.title) || localized(locale, "SHOP", "تسوّق");
  const searchPlaceholder =
    asString(s.search_placeholder) || localized(locale, "Search products…", "ابحث عن المنتجات…");
  const allLabel = asString(s.all_label) || localized(locale, "All", "الكل");
  const colsDesktop = Math.max(1, Math.min(6, asNumber(s.columns_desktop, 4)));
  const colsMobile = Math.max(1, Math.min(3, asNumber(s.columns_mobile, 2)));
  const maxItems = asNumber(s.max_items, 0);
  const emptyState =
    asString(s.empty_state_text) ||
    localized(locale, "Nothing here yet — check back soon.", "لسه مفيش حاجة هنا — ارجع تاني قريب.");

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Distinct categories from the catalogue (V3 has no category list hook).
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) {
      if (p.category) seen.add(p.category);
    }
    return Array.from(seen);
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = products;
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    if (needle) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(needle) ||
          p.description?.toLowerCase().includes(needle),
      );
    }
    return maxItems > 0 ? list.slice(0, maxItems) : list;
  }, [products, query, activeCategory, maxItems]);

  const gridCols =
    colsDesktop >= 4
      ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : colsDesktop === 3
        ? "grid-cols-2 md:grid-cols-3"
        : "grid-cols-2";

  return (
    <section className="bg-[hsl(var(--background))]" data-emp-section={sectionId}>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 emp-label mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">
            {localized(locale, "Home", "الرئيسية")}
          </Link>
          <span>/</span>
          <span className="text-foreground">{title}</span>
        </div>

        {/* Title */}
        <h1 className="emp-display-sm mb-8">
          <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
        </h1>

        {/* Search */}
        <div className="relative mb-5">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-11 pe-10 ps-4 text-sm emp-input"
          />
          <Search
            size={16}
            aria-hidden="true"
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveCategory("")}
              className={`px-5 py-2 whitespace-nowrap transition-all emp-chip ${
                activeCategory === "" ? "emp-chip-active" : ""
              }`}
            >
              {allLabel}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 whitespace-nowrap transition-all emp-chip ${
                  activeCategory === cat ? "emp-chip-active" : ""
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar — product count */}
        <div className="flex items-center justify-between mb-6">
          <span className="emp-label">
            {filtered.length} {localized(locale, "products", "منتج")}
          </span>
        </div>

        {/* Grid */}
        {loading && products.length === 0 ? (
          <div className={`grid ${gridCols} gap-4 md:gap-5`}>
            {[...Array(colsDesktop * 2)].map((_, i) => (
              <div key={i} className="rounded-lg bg-secondary aspect-square animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-muted-foreground">
              <InlineEditable
                sectionId={sectionId}
                settingKey="empty_state_text"
                value={emptyState}
                multiline
              />
            </p>
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-4 md:gap-5`}>
            {filtered.map((p) => (
              <EmpProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
