/**
 * tn-cart — the bag.
 *
 * The reference only ever shows the EMPTY state (the audit says so outright:
 * "a filled-cart state was not modified during audit; the clone should
 * separately implement cart line items, quantity changes, discounts, subtotal,
 * checkout, and payment methods"). So the empty card is a faithful clone —
 * bordered, centred, image over two lines of copy over a dark
 * `Continue shopping ↗`, with a Popular Picks row beneath — and the filled cart
 * is designed in Teen's own language: hairline cards, one bordered summary
 * panel on the end side, exactly like the PDP's purchase card.
 *
 * ## Two things about this route specifically
 *
 * 1. **`/cart` ships NO page data.** The host mounts it as
 *    `page = { type: "cart", title: "Cart" }` with no `data` at all — no
 *    products, no collections. Popular Picks therefore MUST use
 *    `fetchIfMissing`, or the empty cart shows an empty row underneath the
 *    empty card. This is the route-dependence trap in its purest form.
 * 2. **Cart money is in MAJOR units.** `subtotal`, `total`, `discount_amount`
 *    and `automatic_discount` all arrive as pounds, already normalised by
 *    `normalizeCartFromServer`. Dividing by 100 here is a 100x bug, and the
 *    free-shipping threshold below is compared in the same units.
 */

