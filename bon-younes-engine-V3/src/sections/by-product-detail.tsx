"use client";

import { useMemo, useState } from "react";
import {
  Link,
  Money,
  useCart,
  useProductOptional,
  useProducts,
  useResolvedSettings,
  useThemeSettings,
} from "@numueg/theme-sdk";
import { Coffee, Heart, Minus, Plus, ShoppingBag, Sparkles, Star } from "lucide-react";
import { asArray, asImageUrl, asNumber, asRecord, asString, demoOrPlaceholder, PLACEHOLDER_IMG, productHref, resolveBlocks, useBlockResolveContext, useDemo, type SectionRenderProps } from "./_shared";

interface Addon {
  id: string;
  name: string;
  price: number;
  image?: string;
}

const FALLBACK_PRODUCT = {
  name: "Vanilla Latte",
  description:
    "Our signature double shot pulled through seasonal beans, folded into velvet-steamed whole milk with a slow swirl of bourbon vanilla. Finished with a rosetta and served warm.",
  price: 85,
  compare_at_price: 95,
  currency: "EGP",
  images: [
    "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=70",
    "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=1200&q=70",
    "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=1200&q=70",
  ],
  options: [
    { name: "Size", values: ["Small", "Medium", "Large"] },
    { name: "Milk", values: ["Whole", "Skim", "Oat", "Almond"] },
  ],
};

const FALLBACK_ADDONS: Addon[] = [
  {
    id: "extra-shot",
    name: "Extra espresso shot",
    price: 15,
    image: "https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=400&q=70",
  },
  {
    id: "syrup",
    name: "Caramel syrup",
    price: 10,
    image: "https://images.unsplash.com/photo-1587080413959-06b859fb107d?auto=format&fit=crop&w=400&q=70",
  },
  {
    id: "brownie",
    name: "Walnut brownie",
    price: 65,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=70",
  },
];

