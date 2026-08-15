/**
 * gn-not-found — 404.
 *
 * A 404 that only apologises is a dead end. This one offers a way back into the
 * catalogue and, optionally, a rail of real products — a shopper who mistyped a
 * URL is still a shopper.
 *
 * Note the storefront runs a no-404 catch-all (`[...slug]`), so this renders far
 * less often than on a conventional store — but it must still be right when it
 * does, and it must still carry chrome.
 */

import { Link, useLocale, useProducts } from "@numueg/theme-sdk";
import { asBool, asString } from "@numueg/theme-kit";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";

export default function GnNotFound({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const locale = useLocale();
  const quickAdd = useQuickAdd();
  const { products } = useProducts({ limit: 4, fetchIfMissing: true });

  const showPopular = asBool(s.show_popular_products, true) && products.length > 0;

  return (
    <section className="gn-404">
      <div className="gn-container gn-empty">
        <p className="gn-label">404</p>
        <h1 className="gn-page-title">
          {asString(s.headline) || t("notfound.headline", "That page isn’t here")}
        </h1>
        <p className="gn-empty-hint">
          {asString(s.body) ||
            t("notfound.body", "The link may be old, or the piece may have sold out.")}
        </p>
        <Link to={asString(s.cta_link, "/products")} className="gn-btn gn-btn-primary">
          {asString(s.cta_text) || t("notfound.cta", "Shop everything")}
        </Link>
      </div>

      {showPopular && (
        <div className="gn-rail-section">
          <div className="gn-container gn-rail-head">
            <h2 className="gn-section-heading">{t("notfound.popular", "Popular right now")}</h2>
          </div>
          <div className="gn-container gn-grid" style={{ ["--gn-grid-cols" as string]: "4" }}>
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} onQuickAdd={quickAdd.open} />
            ))}
          </div>
        </div>
      )}

      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </section>
  );
}
