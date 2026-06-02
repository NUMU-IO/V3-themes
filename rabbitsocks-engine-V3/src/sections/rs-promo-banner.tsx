"use client";
import { Link, useProducts } from "@numueg/theme-sdk";
import { asString, type SectionRenderProps } from "./_shared";

const RsPromoBanner = ({ instance }: SectionRenderProps) => {
  const { products } = useProducts();
  const s = instance.settings ?? {};

  // Journal card settings
  const journalLabel = asString(s.journal_label, "READ THE JOURNAL");
  const journalTitle = asString(s.journal_title, "Volume IV: The Art of Stillness");
  const journalLink = asString(s.journal_link, "/blog");

  // Product / editorial settings
  const editLabel = asString(s.edit_label, "Curated Comfort");
  const editText = asString(
    s.edit_text,
    "A collection of objects and garments that define the modern daily ritual.",
  );
  const editLink = asString(s.edit_link, "/products");
  const shopText = asString(s.cta_text, "SHOP NOW");

  // Use the 5th product image (index 4) as the editorial product.
  const featuredProduct = products[4] ?? products[0];
  const productImage = asString(s.product_image) || featuredProduct?.images?.[0]?.url || "";

  return (
    <section className="rs-bento-section px-6 md:px-10 max-w-[1440px] mx-auto">
      <div className="rs-bento-grid">

        {/* Left — journal card with floating card inside */}
        <div className="rs-bento-main">
          <div className="rs-bento-main-media">
            <div className="rs-journal-card">
              <p className="rs-label mb-5">{journalLabel}</p>
              <h3 className="rs-headline-md text-[hsl(var(--rs-primary))] mb-6">
                {journalTitle}
              </h3>
              <Link
                to={journalLink}
                className="inline-flex items-center gap-2 text-[hsl(var(--rs-primary))] transition-opacity hover:opacity-60"
                aria-label="Read journal"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right — product image + editorial text stacked */}
        <div className="rs-bento-side flex flex-col">
          {/* Product image */}
          <div className="rs-bento-side-media flex-1">
            {productImage ? (
              <img
                src={productImage}
                alt={featuredProduct?.name ?? ""}
                className="max-h-[260px] w-auto object-contain rs-img-zoom"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-[hsl(var(--rs-surface-high))]" />
            )}
          </div>

          {/* Editorial copy */}
          <div className="p-8 md:p-10">
            <h3 className="rs-headline-md text-[hsl(var(--rs-primary))] mb-4">
              {editLabel}
            </h3>
            <p className="rs-body text-[hsl(var(--rs-primary)/0.6)] mb-6">
              {editText}
            </p>
            <Link to={editLink} className="rs-btn-ghost inline-block">
              {shopText}
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};

export default RsPromoBanner;
