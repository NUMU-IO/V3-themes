/**
 * gn-profile — the customer account page.
 *
 * Signed out, this is a sign-in prompt, not an error. Signed in, it is orders,
 * addresses and wishlist.
 *
 * ⚠ Customer auth is NOT merchant auth on this platform — different token
 * payloads, different endpoints. The SDK's `useCustomer()` is already the
 * customer one; do not reach for anything merchant-shaped here.
 */

import { Link, Money, useCustomer, useCustomerAddresses, useOrders } from "@numueg/theme-sdk";
import { asBool, asString } from "@numueg/theme-kit";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

export default function GnProfile({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const customer = useCustomer();
  const { orders } = useOrders();
  const { addresses } = useCustomerAddresses();

  if (!customer) {
    return (
      <section className="gn-account">
        <div className="gn-container gn-plp-head">
          <h1 className="gn-page-title">{asString(s.heading) || t("account.heading", "Account")}</h1>
        </div>
        <div className="gn-container gn-empty">
          <p className="gn-empty-title">{t("account.signed_out", "Sign in to see your orders")}</p>
          <Link to="/account/login" className="gn-btn gn-btn-primary">
            {t("account.sign_in", "Sign in")}
          </Link>
        </div>
      </section>
    );
  }

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;

  return (
    <section className="gn-account">
      <div className="gn-container gn-plp-head">
        <h1 className="gn-page-title">{asString(s.heading) || t("account.heading", "Account")}</h1>
        <p className="gn-plp-desc">{t("account.greeting", "Hi {{name}}").replace("{{name}}", name)}</p>
      </div>

      <div className="gn-container gn-account-grid">
        {asBool(s.show_orders, true) && (
          <div className="gn-account-block">
            <h2 className="gn-section-heading">{t("account.orders", "Orders")}</h2>
            {orders.length === 0 ? (
              <p className="gn-empty-hint">{t("account.no_orders", "No orders yet.")}</p>
            ) : (
              <ul className="gn-account-list">
                {orders.map((order) => (
                  <li key={order.id} className="gn-account-order">
                    <div>
                      <p className="gn-account-order-no">#{order.order_number}</p>
                      <p className="gn-cart-variant">{order.status}</p>
                    </div>
                    <Money amount={order.total} className="gn-price" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {asBool(s.show_addresses, true) && (
          <div className="gn-account-block">
            <h2 className="gn-section-heading">{t("account.addresses", "Addresses")}</h2>
            {addresses.length === 0 ? (
              <p className="gn-empty-hint">{t("account.no_addresses", "No saved addresses.")}</p>
            ) : (
              <ul className="gn-account-list">
                {addresses.map((a, i) => (
                  <li key={a.id ?? i} className="gn-account-address">
                    {[a.address_line1, a.city, a.state].filter(Boolean).join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="gn-container gn-account-actions">
        <Link to="/account/logout" className="gn-textlink">
          {t("account.sign_out", "Sign out")}
        </Link>
      </div>
    </section>
  );
}
