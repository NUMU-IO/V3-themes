"use client";

import { useMemo, useState } from "react";
import {
  Link,
  Money,
  useLocale,
  useProducts,
  type Product,
} from "@numueg/theme-sdk";
import { Search } from "lucide-react";
import {
  asNumber,
  asString,
  localized,
  usePageData,
  type SectionRenderProps,
} from "./_shared";

/**
 * gilded-search-results — body for the `search` template, in the Gilded voice.
 *
 * Seeds its query from the host page descriptor (`usePageData().data.query`,
 * stashed by the storefront /search route) and renders a live, in-place search
 * box so visitors can refine without a round-trip. Matches over the
 * SSR-prefetched catalog (`useProducts()`) by name/description — so the
 * customizer preview and the live store both show results. Cards mirror the
 * Gilded products-page card (vn-* tokens re-mapped to the gold/dark/white
 * palette).
 */
export default function GildedSearchResults({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const { products } = useProducts();
  const pageData = usePageData();

  const headingEmpty =
    asString(s.empty_heading) || localized(locale, "Search", "البحث");
  const searchPlaceholder =
    asString(s.search_placeholder) ||
    localized(locale, "Search products…", "ابحث عن المنتجات…");
  const noResultsText =
    asString(s.no_results_text) ||
    localized(
      locale,
      "No matches. Try a different keyword or browse the full collection.",
      "لا توجد نتائج. جرّب كلمة أخرى أو تصفّح كامل التشكيلة.",
    );
  const cols = Math.max(1, Math.min(5, asNumber(s.columns_desktop, 4)));

  const initialQuery =
    asString(pageData?.data?.query) || asString(pageData?.data?.q);
  const [query, setQuery] = useState(initialQuery);

  const matches: Product[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(needle)),
    );
  }, [query, products]);

  const hasQuery = Boolean(query.trim());
  const hasMatches = matches.length > 0;

  const cssVars = {
    ["--cols-mobile" as string]: 2,
    ["--cols-desktop" as string]: cols,
  } as React.CSSProperties;
  const gridClassName =
    "grid gap-4 md:gap-5 grid-cols-[repeat(var(--cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--cols-desktop),minmax(0,1fr))]";

  return (
    <section
      className="bg-background min-h-[70vh] py-12 md:py-16"
      data-testid="storefront-search-page"
    >
      <div className="container mx-auto px-4">
        {/* Search header */}
        <div className="text-center max-w-md mx-auto mb-10">
          <h1 className="vn-heading text-2xl md:text-3xl text-[var(--vn-ink)] mb-6">
            {hasQuery ? (
              <>
                {localized(locale, "Results for", "نتائج البحث عن")}{" "}
                <span className="text-[var(--vn-muted)]">“{query}”</span>
              </>
            ) : (
              headingEmpty
            )}
          </h1>
          <form
            className="relative"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <label htmlFor="gilded-search-input" className="sr-only">
              {searchPlaceholder}
            </label>
            <Search
              size={16}
              aria-hidden="true"
              className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--vn-muted)]"
            />
            <input
              id="gilded-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-12 ps-11 pe-4 text-sm bg-transparent border border-border focus:border-[hsl(var(--gold))] focus:outline-none transition-colors placeholder:text-[var(--vn-muted)]"
              data-testid="storefront-search-input"
            />
          </form>
        </div>

        {hasQuery && !hasMatches ? (
          <div className="text-center py-16">
            <Search
              size={40}
              className="mx-auto text-[var(--vn-border)] mb-4"
              aria-hidden="true"
            />
            <p className="text-[var(--vn-muted)] text-sm max-w-sm mx-auto">
              {noResultsText}
            </p>
            <Link
              to="/products"
              className="vn-btn vn-btn-filled mt-6"
            >
              {localized(locale, "Browse all", "تصفّح الكل")}
            </Link>
          </div>
        ) : hasMatches ? (
          <div className={gridClassName} style={cssVars} data-testid="storefront-search-grid">
            {matches.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Inline Gilded product card — mirrors the gilded-products-page card markup. */
function ProductCard({ product }: { product: Product }) {
  const locale = useLocale();
  const price = product.variants?.[0]?.price ?? product.price ?? 0;
  const compareAt = product.compare_at_price;
  const hasDiscount = typeof compareAt === "number" && compareAt > price;
  const outOfStock = product.in_stock === false;
  const primary = product.images?.[0]?.url;
  const secondary = product.images?.[1]?.url;

  return (
    <Link
      to={`/product/${product.slug || product.id}`}
      className="vn-product-card group block"
      data-testid="storefront-product-card"
    >
      <div className="relative overflow-hidden bg-[var(--vn-band)] aspect-[3/4]">
        {primary ? (
          <img
            src={primary}
            alt={product.name}
            className="vn-product-image absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 vn-shimmer" />
        )}
        {secondary && (
          <img
            src={secondary}
            alt=""
            className="vn-product-image-secondary"
            loading="lazy"
          />
        )}

        {hasDiscount && !outOfStock && (
          <span className="absolute top-3 start-3 vn-label px-2.5 py-1 bg-[var(--vn-sale)] text-white text-[10px]">
            {localized(locale, "Sale", "تخفيض")}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-card/65 flex items-center justify-center">
            <span className="vn-label text-[var(--vn-ink)] text-[11px] bg-card px-3 py-1.5 border border-[var(--vn-border)]">
              {localized(locale, "Sold out", "نفدت الكمية")}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 px-1">
        <h3 className="text-sm font-medium text-[var(--vn-ink)] tracking-[0.05em] uppercase line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm font-semibold text-[var(--vn-ink)]">
            <Money amount={price} currency={product.currency} />
          </span>
          {hasDiscount && (
            <span className="text-xs text-[var(--vn-muted)] line-through">
              <Money amount={compareAt} currency={product.currency} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
