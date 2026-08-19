/**
 * tn-order-confirmation — the page after paying.
 *
 * Reached as `/order-confirmation?order_id=…` (also `/thank-you`, `/thanks`,
 * `/order-confirmed` — the host maps all four onto this template). The id
 * arrives as `page.data.order_id`, put there by the catch-all route
 * specifically so a theme's `useOrder()` has something to ask for; without it
 * the hook falls back to the page handle and reports "order not found".
 *
 * This page never invents. If the order cannot be loaded it says the order was
 * placed and offers the tracking route — the payment redirect already happened,
 * so telling the customer their order failed because a fetch did would be both
 * wrong and alarming.
 */

import { Link, Money, useOrder, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asString,
  usePageData,
  waLink,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconArrowUpRight, IconWhatsApp } from "../lib/icons";

export default function TnOrderConfirmation({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const page = usePageData();

  const orderId = asString((page?.data as Record<string, unknown> | undefined)?.order_id);
  const { order, loading } = useOrder(orderId || null);

  const whatsapp = waLink(asString(s.whatsapp));

  return (
    <section className="tn-section tn-orderconf">
      <div className="tn-container tn-orderconf-inner">
        <div className="tn-card tn-orderconf-card">
          <p className="tn-label tn-orderconf-eyebrow">
            {asString(s.eyebrow) || t("order.eyebrow", "Order placed")}
          </p>
          <h1 className="tn-orderconf-title">
            {asString(s.heading) || t("order.heading", "Thank you — we’re on it.")}
          </h1>

          {order?.order_number ? (
            <p className="tn-orderconf-number">
              {t("order.number", "Order")}{" "}
              <strong dir="ltr">#{order.order_number}</strong>
            </p>
          ) : null}

          <p className="tn-footer-text tn-orderconf-message">
            {asString(s.message) ||
              t(
                "order.message",
                "You’ll get a confirmation shortly, and a message when it ships.",
              )}
          </p>

          {asBool(s.show_summary, true) && order && !loading && (
            <dl className="tn-cart-totals tn-orderconf-totals">
              <div>
                <dt>{t("cart.subtotal", "Subtotal")}</dt>
                <dd>
                  <Money amount={order.subtotal} currency={order.currency} />
                </dd>
              </div>
              {order.discount_amount > 0 && (
                <div className="is-saving">
                  <dt>{t("cart.discount", "Discount")}</dt>
                  <dd>
                    −<Money amount={order.discount_amount} currency={order.currency} />
                  </dd>
                </div>
              )}
              {order.shipping_cost > 0 && (
                <div>
                  <dt>{t("order.shipping", "Shipping")}</dt>
                  <dd>
                    <Money amount={order.shipping_cost} currency={order.currency} />
                  </dd>
                </div>
              )}
              <div className="is-total">
                <dt>{t("cart.total", "Total")}</dt>
                <dd>
                  <Money amount={order.total} currency={order.currency} />
                </dd>
              </div>
            </dl>
          )}

          <div className="tn-orderconf-actions">
            <Link to={asString(s.continue_link, "/products")} className="tn-btn tn-btn-dark">
              {asString(s.continue_text) || t("common.continue_shopping", "Continue shopping")}
              <IconArrowUpRight size={14} className="tn-flip-rtl" />
            </Link>
            {asBool(s.show_whatsapp_cta, true) && whatsapp && (
              <a
                className="tn-btn tn-btn-outline"
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWhatsApp size={16} />
                {asString(s.whatsapp_text) || t("order.whatsapp", "Ask about my order")}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
