"use client";

import { useMemo, useState } from "react";
import {
  Link,
  useLocale,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { Search } from "lucide-react";
import { asNumber, asString, localized, usePageData, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { EmpProductCard } from "./emp-product-grid";

/**
 * emp-search-results — body for the `search` template, in the Empire LIGHT
 * editorial voice (matches the products page chrome): an `emp-display-sm`
 * heading, an `emp-input` search box, and the Empire card grid. NOT the
 * dark-amber hero strip it inherited from the Bazar clone.
 *
 * Query seeds from `usePageData().data.query` (the storefront /search route
 * stashes it); a live box lets visitors refine in place. Results are the
 * pre-fetched `page.data.results` when present, else a client-side filter
 * over `useProducts()` for the customizer preview.
 *
 * Settings: placeholder_when_no_query, no_results_text, search_placeholder,
 * columns_desktop.
 */
export default function EmpSearchResults({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const pageData = usePageData();
  const { products } = useProducts();
  const locale = useLocale();

  const titleEmpty =
    asString(s.placeholder_when_no_query) || localized(locale, "SEARCH", "بحث");
  const noResultsText =
    asString(s.no_results_text) ||
    localized(locale, "No matches. Try a different keyword or browse the full collection.", "مفيش نتايج. جرّب كلمة تانية أو تصفّح كل التشكيلة.");
  const searchPlaceholder =
    asString(s.search_placeholder) || localized(locale, "Search products…", "ابحث عن المنتجات…");
  const cols = Math.max(1, Math.min(5, asNumber(s.columns_desktop, 4)));

  const pd = pageData?.data as Record<string, unknown> | undefined;
  const initialQuery = asString(pd?.query) || asString(pd?.q);
  const preFetched = (pd as { results?: Product[] } | undefined)?.results;

  const [query, setQuery] = useState(initialQuery);

  const matches: Product[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return preFetched && preFetched.length > 0 ? preFetched : [];
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(needle) ||
        p.description?.toLowerCase().includes(needle),
    );
  }, [query, preFetched, products]);

  const hasQuery = Boolean(query.trim());
  const hasMatches = matches.length > 0;

  const gridCols =
    cols >= 4
      ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      : cols === 3
        ? "grid-cols-2 md:grid-cols-3"
        : "grid-cols-2";

  return (
    <section className="min-h-[70vh] bg-[hsl(var(--background))]" data-emp-section={sectionId}>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Title */}
        <h1 className="emp-display-sm mb-6">
          {hasQuery ? (
            <>
              {localized(locale, "RESULTS FOR", "نتايج البحث عن")} &ldquo;{query}&rdquo;
            </>
          ) : (
            <InlineEditable sectionId={sectionId} settingKey="placeholder_when_no_query" value={titleEmpty} />
          )}
        </h1>

        {/* Search box */}
        <form className="relative mb-8 max-w-xl" onSubmit={(e) => e.preventDefault()} role="search">
          <label htmlFor="emp-search-input" className="sr-only">
            {searchPlaceholder}
          </label>
          <input
            id="emp-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-11 pe-10 ps-4 text-sm emp-input"
          />
          <Search size={16} aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </form>

        {hasQuery && !hasMatches ? (
          <div className="text-center py-16">
            <Search size={40} className="mx-auto text-muted-foreground/40 mb-4" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              <InlineEditable sectionId={sectionId} settingKey="no_results_text" value={noResultsText} multiline />
            </p>
            <Link
              to="/products"
              className="inline-flex items-center mt-6 px-8 py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors"
            >
              {localized(locale, "Browse All", "تصفّح الكل")}
            </Link>
          </div>
        ) : hasMatches ? (
          <div className={`grid ${gridCols} gap-4 md:gap-5`}>
            {matches.map((p) => (
              <EmpProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
