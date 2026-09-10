/**
 * pw-account — sign in, register, and everything behind it.
 *
 * ONE section for the whole customer surface. The host sends ten different
 * template types at this route — `profile`, `login`, `register`, `recover`,
 * `reset`, `account_orders`, `account_addresses` and more — and main.tsx
 * aliases every one of them here. Ten near-copies would drift apart within a
 * release; one section with a mode cannot.
 *
 * Until this existed, every one of those ten fell through to the platform's
 * unstyled form wrapped in this theme's chrome — on the most-visited page
 * after the product page.
 *
 * ⚠ `/account` ships no `page.data`. Orders and addresses come from their own
 * hooks, which fetch for themselves.
 */

import { useState, type FormEvent } from "react";
import {
  Link,
  Money,
  useCustomer,
  useCustomerActions,
  useCustomerAddresses,
  useOrders,
  useResolvedSettings,
} from "@numueg/theme-sdk";
import { asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { BookStack } from "../lib/ornaments";

type Mode = "login" | "register" | "recover";

export default function PwAccount({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const customer = useCustomer();
  const actions = useCustomerActions();
  const { orders, loading: ordersLoading } = useOrders();
  const { addresses } = useCustomerAddresses();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        await actions.login({ email, password });
      } else if (mode === "register") {
        await actions.register({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        });
      } else {
        await actions.requestRecover({ email });
        // Anti-enumeration: the response never says whether the address
        // exists, so the copy must not imply it did.
        setNotice(t("account.recover_sent", "If that address has an account, a reset link is on its way."));
      }
    } catch {
      setError(t("account.failed", "That did not work. Check the details and try again."));
    } finally {
      setBusy(false);
    }
  };

  /* ── Signed in ─────────────────────────────────────────────────────── */

  if (customer) {
    const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
    return (
      <div className="pw-container" style={{ paddingBlock: "38px 80px" }}>
        <div className="pw-page-head">
          <h1>{t("account.hello", "Hello,")} {name}</h1>
          <span className="pw-rule" />
          <button type="button" className="pw-linkbtn" onClick={() => void actions.logout()}>
            {t("account.logout", "Sign out")}
          </button>
        </div>

        <div className="pw-two-col" style={{ marginBlockStart: 34 }}>
          <section>
            <h2 className="pw-block-title">{t("account.orders", "Your orders")}</h2>
            {orders.length === 0 ? (
              <p className="pw-synopsis">
                {ordersLoading ? "…" : t("account.no_orders", "No orders yet.")}
              </p>
            ) : (
              orders.map((order) => (
                <div className="pw-line" key={order.id} style={{ gridTemplateColumns: "1fr auto" }}>
                  <div>
                    <h3>
                      <Link to={`/account/orders/${order.id}`}>#{order.order_number}</Link>
                    </h3>
                    <p className="pw-byline">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : ""}
                      {order.item_count ? ` · ${order.item_count}` : ""}
                    </p>
                    <span className="pw-badge">{order.status}</span>
                  </div>
                  <p className="pw-line-price">
                    <b>
                      <Money amount={order.total} currency={order.currency} />
                    </b>
                  </p>
                </div>
              ))
            )}
          </section>

          <aside className="pw-summary">
            <h2>{t("account.details", "Your details")}</h2>
            <div className="pw-sumrow">
              <span>{t("checkout.email", "EMAIL")}</span>
              <span>{customer.email}</span>
            </div>
            {customer.phone && (
              <div className="pw-sumrow">
                <span>{t("checkout.phone", "PHONE")}</span>
                <span>{customer.phone}</span>
              </div>
            )}
            <h2 style={{ marginBlockStart: 26 }}>{t("account.addresses", "Addresses")}</h2>
            {addresses.length === 0 ? (
              <p className="pw-note" style={{ textAlign: "start" }}>
                {t("account.no_addresses", "No saved addresses yet.")}
              </p>
            ) : (
              addresses.map((address) => (
                <p className="pw-note" style={{ textAlign: "start" }} key={address.id}>
                  {[address.address_line1, address.city, address.country].filter(Boolean).join(", ")}
                </p>
              ))
            )}
          </aside>
        </div>
      </div>
    );
  }

  /* ── Signed out ────────────────────────────────────────────────────── */

  const heading =
    mode === "login"
      ? asString(s.login_heading) || t("account.sign_in", "Sign in")
      : mode === "register"
        ? asString(s.register_heading) || t("account.create", "Create an account")
        : t("account.recover", "Reset your password");

  return (
    <div className="pw-container" style={{ paddingBlock: "38px 80px" }}>
      <div className="pw-account">
        <div>
          <div className="pw-page-head">
            <h1>{heading}</h1>
          </div>

          <form onSubmit={submit} className="pw-fields" style={{ marginBlockStart: 26 }}>
            {mode === "register" && (
              <>
                <div className="pw-field">
                  <label htmlFor="pw-first-name">{t("checkout.first_name", "FIRST NAME")}</label>
                  <input
                    id="pw-first-name"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="pw-field">
                  <label htmlFor="pw-last-name">{t("checkout.last_name", "LAST NAME")}</label>
                  <input
                    id="pw-last-name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="pw-field wide">
              <label htmlFor="pw-account-email">{t("checkout.email", "EMAIL")}</label>
              <input
                id="pw-account-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== "recover" && (
              <div className="pw-field wide">
                <label htmlFor="pw-account-password">{t("account.password", "PASSWORD")}</label>
                <input
                  id="pw-account-password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            {error && <p className="pw-error wide">{error}</p>}
            {notice && (
              <p className="pw-note wide" style={{ textAlign: "start" }}>
                {notice}
              </p>
            )}

            <div className="wide">
              <button type="submit" className="pw-btn pw-btn-primary" disabled={busy}>
                {mode === "login"
                  ? t("account.sign_in", "Sign in")
                  : mode === "register"
                    ? t("account.create", "Create an account")
                    : t("account.send_reset", "Send the reset link")}
              </button>
            </div>
          </form>

          <div className="pw-account-switch">
            {mode !== "login" && (
              <button type="button" className="pw-linkbtn" onClick={() => setMode("login")}>
                {t("account.have_account", "I already have an account")}
              </button>
            )}
            {mode !== "register" && (
              <button type="button" className="pw-linkbtn" onClick={() => setMode("register")}>
                {t("account.no_account", "Create an account")}
              </button>
            )}
            {mode === "login" && (
              <button type="button" className="pw-linkbtn" onClick={() => setMode("recover")}>
                {t("account.forgot", "I forgot my password")}
              </button>
            )}
          </div>
        </div>

        <aside className="pw-account-aside">
          {ornaments && (
            <span style={{ color: "var(--pw-ink-soft)" }}>
              <BookStack size={120} />
            </span>
          )}
          <p className="pw-synopsis">
            {asString(s.aside_text) ||
              t(
                "account.aside",
                "An account keeps your order history, your addresses and the books you have set aside.",
              )}
          </p>
        </aside>
      </div>
    </div>
  );
}