export default function ByProductDetail({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const themeSettings = useThemeSettings();
  const productCtx = useProductOptional();
  const { products } = useProducts();
  const demo = useDemo();

  const ctxOptions = productCtx?.options;
  const product = productCtx
    ? {
        id: productCtx.id,
        name: productCtx.name,
        description: productCtx.description ?? "",
        price: productCtx.variants?.[0]?.price ?? productCtx.price ?? 0,
        compare_at_price:
          productCtx.variants?.[0]?.compare_at_price ??
          productCtx.compare_at_price ??
          null,
        currency: productCtx.currency,
        images: productCtx.images?.map((img) => img.url) ?? [],
        options:
          (ctxOptions ?? []).map((o) => ({
            name: o.name,
            values: o.values,
          })) ?? [],
      }
    : {
        id: "fallback",
        ...FALLBACK_PRODUCT,
        // Not in demo mode → neutral placeholder gallery, not the demo coffee.
        ...(demo
          ? {}
          : { images: [PLACEHOLDER_IMG], name: "", description: "" }),
      };

  const cart = useCart();

  const recommendedTitle =
    asString(s.recommended_title) || "Complete your order";
  const addonsTitle = asString(s.addons_title) || "Pairs well with";
  const badge1 = asString(s.badge_1_text) || "Signature";
  const badge2 = asString(s.badge_2_text) || "Best with extra shot";
  const quantityLabel = asString(s.quantity_label) || "Quantity";
  const addToCartLabel = asString(s.add_to_cart_label) || "Add to cart";
  const saveLabel = asString(s.save_label) || "Save for later";
  const addonsTotalLabel = asString(s.addons_total_label) || "Add-ons total:";
  const recoCtaLabel = asString(s.reco_cta_label) || "View";

  const blkCtx = useBlockResolveContext();
  const configuredAddons: Addon[] = resolveBlocks(instance, "addon", blkCtx)
    .map((r) => ({
      id: asString(r.id),
      name: asString(r.name),
      price: asNumber(r.price),
      image: asImageUrl(r.image) || undefined,
    }))
    .filter((a) => a.id && a.name);

  const addons = configuredAddons.length > 0 ? configuredAddons : demoOrPlaceholder(demo, FALLBACK_ADDONS);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () => {
      const init: Record<string, string> = {};
      product.options?.forEach((o) => {
        if (o.values?.[0]) init[o.name] = o.values[0];
      });
      return init;
    },
  );
  const [chosenAddons, setChosenAddons] = useState<Set<string>>(new Set());

  const images = product.images?.length ? product.images : [PLACEHOLDER_IMG];

  const toggleAddon = (id: string) => {
    setChosenAddons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fallbackCurrency =
    (themeSettings.global_settings?.currency as string) ||
    product.currency ||
    "EGP";

  const recommended = useMemo(() => {
    if (products.length === 0) return [];
    return products.filter((p) => p.id !== product.id).slice(0, 4);
  }, [products, product.id]);

  const isFallback = !productCtx;

  const addonsSubtotal = Array.from(chosenAddons).reduce((sum, id) => {
    const a = addons.find((x) => x.id === id);
    return sum + (a?.price ?? 0);
  }, 0);

  const handleAddToCart = async () => {
    if (isFallback || !productCtx) {
      // No real product context — graceful no-op so the merchant can
      // still preview the section without a hard error.
      return;
    }
    const variant = productCtx.variants?.[0];
    try {
      await cart.addItem(productCtx.id, variant?.id, quantity);
    } catch (err) {
      console.warn("[bon-younes] add to cart failed", err);
    }
  };

  return (
    <section className="by-pdp" data-by-section={sectionId}>
      <div className="by-shell">
        <div className="by-pdp-grid">
          <div className="by-pdp-gallery">
            <div className="by-pdp-gallery-main">
              <img
                src={images[activeImage]}
                alt={product.name}
                loading="eager"
                decoding="async"
              />
            </div>
            {images.length > 1 && (
              <div className="by-pdp-gallery-thumbs">
                {images.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={`by-pdp-gallery-thumb ${i === activeImage ? "is-active" : ""}`}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={src} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="by-pdp-buy">
            <div className="by-pdp-badges">
              <span className="by-pdp-badge">
                <Sparkles size={12} /> {badge1}
              </span>
              <span className="by-pdp-badge">
                <Star size={12} /> {badge2}
              </span>
            </div>

            <h1 className="by-pdp-name">{product.name}</h1>

            <div className="by-pdp-price-row">
              <span className="by-pdp-price">
                {isFallback ? (
                  `${product.price} ${fallbackCurrency}`
                ) : (
                  <Money amount={product.price} currency={product.currency} />
                )}
              </span>
              {product.compare_at_price != null &&
                product.compare_at_price > product.price && (
                  <span className="by-pdp-compare">
                    {isFallback ? (
                      `${product.compare_at_price} ${fallbackCurrency}`
                    ) : (
                      <Money
                        amount={product.compare_at_price}
                        currency={product.currency}
                      />
                    )}
                  </span>
                )}
            </div>

            {product.description && (
              <p className="by-pdp-desc">{product.description}</p>
            )}

            {product.options && product.options.length > 0 && (
              <div className="by-pdp-options">
                {product.options.map((opt) => (
                  <div key={opt.name}>
                    <div className="by-pdp-option-label">{opt.name}</div>
                    <div className="by-pdp-option-row" role="radiogroup" aria-label={opt.name}>
                      {opt.values.map((v) => (
                        <button
                          key={v}
                          type="button"
                          role="radio"
                          aria-checked={selectedOptions[opt.name] === v}
                          className={`by-pdp-option-chip ${selectedOptions[opt.name] === v ? "is-active" : ""}`}
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [opt.name]: v,
                            }))
                          }
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="by-pdp-option-label">{quantityLabel}</div>
              <div className="by-pdp-qty">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="by-pdp-actions">
              <button
                type="button"
                className="by-btn"
                onClick={handleAddToCart}
                disabled={cart.loading}
              >
                <ShoppingBag size={16} /> {addToCartLabel}
              </button>
              <button type="button" className="by-btn by-btn-ghost">
                <Heart size={16} /> {saveLabel}
              </button>
            </div>

            {addons.length > 0 && (
            <div className="by-pdp-addons">
              <p className="by-pdp-addons-title">{addonsTitle}</p>
              {addons.map((a) => {
                const active = chosenAddons.has(a.id);
                return (
                  <div key={a.id} className="by-pdp-addon">
                    <div className="by-pdp-addon-img">
                      {a.image && (
                        <img src={a.image} alt="" loading="lazy" decoding="async" />
                      )}
                    </div>
                    <div className="by-pdp-addon-meta">
                      <p className="by-pdp-addon-name">{a.name}</p>
                      <p className="by-pdp-addon-price">
                        + {a.price} {fallbackCurrency}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`by-pdp-addon-toggle ${active ? "is-active" : ""}`}
                      onClick={() => toggleAddon(a.id)}
                      aria-pressed={active}
                      aria-label={
                        active ? `Remove ${a.name}` : `Add ${a.name}`
                      }
                    >
                      {active ? <Minus size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                );
              })}
              {addonsSubtotal > 0 && (
                <p
                  className="by-pdp-addon-price"
                  style={{ alignSelf: "flex-end", marginTop: "0.25rem" }}
                >
                  {addonsTotalLabel} + {addonsSubtotal} {fallbackCurrency}
                </p>
              )}
            </div>
            )}
          </div>
        </div>

        {recommended.length > 0 && (
          <div className="by-pdp-recos">
            <h3>{recommendedTitle}</h3>
            <div className="by-menu-grid">
              {recommended.map((p) => (
                <Link
                  key={p.id}
                  to={productHref(p.slug || p.id)}
                  className="by-product-card"
                  aria-label={p.name}
                >
                  <div className="by-product-card-image">
                    {p.images?.[0]?.url && (
                      <img
                        src={p.images[0].url}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                  <div className="by-product-card-body">
                    <h3 className="by-product-card-name">{p.name}</h3>
                    <div className="by-product-card-foot">
                      <span className="by-product-card-price">
                        <Money
                          amount={p.variants?.[0]?.price ?? p.price ?? 0}
                          currency={p.currency}
                        />
                      </span>
                      <span className="by-product-card-cta">{recoCtaLabel}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="by-pdp-sticky-bar">
          <Coffee size={20} color="var(--by-espresso)" aria-hidden="true" />
          <span className="by-pdp-price">
            {isFallback ? (
              `${product.price} ${fallbackCurrency}`
            ) : (
              <Money amount={product.price} currency={product.currency} />
            )}
          </span>
          <button type="button" className="by-btn" onClick={handleAddToCart}>
            {addToCartLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
