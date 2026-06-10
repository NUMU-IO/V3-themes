"use client";
import { Link, Money, useProducts, useLocale } from "@numueg/theme-sdk";
import { ArrowLeft } from "lucide-react";
import { asNumber, asString, asArray, localized, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal featured-collection — faithful port of the V2
 * LuxFeaturedCollection (header row + product grid). V2 className strings kept
 * verbatim. Re-plumbed on the V3 SDK: `useProducts()` returns the SSR-prefetched
 * catalog (tag buckets aren't exposed on the listing route, so we fall back to
 * the full catalog), the product card is inlined with the SDK `Money` instead
 * of the V2 `LuxProductCard`, and manual `product_ids` are honoured.
 */
export default function LuxFeaturedCollection({ instance }: SectionRenderProps) {
  const { products } = useProducts();
  const isLoading = false;
  const s = instance.settings ?? {};
  const locale = useLocale();

  const title = asString(s.title) || localized(locale, "New Arrivals", "وصل حديثاً");
  const subtitle = asString(s.subtitle);
  const viewAllLink = asString(s.view_all_link) || "/products";
  const viewAllText = asString(s.view_all_text) || localized(locale, "View All", "عرض الكل");
  const productCount = asNumber(s.product_count, 4);
  const columns = asNumber(s.columns, 4);

  const manualIds = asArray<unknown>(s.product_ids).filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );

  // Tag buckets aren't available on the listing route — fall back to the full
  // catalog (matching the V2 "fall back to all products if filtered is empty").
  const autoProducts = products;
  const collectionProducts =
    manualIds.length > 0
      ? manualIds
          .map((id) => products.find((p) => p.id === id || p.slug === id))
          .filter((p): p is NonNullable<typeof p> => !!p)
      : autoProducts;

  const displayProducts = collectionProducts.slice(0, productCount);

  // Hide entire section if no products (don't show empty state for new stores)
  if (!isLoading && displayProducts.length === 0) return null;

  const cssVars = {
    "--cols-mobile": 2,
    "--cols-desktop": columns,
  } as React.CSSProperties;

  const gridClassName =
    "grid gap-4 grid-cols-[repeat(var(--cols-mobile),minmax(0,1fr))] md:grid-cols-[repeat(var(--cols-desktop),minmax(0,1fr))]";

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          {title && (
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground hidden md:block">
              {subtitle}
            </p>
          )}
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-[10px] uppercase tracking-[0.2em] text-foreground flex items-center gap-1 hover:opacity-50 transition-opacity border-b border-foreground pb-0.5"
            >
              {viewAllText} <ArrowLeft size={10} />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className={gridClassName} style={cssVars}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={gridClassName} style={cssVars}>
            {displayProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.slug || product.id}`}
                className="lux-product-card group block"
                data-testid="storefront-product-card"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[hsl(var(--lux-gray))] mb-3">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="lux-product-image w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 lux-shimmer" />
                  )}
                  {product.images?.[1]?.url && (
                    <img
                      src={product.images[1].url}
                      alt=""
                      className="lux-product-image-secondary"
                      loading="lazy"
                    />
                  )}
                </div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">
                  {product.name}
                </p>
                <p className="text-sm mt-1 text-foreground">
                  <Money amount={product.variants?.[0]?.price ?? product.price ?? 0} currency={product.currency} />
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
