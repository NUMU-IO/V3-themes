"use client";
import { useMemo, useState } from "react";
import { Link, Money, useProducts, useLocale, type Product } from "@numueg/theme-sdk";
import { Search, Grid3X3, LayoutList, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { asNumber, localized, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal products-listing (PLP) section.
 *
 * Ported from the proven Vionne V3 PLP (breadcrumb, page title, underlined
 * search, category tab strip, toolbar with count + sort + grid/list toggle,
 * animated grid, empty state) and re-skinned to luxury-minimal: uppercase
 * tracked labels, `lux-input` / `lux-chip` controls, hairline dividers, sharp
 * edges. V2 LuxProductsPageSection defaults honoured (view toggle OFF). Empty-
 * safe and never blank.
 */
export default function LuxProductsPageSection({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};

  const colsDesktop = asNumber(s.columns_desktop, 4);
  const colsMobile = asNumber(s.columns_mobile, 2);
  const showViewToggle = s.show_view_toggle ?? false;
  const locale = useLocale();

  const { products, loading } = useProducts();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) {
      if (p.category) seen.add(p.category);
    }
    return Array.from(seen);
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.slice();

    if (category) {
      list = list.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    const priceOf = (p: Product) => p.variants?.[0]?.price ?? p.price ?? 0;
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case "price-desc":
        list.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [products, category, search, sort]);

  const gridCols = `repeat(${viewMode === "list" ? 1 : colsDesktop}, minmax(0,1fr))`;
  const gridColsMobile = `repeat(${viewMode === "list" ? 1 : colsMobile}, minmax(0,1fr))`;

  return (
    <div className="bg-background" data-testid="storefront-products-page">
      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">
            {localized(locale, "Home", "الرئيسية")}
          </Link>
          <span>/</span>
          <span className="text-foreground">{category ?? localized(locale, "Shop", "المتجر")}</span>
        </div>

        {/* Title */}
        <h1 className="lux-heading text-2xl md:text-3xl mb-10 text-foreground">
          {category ?? localized(locale, "All Products", "جميع المنتجات")}
        </h1>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={localized(locale, "Search products", "ابحث عن المنتجات")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pe-9 ps-4 text-xs lux-input"
            data-testid="storefront-products-search"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide"
            data-testid="storefront-products-categories"
          >
            <button
              type="button"
              onClick={() => setCategory(null)}
              className={"px-4 py-2 whitespace-nowrap lux-chip " + (!category ? "lux-chip-active" : "")}
              data-testid="storefront-products-category"
              data-category-id="all"
            >
              {localized(locale, "All", "الكل")}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={"px-4 py-2 whitespace-nowrap lux-chip " + (category === cat ? "lux-chip-active" : "")}
                data-testid="storefront-products-category"
                data-category-id={cat}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6" data-testid="storefront-products-toolbar">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {filtered.length} {localized(locale, "products", "منتج")}
          </span>
          <div className="flex items-center gap-4">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="text-[10px] uppercase tracking-[0.1em] px-3 py-2 lux-input cursor-pointer"
              data-testid="storefront-products-sort"
            >
              <option value="default">{localized(locale, "Sort by", "ترتيب حسب")}</option>
              <option value="price-asc">{localized(locale, "Price: Low to High", "السعر: من الأقل")}</option>
              <option value="price-desc">{localized(locale, "Price: High to Low", "السعر: من الأعلى")}</option>
              <option value="name">{localized(locale, "Name", "الاسم")}</option>
            </select>
            {showViewToggle && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={"p-1.5 transition-colors " + (viewMode === "grid" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <Grid3X3 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  className={"p-1.5 transition-colors " + (viewMode === "list" ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <LayoutList size={15} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grid / empty / loading */}
        {loading ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: gridCols,
              ["--cols-mobile" as string]: gridColsMobile,
            }}
          >
            {Array.from({ length: colsDesktop * 2 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] lux-shimmer" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-px bg-border mx-auto mb-6" />
            <p className="text-sm mb-2 text-foreground">{localized(locale, "No results", "لا توجد نتائج")}</p>
            <p className="text-xs text-muted-foreground">{localized(locale, "Try adjusting your search or filter", "حاول تعديل البحث أو الفلتر")}</p>
          </div>
        ) : (
          <motion.div
            layout
            className="grid gap-4 grid-cols-[var(--cols-mobile)] sm:grid-cols-[var(--cols-tablet)] md:grid-cols-[var(--cols-desktop)]"
            style={
              {
                ["--cols-mobile" as string]: gridColsMobile,
                ["--cols-tablet" as string]:
                  viewMode === "list"
                    ? "repeat(1,minmax(0,1fr))"
                    : `repeat(${Math.min(3, colsDesktop)},minmax(0,1fr))`,
                ["--cols-desktop" as string]: gridCols,
              } as React.CSSProperties
            }
            data-testid="storefront-products-grid"
          >
            <AnimatePresence>
              {filtered.map((product) => (
                <motion.div key={product.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ProductCard product={product} list={viewMode === "list"} locale={locale} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** Inline luxury-minimal product card. */
function ProductCard({ product, list, locale }: { product: Product; list?: boolean; locale?: string }) {
  const price = product.variants?.[0]?.price ?? product.price ?? 0;
  const compareAt = product.compare_at_price;
  const hasDiscount = typeof compareAt === "number" && compareAt > price;
  const outOfStock = product.in_stock === false;
  const primary = product.images?.[0]?.url;
  const secondary = product.images?.[1]?.url;

  return (
    <Link
      to={`/product/${product.slug || product.id}`}
      className={"lux-product-card group block " + (list ? "sm:flex sm:items-center sm:gap-5" : "")}
      data-testid="storefront-product-card"
    >
      <div
        className={
          "relative overflow-hidden bg-[hsl(var(--lux-gray))] aspect-[3/4] " +
          (list ? "sm:w-40 sm:shrink-0" : "")
        }
      >
        {primary ? (
          <img
            src={primary}
            alt={product.name}
            className="lux-product-image absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 lux-shimmer" />
        )}
        {secondary && (
          <img src={secondary} alt="" className="lux-product-image-secondary" loading="lazy" />
        )}

        {product.tags?.[0] && !outOfStock && (
          <span className="absolute top-3 start-3 text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 bg-white/95 text-foreground">
            {product.tags[0]}
          </span>
        )}
        {hasDiscount && !outOfStock && (
          <span className="absolute top-3 start-3 text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 bg-foreground text-background">
            {localized(locale, "Sale", "تخفيض")}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/65 flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] text-foreground bg-white px-3 py-1.5 border border-border">
              {localized(locale, "Sold out", "نفذت الكمية")}
            </span>
          </div>
        )}
      </div>

      <div className={list ? "mt-3 sm:mt-0 flex-1" : "mt-3"}>
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
          {product.name}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm text-foreground">
            <Money amount={price} currency={product.currency} />
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              <Money amount={compareAt} currency={product.currency} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
