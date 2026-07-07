"use client";
import { useRef } from "react";
import { Link, Money, useProducts, useLocale, type Product } from "@numueg/theme-sdk";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";

/** Product + optional backend extras not yet on the SDK type. */
type ProductExtras = Product & {
  /** Merchant-assigned label (attributes.label, denormalized bilingual text). */
  label?: { key?: string; text_en?: string; text_ar?: string } | null;
};

/** Inline Rabbitsocks product card — mirrors RsProductCard's editorial look. */
function RsProductCard({ product }: { product: Product }) {
  const locale = useLocale();
  const p = product as ProductExtras;
  const price = product.variants?.[0]?.price ?? product.price ?? 0;
  const image = product.images?.[0]?.url;
  // Merchant label badge — same slot/classes as the PLP card's tag badge
  // (this editorial card has no auto badges of its own).
  const isArabic = (locale || "").toLowerCase().startsWith("ar");
  const merchantLabel =
    p.label && p.label.key
      ? ((isArabic ? p.label.text_ar || p.label.text_en : p.label.text_en) || "")
      : "";
  return (
    <Link
      to={`/product/${product.slug || product.id}`}
      className="rs-product-card group block"
      data-testid="storefront-product-card"
    >
      <div className={merchantLabel ? "rs-product-media relative" : "rs-product-media"}>
        <div className="rs-product-media-inner overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-contain rs-img-zoom"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-[hsl(var(--rs-surface-high))]" />
          )}
        </div>
        {merchantLabel && (
          <span className="absolute top-3 start-3 vn-label px-2.5 py-1 bg-white/95 text-[var(--vn-ink)] rounded-full text-[10px]">
            {merchantLabel}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-4 mt-5">
        <h3 className="rs-product-name">{product.name}</h3>
        <span className="rs-product-price">
          <Money amount={price} currency={product.currency} />
        </span>
      </div>
    </Link>
  );
}

const RsFeatured = ({ instance }: SectionRenderProps) => {
  const { products } = useProducts();
  const locale = useLocale();
  const s = instance.settings ?? {};
  const label = asString(s.label) || localized(locale, "SEASONAL EDIT", "إصدار الموسم");
  const title = asString(s.title) || localized(locale, "The Fine Material Series", "سلسلة الخامات الفاخرة");
  const viewAllText = asString(s.view_all_text) || localized(locale, "VIEW ALL", "شوف الكل");
  const viewAllLink = asString(s.view_all_link, "/products");
  const count = asNumber(s.product_count, 8);
  const scrollRef = useRef<HTMLDivElement>(null);

  const featured = products.slice(0, count);

  // In RTL (Arabic), logical "previous" visually moves right (+), "next" moves left (−).
  const scroll = (logicalDir: "prev" | "next") => {
    if (!scrollRef.current) return;
    const isRtl = document.documentElement.dir === "rtl";
    let amount: number;
    if (logicalDir === "prev") {
      amount = isRtl ? 432 : -432;
    } else {
      amount = isRtl ? -432 : 432;
    }
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (featured.length === 0) return null;

  return (
    <section className="rs-section">
      <div className="max-w-[1440px] mx-auto">
        {/* Header row */}
        <div className="flex items-end justify-between mb-12 px-6 md:px-12">
          <div>
            <p className="rs-label mb-3">{label}</p>
            <h2 className="rs-headline-md text-[hsl(var(--rs-primary))]">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {/* Navigation arrows — ← = previous, → = next */}
            <button
              type="button"
              onClick={() => scroll("prev")}
              className="rs-arrow-btn"
              aria-label="Previous"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <button
              type="button"
              onClick={() => scroll("next")}
              className="rs-arrow-btn"
              aria-label="Next"
            >
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scrolling product slider */}
      <div
        ref={scrollRef}
        className="flex gap-8 overflow-x-auto rs-no-scrollbar snap-x snap-mandatory pb-8 px-6 md:px-12"
      >
        {featured.map((product) => (
          <div
            key={product.id}
            className="min-w-[300px] md:min-w-[400px] flex-shrink-0 snap-start"
          >
            <RsProductCard product={product} />
          </div>
        ))}
      </div>

      {/* View all link */}
      <div className="text-center mt-8 md:mt-12">
        <Link to={viewAllLink} className="rs-btn-ghost inline-block">
          {viewAllText}
        </Link>
      </div>
    </section>
  );
};

export default RsFeatured;
