"use client";

import { useMemo, useState } from "react";
import {
  useLocale,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { EmpProductCard } from "./emp-product-grid";

/**
 * emp-featured-collection — faithful V3 port of V2 EmpFeatured
 * (numu-egyptian-bazaar/src/themes/empire/sections/featured-collection/EmpFeatured.tsx).
 *
 * A white `emp-section`: a big `font-black uppercase` title on the start
 * side, a row of rounded-full pill TABS on the end side (الأكثر رواجاً /
 * الأكثر مبيعاً / وصل حديثاً / عرض الكل — active = black fill), then a
 * HORIZONTAL scrollable product rail (each card `min-w-[240px]`). NOT the
 * eyebrow-heading-grid layout it inherited from the Bazar clone.
 *
 * Settings: title, view_all_link, product_count.
 */
export default function EmpFeaturedCollection({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products, loading } = useProducts();
  const locale = useLocale();

  const title = asString(s.title) || localized(locale, "SHOP", "تسوّق");
  const count = Math.max(2, Math.min(12, asNumber(s.product_count, 5)));

  // Pill tabs, copy ported verbatim from V2 (Arabic labels), with English
  // equivalents for LTR shoppers.
  const tabs = [
    { key: "trending", label: localized(locale, "Trending", "الأكثر رواجاً") },
    { key: "bestseller", label: localized(locale, "Bestsellers", "الأكثر مبيعاً") },
    { key: "new", label: localized(locale, "New", "وصل حديثاً") },
    { key: "all", label: localized(locale, "View All", "عرض الكل") },
  ];

  const [activeTab, setActiveTab] = useState("trending");

  const filtered = useMemo<Product[]>(() => {
    let list = [...products];
    switch (activeTab) {
      case "new":
        // Newest-first proxy: reverse catalogue order.
        list = [...list].reverse();
        break;
      case "bestseller":
        // On-sale items surface first as a best-effort "bestseller" proxy
        // (the SDK Product has no rating/review fields).
        list = list.filter(
          (p) =>
            typeof p.compare_at_price === "number" && p.compare_at_price > p.price,
        );
        break;
      case "trending":
      default:
        break;
    }
    // V2 parity: if a filter empties, fall back to the full set.
    if (list.length === 0) list = products;
    return list.slice(0, count);
  }, [products, activeTab, count]);

  // Don't render an empty rail on the home page (reads as broken).
  if (!loading && products.length === 0) return null;

  return (
    <section className="emp-section bg-white" data-emp-section={sectionId}>
      <div className="container mx-auto px-4">
        {/* Title + pill tabs row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 text-sm font-medium whitespace-nowrap rounded-full border transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-black text-white border-black"
                    : "bg-transparent text-foreground border-[hsl(var(--border))] hover:border-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal scrollable product row */}
        {loading && products.length === 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {[...Array(count)].map((_, i) => (
              <div
                key={i}
                className="min-w-[240px] md:min-w-[260px] flex-shrink-0 rounded-lg bg-secondary aspect-square animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="min-w-[240px] md:min-w-[260px] flex-shrink-0 snap-start"
              >
                <EmpProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
