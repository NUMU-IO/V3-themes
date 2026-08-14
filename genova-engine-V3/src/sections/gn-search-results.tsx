/**
 * gn-search-results — /search.
 *
 * A prominent field, a clear affordance, and results reusing the product card.
 * Search IS supported server-side (`search` is one of the five params the
 * catalog endpoint accepts), so unlike the PLP's facets this queries the real
 * catalogue rather than filtering a fetched pool.
 *
 * The query is read from `?q=` on first render so a shared or bookmarked search
 * URL works, and pushed back to the URL as the shopper types — debounced by the
 * SDK's `useSearch`.
 */

import { useEffect, useState } from "react";
import { Link, useLocale, useSearch } from "@numueg/theme-sdk";
import { asBool, asNumber } from "@numueg/theme-kit";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard, ProductCardSkeleton } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import { IconClose, IconSearch } from "../lib/icons";

function initialQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export default function GnSearchResults({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const locale = useLocale();
  const quickAdd = useQuickAdd();

  // Seeded in an effect, not at first render: reading `window` during render
  // would produce different server and client output and break hydration.
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(initialQuery()), []);

  // `useSearch` returns { query, results: { products, collections, pages, articles }, … }
  const { results, loading } = useSearch(query);
  const products = results?.products ?? [];
  const columns = asNumber(s.columns_desktop, 3);

  // Keep the URL in step so results are shareable and Back works.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url.toString());
  }, [query]);

  const hasQuery = query.trim().length > 0;

  return (
    <section className="gn-search">
      <div className="gn-container gn-plp-head">
        <h1 className="gn-page-title">{t("search.heading", "Search")}</h1>

        <form className="gn-search-big" role="search" onSubmit={(e) => e.preventDefault()}>
          <IconSearch size={20} />
          <input
            type="search"
            name="q"
            className="gn-search-big-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder", "What are you looking for?")}
            aria-label={t("search.heading", "Search")}
            autoComplete="off"
          />
          {hasQuery && (
            <button
              type="button"
              className="gn-icon-btn"
              aria-label={t("search.clear", "Clear search")}
              onClick={() => setQuery("")}
            >
              <IconClose size={18} />
            </button>
          )}
        </form>
      </div>

      <div className="gn-container">
        {hasQuery && (
          <p className="gn-plp-count gn-label" aria-live="polite">
            {loading
              ? t("search.searching", "Searching…")
              : t("search.results", "{{n}} results for “{{q}}”")
                  .replace("{{n}}", String(products.length))
                  .replace("{{q}}", query)}
          </p>
        )}

        <div className="gn-grid" style={{ ["--gn-grid-cols" as string]: String(columns) }}>
          {loading && hasQuery
            ? Array.from({ length: columns }, (_, i) => <ProductCardSkeleton key={i} />)
            : products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  onQuickAdd={quickAdd.open}
                />
              ))}
        </div>

        {hasQuery && !loading && products.length === 0 && (
          <div className="gn-empty">
            <p className="gn-empty-title">
              {t("search.empty", "Nothing found for “{{q}}”").replace("{{q}}", query)}
            </p>
            {asBool(s.show_empty_suggestions, true) && (
              <p className="gn-empty-hint">
                {t("search.empty_hint", "Try a shorter word, or browse everything.")}
              </p>
            )}
            <Link to="/products" className="gn-btn gn-btn-outline">
              {t("collections.browse_all", "Browse all products")}
            </Link>
          </div>
        )}
      </div>

      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </section>
  );
}
