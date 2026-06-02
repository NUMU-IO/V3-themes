"use client";
import { Link, useCollections } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { asNumber, asString, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal categories — faithful port of the V2 LuxCategories (centered
 * eyebrow + square category grid with hover-zoom image and uppercase label).
 * V2 className strings kept verbatim. Re-plumbed on the V3 SDK: the V2
 * `useProducts().categories` becomes `useCollections()`; each collection's
 * `image_url` / `slug` map onto the V2 category's `image` / link.
 */
export default function LuxCategories({ instance }: SectionRenderProps) {
  const { collections } = useCollections();
  const isLoading = false;
  const s = instance.settings ?? {};

  const title = asString(s.title) || "تسوق حسب الفئة";
  const columnsDesktop = asNumber(s.columns_desktop, 5);
  const columnsMobile = asNumber(s.columns_mobile, 2);
  const maxItems = asNumber(s.max_items, 0);

  const displayCategories =
    maxItems > 0 ? collections.slice(0, maxItems) : collections;

  // Hide section if no categories
  if (!isLoading && displayCategories.length === 0) return null;

  const cssVars = {
    "--cols-mobile": columnsMobile,
    "--cols-desktop": columnsDesktop,
  } as React.CSSProperties;

  const gridClassName =
    "grid gap-4 grid-cols-[repeat(var(--cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--cols-desktop),minmax(0,1fr))]";

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        {title && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground text-center mb-8">
            {title}
          </p>
        )}

        <div className={gridClassName} style={cssVars}>
          {displayCategories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/products?category=${cat.slug ?? cat.id}`}
                className="group block text-center"
              >
                <div className="aspect-square overflow-hidden bg-[hsl(var(--lux-gray))] mb-3">
                  {cat.image_url && (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                    />
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
                  {cat.name}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
