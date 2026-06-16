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
 * lux-search-results — body for the `search` template. Seeds its query from
 * the host page descriptor (`usePageData().data.q`, stashed by the storefront
 * /search route) and renders a live, in-place search box so visitors can
 * refine without a round-trip. Matches over the SSR-prefetched catalog
 * (`useProducts()`) by name/description — so the customizer preview and the
 * live store both show results. Cards mirror the Luxury Minimal product card.
 */
export default function LuxSearchResults({ instance }: SectionRenderProps) {
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
        p.description?.toLowerCase().includes(needle),
    );
  }, [query, products]);

  const hasQuery = Boolean(query.trim());
  const hasMatches = matches.length > 0;

  const cssVars = {
    "--cols-mobile": 2,
    "--cols-desktop": cols,
  } as React.CSSProperties;
  const gridClassName =
    "grid gap-4 grid-cols-[repeat(var(--cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--cols-desktop),minmax(0,1fr))]";

  return (
    <section className="min-h-[70vh] py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Search header */}
        <div className="text-center max-w-md mx-auto mb-10">
          <h1 className="lux-heading text-2xl md:text-3xl text-foreground mb-6">
            {hasQuery ? (
              <>
                {localized(locale, "Results for", "نتائج البحث عن")}{" "}
                <span className="text-muted-foreground">“{query}”</span>
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
            <label htmlFor="lux-search-input" className="sr-only">
              {searchPlaceholder}
            </label>
            <Search
              size={16}
              aria-hidden="true"
              className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="lux-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-12 ps-11 pe-4 text-sm lux-input"
            />
          </form>
        </div>

        {hasQuery && !hasMatches ? (
          <div className="text-center py-16">
            <Search
              size={40}
              className="mx-auto text-muted-foreground/40 mb-4"
              aria-hidden="true"
            />
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {noResultsText}
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 lux-btn mt-6"
            >
              {localized(locale, "Browse all", "تصفّح الكل")}
            </Link>
          </div>
        ) : hasMatches ? (
          <div className={gridClassName} style={cssVars}>
            {matches.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.slug || product.id}`}
                className="lux-product-card group block"
                data-testid="storefront-product-card"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[hsl(var(--lux-gray))] mb-3">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="lux-product-image w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 lux-shimmer" />
                  )}
                </div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                  {product.name}
                </p>
                <p className="text-sm mt-1 text-foreground">
                  <Money
                    amount={product.variants?.[0]?.price ?? product.price ?? 0}
                    currency={product.currency}
                  />
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
