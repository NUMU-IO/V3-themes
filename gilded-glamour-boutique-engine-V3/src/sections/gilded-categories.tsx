"use client";
import { Link, useCollections } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { asString, asNumber, type SectionRenderProps } from "./_shared";

const PLACEHOLDER_SQUARE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&h=600&q=60";

const GildedCategories = ({ instance }: SectionRenderProps) => {
  const { collections } = useCollections();
  const isLoading = false;
  const s = instance.settings ?? {};

  const title = asString(s.title) || "Curated Verticals";
  const maxItems = asNumber(s.max_items, 0);

  const displayCategories =
    maxItems > 0 ? collections.slice(0, maxItems) : collections;

  if (!isLoading && displayCategories.length === 0) return null;

  return (
    <section className="py-12 md:py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase text-muted-foreground mb-8 md:mb-12 text-center"
        >
          {title}
        </motion.h3>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {displayCategories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <Link
                  to={`/products?category=${cat.id}`}
                  className="group relative aspect-[3/4] overflow-hidden cursor-pointer block"
                >
                  <img
                    src={cat.image_url && cat.image_url.trim() ? cat.image_url : PLACEHOLDER_SQUARE}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-foreground/30 transition-opacity duration-300 group-hover:bg-foreground/50" />
                  <div className="absolute inset-0 flex items-end p-4 sm:p-6 md:p-8">
                    <h4 className="text-card text-sm sm:text-lg md:text-xl font-semibold tracking-[0.08em] sm:tracking-[0.15em] uppercase">
                      {cat.name}
                    </h4>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default GildedCategories;