import { useMemo, useState } from "react";
import { Image, Link, Money, useCart, useLocale, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import {
  asBool,
  asImageUrl,
  asNumber,
  asString,
  cx,
  useDemo,
  useInsideEditor,
  type SectionRenderProps,
} from "../lib/shared";
import { useT, type TFunction } from "../lib/i18n";
import { ProductCard } from "../lib/product-card";
import { QuickAddSheet, useQuickAdd } from "../lib/quick-add";
import { PaymentMarks } from "../lib/payment-marks";
import { IconArrowUpRight, IconClose, IconMinus, IconPlus } from "../lib/icons";

const FALLBACK_EMPTY = "https://cdn.numueg.app/theme-assets/teen/empty-cart.png";

/** A stand-in bag so the customizer can style the filled state (see below). */
const SAMPLE_ITEMS = [
  { id: "s1", product_id: "s1", name: "Boxy tee", variant_name: "Off-White / M", price: 690, quantity: 1 },
  { id: "s2", product_id: "s2", name: "Everyday cap", variant_name: "Pink", price: 550, quantity: 2 },
];

export default function TnCart({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const locale = useLocale();
  const demo = useDemo();
  const insideEditor = useInsideEditor();
  const { cart, updateQuantity, removeItem, applyDiscount, removeDiscount, loading } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  const realItems = cart?.items ?? [];
  /**
   * The customizer never has a bag, so a merchant editing this page would only
   * ever see the empty card and could not style the half of it that earns the
   * money. Inside the editor an empty cart therefore renders a clearly-labelled
   * SAMPLE — never on a storefront, where an invented line item would be a
   * genuine lie about what the shopper is buying.
   */
  const sampling = insideEditor && realItems.length === 0;
  const items = sampling ? (SAMPLE_ITEMS as unknown as typeof realItems) : realItems;
  const isEmpty = items.length === 0;

  const currency = cart?.currency;
  const subtotal = sampling
    ? SAMPLE_ITEMS.reduce((n, i) => n + i.price * i.quantity, 0)
    : (cart?.subtotal ?? 0);

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const res = await applyDiscount(code);
      // `CartMutationResult` is `{ ok, status, message?, cart? }` — there is no
      // `success` field. Testing for one (as this did) meant `success === false`
      // was never true, so a REJECTED code cleared the input and reported
      // nothing at all.
      if (!res?.ok) {
        setCouponError(res?.message || t("cart.coupon_invalid", "That code didn’t work"));
        return;
      }
      // A 200 is not proof the code did anything. NUMU's cart accepts a code,
      // answers 200 and pins nothing — verified in the API, which documents
      // that no cart carries a `discount_code` field, so the value is dropped
      // on the floor. Without this check the shopper types a real code, sees
      // the field clear, and is charged full price with no explanation.
      const applied = res.cart ?? undefined;
      const tookEffect =
        Boolean(applied?.discount_code) ||
        (applied?.discount_amount ?? 0) > 0 ||
        (applied?.automatic_discount ?? 0) > 0;
      if (!tookEffect) {
        setCouponError(t("cart.coupon_no_effect", "That code isn’t valid for this bag"));
        return;
      }
      setCouponInput("");
    } catch {
      setCouponError(t("cart.coupon_invalid", "That code didn’t work"));
    } finally {
      setCouponBusy(false);
    }
  };

  if (isEmpty && !loading) {
    return (
      <section className="tn-section tn-cart">
        <div className="tn-container">
          {/* The reference's empty cart shows no page title, and cloning that
              literally left the page with no <h1> at all. Keeping it out of
              sight preserves the design; keeping it in the document gives the
              page the one heading every page owes a screen-reader user. */}
          <h1 className="tn-sr">{asString(s.heading) || t("cart.heading", "Your bag")}</h1>
          <EmptyCart settings={s} demo={demo} t={t} />
        </div>
        {asBool(s.show_popular_picks, true) && (
          <PopularPicks settings={s} locale={locale} t={t} />
        )}
      </section>
    );
  }

  return (
    <section className="tn-section tn-cart">
      <div className="tn-container">
        <h1 className="tn-plp-title tn-cart-title">{asString(s.heading) || t("cart.heading", "Your bag")}</h1>

        {sampling && (
          <div className="tn-editor-note">
            <p className="tn-label">{t("editor.cart_sample_title", "Sample bag")}</p>
            <p className="tn-footer-text">
              {t(
                "editor.cart_sample",
                "Your bag is empty, so these two lines are here to let you style the page. Shoppers never see them.",
              )}
            </p>
          </div>
        )}

        <div className="tn-cart-grid">
          <div className="tn-cart-lines">
            {items.map((item) => (
              <article className="tn-cart-line" key={item.id}>
                <span className="tn-plate tn-cart-thumb">
                  {item.image_url ? <Image src={item.image_url} alt="" sizes="96px" loading="lazy" /> : null}
                </span>

                <div className="tn-cart-lineinfo">
                  <h2 className="tn-cart-linename">
                    <Link to={`/products/${item.product_id}`}>{item.name}</Link>
                  </h2>
                  {item.variant_name && <p className="tn-cart-variant">{item.variant_name}</p>}
                  {/* Only when it means something. At quantity 1 the unit
                      price and the line total are the same number printed
                      twice, three centimetres apart. */}
                  {item.quantity > 1 && (
                    <span className="tn-cart-unit">
                      <Money amount={item.price} currency={currency} />{" "}
                      {t("cart.each", "each")}
                    </span>
                  )}
                </div>

                <div className="tn-cart-lineactions">
                  {/* Stepper and remove belong on ONE row: stacked, the ✕ sat
                      orphaned between the stepper and the price with nothing
                      to associate it with. */}
                  <div className="tn-cart-linerow">
                    <div className="tn-qty tn-cart-qty">
                      <button
                        type="button"
                        className="tn-qty-btn"
                        aria-label={t("product.decrease", "Decrease quantity")}
                        disabled={sampling || item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <IconMinus size={16} />
                      </button>
                      <span className="tn-qty-value" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="tn-qty-btn"
                        aria-label={t("product.increase", "Increase quantity")}
                        disabled={sampling}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <IconPlus size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="tn-icon-btn tn-cart-remove"
                      /* Names the LINE, not just "Remove" — a bag of six items
                         otherwise gives a screen reader six identical buttons. */
                      aria-label={t("cart.remove_name", "Remove {{name}}").replace(
                        "{{name}}",
                        item.name,
                      )}
                      disabled={sampling}
                      onClick={() => removeItem(item.id)}
                    >
                      <IconClose size={16} />
                    </button>
                  </div>
                  <span className="tn-cart-linetotal">
                    <Money amount={item.price * item.quantity} currency={currency} />
                  </span>
                </div>
              </article>
            ))}
          </div>

          <aside className="tn-cart-summary" aria-label={t("cart.summary", "Order summary")}>
            <div className="tn-card tn-cart-summarycard">
              <FreeShipBar subtotal={subtotal} threshold={asNumber(s.free_shipping_threshold, 0)} currency={currency} enabled={asBool(s.show_progress_bar, true)} t={t} />

              {asBool(s.show_coupon, true) && (
                <div className="tn-cart-coupon">
                  {cart?.discount_code ? (
                    <div className="tn-cart-couponapplied">
                      <span className="tn-badge tn-badge-sale">{cart.discount_code}</span>
                      <button type="button" className="tn-textlink" onClick={() => removeDiscount()}>
                        {t("cart.remove_code", "Remove")}
                      </button>
                    </div>
                  ) : (
                    <form className="tn-cart-couponform" onSubmit={applyCoupon}>
                      <label className="tn-sr" htmlFor="tn-coupon">
                        {t("cart.coupon_label", "Discount code")}
                      </label>
                      <input
                        id="tn-coupon"
                        className="tn-input"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder={t("cart.coupon_placeholder", "Discount code")}
                        autoComplete="off"
                      />
                      <button type="submit" className="tn-btn tn-btn-outline" disabled={couponBusy || sampling}>
                        {couponBusy ? t("cart.applying", "Applying…") : t("cart.apply", "Apply")}
                      </button>
                    </form>
                  )}
                  {couponError && (
                    <p className="tn-formnote is-error" role="alert">
                      {couponError}
                    </p>
                  )}
                </div>
              )}

              <dl className="tn-cart-totals">
                <div>
                  <dt>{t("cart.subtotal", "Subtotal")}</dt>
                  <dd>
                    <Money amount={subtotal} currency={currency} />
                  </dd>
                </div>
                {/* Automatic (no-code) promotions and coded discounts are two
                    different lines on purpose — a shopper who typed a code
                    wants to see THAT code do something. Both come priced from
                    the engine; the theme never recomputes a saving. */}
                {!!cart?.automatic_discount && cart.automatic_discount > 0 && (
                  <div className="is-saving">
                    <dt>{t("cart.offers", "Offers")}</dt>
                    <dd>
                      −<Money amount={cart.automatic_discount} currency={currency} />
                    </dd>
                  </div>
                )}
                {!!cart?.discount_amount && cart.discount_amount > 0 && (
                  <div className="is-saving">
                    <dt>{t("cart.discount", "Discount")}</dt>
                    <dd>
                      −<Money amount={cart.discount_amount} currency={currency} />
                    </dd>
                  </div>
                )}
                <div className="is-total">
                  <dt>{t("cart.total", "Total")}</dt>
                  <dd>
                    <Money amount={sampling ? subtotal : (cart?.total ?? subtotal)} currency={currency} />
                  </dd>
                </div>
              </dl>

              <p className="tn-cart-taxnote">
                {t("cart.tax_note", "Shipping is calculated at checkout.")}
              </p>

              <Link to="/checkout" className="tn-btn tn-btn-dark tn-buy-cta">
                {t("cart.checkout", "Checkout")}
                <IconArrowUpRight size={14} className="tn-flip-rtl" />
              </Link>

              {asBool(s.show_payment_marks, true) && <PaymentMarks />}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Pieces
   ═════════════════════════════════════════════════════════════════════════ */

function EmptyCart({
  settings: s,
  demo,
  t,
}: {
  settings: Record<string, unknown>;
  demo: boolean;
  t: TFunction;
}) {
  const image = asImageUrl(s.empty_image) || (demo ? FALLBACK_EMPTY : "");
  return (
    <div className="tn-card tn-cart-empty">
      {image ? (
        <img className="tn-cart-emptyimg" src={image} alt="" loading="lazy" decoding="async" />
      ) : null}
      <p className="tn-cart-emptytitle">
        {asString(s.empty_heading) || t("cart.empty_heading", "Nothing in the bag yet.")}
      </p>
      <Link to={asString(s.empty_cta_link, "/products")} className="tn-btn tn-btn-dark">
        {asString(s.empty_cta_text) || t("common.continue_shopping", "Continue shopping")}
        <IconArrowUpRight size={14} className="tn-flip-rtl" />
      </Link>
    </div>
  );
}

/**
 * Free-shipping progress.
 *
 * The threshold is a merchant SETTING, not a platform value — NUMU prices
 * shipping from zones at checkout and exposes no "free over X" rule a theme
 * could read. So the bar is off (threshold 0) until a merchant sets a number,
 * rather than shipping a default that promises free delivery nobody configured.
 */
function FreeShipBar({
  subtotal,
  threshold,
  currency,
  enabled,
  t,
}: {
  subtotal: number;
  threshold: number;
  currency?: string;
  enabled: boolean;
  t: TFunction;
}) {
  if (!enabled || threshold <= 0) return null;
  const reached = subtotal >= threshold;
  const pct = Math.max(0, Math.min(100, Math.round((subtotal / threshold) * 100)));
  const remaining = Math.max(0, threshold - subtotal);

  return (
    <div className="tn-freeship">
      <p className="tn-freeship-text" role="status" aria-live="polite">
        {reached ? (
          t("cart.freeship_done", "Free shipping unlocked.")
        ) : (
          <>
            {t("cart.freeship_left", "You’re")} <Money amount={remaining} currency={currency} />{" "}
            {t("cart.freeship_away", "away from free shipping")}
          </>
        )}
      </p>
      {/* A real progressbar role, so the state is announced rather than being a
          decorative stripe only sighted shoppers can read. */}
      <div
        className={cx("tn-freeship-track", reached && "is-done")}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span className="tn-freeship-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Popular Picks — the four-card row under the empty card.
 *
 * `fetchIfMissing` is not optional here: `/cart` ships no `page.data` at all,
 * so without it this row is empty on the one page it exists for.
 */
function PopularPicks({
  settings: s,
  locale,
  t,
}: {
  settings: Record<string, unknown>;
  locale: string;
  t: TFunction;
}) {
  const quickAdd = useQuickAdd();
  const { products, loading } = useProducts({ limit: 100, fetchIfMissing: true });
  const categoryId = asString(s.popular_picks_category);
  const limit = asNumber(s.popular_picks_limit, 4);

  const picks = useMemo<Product[]>(() => {
    const pool = categoryId
      ? products.filter((p) => {
          const raw = p as unknown as Record<string, unknown>;
          return String(raw.category ?? "") === categoryId || String(raw.category_id ?? "") === categoryId;
        })
      : products;
    return pool.slice(0, limit);
  }, [products, categoryId, limit]);

  if (loading || picks.length === 0) return null;

  return (
    <div className="tn-container tn-cart-picks">
      <h2 className="tn-rail-title tn-cart-pickstitle">
        {asString(s.popular_picks_title) || t("cart.popular_picks", "Popular picks")}
      </h2>
      <div
        className="tn-grid"
        style={{ "--tn-cols-tablet": 4, "--tn-cols-desktop": 4 } as React.CSSProperties}
      >
        {picks.map((p) => (
          <ProductCard key={p.id} product={p} locale={locale} onQuickAdd={quickAdd.open} />
        ))}
      </div>
      {quickAdd.product && <QuickAddSheet product={quickAdd.product} onClose={quickAdd.close} />}
    </div>
  );
}
