/**
 * gn-product-rail — "New in", "Bestsellers", any curated merchandising row.
 *
 * A scroll-snap rail of product cards with a heading, a "View all" link and
 * arrow controls. Used two or three times on the homepage, so everything about
 * it is a setting.
 *
 * Source: newest from the store, a specific category, or a hand-picked list.
 * Reads through `useProducts({fetchIfMissing: true})` because the host only
 * pre-fetches `page.data.products` on catalog routes — a rail on /about or a
 * CMS page would otherwise be permanently empty.
 */

import { useMemo, useRef } from "react";
import { Link, useLocale, useProducts, type Product } from "@numueg/theme-sdk";
import { asArray, asBool, asNumber, asString } from "@numueg/theme-kit";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { Reveal } from "../lib/reveal";
import { ProductCard } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import { IconChevronRight } from "../lib/icons";

export default function GnProductRail({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const locale = useLocale();
  const quickAdd = useQuickAdd();
  const trackRef = useRef<HTMLDivElement>(null);

  const limit = asNumber(s.limit, 8);
  const { products, loading } = useProducts({ limit: 100, fetchIfMissing: true });

  const source = asString(s.source, "newest");
  const categoryId = asString(s.category);
  const pickedIds = asArray<string>(s.product_list).map(String);

  const items: Product[] = useMemo(() => {
    if (source === "product_list" && pickedIds.length > 0) {
      // Preserve the merchant's chosen ORDER, not the catalogue's.
      const byId = new Map(products.map((p) => [String(p.id), p]));
      return pickedIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
    }
    if (source === "category" && categoryId) {
      return products.filter((p) => String(p.category ?? "") === categoryId).slice(0, limit);
    }
    return products.slice(0, limit);
  }, [products, source, categoryId, pickedIds, limit]);

  const perView = asNumber(s.columns_desktop, 4);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth / perView), behavior: "smooth" });
  };

  // Nothing to show and nothing coming: render nothing rather than a heading
  // over an empty strip.
  if (!loading && items.length === 0) return null;

  const heading = asString(s.heading) || t("product_rail.heading", "New in");
  const viewAll = asString(s.view_all_link, "/products");

  return (
    <section className="gn-rail-section">
      <div className="gn-container gn-rail-head">
        <h2 className="gn-section-heading">{heading}</h2>
        <div className="gn-rail-head-end">
          {viewAll && (
            <Link to={viewAll} className="gn-textlink">
              {t("general.view_all", "View all")}
              <IconChevronRight size={14} />
            </Link>
          )}
          {asBool(s.show_arrows, true) && items.length > perView && (
            <div className="gn-rail-arrows">
              <button
                type="button"
                className="gn-rail-arrow"
                aria-label={t("general.previous", "Previous")}
                onClick={() => scrollBy(-1)}
              >
                <IconChevronRight size={16} style={{ transform: "scaleX(-1)" }} />
              </button>
              <button
                type="button"
                className="gn-rail-arrow"
                aria-label={t("general.next", "Next")}
                onClick={() => scrollBy(1)}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className="gn-container gn-rail-track"
        style={{ ["--gn-rail-per-view" as string]: String(perView) }}
      >
        {items.map((product, pi) => (
          <Reveal key={product.id} index={pi} className="gn-rail-item">
            <ProductCard
              product={product}
              locale={locale}
              showQuickAdd={asBool(s.show_quick_add, true)}
              showColorLabel={asBool(s.show_color_label, true)}
              onQuickAdd={quickAdd.open}
            />
          </Reveal>
        ))}
      </div>

      {quickAdd.product && (
        <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />
      )}
    </section>
  );
}
