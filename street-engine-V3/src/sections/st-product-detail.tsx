"use client";

import { useState } from "react";
import {
  AddToCartButton,
  Link,
  Money,
  RichText,
  useLocale,
  useProductOptional,
  useResolvedSettings,
  useVariantSelection,
} from "@numueg/theme-sdk";
import { asBool, localized, productImage, type StSectionProps } from "./_shared";

/**
 * st-product-detail — Street's PDP body.
 *
 * Replaces the `numu-theme migrate` stub, which delegated to
 * `@/components/store/shared/BaseProductDetailPage` — a V2 path that does not
 * exist in V3, so the theme could not build.
 */
export default function StProductDetail({ instance, sectionId }: StSectionProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const product = useProductOptional();
  const showDescription = asBool(s.show_description, true);

  const { options, selected, select, variant, canAddToCart } =
    useVariantSelection(product ?? undefined);

  const images = (() => {
    const raw = (product as { images?: Array<string | { url?: string }> } | null)
      ?.images;
    const list = (raw ?? [])
      .map((i) => (typeof i === "string" ? i : i?.url))
      .filter((u): u is string => Boolean(u));
    const primary = productImage(product);
    return list.length > 0 ? list : primary ? [primary] : [];
  })();
  const [active, setActive] = useState(0);

  if (!product) {
    return (
      <section data-st-section={sectionId} className="bg-[var(--st-cream)]">
        <div className="mx-auto max-w-[1400px] px-4 py-24 text-center">
          <p className="st-section-title text-[var(--st-dark)]">
            {localized(locale, "Product not found", "المنتج مش موجود")}
          </p>
          <Link to="/products" className="st-btn mt-6">
            {localized(locale, "Back to shop", "ارجع للمتجر")}
          </Link>
        </div>
      </section>
    );
  }

  const price = (variant as { price?: number } | null)?.price
    ?? (product as { price?: number }).price
    ?? 0;
  const compareAt = (product as { compare_at_price?: number }).compare_at_price;
  const onSale = typeof compareAt === "number" && compareAt > Number(price);

  return (
    <section data-st-section={sectionId} className="bg-[var(--st-cream)]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:py-16 grid gap-10 md:grid-cols-2">
        <div>
          <div className="st-card st-product-img-wrap aspect-square bg-white">
            {images[active] ? (
              <img
                src={images[active]}
                alt={product.name ?? ""}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs font-black uppercase tracking-[0.14em] opacity-40">
                {localized(locale, "No image", "بدون صورة")}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <ul className="mt-4 flex gap-3 flex-wrap">
              {images.map((src, i) => (
                <li key={src}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`${localized(locale, "Image", "صورة")} ${i + 1}`}
                    aria-current={i === active}
                    className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                      i === active
                        ? "border-[var(--st-dark)]"
                        : "border-transparent opacity-70"
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {onSale && <span className="st-badge-pink">{localized(locale, "Sale", "تخفيض")}</span>}
          <h1 className="st-section-title mt-3 text-[var(--st-dark)]">{product.name}</h1>

          <p className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-black text-[var(--st-dark)]">
              <Money amount={Number(price)} />
            </span>
            {onSale && (
              <span className="text-base font-bold line-through opacity-50">
                <Money amount={Number(compareAt)} />
              </span>
            )}
          </p>

          {options.map((opt) => (
            <div key={opt.name} className="mt-6">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--st-dark)]/70">
                {opt.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {opt.values.map((value) => {
                  const isOn = selected[opt.name] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => select(opt.name, value)}
                      aria-pressed={isOn}
                      className={`st-size-btn !w-auto !px-3 ${isOn ? "active" : ""}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-8">
            <AddToCartButton
              product={product}
              variantId={(variant as { id?: string } | null)?.id}
              disabled={!canAddToCart}
              className="st-btn w-full md:w-auto"
            >
              {canAddToCart
                ? localized(locale, "Add to bag", "أضف للسلة")
                : localized(locale, "Pick your options", "اختار المقاس")}
            </AddToCartButton>
          </div>

          {showDescription &&
            (product as { description?: string }).description && (
              <div className="mt-10 border-t-2 border-[var(--st-dark)]/15 pt-6">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--st-dark)]/70">
                  {localized(locale, "Details", "التفاصيل")}
                </p>
                <div className="mt-3 text-sm leading-relaxed text-[var(--st-dark)]/85">
                  <RichText html={(product as { description?: string }).description ?? ""} />
                </div>
              </div>
            )}
        </div>
      </div>
    </section>
  );
}
