"use client";
import { Link, Money, useProducts, useLocale, type Product } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { asString, asNumber, localized, type SectionRenderProps } from "./_shared";

/** Inline Gilded product card — mirrors the V2 GildedProductCard look:
 *  sharp-edged image, hover zoom, uppercase name, gold price. */
function GildedProductCard({ product }: { product: Product }) {
  const locale = useLocale();
  const price = product.variants?.[0]?.price ?? product.price ?? 0;
  const compareAt = product.compare_at_price;
  const hasDiscount = typeof compareAt === "number" && compareAt > price;
  const primary = product.images?.[0]?.url;
  const secondary = product.images?.[1]?.url;

  return (
    <Link
      to={`/product/${product.slug || product.id}`}
      className="vn-product-card group block"
      data-testid="storefront-product-card"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted mb-3">
        {primary ? (
          <img
            src={primary}
            alt={product.name}
            className="vn-product-image absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 vn-shimmer" />
        )}
        {secondary && (
          <img
            src={secondary}
            alt=""
            className="vn-product-image-secondary"
            loading="lazy"
          />
        )}
        {hasDiscount && (
          <span className="absolute top-3 start-3 px-2.5 py-1 bg-[hsl(var(--sale))] text-card text-[10px] tracking-[0.1em] uppercase font-semibold">
            {localized(locale, "Sale", "تخفيض")}
          </span>
        )}
      </div>
      <div className="px-0.5">
        <h3 className="text-xs sm:text-sm font-medium text-foreground tracking-[0.05em] uppercase line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm font-semibold text-foreground">
            <Money amount={price} currency={product.currency} />
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              <Money amount={compareAt} currency={product.currency} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const GildedFeaturedCollection = ({ instance }: SectionRenderProps) => {
  const { products } = useProducts();
  const isLoading = false;
  const s = instance.settings ?? {};
  const locale = useLocale();

  const heading = asString(s.title) || localized(locale, "Crafted for the Eternal Wardrobe", "صُمّم ليبقى في خزانتك للأبد");
  const subheading = asString(s.subtitle);
  const viewAllLink = asString(s.view_all_link) || "/products";
  const viewAllText = asString(s.view_all_text) || localized(locale, "View All", "عرض الكل");
  const productCount = asNumber(s.product_count, 5);
  const columns = asNumber(s.columns, 5);
  const manualIds = Array.isArray(s.product_ids)
    ? (s.product_ids as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  const autoProducts = products;
  const collectionProducts =
    manualIds.length > 0
      ? manualIds
          .map((id) => products.find((p) => p.id === id || p.slug === id))
          .filter((p): p is NonNullable<typeof p> => !!p)
      : autoProducts;
  const displayProducts = collectionProducts.slice(0, productCount);

  if (!isLoading && displayProducts.length === 0) return null;

  const cssVars = {
    "--cols-mobile": 2,
    "--cols-desktop": columns,
  } as React.CSSProperties;

  const gridClassName =
    "grid gap-3 sm:gap-4 md:gap-6 grid-cols-[repeat(var(--cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--cols-desktop),minmax(0,1fr))]";

  return (
    <section className="bg-card py-12 md:py-20 lg:py-32">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 md:mb-16"
        >
          {subheading && (
            <p className="text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase text-muted-foreground mb-3 md:mb-4">
              {subheading}
            </p>
          )}
          <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl text-foreground uppercase tracking-[0.04em] sm:tracking-[0.08em] font-bold">
            {heading}
          </h2>
        </motion.div>

        {isLoading ? (
          <div className={gridClassName} style={cssVars}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className={gridClassName} style={cssVars}>
              {displayProducts.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <GildedProductCard product={product} />
                </motion.div>
              ))}
            </div>

            {/* View all link */}
            <div className="text-center mt-8 md:mt-12">
              <Link
                to={viewAllLink}
                className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 border border-[hsl(var(--gold))] text-foreground text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.15em] uppercase font-medium hover:bg-[hsl(var(--gold))] hover:text-foreground transition-all duration-300"
              >
                {viewAllText}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default GildedFeaturedCollection;
