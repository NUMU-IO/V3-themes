/**
 * tn-product-rail — editorial line, heading, "View all", one row of cards.
 *
 * Reads through `useProducts({ fetchIfMissing: true })` because the host only
 * pre-fetches products on catalog routes. Without the escape hatch this section
 * looks perfect on the homepage and renders an empty row on `/cart`,
 * `/pages/*` and every content page — the single most common "works here,
 * blank there" bug in the engine.
 *
 * The rail is a scroll-snap row, not a JS carousel: it swipes natively on a
 * phone, keyboard-scrolls, needs no arrows to be usable, and cannot get stuck
 * in a half-transitioned state. The arrows are an enhancement on top.
 */

import { useMemo, useRef } from "react";
import { Link, useLocale, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import { asArray, asBool, asNumber, asString, cx, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard, ProductCardSkeleton } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import { IconChevronLeft, IconChevronRight } from "../lib/icons";

export default function TnProductRail({ instance }: SectionRenderProps) {
  const s = useResolvedRailSettings(instance);
  const t = useT();
  const locale = useLocale();
  const quickAdd = useQuickAdd();
  const trackRef = useRef<HTMLDivElement | null>(null);

  // 100, not `limit`: the filtering below happens client-side, so asking for
  // only `limit` products and then filtering by category leaves a short row.
  const { products, loading } = useProducts({ limit: 100, fetchIfMissing: true });

  const items = useMemo<Product[]>(() => {
    if (s.source === "product_list" && s.pickedIds.length > 0) {
      // Preserve the merchant's ORDER, not the API's. They arranged these.
      const byId = new Map(products.map((p) => [String(p.id), p]));
      return s.pickedIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
    }
    if (s.source === "category" && s.categoryId) {
      // `category` on the typed Product, `category_id` on raw payloads — read
      // both rather than silently returning an empty rail on half the stores.
      return products
        .filter((p) => {
          const raw = p as unknown as Record<string, unknown>;
          return (
            String(raw.category ?? "") === s.categoryId ||
            String(raw.category_id ?? "") === s.categoryId
          );
        })
        .slice(0, s.limit);
    }
    return products.slice(0, s.limit);
  }, [products, s.source, s.categoryId, s.pickedIds, s.limit]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    // One "page" is 80% of the visible track — enough that the shopper sees a
    // partial card and knows there is more, which a full-width jump hides.
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="tn-section tn-rail-section">
      <div className="tn-container">
        <header className="tn-rail-head">
          <div className="tn-rail-headings">
            {s.editorial ? <p className="tn-rail-editorial">{s.editorial}</p> : null}
            {s.heading ? <h2 className="tn-rail-title">{s.heading}</h2> : null}
          </div>
          <div className="tn-rail-tools">
            {s.viewAll ? (
              <Link to={s.viewAll} className="tn-rail-viewall">
                {t("common.view_all", "View all")}
              </Link>
            ) : null}
            {s.layout === "rail" && items.length > 2 && (
              <div className="tn-rail-arrows">
                {/* Logical direction: in RTL "previous" is still the start of
                    the track, and `scrollBy` follows the writing direction, so
                    the same sign is correct in both. Only the ICON flips. */}
                <button
                  type="button"
                  className="tn-icon-btn"
                  aria-label={t("common.previous", "Previous")}
                  onClick={() => scrollBy(-1)}
                >
                  <IconChevronLeft className="tn-flip-rtl" />
                </button>
                <button
                  type="button"
                  className="tn-icon-btn"
                  aria-label={t("common.next", "Next")}
                  onClick={() => scrollBy(1)}
                >
                  <IconChevronRight className="tn-flip-rtl" />
                </button>
              </div>
            )}
          </div>
        </header>

        <div
          ref={trackRef}
          className={cx("tn-rail", s.layout === "grid" ? "is-grid tn-grid" : "is-rail")}
          style={
            {
              "--tn-cols-desktop": s.columnsDesktop,
              "--tn-rail-per-view": s.columnsDesktop,
            } as React.CSSProperties
          }
        >
          {loading && items.length === 0
            ? Array.from({ length: Math.min(4, s.limit) }, (_, i) => (
                <ProductCardSkeleton key={`sk-${i}`} />
              ))
            : items.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  locale={locale}
                  showQuickAdd={s.showQuickAdd}
                  showSwatches={s.showSwatches}
                  onQuickAdd={quickAdd.open}
                  /* Only the first row is worth loading eagerly. */
                  eager={i < 2}
                />
              ))}
        </div>
      </div>

      {quickAdd.product && (
        <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />
      )}
    </section>
  );
}

/**
 * Settings, read once through `useResolvedSettings`.
 *
 * `useResolvedSettings`, never raw `instance.settings`: it is what resolves
 * dynamic sources (`{__numu_source: "store.name"}`) and what makes an editor
 * keystroke repaint the preview.
 */
function useResolvedRailSettings(instance: SectionRenderProps["instance"]) {
  const s = useResolvedSettings(instance);
  return {
    editorial: asString(s.editorial_line),
    heading: asString(s.heading),
    viewAll: asString(s.view_all_link),
    source: asString(s.source, "newest"),
    categoryId: asString(s.category),
    // A product_list arrives as ids, or as objects carrying an id, depending on
    // where the customizer wrote it.
    pickedIds: asArray(s.product_list)
      .map((v) => (typeof v === "string" ? v : asString((v as { id?: unknown })?.id)))
      .filter(Boolean),
    limit: asNumber(s.limit, 6),
    layout: asString(s.layout, "rail"),
    columnsDesktop: asNumber(s.columns_desktop, 4),
    showQuickAdd: asBool(s.show_quick_add, true),
    showSwatches: asBool(s.show_swatches, true),
  };
}
