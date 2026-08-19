/**
 * tn-search — `/search`.
 *
 * Reference anatomy: a bordered white panel holding a centred `Search` heading,
 * a wide field with a dark `Search ↗` button beside it, and a row of underlined
 * quick links. No products until there is a query.
 *
 * ## Why this does NOT use the SDK's `useSearch()`
 *
 * `useSearch()` fetches `/api/storefront/search`, and **numu-storefront has no
 * such route** (`src/app/api/storefront/` holds apps, cart-track,
 * checkout-config, currencies, geocode, pickup-locations, products, promotions,
 * store, track, track-lookup, unlock — and nothing else). The SDK treats a
 * non-OK response as "no matches" rather than an error, so a theme wired that
 * way renders a working-looking search that answers **zero results to every
 * query, silently**. Genova ships exactly that.
 *
 * What actually works is already on the page: the `/search` route pre-fetches
 * `products` (up to 1000 — the whole catalogue for any realistic store) and the
 * submitted `query` into `page.data`. So Teen matches locally, with folding that
 * makes Arabic searchable — diacritics stripped, alef/ya/ta-marbuta unified,
 * Arabic-Indic digits normalised. See lib/filters.ts.
 *
 * Submitting is a real form GET, so the results are a shareable URL and a
 * server-rendered page rather than client state that Back throws away.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, requestNavigate, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asNumber,
  asString,
  readBlockNodes,
  usePageData,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import {
  asProducts,
  matchesQuery,
  queryTokens,
  sortProducts,
} from "../lib/filters";
import { PlpEmpty, ProductGrid, productCountLabel } from "../lib/plp";
import { IconArrowUpRight } from "../lib/icons";

export default function TnSearch({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();
  const page = usePageData();

  const heading = asString(s.heading) || t("search.heading", "Search");
  const placeholder = asString(s.placeholder) || t("search.placeholder", "Search");
  const pageSize = asNumber(s.products_per_page, 16);
  const columnsDesktop = asNumber(s.columns_desktop, 4);

  // The host puts the submitted query and the catalogue in `page.data` on this
  // route. That is the SSR-correct source: reading `window.location` during
  // render would make the server and client markup differ and break hydration.
  const data = (page?.data ?? {}) as { query?: unknown; products?: unknown };
  const pageQuery = asString(data.query);
  const pool = Array.isArray(data.products) ? data.products : [];

  // Belt and braces for a soft navigation, and for the CLI dev server (which
  // ships no page data at all). Re-runs when the page query changes so a
  // client-side move between two searches still lands on the right term.
  const [urlQuery, setUrlQuery] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    setUrlQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, [pageQuery]);

  const query = pageQuery || urlQuery;
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);

  // Server renders `/search`; the client corrects it to the real path so the
  // no-JS fallback works under dev path-routing (`/<store>/search`) and under a
  // locale prefix (`/ar/search`) too. Both renders agree on the first pass, so
  // hydration is clean.
  const [action, setAction] = useState("/search");
  useEffect(() => {
    if (typeof window === "undefined") return;
    setAction(window.location.pathname || "/search");
  }, []);

  const tokens = useMemo(() => queryTokens(query), [query]);
  const results = useMemo(() => {
    if (tokens.length === 0) return [];
    const matched = pool.filter((p) => matchesQuery(p, tokens));
    return asProducts(sortProducts(matched, "relevance", { locale, query }));
  }, [pool, tokens, locale, query]);

  const links = readBlockNodes(instance, "link")
    .map((node) => ({
      label: asString(node.settings.label),
      url: asString(node.settings.url, "/"),
    }))
    .filter((l) => l.label);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    const q = draft.trim();
    const target = q ? `/search?q=${encodeURIComponent(q)}` : "/search";
    // Soft navigation when the host offers it; otherwise let the browser
    // perform the ordinary GET this form already describes.
    if (requestNavigate(target)) e.preventDefault();
  };

  return (
    <section className="tn-section tn-searchpage">
      <div className="tn-container">
        <div className="tn-panel tn-search-panel">
          <h1 className="tn-search-title">{heading}</h1>

          <form className="tn-search-form" role="search" action={action} method="get" onSubmit={submit}>
            <input
              type="search"
              name="q"
              className="tn-input tn-search-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              aria-label={heading}
              autoComplete="off"
            />
            <button type="submit" className="tn-btn tn-btn-dark tn-search-submit">
              {t("search.submit", "Search")}
              <IconArrowUpRight size={14} className="tn-flip-rtl" />
            </button>
          </form>

          {links.length > 0 && (
            <nav className="tn-search-links" aria-label={t("search.quick_links", "Quick links")}>
              {links.map((l) => (
                <Link key={`${l.label}-${l.url}`} to={l.url} className="tn-search-link">
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {tokens.length > 0 && (
          <div className="tn-search-results">
            <p className="tn-plp-count is-block" role="status" aria-live="polite">
              {`${productCountLabel(results.length, t)} ${t("search.for", "for “{{q}}”").replace(
                "{{q}}",
                query,
              )}`}
            </p>

            <ProductGrid
              products={results}
              locale={locale}
              columnsDesktop={columnsDesktop}
              pageSize={pageSize}
              resetKey={query}
              empty={
                <PlpEmpty
                  title={t("search.empty", "Nothing found for “{{q}}”").replace("{{q}}", query)}
                  body={t("search.empty_hint", "Try a shorter word, or browse everything.")}
                />
              }
            />

            {results.length === 0 && (
              <p className="tn-plp-backlink">
                <Link to="/products" className="tn-btn tn-btn-outline">
                  {t("search.browse_all", "Browse all products")}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
