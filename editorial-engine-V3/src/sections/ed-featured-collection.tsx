"use client";
import { Link, Money, useLocale, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import { ArrowRight } from "lucide-react";
import { asString, localized, merchantLabelText, productImage, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { QuickAddButton } from "./_quick-add";
import { PricePair } from "./_price";
import { Rise, RuleDraw, useMotionOn } from "./_motion";

const ManshetFeaturedCollection = ({ instance, sectionId }: SectionRenderProps) => {
  const { products } = useProducts();
  const locale = useLocale();
  const on = useMotionOn();
  const isLoading = false;
  const s = useResolvedSettings(instance);
  const tag = asString(s.collection_tag) || "new";
  // Default title follows the collection tag so two instances on one page
  // (new + bestseller) don't both read "New Arrivals".
  const defaultTitle = /best/i.test(tag)
    ? localized(locale, "Best Sellers", "الأكثر مبيعًا")
    : localized(locale, "New Arrivals", "وصل حديثًا");
  const title = asString(s.title) || defaultTitle;
  const subtitle = asString(s.subtitle);
  const viewAllText = asString(s.view_all_text) || localized(locale, "View all", "عرض الكل");
  const viewAllLink = asString(s.view_all_link) || "/products";
  const count = Number(s.product_count ?? 8);
  const cols = Number(s.columns ?? 4);
  const manualIds = Array.isArray(s.product_ids)
    ? (s.product_ids as unknown[]).filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  const tagged = products;
  const autoProducts = tagged.length > 0 ? tagged : products;

  const collectionProducts = manualIds.length > 0
    ? manualIds
        .map((id) => products.find((p) => p.id === id || p.slug === id))
        .filter((p): p is NonNullable<typeof p> => !!p)
    : autoProducts;

  const displayProducts = collectionProducts.slice(0, count);

  if (!isLoading && displayProducts.length === 0) return null;

  const cssVars = {
    "--cols-mobile": 2,
    "--cols-tablet": Math.min(3, cols),
    "--cols-desktop": cols,
  } as React.CSSProperties;

  const gridClassName =
    "grid gap-4 md:gap-5 grid-cols-[repeat(var(--cols-mobile),minmax(0,1fr))] sm:grid-cols-[repeat(var(--cols-tablet),minmax(0,1fr))] md:grid-cols-[repeat(var(--cols-desktop),minmax(0,1fr))]";

  return (
    <section className="py-10 md:py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-6 md:mb-8">
          {/* Section header rules itself in like a newspaper department head. */}
          <RuleDraw on={on} className="ed-rule-double mb-4">
            <span aria-hidden="true" />
          </RuleDraw>
          {subtitle && (
            <span className="vn-eyebrow block mb-1.5">
              <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} />
            </span>
          )}
          <h2 className="vn-heading text-2xl md:text-3xl">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>
        </div>

        {isLoading ? (
          <div className={gridClassName} style={cssVars}>
            {Array.from({ length: cols }).map((_, i) => (
              <div key={i} className="aspect-[3/4] vn-shimmer rounded" />
            ))}
          </div>
        ) : (
          <div className={gridClassName} style={cssVars}>
            {displayProducts.map((product, i) => (
              <Rise key={product.id} on={on} inView delay={Math.min(i % cols, 5) * 0.07} y={22}>
              <Link
                to={`/product/${product.slug || product.id}`}
                className="vn-product-card group block"
                data-testid="storefront-product-card"
              >
                {/* Image */}
                <div className="relative aspect-[3/4] overflow-hidden bg-muted/30 mb-3 group-hover:scale-[1.02] transition-transform duration-500">
                  {productImage(product) ? (
                    <img
                      src={productImage(product)}
                      alt={product.name}
                      className="vn-product-image w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 vn-shimmer" />
                  )}
                  {/* A8 — one-tap quick-add (single-variant products only). */}
                  <QuickAddButton product={product} locale={locale} />
                  {/* Merchant label — same pill as the PLP card's top-start slot. */}
                  {merchantLabelText(product, locale) && (
                    <span className="absolute top-3 start-3 vn-label px-2.5 py-1 bg-white/95 text-[var(--vn-ink)] rounded-full text-[10px]">
                      {merchantLabelText(product, locale)}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h3 className="text-[13px] font-medium text-foreground/90 line-clamp-1 group-hover:text-foreground transition-colors">
                    {product.name}
                  </h3>

                  <div className="pt-0.5">
                    <PricePair
                      price={product.variants?.[0]?.price ?? product.price ?? 0}
                      compareAt={product.variants?.[0]?.compare_at_price ?? product.compare_at_price}
                      currency={product.currency}
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
              </Rise>
            ))}
          </div>
        )}

        {/* VIEW ALL sits AFTER the products (B1): the natural reading order is
            see the items → want more → view all. A top-right link before the
            grid asked for a click before the customer had a reason to give it. */}
        <div className="mt-8 md:mt-10 text-center">
          <Link to={viewAllLink} className="vn-btn vn-btn-outline-dark">
            <InlineEditable sectionId={sectionId} settingKey="view_all_text" value={viewAllText} />
            <ArrowRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ManshetFeaturedCollection;
