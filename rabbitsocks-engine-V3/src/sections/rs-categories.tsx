"use client";
import { Link, useCollections, useLocale } from "@numueg/theme-sdk";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Aperture, useMotionOn } from "./_motion";

/**
 * Editorial categories — faithful port of V2
 * themes/editorial/sections/categories/RsCategories.tsx.
 *
 * V2 read `useProducts().{ categories, isLoading }`; on V3 the catalog
 * categories come from the SDK's `useCollections()` (collections carry
 * id/name/slug/image_url/product_count). Dramatic 4:5 image cards with a
 * bottom gradient + oversized uppercase label, exactly as V2.
 */
export default function RsCategories({ instance, sectionId }: SectionRenderProps) {
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
          // The gallery arcade: every category is an arched doorway with a
          // plaque beneath — walk through a shape into the collection.
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6">
            {displayCategories.map((cat, i) => (
              <Aperture key={cat.id} on={on} delay={Math.min(i, 5) * 0.08}>
                <Link
                  to={`/products?category=${cat.id}`}
                  className="rs-morph-host group block"
                >
                  <div className="relative aspect-[3/4] p-[4%]">
                    <div className="absolute inset-0 rs-clip-arch border border-[hsl(var(--rs-line))]" aria-hidden="true" />
                    <div className="w-full h-full rs-clip-arch rs-morph bg-[var(--rs-surface-high)]">
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-[hsl(var(--rs-navy))]" />
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-[var(--vn-border)] pt-2.5">
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))] line-clamp-1 group-hover:underline underline-offset-4">
                      {cat.name}
                    </span>
                    <span className="rs-spec">
                      {cat.product_count} {localized(locale, "pcs", "قطعة")}
                    </span>
                  </div>
                </Link>
              </Aperture>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
