/**
 * gn-order-confirmation — the thank-you page.
 *
 * The one page where a shopper is anxious, so it answers the three questions
 * they actually have: did it go through, what did I buy, when will it arrive.
 * The WhatsApp CTA is prominent because for an Egyptian storefront that is where
 * the follow-up conversation happens.
 */

import { useEffect, useState } from "react";
import { Link, Money, useOrder, useShop } from "@numueg/theme-sdk";
import { asBool, asString } from "@numueg/theme-kit";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconWhatsApp } from "../lib/icons";

export default function GnOrderConfirmation({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const shop = useShop();
  // The platform's REAL receipt is host-rendered at
  // /checkout/[order_id]/thank-you. This template is a CMS page
  // ("order-confirmation" / "thank-you"), so there is usually no order in
  // context — we look for an id on the URL and fall back to the generic
  // message. Resolved in an effect, not during render, so the server and the
  // first client render agree.
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const fromQuery = q.get("order") || q.get("order_id");
    const fromPath = window.location.pathname.match(/\/checkout\/([^/]+)\//)?.[1];
    setOrderId(fromQuery || fromPath || null);
  }, []);
  const { order } = useOrder(orderId);

  // OrderDetail carries `line_items: unknown[]` — coerce rather than trust it.
  const lines = ((order?.line_items ?? []) as Record<string, unknown>[]).map((raw, i) => ({
    id: String(raw.id ?? i),
    name: String(raw.name ?? raw.product_name ?? ""),
    quantity: Number(raw.quantity ?? 1),
    price: Number(raw.price ?? raw.unit_price ?? 0),
  })).filter((l) => l.name);

  const whatsapp = asString(s.whatsapp_number);

  return (
    <section className="gn-confirm">
      <div className="gn-container gn-confirm-inner">
        {/* Success is stated in words inside a hairline card — Genova has no
            green, and colour-only status fails WCAG 1.4.1 regardless. */}
        <p className="gn-label gn-confirm-eyebrow">{t("order.confirmed", "Order confirmed")}</p>
        <h1 className="gn-page-title">
          {asString(s.heading) || t("order.thanks", "Thank you")}
        </h1>
        {order?.order_number && (
          <p className="gn-confirm-number">
            {t("order.number", "Order #{{n}}").replace("{{n}}", order.order_number)}
          </p>
        )}
        <p className="gn-plp-desc">
          {asString(s.message) ||
            t(
              "order.message",
              "We’ve got it. You’ll hear from us as soon as it ships — usually within a day.",
            )}
        </p>

        {asBool(s.show_summary, true) && order && lines.length > 0 && (
          <div className="gn-confirm-summary">
            {lines.map((item) => (
              <div key={item.id} className="gn-confirm-line">
                <span>
                  {item.name}
                  {item.quantity > 1 && ` × ${item.quantity}`}
                </span>
                <Money amount={item.price * item.quantity} currency={order.currency} className="gn-price" />
              </div>
            ))}
            <div className="gn-confirm-line is-total">
              <span className="gn-label">{t("order.total", "Total")}</span>
              <Money amount={order.total} currency={order.currency} className="gn-price is-lg" />
            </div>
          </div>
        )}

        <div className="gn-confirm-actions">
          {asBool(s.show_whatsapp_cta, true) && whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
              className="gn-btn gn-btn-outline"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconWhatsApp size={18} />
              {t("order.whatsapp", "Ask us about this order")}
            </a>
          )}
          <Link to={asString(s.continue_link, "/products")} className="gn-btn gn-btn-primary">
            {t("cart.continue", "Continue shopping")}
          </Link>
        </div>

        <p className="gn-pdp-return">
          {t("order.support", "Questions? Reach {{store}} any time.").replace(
            "{{store}}",
            shop?.name ?? "us",
          )}
        </p>
      </div>
    </section>
  );
}
