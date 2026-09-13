/**
 * Slide-in drawers: the shell every panel shares, and the cart drawer itself.
 *
 * The cart drawer's open state lives at module level, not in a provider.
 * Several unrelated places open it — the masthead, the book page, quick look
 * and every card's quick-add — and each is a separate section the host
 * mounts, so there is no common parent to hang a context on. The server
 * snapshot is always "closed", which keeps SSR and hydration identical.
 *
 * Drawers render only while open, so they are client-only by construction, and
 * they are portalled to the theme root: rendered in place, a drawer opened from
 * a card would inherit the card's descendant styles, and any transformed
 * ancestor would become the containing block for `position: fixed`. The theme
 * root (not <body>) keeps every `--pw-*` token and the merchant's inline
 * overrides in scope.
 */

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Image, Link, Money, useCart } from "@numueg/theme-sdk";
import { useT } from "./i18n";
import { IconClose } from "./ornaments";
import { CartNudges } from "./promotions";

let cartOpen = false;
const listeners = new Set<() => void>();

export function setCartDrawer(open: boolean): void {
  cartOpen = open;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCartDrawerOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => cartOpen,
    () => false,
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function Drawer({
  side,
  title,
  closeLabel,
  onClose,
  footer,
  wide = false,
  children,
}: {
  side: "start" | "end";
  title: string;
  closeLabel: string;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  if (typeof document === "undefined") return null;
  const host = document.querySelector<HTMLElement>("[data-powells-v3-app]") ?? document.body;

  return createPortal(
    <div className="pw-drawer-root">
      <div className="pw-drawer-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pw-drawer ${side}${wide ? " wide" : ""}`}
      >
        <div className="pw-drawer-head">
          <h2>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="pw-iconbtn"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>
        <div className="pw-drawer-body">{children}</div>
        {footer && <div className="pw-drawer-foot">{footer}</div>}
      </div>
    </div>,
    host,
  );
}

/** The cart drawer. Mounted once by main.tsx; renders nothing while closed. */
export function CartDrawer() {
  const open = useCartDrawerOpen();
  return open ? <CartDrawerPanel /> : null;
}

/**
 * Split from `CartDrawer` so the promotion lookup only runs while the drawer is
 * open, not on every page load.
 *
 * Cart money is in MAJOR units (normalised by the SDK) — never divide here.
 */
function CartDrawerPanel() {
  const t = useT();
  const { cart, updateQuantity, removeItem, loading } = useCart();

  const items = cart?.items ?? [];
  const currency = cart?.currency;
  const close = () => setCartDrawer(false);

  return (
    <Drawer
      side="end"
      title={t("cart.title", "Your Cart")}
      closeLabel={t("drawer.close", "Close")}
      onClose={close}
      footer={
        items.length > 0 ? (
          <>
            <div className="pw-sumrow total">
              <span>{t("cart.subtotal", "Subtotal")}</span>
              <span>
                <Money amount={cart?.subtotal ?? 0} currency={currency} />
              </span>
            </div>
            <p className="pw-note">
              {t("cart.drawer_note", "Shipping and discounts are calculated at checkout.")}
            </p>
            <Link className="pw-btn pw-btn-primary pw-btn-block" to="/checkout" onClick={close}>
              {t("cart.checkout", "Checkout")}
            </Link>
            <Link className="pw-btn pw-btn-ghost pw-btn-block" to="/cart" onClick={close}>
              {t("cart.view", "View cart")}
            </Link>
          </>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="pw-empty">
          <p>{t("cart.empty", "Your cart is empty.")}</p>
          <Link className="pw-btn pw-btn-primary" to="/products" onClick={close}>
            {t("cart.empty_cta", "Start browsing")}
          </Link>
        </div>
      ) : (
        <>
          <CartNudges />
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
                  <Link to={`/products/${item.product_id}`} onClick={close}>
                    {item.name}
                  </Link>
                </h3>
                {item.variant_name && <span className="pw-badge">{item.variant_name}</span>}
                <div className="pw-line-actions">
                  <div className="pw-qty">
                    <button
                      type="button"
                      aria-label={t("product.decrease", "Decrease quantity")}
                      disabled={loading || item.quantity <= 1}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <output aria-live="polite">{item.quantity}</output>
                    <button
                      type="button"
                      aria-label={t("product.increase", "Increase quantity")}
                      disabled={loading}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="pw-linkbtn"
                    disabled={loading}
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
        </>
      )}
    </Drawer>
  );
}
