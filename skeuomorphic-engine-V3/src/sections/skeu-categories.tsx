"use client";
import { Link, useCollections, useLocale } from "@numueg/theme-sdk";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Develop, useMotionOn } from "./_motion";

/**
 * Editorial categories — faithful port of V2
 * themes/editorial/sections/categories/SkeuCategories.tsx.
 *
 * V2 read `useProducts().{ categories, isLoading }`; on V3 the catalog
 * categories come from the SDK's `useCollections()` (collections carry
 * id/name/slug/image_url/product_count). Dramatic 4:5 image cards with a
 * bottom gradient + oversized uppercase label, exactly as V2.
 */
export default function SkeuCategories({ instance, sectionId }: SectionRenderProps) {
  const { collections } = useCollections();
  const on = useMotionOn();
  const isLoading = false;
  const s = instance.settings ?? {};
  const locale = useLocale();
  const title = asString(s.title) || localized(locale, "Shop by Category", "تسوق حسب الفئة");
  const maxItems = asNumber(s.max_items, 0);

  const displayCategories = maxItems > 0 ? collections.slice(0, maxItems) : collections;

  // Hide section if no categories
  if (!isLoading && displayCategories.length === 0) return null;

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">
          <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
        </h2>

        {!isLoading && displayCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {localized(locale, "No categories yet", "لا توجد فئات بعد")}
          </p>
        ) : (
          // Workshop drawers: each category is a raised kraft card that
          // physically presses down when grabbed (the theme's hallmark).
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {displayCategories.map((cat, i) => (
              <Develop key={cat.id} on={on} delay={Math.min(i, 5) * 0.08}>
                <Link
                  to={`/products?category=${cat.id}`}
                  className="skeu-card group block overflow-hidden transition-shadow duration-150 active:shadow-[var(--skeu-shadow-pressed)] active:translate-y-[1px]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-[hsl(var(--skeu-kraft-low))]" />
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-2 px-4 py-3 border-t border-[var(--vn-border)]">
                    <span className="vn-heading text-base line-clamp-1 group-hover:text-[hsl(var(--skeu-leather))] transition-colors">
                      {cat.name}
                    </span>
                    <span className="text-xs font-bold text-[var(--vn-muted)] whitespace-nowrap">
                      {cat.product_count} {localized(locale, "pcs", "قطعة")}
                    </span>
                  </div>
                </Link>
              </Develop>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
