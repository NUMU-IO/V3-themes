"use client";

import {
  Link,
  useCollections,
  useLocale,
  useResolvedSettings,
} from "@numueg/theme-sdk";
import { asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * emp-categories — faithful V3 port of V2 EmpCategories
 * (numu-egyptian-bazaar/src/themes/empire/sections/categories/EmpCategories.tsx).
 *
 * A white `emp-section` with an optional small title and a responsive grid
 * (2 / 3 / 5 cols) of category cards. Each card is a BLACK `aspect-square
 * rounded-lg` tile holding the category image (zooms on hover), with the
 * category name in `text-xs font-bold uppercase tracking-[0.15em]` below.
 * When a category has no image, the tile shows its first letter as a faint
 * monogram — exactly like V2.
 *
 * V2's "categories" are V3 COLLECTIONS (the SDK has no category list);
 * cards link to `/collections/<slug>`. KEEPS the V3 image-fit improvement
 * (`object-cover`) so the photo fills the black tile.
 *
 * Settings: title (optional — hidden when empty).
 */
export default function EmpCategories({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { collections } = useCollections();
  const locale = useLocale();

  const title = asString(s.title);

  // Nothing to show → don't render an empty grid.
  if (collections.length === 0) return null;

  return (
    <section className="emp-section bg-white" data-emp-section={sectionId}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-xl font-bold mb-6 text-foreground">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>
        )}

        {/* Category cards — black tile + image, white label below */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {collections.map((cat) => (
            <Link key={cat.id} to={`/collections/${cat.slug}`} className="group block">
              <div className="aspect-square bg-black rounded-lg overflow-hidden relative">
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white/20 text-4xl font-black uppercase">
                      {cat.name?.[0]}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-center text-xs font-bold uppercase tracking-[0.15em] mt-3 text-foreground">
                {cat.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
