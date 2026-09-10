/**
 * pw-cart — the cart.
 *
 * ## Two things about this route specifically
 *
 * 1. **`/cart` ships NO page data.** The host mounts it as
 *    `page = { type: "cart" }` with no `data` at all — no products, no
 *    collections. Nothing here may read `page.data`; the cart comes from
 *    `useCart`, which fetches for itself.
 * 2. **Cart money is in MAJOR units.** `subtotal`, `total`, `discount_amount`
 *    and `automatic_discount` are already normalised by
 *    `normalizeCartFromServer`. Dividing by 100 here is a 100× bug, and the
 *    free-shipping threshold is compared in the same units.
 *
 * The condition badge on each line is what makes this a used-bookshop cart:
 * two lines can carry the same title at different prices, and without the
 * grade the shopper cannot tell which copy is which.
 */

import { useState, type FormEvent } from "react";
import { Image, Link, Money, useCart, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  useInsideEditor,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";

/** A stand-in cart so the customizer can style the filled state. */
const SAMPLE_ITEMS = [
  {
    id: "s1",
    product_id: "s1",
    name: "They Both Die at the End",
    variant_name: "Used Trade Paperback · Very good",
    price: 8.95,
    quantity: 1,
  },
  {
    id: "s2",
    product_id: "s2",
    name: "Pachinko",
    variant_name: "Used Trade Paperback · Good",
    price: 8.5,
    quantity: 1,
  },
];

export default function PwCart({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const insideEditor = useInsideEditor();
  const { cart, updateQuantity, removeItem, applyDiscount, loading } = useCart();

  const [code, setCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  const realItems = cart?.items ?? [];
  /**
   * The customizer never has a cart, so a merchant editing this page would
   * only ever see the empty state and could not style the half that earns the
   * money. Inside the editor an empty cart shows a clearly-labelled SAMPLE —
   * never on a storefront, where an invented line would be a genuine lie about
   * what the shopper is buying.
   */
  const sampling = insideEditor && realItems.length === 0;
  const items = sampling ? (SAMPLE_ITEMS as unknown as typeof realItems) : realItems;
  const isEmpty = items.length === 0;

  const currency = cart?.currency;
  const subtotal = sampling
    ? SAMPLE_ITEMS.reduce((n, i) => n + i.price * i.quantity, 0)
    : (cart?.subtotal ?? 0);
  const discount = (cart?.discount_amount ?? 0) + (cart?.automatic_discount ?? 0);
  const total = sampling ? subtotal : (cart?.total ?? subtotal);

  const threshold = asNumber(s.free_shipping_threshold, 0);
  const remaining = Math.max(0, threshold - subtotal);
  const showMeter = asBool(s.show_progress_bar, true) && threshold > 0 && !isEmpty;

  const onCoupon = async (e: FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setCouponBusy(true);
    setCouponError("");
    const result = await applyDiscount(value);
    setCouponBusy(false);
    // `CartMutationResult` is `{ ok, status, message?, cart? }` — there is no
    // `success` field, and testing for one silently reports every success as a
    // failure.
    if (result?.ok) setCode("");
    else setCouponError(result?.message || t("checkout.failed", "That code did not work."));
  };

  return (
    <div className="pw-container" style={{ paddingBlock: "30px 80px" }}>
      <nav className="pw-crumbs" aria-label="Breadcrumb">
        <Link to="/">{asString(s.home_label) || "Home"}</Link> ›<span>
          {asString(s.heading) || t("cart.title", "Your Cart")}
        </span>
      </nav>

      <div className="pw-page-head">
        <h1>{asString(s.heading) || t("cart.title", "Your Cart")}</h1>
        <span className="pw-rule" />
        {ornaments && asString(s.hand_note) && !isEmpty && (
          <span className="pw-hand">{asString(s.hand_note)}</span>
        )}
      </div>

      {isEmpty ? (
        <div className="pw-empty">
          <p>{asString(s.empty_heading) || t("cart.empty", "Your cart is empty.")}</p>
          <Link className="pw-btn pw-btn-primary" to={asString(s.empty_cta_link) || "/products"}>
            {asString(s.empty_cta_text) || t("cart.empty_cta", "Start browsing")}
          </Link>
        </div>
      ) : (
        <div className="pw-two-col">
          <section aria-label={t("cart.title", "Your Cart")}>
            {sampling && (
              <p className="pw-note" style={{ textAlign: "start", marginBlockEnd: 8 }}>
                {t("cart.sample_notice", "Sample lines — only you can see these, while editing.")}
              </p>
            )}

            {items.map((item) => (
              <div className="pw-line" key={item.id}>
                <div className="pw-line-media">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} responsive={false} loading="lazy" />
                  ) : (
                    <span className="pw-blank" />
                  )}
                </div>
                <div>
                  <h3>
                    <Link to={`/products/${item.product_id}`}>{item.name}</Link>
                  </h3>
                  {item.variant_name && <span className="pw-badge">{item.variant_name}</span>}
                  <div className="pw-line-actions">
                    <div className="pw-qty">
                      <button
                        type="button"
                        aria-label={t("product.decrease", "Decrease quantity")}
                        disabled={sampling || loading}
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      >
                        −
                      </button>
                      <output aria-live="polite">{item.quantity}</output>
                      <button
                        type="button"
                        aria-label={t("product.increase", "Increase quantity")}
                        disabled={sampling || loading}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="pw-linkbtn"
                      disabled={sampling || loading}
                      onClick={() => removeItem(item.id)}
                    >
                      {t("cart.remove", "Remove")}
                    </button>
                  </div>
                </div>
                <p className="pw-line-price">
                  <b>
                    <Money amount={item.price * item.quantity} currency={currency} />
                  </b>
                </p>
              </div>
            ))}

            <div style={{ marginBlockStart: 30 }}>
              <Link className="pw-linkbtn" to={asString(s.empty_cta_link) || "/products"}>
                ← {t("cart.continue", "Continue shopping")}
              </Link>
            </div>
          </section>

          <aside className="pw-summary">
            <h2>{t("cart.summary", "Order Summary")}</h2>

            {showMeter && (
              <div className="pw-meter">
                <p>
                  {remaining > 0
                    ? t("cart.free_shipping_left", "{{amount}} away from free shipping").replace(
                        "{{amount}}",
                        new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: currency || "USD",
                        }).format(remaining),
                      )
                    : t("cart.free_shipping_hit", "You have free shipping.")}
                </p>
                <div className="track">
                  <div
                    className="fill"
                    style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pw-sumrow">
              <span>{t("cart.subtotal", "Subtotal")}</span>
              <span>
                <Money amount={subtotal} currency={currency} />
              </span>
            </div>
            {discount > 0 && (
              <div className="pw-sumrow saved">
                <span>{t("cart.saved", "You saved")}</span>
                <span>
                  −<Money amount={discount} currency={currency} />
                </span>
              </div>
            )}
            <div className="pw-sumrow">
              <span>{t("cart.shipping", "Shipping")}</span>
              <span>{t("cart.shipping_at_checkout", "Calculated at checkout")}</span>
            </div>
            <div className="pw-sumrow total">
              <span>{t("cart.total", "Total")}</span>
              <span>
                <Money amount={total} currency={currency} />
              </span>
            </div>

            {asBool(s.show_coupon, true) && (
              <form className="pw-coupon" onSubmit={onCoupon} style={{ marginBlockStart: 18 }}>
                <label className="pw-sr" htmlFor="pw-coupon">
                  {t("cart.coupon_label", "Discount code")}
                </label>
                <input
                  id="pw-coupon"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t("cart.coupon_label", "Discount code")}
                />
                <button type="submit" className="pw-btn pw-btn-ghost" disabled={couponBusy}>
                  {t("cart.coupon_apply", "Apply")}
                </button>
              </form>
            )}
            {couponError && <p className="pw-error">{couponError}</p>}

            <Link className="pw-btn pw-btn-primary pw-btn-block" to="/checkout">
              {t("cart.checkout", "Checkout")}
            </Link>
            {asString(s.reassurance) && <p className="pw-note">{asString(s.reassurance)}</p>}
          </aside>
        </div>
      )}
    </div>
  );
}
