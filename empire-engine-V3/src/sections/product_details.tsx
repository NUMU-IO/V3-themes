import {
  useState } from "react";
import {
  useProductOptional,
  useVariantSelection,
  useRelatedProducts,
  useCart,
  useLocalization,
  useShop,
} from "@numueg/theme-sdk";
import { EditableText } from "../lib/EditableText";
import type { EmpSectionProps } from "../lib/section";
import { ProductCard } from "../lib/ProductCard";
import { openCart } from "../lib/cartUI";

interface PdpSettings {
  add_to_cart_label?: string;
  show_compare_price?: boolean;
  show_related?: boolean;
}

/**
 * Product detail page — two-column gallery + buy box. Reads the active product
 * from the SDK ProductProvider (the storefront supplies it on
 * `/products/:slug`), drives a Size/Color picker via `useVariantSelection`,
 * adds the resolved variant to the live cart and pops the drawer. A related
 * rail (same-category) renders below when enabled.
 */
export default function ProductDetails({ id, settings }: EmpSectionProps) {
  const s = settings as PdpSettings;
  const product = useProductOptional();
  const { addItem } = useCart();
  const { formatMoney } = useLocalization();
  const shop = useShop();
  const [pending, setPending] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  const variantSel = useVariantSelection(
    product ?? { options: [], variants: [] },
    { autoSelect: true },
  );

  const related = useRelatedProducts(product?.id, { limit: 4 });

  if (!product) {
    return (
      <section className="empire-page empire-container">
        <p className="empire-placeholder">لم يتم العثور على المنتج.</p>
      </section>
    );
  }

  const { selection, variant, select, availability, isComplete } = variantSel;
  const currency = product.currency || shop?.currency;
  const activePrice = variant?.price ?? product.price;
  const compareRaw = variant?.compare_at_price ?? product.compare_at_price;
  const compareAt =
    s.show_compare_price !== false && compareRaw && compareRaw > activePrice
      ? compareRaw
      : null;

  const images = product.images ?? [];
  const mainImage = images[activeImg] ?? images[0];
  const purchasable =
    product.in_stock && (variant?.is_in_stock ?? true) && isComplete;
  const productId = product.id;

  async function handleAdd() {
    if (pending || !purchasable) return;
    setPending(true);
    try {
      await addItem(productId, variant?.id, qty);
      openCart();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="empire-container" style={{ paddingBlock: "2.5rem" }}>
      <nav className="empire-breadcrumb empire-label">
        <a href="/">الرئيسية</a>
        <span>/</span>
        <a href="/products">المتجر</a>
        <span>/</span>
        <span style={{ color: "var(--emp-fg)" }}>{product.name}</span>
      </nav>

      <div className="empire-pdp">
        {/* Gallery */}
        <div className="empire-pdp__gallery">
          <div className="empire-pdp__main-img">
            {mainImage ? (
              <img src={mainImage.url} alt={mainImage.alt || product.name} />
            ) : (
              <div className="empire-card__placeholder" />
            )}
          </div>
          {images.length > 1 ? (
            <div className="empire-pdp__thumbs">
              {images.map((img, i) => (
                <button
                  key={img.id ?? i}
                  type="button"
                  className={`empire-pdp__thumb${i === activeImg ? " is-active" : ""}`}
                  onClick={() => setActiveImg(i)}
                  aria-label={`صورة ${i + 1}`}
                >
                  <img src={img.url} alt={img.alt || ""} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Buy box */}
        <div className="empire-pdp__info">
          {product.category ? (
            <p className="empire-label" style={{ marginBottom: "0.5rem" }}>
              {product.category}
            </p>
          ) : null}
          <h1 className="empire-pdp__title">{product.name}</h1>
          <p className="empire-pdp__price">
            {formatMoney(activePrice, currency)}
            {compareAt ? (
              <span className="empire-card__compare">
                {formatMoney(compareAt, currency)}
              </span>
            ) : null}
          </p>

          {product.description ? (
            <p className="empire-pdp__desc">{product.description}</p>
          ) : null}

          <div className="empire-pdp__divider" />

          {(product.options ?? []).map((opt) => (
            <div key={opt.name} style={{ marginBottom: "1.25rem" }}>
              <span className="empire-pdp__opt-label">{opt.name}</span>
              <div className="empire-pdp__opts">
                {opt.values.map((value) => {
                  const selected = selection[opt.name] === value;
                  const reachable = availability[opt.name]?.has(value) ?? true;
                  return (
                    <button
                      key={value}
                      type="button"
                      className="empire-chip"
                      aria-pressed={selected}
                      disabled={!reachable && !selected}
                      onClick={() => select(opt.name, value)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity + add to cart */}
          <div className="empire-pdp__buy">
            <div className="empire-qty empire-pdp__qty" aria-label="الكمية">
              <button
                type="button"
                aria-label="تقليل"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span>{qty}</span>
              <button
                type="button"
                aria-label="زيادة"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </button>
            </div>
            <button
              className="empire-btn"
              type="button"
              style={{ flex: 1 }}
              disabled={!purchasable || pending}
              onClick={handleAdd}
            >
              {pending ? (
                "..."
              ) : !product.in_stock ? (
                "نفذ المخزون"
              ) : (
                <EditableText
                  as="span"
                  sectionId={id}
                  settingId="add_to_cart_label"
                  value={s.add_to_cart_label || "أضف إلى السلة"}
                />
              )}
            </button>
          </div>

          {/* Trust / service strip — fills the buy box + reassures */}
          <ul className="empire-pdp__trust">
            <li>
              <TruckIcon />
              <span>شحن سريع لكل المحافظات</span>
            </li>
            <li>
              <ReturnIcon />
              <span>إرجاع سهل خلال ١٤ يوم</span>
            </li>
            <li>
              <LockIcon />
              <span>دفع آمن 100%</span>
            </li>
          </ul>
        </div>
      </div>

      {s.show_related !== false && related.items.length > 0 ? (
        <div style={{ marginTop: "4rem" }}>
          <h2 className="empire-heading" style={{ marginBottom: "1.5rem" }}>
            منتجات مشابهة
          </h2>
          <div className="empire-grid" style={{ ["--cols" as string]: 4 }}>
            {related.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

const TruckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 18V6H2v12h2" /><path d="M14 9h4l4 4v5h-3" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
  </svg>
);
const ReturnIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7v6h6" /><path d="M3.5 13a9 9 0 1 0 2.3-9.3L3 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
