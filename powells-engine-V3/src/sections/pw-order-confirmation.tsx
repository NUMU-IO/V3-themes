/**
 * pw-order-confirmation — the thank-you page.
 *
 * The one page a shopper reads word for word, and the last chance to sound
 * like a bookshop rather than a payment processor. It answers the three
 * questions someone actually has: did it work, what did I buy, and when does
 * it arrive.
 *
 * The order id comes from the URL (`/checkout/{order_id}/thank-you`), because
 * that is the route `pw-checkout` navigates to and the host does not always
 * put the order in `page.data`. Read on the client, so the first frame shows
 * the confirmation copy and the detail fills in — never a spinner where the
 * reassurance should be.
 */

import { useEffect, useState } from "react";
import { Link, Money, useOrder, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { Twinkle } from "../lib/ornaments";

function orderIdFromPath(): string {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(/\/checkout\/([^/]+)\/thank-you/);
  return match?.[1] ?? "";
}

export default function PwOrderConfirmation({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();

  const [orderId, setOrderId] = useState("");
  useEffect(() => setOrderId(orderIdFromPath()), []);
  const { order } = useOrder(orderId || null);

  const items = (order?.line_items ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="pw-container" style={{ paddingBlock: "56px 90px" }}>
      <div className="pw-confirm-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)" }}>
            <Twinkle size={38} />
          </span>
        )}
        <h1>{asString(s.heading) || t("confirm.title", "Thank you — your books are reserved.")}</h1>
        <p className="pw-synopsis" style={{ marginInline: "auto" }}>
          {asString(s.body) ||
            t(
              "confirm.body",
              "We have your order. A bookseller will pull each copy from the shelf and email you when it ships.",
            )}
        </p>
        {order?.order_number && (
          <p className="pw-confirm-number">
            {t("confirm.number", "Order")} <b>#{order.order_number}</b>
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="pw-two-col" style={{ marginBlockStart: 44 }}>
          <section>
            <h2 className="pw-block-title">{t("confirm.items", "What you bought")}</h2>
            {items.map((item, i) => (
              <div className="pw-line" key={String(item.id ?? i)} style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <h3>{String(item.name ?? "")}</h3>
                  {item.variant_name ? <span className="pw-badge">{String(item.variant_name)}</span> : null}
                  <p className="pw-byline">
                    {t("product.quantity", "Quantity")} {String(item.quantity ?? 1)}
                  </p>
                </div>
                <p className="pw-line-price">
                  <b>
                    <Money
                      amount={Number(item.price ?? 0) * Number(item.quantity ?? 1)}
                      currency={order?.currency}
                    />
                  </b>
                </p>
              </div>
            ))}
          </section>

          <aside className="pw-summary">
            <h2>{t("cart.summary", "Order Summary")}</h2>
            <div className="pw-sumrow">
              <span>{t("cart.subtotal", "Subtotal")}</span>
              <span>
                <Money amount={order?.subtotal ?? 0} currency={order?.currency} />
              </span>
            </div>
            <div className="pw-sumrow">
              <span>{t("cart.shipping", "Shipping")}</span>
              <span>
                <Money amount={order?.shipping_cost ?? 0} currency={order?.currency} />
              </span>
            </div>
            <div className="pw-sumrow total">
              <span>{t("cart.total", "Total")}</span>
              <span>
                <Money amount={order?.total ?? 0} currency={order?.currency} />
              </span>
            </div>
            <Link className="pw-btn pw-btn-ghost pw-btn-block" to="/account" style={{ marginBlockStart: 20 }}>
              {t("confirm.view_orders", "View your orders")}
            </Link>
          </aside>
        </div>
      )}

      <div style={{ textAlign: "center", marginBlockStart: 40 }}>
        <Link className="pw-btn pw-btn-primary" to={asString(s.cta_link) || "/products"}>
          {asString(s.cta_text) || t("confirm.keep_browsing", "Back to the shelves")}
        </Link>
      </div>
    </div>
  );
}
