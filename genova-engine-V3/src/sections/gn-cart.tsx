/**
 * gn-cart — the bag.
 *
 * Reference: an empty state that says so and offers a way back, and a populated
 * state with line items, quantity controls, a subtotal and a checkout action.
 *
 * AOV layer on top of that: a free-shipping progress bar and a recommendations
 * rail. Both are the theme's job, not the platform's — the checkout itself stays
 * platform-owned (decision D6), so this page styles the entry point only.
 *
 * The progress bar is `--gn-line` track + `--gn-ink` fill, per plan §2.1a. There
 * is no accent colour to make it "encouraging", so the encouragement has to come
 * from the copy.
 */

import { useState } from "react";
import { Image, Link, Money, useCart, useLocale, useProducts } from "@numueg/theme-sdk";
import { asBool, asNumber, asString } from "@numueg/theme-kit";
import { cx, useDemo, useInsideEditor, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import { PaymentMarks } from "../lib/payment-marks";
import { CartOfferNudge } from "../lib/offers";
import { IconClose } from "../lib/icons";

/**
 * A stand-in cart for the customizer and the marketplace preview ONLY.
 *
 * Without it a merchant editing the cart page sees the empty state and cannot
 * judge any of the settings they are being offered — the progress bar, the line
 * rows, the coupon field are all invisible. Gated so a real shopper with an
 * empty bag never sees phantom items.
 */
const SAMPLE_ITEMS = [
  { id: "s1", product_id: "s1", name: "High-rise straight jean", variant_name: "Indigo · 30", price: 1450, quantity: 1, image_url: "" },
  { id: "s2", product_id: "s2", name: "Boxy cotton tee", variant_name: "Off-white · M", price: 480, quantity: 2, image_url: "" },
];

export default function GnCart({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const locale = useLocale();
  const { cart, updateQuantity, removeItem, applyDiscount, loading } = useCart();
  const quickAdd = useQuickAdd();
  const demo = useDemo();
  const insideEditor = useInsideEditor();
  const [code, setCode] = useState("");
  const [codeNote, setCodeNote] = useState("");

  const { products } = useProducts({ limit: 8, fetchIfMissing: true });

  const realItems = cart?.items ?? [];
  const showSample = realItems.length === 0 && (demo || insideEditor);
  const items = showSample ? SAMPLE_ITEMS : realItems;

  // Cart money is in MAJOR units (the SDK normalises it) — do NOT divide by 100.
  const subtotal = showSample
    ? SAMPLE_ITEMS.reduce((n, i) => n + i.price * i.quantity, 0)
    : (cart?.subtotal ?? 0);
  const currency = cart?.currency;

  const threshold = asNumber(s.free_shipping_threshold, 0);
  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(1, subtotal / threshold) : 0;

  const heading = asString(s.heading) || t("cart.heading", "Your bag");

  if (items.length === 0) {
    return (
      <section className="gn-cart">
        <div className="gn-container gn-plp-head">
          <h1 className="gn-page-title">{heading}</h1>
        </div>
        <div className="gn-container gn-empty">
          <p className="gn-empty-title">{t("cart.empty", "Your bag is empty")}</p>
          <Link to={asString(s.continue_link, "/products")} className="gn-btn gn-btn-primary">
            {t("cart.continue", "Continue shopping")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="gn-cart">
      <div className="gn-container gn-plp-head">
        <h1 className="gn-page-title">{heading}</h1>
      </div>

      <div className="gn-container gn-cart-grid">
        <div className="gn-cart-items">
          {showSample && (
            <p className="gn-formnote">
              {t("cart.sample_note", "Sample items — only you can see these, while editing.")}
            </p>
          )}

          {items.map((item) => (
            <article key={item.id} className="gn-cart-row">
              <span className="gn-plate gn-cart-thumb">
                {item.image_url ? <Image src={item.image_url} alt="" sizes="84px" loading="lazy" /> : null}
              </span>

              <div className="gn-cart-detail">
                <p className="gn-cart-name">{item.name}</p>
                {item.variant_name && <p className="gn-cart-variant">{item.variant_name}</p>}
                <Money amount={item.price} currency={currency} className="gn-price" />
              </div>

              <div className="gn-cart-controls">
                <div className="gn-qty-control">
                  <button
                    type="button"
                    aria-label={t("product.decrease", "Decrease quantity")}
                    disabled={showSample || loading || item.quantity <= 1}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={t("product.increase", "Increase quantity")}
                    disabled={showSample || loading}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="gn-icon-btn"
                  aria-label={t("cart.remove", "Remove")}
                  disabled={showSample || loading}
                  onClick={() => removeItem(item.id)}
                >
                  <IconClose size={16} />
                </button>
              </div>

              <Money
                amount={item.price * item.quantity}
                currency={currency}
                className="gn-price gn-cart-line-total"
              />
            </article>
          ))}
        </div>

        <aside className="gn-cart-summary" aria-label={t("cart.summary", "Order summary")}>
          {threshold > 0 && asBool(s.show_progress_bar, true) && (
            <div className="gn-freeship">
              <p className="gn-freeship-text">
                {remaining > 0
                  ? t("cart.free_ship_remaining", "Spend {{amount}} more for free shipping").replace(
                      "{{amount}}",
                      `${Math.ceil(remaining)} ${currency ?? "EGP"}`,
                    )
                  : t("cart.free_ship_reached", "Free shipping unlocked")}
              </p>
              {/* Track + fill, both greyscale. `aria-hidden` because the sentence
                  above already says the same thing in words — a progress bar
                  announced as "75 percent" adds noise, not information. */}
              <div className="gn-freeship-track" aria-hidden="true">
                <span className="gn-freeship-fill" style={{ inlineSize: `${progress * 100}%` }} />
              </div>
            </div>
          )}

          <CartOfferNudge />

          <div className="gn-cart-total">
            <span className="gn-label">{t("cart.subtotal", "Subtotal")}</span>
            <Money amount={subtotal} currency={currency} className="gn-price is-lg" />
          </div>
          <p className="gn-pdp-return">
            {t("cart.shipping_note", "Shipping and any discounts are calculated at checkout.")}
          </p>

          {asBool(s.show_coupon, true) && (
            <form
              className="gn-coupon"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!code.trim() || showSample) return;
                const before = cart?.discount_amount ?? 0;
                const res = (await applyDiscount(code.trim())) as
                  | { success?: boolean; discount_amount?: number; code_discount_cents?: number }
                  | undefined;

                // H6: treating "not an explicit failure" as success told
                // shoppers a code had applied when it had not — including for
                // a code the backend rejected with a 400. Measured: a bogus
                // code rendered "Code applied", and a real code applied from
                // this page reported success, discounted nothing, and did not
                // survive into checkout.
                //
                // Only claim success when the money actually moved. Anything
                // else says so plainly and points at checkout, which is where
                // the same code demonstrably does work.
                const explicitFailure = res?.success === false;
                const moved =
                  (res?.code_discount_cents ?? 0) > 0 ||
                  (res?.discount_amount ?? 0) > before;

                setCodeNote(
                  explicitFailure || !moved
                    ? t(
                        "cart.coupon_not_applied",
                        "We couldn’t apply that here — try it at checkout.",
                      )
                    : t("cart.coupon_ok", "Code applied"),
                );
              }}
            >
              <label className="gn-sr-only" htmlFor="gn-coupon">
                {t("cart.coupon", "Discount code")}
              </label>
              <input
                id="gn-coupon"
                className="gn-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("cart.coupon", "Discount code")}
              />
              <button type="submit" className="gn-btn gn-btn-outline" disabled={showSample}>
                {t("cart.apply", "Apply")}
              </button>
            </form>
          )}
          {codeNote && <p className="gn-formnote">{codeNote}</p>}

          <Link to="/checkout" className="gn-btn gn-btn-primary gn-cart-checkout">
            {t("cart.checkout", "Checkout")}
          </Link>
          <Link to={asString(s.continue_link, "/products")} className="gn-textlink gn-cart-back">
            {t("cart.continue", "Continue shopping")}
          </Link>

          {asBool(s.show_payment_marks, true) && (
            <div className="gn-cart-pay">
              <PaymentMarks />
            </div>
          )}
        </aside>
      </div>

      {asBool(s.show_recommendations, true) && products.length > 0 && (
        <div className={cx("gn-rail-section")}>
          <div className="gn-container gn-rail-head">
            <h2 className="gn-section-heading">
              {asString(s.recommendations_title) || t("cart.recommendations", "Complete the look")}
            </h2>
          </div>
          <div className="gn-container gn-rail-track" style={{ ["--gn-rail-per-view" as string]: "4" }}>
            {products.slice(0, 8).map((p) => (
              <div key={p.id} className="gn-rail-item">
                <ProductCard product={p} locale={locale} onQuickAdd={quickAdd.open} />
              </div>
            ))}
          </div>
        </div>
      )}

      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </section>
  );
}
