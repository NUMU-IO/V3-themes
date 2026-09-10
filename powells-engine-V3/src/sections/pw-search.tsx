/**
 * pw-search — search results, in the same shelf layout as a collection.
 *
 * A separate section rather than a flag on `pw-collection` because the two
 * differ in the only place that matters: where the products come from. This
 * one drives `useSearch` off the `q` query parameter and shows the query back
 * to the shopper; the collection reads the host's product payload. Everything
 * below the heading is the same card, from the same component.
 *
 * The query is read on the client, so the first server-rendered frame has no
 * results. That is correct: the URL is the only place the term exists, and
 * rendering a stale or empty "0 results" line on the server would be worse
 * than a heading that fills in.
 */

import { useEffect, useState } from "react";
import { Link, useResolvedSettings, useSearch } from "@numueg/theme-sdk";
import { asBool, asString, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { Twinkle } from "../lib/ornaments";
import { useOrnaments } from "../lib/shared";

export default function PwSearch({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
    read();
    // Soft navigation changes the URL without a reload, so a search made from
    // the masthead while already on /search would otherwise keep the old term.
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const { results, loading } = useSearch(query);
  const products = results?.products ?? [];

  return (
    <div className="pw-container" style={{ paddingBlock: "38px 80px" }}>
      <div className="pw-page-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Twinkle />
          </span>
        )}
        <h1>
          {query
            ? `${t("search.results_for", "Results for")} “${query}”`
            : asString(s.heading) || t("search.label", "Search for books")}
        </h1>
        <span className="pw-rule" />
      </div>

      {products.length === 0 ? (
        <div className="pw-empty">
          <p>{loading ? "…" : t("search.no_results", "No books matched that search.")}</p>
          {!loading && <p className="pw-hand">{t("search.try", "Try an author, a title, or an ISBN.")}</p>}
          <Link className="pw-btn pw-btn-ghost" to="/products">
            {t("collection.empty_cta", "Browse everything")}
          </Link>
        </div>
      ) : (
        <div className="pw-grid" style={{ marginBlockStart: 34 }}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showWishlist={asBool(s.show_wishlist, true)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
