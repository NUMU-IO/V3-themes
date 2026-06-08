"use client";

import {
  Link,
  useLocale,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { ShoppingBag } from "lucide-react";
import { asArray, asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { EmpProductCard } from "./emp-product-grid";

/**
 * emp-featured-collection — the home-page commerce showcase, ported from
 * V2 EmpFeaturedCollection. An eyebrow + heading on the left, a "VIEW
 * ALL" pill on the right, then a card grid. Merchants can hand-pick
 * products (the `product_ids` picker, used in the chosen order) or let
 * it auto-fill from the catalogue. Uses the shared EmpProductCard so it
 * matches the listing/related rails.
 *
 * Settings: title, subtitle, view_all_label, view_all_link,
 * product_ids (manual), product_count, columns.
 */
export default function EmpFeaturedCollection({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products, loading } = useProducts();
  const locale = useLocale();

  const title = asString(s.title) || localized(locale, "THE COLLECTION", "التشكيلة");
  const subtitle = asString(s.subtitle) || localized(locale, "SEASONAL EDIT", "تشكيلة الموسم");
  const viewAllLabel = asString(s.view_all_label) || localized(locale, "VIEW ALL", "عرض الكل");
  const viewAllLink = asString(s.view_all_link) || "/products";
  const count = Math.max(2, Math.min(12, asNumber(s.product_count, 8)));
  const cols = Math.max(2, Math.min(5, asNumber(s.columns, 4)));

  // Manual picks: the `product` setting type stores ids (or slugs).
  const manualIds = asArray<unknown>(s.product_ids).filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );

  const picked: Product[] =
    manualIds.length > 0
      ? manualIds
          .map((id) => products.find((p) => p.id === id || p.slug === id))
          .filter((p): p is Product => Boolean(p))
      : products;

  const displayProducts = picked.slice(0, count);

  // Hide the section entirely once loaded with nothing to show — an empty
  // commerce rail on the home page reads as broken.
  if (!loading && displayProducts.length === 0) return null;

  const gridStyle = {
    "--emp-cols-mobile": 2,
    "--emp-cols-desktop": cols,
  } as React.CSSProperties;

  const gridClass =
    "grid gap-3 sm:gap-4 md:gap-6 grid-cols-[repeat(var(--emp-cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--emp-cols-desktop),minmax(0,1fr))]";

  return (
    <section
      className="py-12 md:py-16 lg:py-24 bg-[var(--emp-cream)]"
      data-emp-section={sectionId}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-8 md:mb-10">
          <div>
            <span className="emp-label text-[var(--emp-amber)]">
              <InlineEditable
                sectionId={sectionId}
                settingKey="subtitle"
                value={subtitle}
              />
            </span>
            <h2 className="emp-heading text-2xl sm:text-3xl md:text-4xl mt-2 text-[var(--emp-dark)]">
              <InlineEditable
                sectionId={sectionId}
                settingKey="title"
                value={title}
              />
            </h2>
          </div>
          <Link
            to={viewAllLink}
            className="emp-btn text-[10px] sm:text-[11px] self-start sm:self-auto"
          >
            <InlineEditable
              sectionId={sectionId}
              settingKey="view_all_label"
              value={viewAllLabel}
            />
          </Link>
        </div>

        {loading && displayProducts.length === 0 ? (
          <div className={gridClass} style={gridStyle}>
            {[...Array(cols)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[var(--emp-dark)]/5 aspect-[3/4] animate-pulse"
              />
            ))}
          </div>
        ) : displayProducts.length > 0 ? (
          <div className={gridClass} style={gridStyle}>
            {displayProducts.map((product) => (
              <EmpProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <ShoppingBag
              size={40}
              className="mx-auto text-[var(--emp-amber)] mb-4"
              aria-hidden="true"
            />
            <p className="emp-heading text-lg text-[var(--emp-dark)]">{localized(locale, "COMING SOON", "قريبًا")}</p>
            <p className="text-sm text-[var(--emp-gray)] mt-2">
              {localized(locale, "Our collection is being prepared.", "تشكيلتنا بتتجهز دلوقتي.")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
