/**
 * pw-shelf — a row of books under a heading.
 *
 * The home page's workhorse: "New arrivals", "Staff picks", "Under $10". One
 * section, used several times with different sources, rather than one section
 * per row — the layout is identical and only the query differs.
 *
 * Rendered as a horizontal RAIL that scrolls, not a wrapping grid: a shelf is
 * a line of books, and a rail keeps the home page's vertical rhythm no matter
 * how many titles a merchant points it at. The listing page is where a grid
 * belongs.
 */

import { useMemo } from "react";
import { Link, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import { asBool, asNumber, asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { Twinkle } from "../lib/ornaments";

type Source = "newest" | "sale" | "cheapest" | "collection";

export default function PwShelf({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();

  // Home ships `page.data.products`, but this section is also usable on routes
  // that ship none — hence fetchIfMissing.
  const { products } = useProducts({ limit: 48, fetchIfMissing: true });

  const source = (asString(s.source) || "newest") as Source;
  const limit = asNumber(s.limit, 5);
  const collectionHandle = asString(s.collection).toLowerCase();

  const picks = useMemo(() => {
    const withMeta = products as Array<Product & Record<string, unknown>>;
    let list = withMeta;

    if (source === "collection" && collectionHandle) {
      list = withMeta.filter((p) => {
        const category = (p.category ?? {}) as Record<string, unknown>;
        return (
          String(category.id ?? "").toLowerCase() === collectionHandle ||
          String(category.name ?? "").toLowerCase() === collectionHandle
        );
      });
      // A handle that matches nothing falls back to everything rather than
      // rendering an empty row — a merchant mistyping a collection name should
      // see books, not a hole in their home page.
      if (list.length === 0) list = withMeta;
    }

    const copy = [...list];
    switch (source) {
      case "sale":
        return copy
          .filter((p) => Number(p.compare_at_price ?? 0) > Number(p.price ?? 0))
          .slice(0, limit);
      case "cheapest":
        return copy.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0)).slice(0, limit);
      case "newest":
        return copy
          .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
          .slice(0, limit);
      default:
        return copy.slice(0, limit);
    }
  }, [products, source, collectionHandle, limit]);

  if (picks.length === 0) return null;

  const heading = asString(s.heading);
  const note = asString(s.note);
  const viewAllText = asString(s.view_all_text);
  const viewAllLink = asString(s.view_all_link) || "/products";

  return (
    <section className="pw-section">
      <div className="pw-section-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Twinkle size={20} />
          </span>
        )}
        {heading && <h2>{heading}</h2>}
        <span className="pw-rule" />
        {note && ornaments && <span className="pw-hand">{note}</span>}
        {viewAllText && (
          <Link className="pw-linkbtn" to={viewAllLink}>
            {viewAllText}
          </Link>
        )}
      </div>

      <div className="pw-rail-scroll">
        {picks.map((product) => (
          <div className="pw-rail-item" key={product.id}>
            <ProductCard
              product={product}
              showWishlist={asBool(s.show_wishlist, true)}
              formatLabel={asString((product as unknown as Record<string, unknown>).product_type)}
            />
          </div>
        ))}
      </div>

      <p className="pw-sr">{t("collection.count_many", "{{count}} books").replace("{{count}}", String(picks.length))}</p>
    </section>
  );
}
