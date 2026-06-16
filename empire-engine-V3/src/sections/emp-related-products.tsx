"use client";

import { useMemo } from "react";
import {
  useLocale,
  useProductOptional,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { EmpProductCard } from "./emp-product-grid";

/**
 * emp-related-products — "you may also like" rail under the PDP. Prefers
 * same-category products (matching V2's behaviour) and excludes the
 * product currently in context; falls back to the first N of the
 * catalogue when there's no product context (e.g. customizer preview).
 *
 * Settings: title, count (2–8).
 */
export default function EmpRelatedProducts({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { products } = useProducts();
  const current = useProductOptional();
  const locale = useLocale();

  const title = asString(s.title) || localized(locale, "YOU MAY ALSO LIKE", "ممكن يعجبك كمان");
  const count = Math.max(2, Math.min(8, asNumber(s.count, 4)));

  const items: Product[] = useMemo(() => {
    if (products.length === 0) return [];
    if (!current) return products.slice(0, count);
    const sameCategory = products.filter(
      (p) => p.id !== current.id && p.category && p.category === current.category,
    );
    const pool =
      sameCategory.length > 0
        ? sameCategory
        : products.filter((p) => p.id !== current.id);
    return pool.slice(0, count);
  }, [products, current, count]);

  if (items.length === 0) return null;

  return (
    <section
      className="py-12 md:py-16 bg-[hsl(var(--background))] border-t border-[hsl(var(--border))]"
      data-emp-section={sectionId}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-xl font-black uppercase tracking-tight mb-6">
          <InlineEditable
            sectionId={sectionId}
            settingKey="title"
            value={title}
          />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          {items.map((p) => (
            <EmpProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
