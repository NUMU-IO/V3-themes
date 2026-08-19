/**
 * tn-account — sign in, or the customer's own dashboard.
 *
 * The reference is no help here: its account link goes to Shopify-hosted auth
 * on a different visual shell entirely (pale blue-grey, "Continue with Shop").
 * NUMU's customer auth is theme-rendered, so this is Teen's own page, built
 * from the same hairline cards as the rest of it.
 *
 * ## Signed out is a PROMPT, not an error
 *
 * The commonest way to get this page wrong is to treat "no customer" as a
 * failure state — a spinner that never resolves, or an empty dashboard. Signed
 * out is the normal case for most visits, so it renders the actual sign-in and
 * registration forms and nothing else.
 *
 * Everything that needs an authenticated fetch lives in `<Dashboard>`, which
 * only mounts once there IS a customer. Putting `useOrders()` and
 * `useCustomerAddresses()` at the top level would fire two guaranteed-401
 * requests on every signed-out visit.
 *
 * ## No wishlist tab
 *
 * The plan listed one. The SDK's `useWishlist` stores product IDs in
 * localStorage and carries no product bodies, so rendering it means N detail
 * fetches to show a grid — real work for a feature the reference does not have
 * and nobody has asked for. Left out deliberately rather than shipped as a list
 * of bare IDs.
 */

import { useState } from "react";
import {
  Money,
  useCustomer,
  useCustomerActions,
  useCustomerAddresses,
  useOrders,
  useResolvedSettings,
  type Customer,
} from "@numueg/theme-sdk";
import { asBool, asString, cx, usePageData, type SectionRenderProps } from "../lib/shared";
import { useT, type TFunction } from "../lib/i18n";

/** Pull a human message out of whatever shape the action returned. */
function errorMessage(res: unknown, fallback: string): string | null {
  const r = (res ?? {}) as { success?: boolean; error?: { message?: string } | string };
  if (r.success !== false) return null;
  if (typeof r.error === "string") return r.error;
  return r.error?.message || fallback;
}

