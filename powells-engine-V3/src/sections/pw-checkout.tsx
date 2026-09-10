/**
 * pw-checkout — a single-page checkout, driven by the SDK.
 *
 * ## Why this section exists at all
 *
 * Every other theme in the V3 fleet declares a `checkout` template containing
 * nothing but header and footer, and lets the storefront's own four step pages
 * (`/checkout` → `/shipping` → `/payment` → `/review`) render the body. That
 * works, but it drops the shopper out of the theme at the exact moment the
 * design is doing the most work.
 *
 * `useCheckout` is the supported alternative: it writes the same
 * `numu_checkout_state` sessionStorage blob the platform's step pages read, so
 * a theme can collect contact and shipping here and still hand off to
 * `/checkout/payment` for a gateway capture. This section is the first in the
 * fleet to use it. Treat it as the newest surface in the theme.
 *
 * ## What it does NOT do
 *
 * It never touches card data. `payment.select("card")` records the CHOICE and
 * `placeOrder()` returns a `payment_url` the shopper is redirected to, so the
 * gateway owns the card fields exactly as it does on the platform pages. A
 * theme that rendered a PAN input would be putting a storefront bundle inside
 * the cardholder-data environment, which is not a thing a theme may do.
 *
 * ⚠ `/checkout` ships no page data, same as `/cart`.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Link,
  Money,
  requestNavigate,
  useCart,
  useCheckout,
  useResolvedSettings,
} from "@numueg/theme-sdk";
import { asBool, asString, type SectionRenderProps } from "../lib/shared";
import { useCheckoutConfig } from "../lib/store-data";
import { useT } from "../lib/i18n";

type StepKey = "contact" | "shipping" | "payment";

export default function PwCheckout({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const { cart } = useCart();
  const checkout = useCheckout();
  // The merchant's real options. A store with Fawry or InstaPay switched on
  // used to see neither, because this step named its two by hand.
  const { methods: paymentMethods } = useCheckoutConfig();

  const [step, setStep] = useState<StepKey>("contact");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState(checkout.state.email);
  const [phone, setPhone] = useState(checkout.state.phone);
  const [address, setAddress] = useState(checkout.state.shipping_address ?? {});

  const items = cart?.items ?? [];
  const currency = cart?.currency;
  const isEmpty = items.length === 0;

  const selectedRate = useMemo(
    () => (checkout.shipping.rates ?? []).find((r) => r.id === checkout.state.selected_shipping_rate_id),
    [checkout.shipping.rates, checkout.state.selected_shipping_rate_id],
  );

  const shippingCost = selectedRate ? selectedRate.amount_cents / 100 : 0;
  const subtotal = cart?.subtotal ?? 0;
  const total = (cart?.total ?? subtotal) + shippingCost;

  const addressComplete = Boolean(
    address.first_name && address.last_name && address.line1 && address.city,
  );

  /**
   * Rates depend on the address, so they are refreshed when the shopper
   * reaches the delivery step with a usable one — not on every keystroke,
   * which would be a rate call per character typed into the street field.
   */
  useEffect(() => {
    if (step !== "shipping" || !addressComplete) return;
    checkout.contact.set({ email, phone, shipping_address: address });
    void checkout.shipping.refresh();
    // `checkout` is recreated each render by the hook; depending on it here
    // would re-fire the refresh forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, addressComplete]);

  const goToShipping = () => {
    checkout.contact.set({ email, phone, shipping_address: address });
    setStep("shipping");
  };

  const placeOrder = async () => {
    setError("");
    setPlacing(true);
    try {
      const result = await checkout.placeOrder();
      if (result.payment_url) {
        // The gateway owns the card capture. Full assign, not a soft nav: the
        // destination is a different origin. Guarded because this module is
        // also loaded by the SSR bundle, where `window` does not exist — the
        // handler cannot run there, but the linter reads the module, not the
        // call graph, and a reader deserves the same reassurance.
        if (typeof window !== "undefined") window.location.assign(result.payment_url);
        return;
      }
      requestNavigate(`/checkout/${result.order_id}/thank-you`);
    } catch {
      setError(t("checkout.failed", "We could not place the order. Check the details above and try again."));
    } finally {
      setPlacing(false);
    }
  };

  if (isEmpty) {
    return (
      <div className="pw-container" style={{ paddingBlock: "30px 80px" }}>
        <div className="pw-empty">
          <p>{t("checkout.empty", "There is nothing to check out yet.")}</p>
          <Link className="pw-btn pw-btn-primary" to="/products">
            {t("cart.empty_cta", "Start browsing")}
          </Link>
        </div>
      </div>
    );
  }

  /**
   * What the shopper may actually pick.
   *
   * The merchant's list wins. `allow_cod` can only ever REMOVE cash on
   * delivery — a theme toggle must not be able to switch on a payment method
   * the store has not configured, because the order would then fail at
   * capture. The two-method fallback below applies only when the config call
   * returned nothing at all.
   */
  const visibleMethods = (
    paymentMethods.length > 0
      ? paymentMethods
      : [
          { code: "cod", label: t("checkout.pay_cod", "Cash on delivery") },
          { code: "card", label: t("checkout.pay_card", "Pay by card") },
        ]
  ).filter((m) => (m.code === "cod" ? asBool(s.allow_cod, true) : true));

  const steps: Array<{ key: StepKey | "review"; label: string }> = [
    { key: "contact", label: t("checkout.step_contact", "Contact") },
    { key: "shipping", label: t("checkout.step_shipping", "Shipping") },
    { key: "payment", label: t("checkout.step_payment", "Payment") },
    { key: "review", label: t("checkout.step_review", "Review") },
  ];
  const stepIndex = steps.findIndex((x) => x.key === step);

  return (
    <div className="pw-container" style={{ paddingBlock: "30px 80px" }}>
      <nav className="pw-crumbs" aria-label="Breadcrumb">
        <Link to="/cart">{t("cart.title", "Your Cart")}</Link> ›<span>
          {t("checkout.title", "Checkout")}
        </span>
      </nav>

      <div className="pw-page-head">
        <h1>{asString(s.heading) || t("checkout.title", "Checkout")}</h1>
        <span className="pw-rule" />
      </div>

      <div className="pw-steps">
        {steps.map((entry, i) => (
          <span key={entry.key} style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            {i > 0 && <span className="sep" aria-hidden="true" />}
            <button
              type="button"
              className={`pw-step${i < stepIndex ? " done" : ""}`}
              aria-current={i === stepIndex ? "step" : undefined}
              // Only a completed step is navigable. Letting a shopper jump
              // ahead to payment produces an order with no address on it.
              disabled={i >= stepIndex}
              onClick={() => i < stepIndex && setStep(entry.key as StepKey)}
            >
              <span className="n">{i + 1}</span> {entry.label}
            </button>
          </span>
        ))}
      </div>

      <div className="pw-two-col">
        <form onSubmit={(e) => e.preventDefault()}>
          <section className="pw-block">
            <h2>{t("checkout.contact", "Contact")}</h2>
            <div className="pw-fields">
              <div className="pw-field wide">
                <label htmlFor="pw-email">{t("checkout.email", "EMAIL")}</label>
                <input
                  id="pw-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="pw-field wide">
                <label htmlFor="pw-phone">{t("checkout.phone", "PHONE")}</label>
                <input
                  id="pw-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="pw-block">
            <h2>{t("checkout.address", "Shipping address")}</h2>
            <div className="pw-fields">
              <div className="pw-field">
                <label htmlFor="pw-first">{t("checkout.first_name", "FIRST NAME")}</label>
                <input
                  id="pw-first"
                  autoComplete="given-name"
                  value={address.first_name ?? ""}
                  onChange={(e) => setAddress({ ...address, first_name: e.target.value })}
                />
              </div>
              <div className="pw-field">
                <label htmlFor="pw-last">{t("checkout.last_name", "LAST NAME")}</label>
                <input
                  id="pw-last"
                  autoComplete="family-name"
                  value={address.last_name ?? ""}
                  onChange={(e) => setAddress({ ...address, last_name: e.target.value })}
                />
              </div>
              <div className="pw-field wide">
                <label htmlFor="pw-line1">{t("checkout.line1", "ADDRESS")}</label>
                <input
                  id="pw-line1"
                  autoComplete="address-line1"
                  value={address.line1 ?? ""}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                />
              </div>
              <div className="pw-field wide">
                <label htmlFor="pw-line2">{t("checkout.line2", "APARTMENT, SUITE (OPTIONAL)")}</label>
                <input
                  id="pw-line2"
                  autoComplete="address-line2"
                  value={address.line2 ?? ""}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                />
              </div>
              <div className="pw-field">
                <label htmlFor="pw-city">{t("checkout.city", "CITY")}</label>
                <input
                  id="pw-city"
                  autoComplete="address-level2"
                  value={address.city ?? ""}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>
              <div className="pw-field">
                <label htmlFor="pw-postal">{t("checkout.postal", "POSTAL CODE")}</label>
                <input
                  id="pw-postal"
                  autoComplete="postal-code"
                  value={address.postal_code ?? ""}
                  onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
                />
              </div>
            </div>
            {step === "contact" && (
              <button
                type="button"
                className="pw-btn pw-btn-primary"
                style={{ marginBlockStart: 20 }}
                disabled={!email || !addressComplete}
                onClick={goToShipping}
              >
                {t("checkout.continue", "Continue")}
              </button>
            )}
          </section>

          {step !== "contact" && (
            <section className="pw-block">
              <h2>{t("checkout.delivery", "Delivery")}</h2>
              {checkout.shipping.loading && (
                <p className="pw-synopsis">{t("checkout.loading_rates", "Checking delivery options...")}</p>
              )}
              {!checkout.shipping.loading && (checkout.shipping.rates ?? []).length === 0 && (
                <p className="pw-synopsis">
                  {t("checkout.no_rates", "No delivery options for this address yet. Check the address above.")}
                </p>
              )}
              <div className="pw-methods" role="radiogroup" aria-label={t("checkout.delivery", "Delivery")}>
                {(checkout.shipping.rates ?? []).map((rate) => (
                  <button
                    key={rate.id}
                    type="button"
                    role="radio"
                    className="pw-method"
                    aria-checked={checkout.state.selected_shipping_rate_id === rate.id}
                    onClick={() => {
                      checkout.shipping.select(rate.id);
                      setStep("payment");
                    }}
                  >
                    <span className="pw-dot" aria-hidden="true" />
                    <span>
                      {rate.name}
                      {(rate.estimated_days_min || rate.estimated_days_max) && (
                        <small>
                          {rate.estimated_days_min}–{rate.estimated_days_max} days
                          {rate.carrier ? ` · ${rate.carrier}` : ""}
                        </small>
                      )}
                    </span>
                    <span className="amt">
                      <Money amount={rate.amount_cents / 100} currency={rate.currency} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === "payment" && (
            <section className="pw-block">
              <h2>{t("checkout.payment", "Payment")}</h2>
              <div className="pw-methods" role="radiogroup" aria-label={t("checkout.payment", "Payment")}>
                {visibleMethods.map((method) => (
                  <button
                    key={method.code}
                    type="button"
                    role="radio"
                    className="pw-method"
                    aria-checked={checkout.state.payment_method === method.code}
                    onClick={() => checkout.payment.select(method.code)}
                  >
                    <span className="pw-dot" aria-hidden="true" />
                    <span>
                      {method.label}
                      {method.code !== "cod" && asString(s.card_note) && (
                        <small>{asString(s.card_note)}</small>
                      )}
                      {method.description && <small>{method.description}</small>}
                    </span>
                    <span className="amt" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </form>

        <aside className="pw-summary">
          <h2>{t("cart.summary", "Order Summary")}</h2>

          <div className="pw-co-items">
            {items.map((item) => (
              <div className="pw-co-item" key={item.id}>
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} responsive={false} loading="lazy" />
                ) : (
                  <span className="pw-blank" />
                )}
                <span className="t">
                  {item.name}
                  <small>
                    {item.variant_name ? `${item.variant_name} · ` : ""}
                    {t("product.quantity", "Quantity")} {item.quantity}
                  </small>
                </span>
                <span className="amt">
                  <Money amount={item.price * item.quantity} currency={currency} />
                </span>
              </div>
            ))}
          </div>

          <div className="pw-sumrow">
            <span>{t("cart.subtotal", "Subtotal")}</span>
            <span>
              <Money amount={subtotal} currency={currency} />
            </span>
          </div>
          <div className="pw-sumrow">
            <span>{t("cart.shipping", "Shipping")}</span>
            <span>
              {selectedRate ? (
                <Money amount={shippingCost} currency={currency} />
              ) : (
                t("cart.shipping_at_checkout", "Calculated at checkout")
              )}
            </span>
          </div>
          <div className="pw-sumrow total">
            <span>{t("cart.total", "Total")}</span>
            <span>
              <Money amount={total} currency={currency} />
            </span>
          </div>

          {error && <p className="pw-error" style={{ marginBlockStart: 14 }}>{error}</p>}

          <button
            type="button"
            className="pw-btn pw-btn-primary pw-btn-block"
            style={{ marginBlockStart: 20 }}
            disabled={placing || step !== "payment" || !checkout.payment.isComplete()}
            onClick={placeOrder}
          >
            {placing ? t("checkout.placing", "Placing your order...") : t("checkout.place_order", "Place Order")}
          </button>
          <Link className="pw-linkbtn" to="/cart" style={{ display: "block", marginBlockStart: 14, textAlign: "center" }}>
            {t("checkout.back_to_cart", "Back to cart")}
          </Link>
          {asString(s.reassurance) && <p className="pw-note">{asString(s.reassurance)}</p>}
        </aside>
      </div>
    </div>
  );
}
