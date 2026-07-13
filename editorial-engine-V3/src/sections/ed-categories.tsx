"use client";
import { Link, useCollections, useLocale } from "@numueg/theme-sdk";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Plate, useMotionOn } from "./_motion";

/**
 * Editorial categories — faithful port of V2
 * themes/editorial/sections/categories/EdCategories.tsx.
 *
 * V2 read `useProducts().{ categories, isLoading }`; on V3 the catalog
 * categories come from the SDK's `useCollections()` (collections carry
 * id/name/slug/image_url/product_count). Dramatic 4:5 image cards with a
 * bottom gradient + oversized uppercase label, exactly as V2.
 */
export default function EdCategories({ instance, sectionId }: SectionRenderProps) {
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {displayCategories.map((cat, i) => (
              // Plates uncover in reading order, alternating wipe direction
              // per column so the row reads like pages being turned.
              <Plate key={cat.id} on={on} from={i % 2 === 0 ? "start" : "end"} delay={Math.min(i, 5) * 0.07}>
                <Link
                  to={`/products?category=${cat.id}`}
                  className="group relative block overflow-hidden aspect-[4/5]"
                >
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-[hsl(var(--ed-green))]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="text-white font-black text-xl uppercase">
                      {cat.name}
                    </span>
                    <p className="text-white/60 text-xs mt-1">
                      {cat.product_count} {localized(locale, "products", "منتج")}
                    </p>
                  </div>
                </Link>
              </Plate>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