export default function TnAccount({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const customer = useCustomer();

  return (
    <section className="tn-section tn-account">
      <div className="tn-container tn-account-inner">
        {customer ? (
          <Dashboard settings={s} customer={customer} t={t} />
        ) : (
          <AuthPanel settings={s} t={t} />
        )}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Signed out
   ═════════════════════════════════════════════════════════════════════════ */

function AuthPanel({ settings: s, t }: { settings: Record<string, unknown>; t: TFunction }) {
  const { login, register } = useCustomerActions();
  // `/account/register` is a real route, and the host tells the bundle which
  // one it is. Opening on the sign-in tab there would silently ignore the URL
  // the shopper followed — they clicked "Create account" and got a login form.
  const pageType = (usePageData()?.type ?? "").toLowerCase();
  const [mode, setMode] = useState<"login" | "register">(
    pageType === "register" ? "register" : "login",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res =
        mode === "login"
          ? await login({ email, password })
          : await register({
              email,
              password,
              first_name: String(form.get("first_name") ?? "").trim() || undefined,
              last_name: String(form.get("last_name") ?? "").trim() || undefined,
              phone: String(form.get("phone") ?? "").trim() || undefined,
              accepts_marketing: form.get("accepts_marketing") === "on",
            });
      const message = errorMessage(
        res,
        mode === "login"
          ? t("account.login_failed", "That email and password didn’t match")
          : t("account.register_failed", "Couldn’t create the account — try again"),
      );
      if (message) setError(message);
      else if (mode === "register") {
        // Registration issues the cookie but some stores gate on verification,
        // so say what happens next instead of leaving a silent success.
        setNotice(t("account.registered", "Account created. Check your email to confirm it."));
      }
    } catch {
      setError(t("account.network", "Something went wrong — try again"));
    } finally {
      setBusy(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="tn-card tn-account-auth">
      <h1 className="tn-account-title">
        {isLogin
          ? asString(s.signin_heading) || t("account.sign_in", "Sign in")
          : asString(s.register_heading) || t("account.create", "Create an account")}
      </h1>

      {/* Two tabs, one form. Separate pages would need a second route the
          platform does not give a theme. */}
      <div className="tn-account-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={isLogin}
          className={cx("tn-account-tab", isLogin && "is-active")}
          onClick={() => setMode("login")}
        >
          {t("account.sign_in", "Sign in")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isLogin}
          className={cx("tn-account-tab", !isLogin && "is-active")}
          onClick={() => setMode("register")}
        >
          {t("account.create", "Create an account")}
        </button>
      </div>

      <form className="tn-account-form" onSubmit={submit}>
        {/* Both names are `required`, because the API requires both:
            `CustomerRegisterRequest` declares first_name AND last_name with
            `min_length=1` and no default. This form asked for neither as
            required and had no last-name field at all, so EVERY registration
            came back "Request validation failed" — the account could not be
            created on this theme at all. Live QA found it; no fixture render
            can, because nothing there posts to the API. */}
        {!isLogin && (
          <label className="tn-contact-field">
            <span className="tn-contact-fieldlabel">{t("account.first_name", "First name")}</span>
            <input className="tn-input" name="first_name" required autoComplete="given-name" />
          </label>
        )}

        {!isLogin && (
          <label className="tn-contact-field">
            <span className="tn-contact-fieldlabel">{t("account.last_name", "Last name")}</span>
            <input className="tn-input" name="last_name" required autoComplete="family-name" />
          </label>
        )}

        <label className="tn-contact-field">
          <span className="tn-contact-fieldlabel">{t("account.email", "Email")}</span>
          <input className="tn-input" type="email" name="email" required autoComplete="email" dir="ltr" />
        </label>

        {!isLogin && (
          <label className="tn-contact-field">
            <span className="tn-contact-fieldlabel">{t("account.phone", "Phone")}</span>
            <input className="tn-input" type="tel" name="phone" autoComplete="tel" dir="ltr" />
          </label>
        )}

        <label className="tn-contact-field">
          <span className="tn-contact-fieldlabel">{t("account.password", "Password")}</span>
          <input
            className="tn-input"
            type="password"
            name="password"
            required
            /* Tells a password manager which operation this is; without it a
               sign-in form gets offered a new generated password. */
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </label>

        {!isLogin && (
          <label className="tn-account-check">
            <input type="checkbox" name="accepts_marketing" />
            <span>{t("account.marketing", "Email me about new drops and offers")}</span>
          </label>
        )}

        {error && (
          <p className="tn-formnote is-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="tn-formnote" role="status" aria-live="polite">
            {notice}
          </p>
        )}

        <button type="submit" className="tn-btn tn-btn-dark" disabled={busy}>
          {busy
            ? t("account.working", "Just a second…")
            : isLogin
              ? t("account.sign_in", "Sign in")
              : t("account.create", "Create an account")}
        </button>
      </form>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   Signed in
   ═════════════════════════════════════════════════════════════════════════ */

function Dashboard({
  settings: s,
  customer,
  t,
}: {
  settings: Record<string, unknown>;
  customer: Customer;
  t: TFunction;
}) {
  const { logout } = useCustomerActions();
  const name = customer.first_name || customer.email;

  return (
    <div className="tn-account-dash">
      <header className="tn-account-head">
        <div>
          <h1 className="tn-account-title">
            {(asString(s.signed_in_heading) || t("account.hello", "Hi {{name}}")).replace(
              "{{name}}",
              name,
            )}
          </h1>
          <p className="tn-footer-text" dir="ltr">
            {customer.email}
          </p>
        </div>
        <button type="button" className="tn-btn tn-btn-outline" onClick={() => logout()}>
          {t("account.sign_out", "Sign out")}
        </button>
      </header>

      {asBool(s.show_orders, true) && <Orders t={t} />}
      {asBool(s.show_addresses, true) && <Addresses t={t} />}
    </div>
  );
}

function Orders({ t }: { t: TFunction }) {
  const { orders, loading } = useOrders();

  if (loading) {
    return (
      <div className="tn-card tn-account-panel">
        <p className="tn-footer-text">{t("common.loading", "Loading")}</p>
      </div>
    );
  }

  return (
    <div className="tn-card tn-account-panel">
      <h2 className="tn-account-paneltitle">{t("account.orders", "Orders")}</h2>
      {orders.length === 0 ? (
        <p className="tn-footer-text">{t("account.no_orders", "No orders yet.")}</p>
      ) : (
        <ul className="tn-account-orders">
          {orders.map((o) => (
            <li key={o.id} className="tn-account-order">
              <div>
                <span className="tn-account-ordernum" dir="ltr">
                  #{o.order_number}
                </span>
                {/* The raw status string, not a theme-invented label: a theme
                    that renames "pending" to "Confirmed" is telling the
                    customer something the merchant's dashboard disagrees with. */}
                <span className="tn-badge tn-badge-soldout">{o.status}</span>
              </div>
              <span className="tn-account-ordertotal">
                <Money amount={o.total} currency={o.currency} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Addresses({ t }: { t: TFunction }) {
  const { addresses, loading } = useCustomerAddresses();
  if (loading || addresses.length === 0) return null;

  return (
    <div className="tn-card tn-account-panel">
      <h2 className="tn-account-paneltitle">{t("account.addresses", "Addresses")}</h2>
      <ul className="tn-account-addresses">
        {addresses.map((a) => {
          const r = a as unknown as Record<string, unknown>;
          const parts = [r.address_line1, r.address_line2, r.city, r.governorate, r.country]
            .map((v) => asString(v))
            .filter(Boolean);
          return (
            <li key={asString(r.id)} className="tn-account-address">
              {r.is_default ? (
                <span className="tn-badge tn-badge-lime">{t("account.default", "Default")}</span>
              ) : null}
              <p className="tn-footer-text">{parts.join(", ")}</p>
            </li>
          );
        })}
      </ul>
      <p className="tn-footer-text tn-account-addrnote">
        {t("account.address_note", "Addresses are managed at checkout.")}
      </p>
    </div>
  );
}
