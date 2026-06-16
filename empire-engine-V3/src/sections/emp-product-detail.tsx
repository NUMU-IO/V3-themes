"use client";

import { useRef, useState } from "react";
import {
  Link,
  Money,
  useCart,
  useLocale,
  useProductOptional,
  useResolvedSettings,
  useVariantSelection,
} from "@numueg/theme-sdk";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import {
  applyImageTransform,
  asString,
  localized,
  PLACEHOLDER_IMG,
  useDemo,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

// Demo product used ONLY in marketplace preview (no real product context).
const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=70",
];

/**
 * emp-product-detail — faithful V3 port of V2 EmpProductDetailPage
 * (numu-egyptian-bazaar/src/themes/empire/sections/product-detail/…,
 * driven by BaseProductDetailPage with Empire styles).
 *
 * A LIGHT editorial PDP: a 2-column grid — a big `aspect-square rounded-lg`
 * image (light grey frame) with a thumbnail row beneath, and a buy-box on
 * the other side with an `emp-label` breadcrumb, a `font-black uppercase`
 * name, bold price (+ muted strikethrough), an italic description,
 * rounded-full size/option chips (active = black), a quantity stepper, and
 * a BLACK rounded-full uppercase ADD-TO-CART button. NOT the dark wavy-amber
 * buy-box it inherited from the Bazar clone.
 *
 * KEEPS the V3 image-fit (`object-cover` + applyImageTransform) on the main
 * image. Wiring: useProductOptional / useVariantSelection / useCart.
 */
export default function EmpProductDetail({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const productCtx = useProductOptional();
  const { addItem, loading } = useCart();
  const demo = useDemo();
  const locale = useLocale();

  const addToCartLabel = asString(s.add_to_cart_label) || localized(locale, "Add to Cart", "أضف للسلة");
  const addedLabel = asString(s.added_label) || localized(locale, "Added!", "تمت الإضافة!");
  const outOfStockLabel = asString(s.out_of_stock_label) || localized(locale, "Out of Stock", "نفد المخزون");
  const quantityLabel = asString(s.quantity_label) || localized(locale, "Quantity", "الكمية");

  // The product to render: real context, else a demo product (preview), else
  // neutral placeholders.
  const product = productCtx ?? {
    id: "demo",
    name: demo ? "Empire Tote Bag" : "",
    slug: "demo",
    description: demo
      ? "A roomy everyday tote in heavyweight cotton canvas — screen-printed by hand."
      : "",
    price: demo ? 350 : 0,
    compare_at_price: demo ? 450 : undefined,
    currency: "EGP",
    images: (demo ? DEMO_IMAGES : [PLACEHOLDER_IMG]).map((url, i) => ({ id: String(i), url, position: i })),
    options: [],
    variants: [],
    in_stock: true,
  };

  const isFallback = !productCtx;
  const { selection, variant, select, availability, isComplete } = useVariantSelection(product);

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const addInFlight = useRef(false);

  const images = product.images ?? [];
  const mainImage = images[Math.min(activeImage, Math.max(0, images.length - 1))];
  const mainTransform =
    mainImage && typeof (mainImage as { transform?: unknown }).transform === "object"
      ? ((mainImage as { transform?: unknown }).transform as Parameters<typeof applyImageTransform>[0])
      : undefined;

  const activePrice = variant?.price ?? product.price ?? 0;
  const activeCompareAt = variant?.compare_at_price ?? product.compare_at_price ?? null;
  const hasDiscount = activeCompareAt != null && activeCompareAt > activePrice;
  const inStock = variant ? variant.is_in_stock : product.in_stock;

  const handleAdd = async () => {
    if (isFallback || addInFlight.current || added || !inStock) return;
    if (!isComplete) return;
    addInFlight.current = true;
    try {
      await addItem(product.id, variant?.id, quantity);
      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        addInFlight.current = false;
      }, 1500);
    } catch (err) {
      addInFlight.current = false;
      console.warn("[empire] add to cart failed", err);
    }
  };

  const addDisabled =
    isFallback || added || !inStock || (product.options?.length ? !isComplete : false);

  return (
    <section className="bg-[hsl(var(--background))]" data-emp-section={sectionId}>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 emp-label mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">
            {localized(locale, "Home", "الرئيسية")}
          </Link>
          <span>/</span>
          <Link to="/products" className="hover:text-foreground transition-colors">
            {localized(locale, "Shop", "المتجر")}
          </Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-14">
          {/* Images */}
          <div>
            <div className="aspect-square overflow-hidden rounded-lg bg-[#f5f5f5] mb-3 relative">
              {mainImage ? (
                <img
                  src={mainImage.url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  style={applyImageTransform(mainTransform, "cover")}
                  loading="eager"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingCart size={40} className="text-muted-foreground/30" aria-hidden="true" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`w-16 h-16 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                      i === activeImage ? "border-black" : "border-transparent"
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buy-box */}
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight mb-3 leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-base font-bold">
                <Money amount={activePrice} currency={product.currency} />
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  <Money amount={activeCompareAt} currency={product.currency} />
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic mt-4">
                {product.description}
              </p>
            )}

            {/* Variant options — rounded-full chips */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-6 mb-6">
                {product.options.map((opt) => {
                  const chosen = selection[opt.name];
                  const avail = availability[opt.name];
                  return (
                    <div key={opt.name}>
                      <span className="text-sm font-bold mb-3 block">{opt.name}</span>
                      <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label={opt.name}>
                        {opt.values.map((v) => {
                          const isSelected = chosen === v;
                          const unavailable = avail != null && !avail.has(v) && !isSelected;
                          return (
                            <button
                              type="button"
                              key={v}
                              role="radio"
                              aria-checked={isSelected}
                              disabled={unavailable}
                              onClick={() => select(opt.name, v)}
                              className={`min-w-[48px] h-11 px-4 text-sm font-medium rounded-full border transition-all ${
                                isSelected
                                  ? "bg-black text-white border-black"
                                  : "border-[hsl(var(--border))] hover:border-black bg-transparent text-foreground"
                              } ${unavailable ? "opacity-30 cursor-not-allowed line-through" : ""}`}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-3 h-12 border border-[hsl(var(--border))] rounded-full overflow-hidden">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="px-4 h-full hover:bg-black/5 transition-colors disabled:opacity-40"
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <span className="px-2 text-sm font-bold min-w-[40px] text-center" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-4 h-full hover:bg-black/5 transition-colors"
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={addDisabled || loading}
                className={`flex-1 h-12 font-bold text-xs uppercase tracking-[0.1em] flex items-center justify-center gap-2 px-6 rounded-full transition-all disabled:opacity-50 ${
                  added ? "bg-green-600 text-white" : "bg-black text-white hover:bg-black/90"
                }`}
              >
                {added ? (
                  <>
                    <Check size={16} aria-hidden="true" /> {addedLabel}
                  </>
                ) : !inStock ? (
                  outOfStockLabel
                ) : (
                  <>
                    <ShoppingCart size={16} aria-hidden="true" />
                    <InlineEditable sectionId={sectionId} settingKey="add_to_cart_label" value={addToCartLabel} />
                  </>
                )}
              </button>
            </div>

            <span className="sr-only">{quantityLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
