/**
 * tn-not-found — 404.
 *
 * **A deliberate departure from the reference.** Its 404 is a bare Shopify
 * error page — a yellow warning triangle, "Something went wrong.", "What
 * happened?", and no storefront shell at all. That is not a design; it is the
 * absence of one, and cloning it would mean shipping a dead end on the page a
 * shopper reaches from a stale link or a mistyped URL. Teen's is branded, keeps
 * the header and footer (main.tsx guarantees chrome on every route), and offers
 * a way back into the catalogue.
 *
 * Reached through the host's `notFound()`, which renders this template with a
 * real HTTP 404 — so it is correctly excluded from indexing, unlike a 200
 * "page not found" placeholder.
 */

import { Link, useLocale, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import { asBool, asNumber, asString, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import { IconArrowUpRight } from "../lib/icons";

export default function TnNotFound({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();
  const quickAdd = useQuickAdd();

  // 404 is one of the routes that ships no page data at all, so the products
  // below only exist because of `fetchIfMissing`.
  const limit = asNumber(s.popular_limit, 4);
  const { products } = useProducts({ limit: 100, fetchIfMissing: true });
  const picks = asBool(s.show_popular_products, true) ? products.slice(0, limit) : [];

  return (
    <section className="tn-section tn-notfound">
      <div className="tn-container">
        <div className="tn-card tn-notfound-card">
          <p className="tn-label tn-notfound-code">{asString(s.code) || "404"}</p>
          <h1 className="tn-notfound-title">
            {asString(s.heading) || t("notfound.heading", "This one’s gone.")}
          </h1>
          <p className="tn-footer-text">
            {asString(s.body) ||
              t("notfound.body", "The link is dead or the page moved. The good stuff is still here.")}
          </p>
          <Link to={asString(s.cta_link, "/products")} className="tn-btn tn-btn-dark">
            {asString(s.cta_text) || t("notfound.cta", "Shop everything")}
            <IconArrowUpRight size={14} className="tn-flip-rtl" />
          </Link>
        </div>

        {picks.length > 0 && (
          <div className="tn-notfound-picks">
            <h2 className="tn-rail-title tn-cart-pickstitle">
              {asString(s.popular_title) || t("notfound.popular", "Popular right now")}
            </h2>
            <div
              className="tn-grid"
              style={{ "--tn-cols-tablet": 4, "--tn-cols-desktop": 4 } as React.CSSProperties}
            >
              {picks.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} onQuickAdd={quickAdd.open} />
              ))}
            </div>
          </div>
        )}
      </div>

      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </section>
  );
}
