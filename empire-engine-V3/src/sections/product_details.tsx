import { useState } from "react";
import {
  useProductOptional,
  useVariantSelection,
  useRelatedProducts,
  useProductSizeChart,
  useCart,
  useLocalization,
  useShop,
  defaultVariant,
} from "@numueg/theme-sdk";
import { EditableText } from "../lib/EditableText";
import type { EmpSectionProps } from "../lib/section";
import { ProductCard } from "../lib/ProductCard";
import { openCart } from "../lib/cartUI";
import { useT } from "../lib/i18n";

interface PdpSettings {
  add_to_cart_label?: string;
  show_compare_price?: boolean;
  show_related?: boolean;
}

/**
 * Product detail page — gallery + buy box. Drives a Size/Color picker via
 * `useVariantSelection` when the product declares option axes; falls back to a
 * flat variant chip list when it only has variants (no axes). Integrates the
 * size guide (useProductSizeChart) inline, plus quantity + trust strip.
 */
export default function ProductDetails({ id, settings }: EmpSectionProps) {
  const s = settings as PdpSettings;
  const t = useT();
  const product = useProductOptional();
  const { addItem } = useCart();
  const { formatMoney } = useLocalization();
  const shop = useShop();
  const chart = useProductSizeChart();
  const [pending, setPending] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [pickedId, setPickedId] = useState<string | undefined>(undefined);
  const [sizeOpen, setSizeOpen] = useState(false);

  const variantSel = useVariantSelection(
    product ?? { options: [], variants: [] },
    { autoSelect: true },
  );

  const related = useRelatedProducts(product?.id, { limit: 4 });

  if (!product) {
    return (
      <section className="empire-page empire-container">
        <p className="empire-placeholder">{t("Product not found.", "لم يتم العثور على المنتج.")}</p>
      </section>
    );
  }

  const opts = product.options ?? [];
  const variants = product.variants ?? [];
  const hasOptions = opts.length > 0;
  const hasVariantList = !hasOptions && variants.length > 1;

  const { selection, variant, select, availability, isComplete } = variantSel;

  // When the product has no option axes but multiple variants, use a flat
  // chip list controlled by `pickedId`; otherwise rely on useVariantSelection.
  const fallbackVariant = hasOptions
    ? null
    : (variants.find((v) => v.id === pickedId) ??
        defaultVariant(product) ??
        variants[0] ??
        null);
  const activeVariant = hasOptions ? variant : fallbackVariant;

  const currency = product.currency || shop?.currency;
  const activePrice = activeVariant?.price ?? product.price;
  const compareRaw = activeVariant?.compare_at_price ?? product.compare_at_price;
  const compareAt =
    s.show_compare_price !== false && compareRaw && compareRaw > activePrice
      ? compareRaw
      : null;

  const images = product.images ?? [];
  const mainImage = images[activeImg] ?? images[0];
  const purchasable =
    product.in_stock &&
    (activeVariant?.is_in_stock ?? true) &&
    (hasOptions ? isComplete : true);
  const productId = product.id;
  const selectedVariantId = activeVariant?.id ?? pickedId;

  async function handleAdd() {
    if (pending || !purchasable) return;
    setPending(true);
    try {
      await addItem(productId, selectedVariantId, qty);
      openCart();
    } finally {
      setPending(false);
    }
  }

  const variantLabel = (v: (typeof variants)[number], i: number) =>
    v.name ||
    Object.values(v.option_values ?? {}).join(" / ") ||
    `${t("Option", "الخيار")} ${i + 1}`;

  return (
    <section className="empire-container" style={{ paddingBlock: "2.5rem" }}>
      <nav className="empire-breadcrumb empire-label">
        <a href="/">{t("Home", "الرئيسية")}</a>
        <span>/</span>
        <a href="/products">{t("Shop", "المتجر")}</a>
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

          {/* Option-axis picker (Size / Color / …) */}
          {opts.map((opt) => (
            <div key={opt.name} className="empire-pdp__optgroup">
              <div className="empire-pdp__opt-head">
                <span className="empire-pdp__opt-label">{opt.name}</span>
                {chart ? (
                  <button
                    type="button"
                    className="empire-pdp__sizelink"
                    onClick={() => setSizeOpen(true)}
                  >
                    {t("Size guide", "دليل المقاسات")}
                  </button>
                ) : null}
              </div>
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

          {/* Flat variant picker when there are variants but no axes */}
          {hasVariantList ? (
            <div className="empire-pdp__optgroup">
              <div className="empire-pdp__opt-head">
                <span className="empire-pdp__opt-label">{t("Option", "الخيار")}</span>
                {chart ? (
                  <button
                    type="button"
                    className="empire-pdp__sizelink"
                    onClick={() => setSizeOpen(true)}
                  >
                    {t("Size guide", "دليل المقاسات")}
                  </button>
                ) : null}
              </div>
              <div className="empire-pdp__opts">
                {variants.map((v, i) => {
                  const isSel = (activeVariant?.id ?? null) === v.id;
                  const inStock = v.is_in_stock ?? v.in_stock ?? true;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className="empire-chip"
                      aria-pressed={isSel}
                      disabled={!inStock}
                      onClick={() => setPickedId(v.id)}
                    >
                      {variantLabel(v, i)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Size guide link when the product has no variant picker to attach it to */}
          {chart && !hasOptions && !hasVariantList ? (
            <button
              type="button"
              className="empire-pdp__sizelink empire-pdp__sizelink--standalone"
              onClick={() => setSizeOpen(true)}
            >
              {t("Size guide", "دليل المقاسات")}
            </button>
          ) : null}

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
              <button type="button" aria-label="زيادة" onClick={() => setQty((q) => q + 1)}>
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
                t("Sold out", "نفذ المخزون")
              ) : (
                <EditableText
                  as="span"
                  sectionId={id}
                  settingId="add_to_cart_label"
                  value={s.add_to_cart_label || t("Add to cart", "أضف إلى السلة")}
                />
              )}
            </button>
          </div>

          {/* Trust / service strip */}
          <ul className="empire-pdp__trust">
            <li>
              <TruckIcon />
              <span>{t("Fast nationwide shipping", "شحن سريع لكل المحافظات")}</span>
            </li>
            <li>
              <ReturnIcon />
              <span>{t("Easy 14-day returns", "إرجاع سهل خلال ١٤ يوم")}</span>
            </li>
            <li>
              <LockIcon />
              <span>{t("100% secure payment", "دفع آمن 100%")}</span>
            </li>
          </ul>
        </div>
      </div>

      {s.show_related !== false && related.items.length > 0 ? (
        <div style={{ marginTop: "4rem" }}>
          <h2 className="empire-heading" style={{ marginBottom: "1.5rem" }}>
            {t("You may also like", "منتجات مشابهة")}
          </h2>
          <div className="empire-grid" style={{ ["--cols" as string]: 4 }}>
            {related.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Size guide modal */}
      {sizeOpen && chart ? (
        <div
          className="empire-modal"
          role="dialog"
          aria-modal="true"
          aria-label="دليل المقاسات"
        >
          <div className="empire-modal__overlay" onClick={() => setSizeOpen(false)} />
          <div className="empire-modal__panel">
            <div className="empire-modal__head">
              <h2 className="empire-modal__title">
                {t("Size guide", "دليل المقاسات")}{chart.unit ? ` (${chart.unit})` : ""}
              </h2>
              <button
                className="empire-drawer__close"
                type="button"
                onClick={() => setSizeOpen(false)}
                aria-label="إغلاق"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="empire-modal__body">
              {chart.image_url ? (
                <img className="empire-sizeguide__img" src={chart.image_url} alt="" />
              ) : null}
              <table className="empire-sizetable">
                <thead>
                  <tr>
                    <th>{t("Size", "المقاس")}</th>
                    {chart.column_headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart.rows.map((row, ri) => (
                    <tr key={ri}>
                      <th scope="row">{row.size}</th>
                      {chart.column_headers.map((_, ci) => (
                        <td key={ci}>{row.values[ci] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {chart.notes ? (
                <p className="empire-muted" style={{ fontSize: "0.8125rem", marginTop: "1rem" }}>
                  {chart.notes}
                </p>
              ) : null}
            </div>
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
