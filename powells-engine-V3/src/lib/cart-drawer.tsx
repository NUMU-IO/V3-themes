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

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Image,
  Link,
  Money,
  requestNavigate,
  useCart,
  useProducts,
  useRelatedProducts,
  useThemeSettings,
  type Product,
} from "@numueg/theme-sdk";
import { useT } from "./i18n";
import { IconClose, SceneEmptyBag } from "./ornaments";
import { BookJacket } from "./jacket";
import { CartNudges } from "./promotions";
import { fetchProductDetail } from "./product-detail";
import { asNumber, asRecord, bookFormat, productAuthor, productImages } from "./shared";

/** An open/closed flag that unrelated sections can flip without a shared parent. */
export function createOpenStore() {
  let open = false;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return {
    set(next: boolean) {
      open = next;
      listeners.forEach((listener) => listener());
    },
    useOpen: () =>
      useSyncExternalStore(
        subscribe,
        () => open,
        () => false,
      ),
  };
}

const cartStore = createOpenStore();
export const setCartDrawer = (open: boolean): void => cartStore.set(open);
export const useCartDrawerOpen = (): boolean => cartStore.useOpen();

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The overlay shell.
 *
 * Two shapes, one implementation: `side` slides a panel in from an edge, and
 * `modal` centres a card. A modal is a drawer as far as focus, Escape, the
 * scrim, the scroll lock and the portal are concerned, and those are the parts
 * that are easy to get subtly wrong — so there is one of them, not two.
 */
export function Drawer({
  side,
  modal = false,
  title,
  closeLabel,
  onClose,
  footer,
  wide = false,
  children,
}: {
  side: "start" | "end";
  modal?: boolean;
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
    <div className={`pw-drawer-root${modal ? " modal" : ""}`}>
      <div className="pw-drawer-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`pw-drawer ${modal ? "popup" : side}${wide ? " wide" : ""}`}
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

/**
 * "You may also like" — a short row under the cart lines.
 *
 * Related to what is ALREADY in the cart, because that is the only thing the
 * shopper has told us. With an empty cart there is nothing to relate to, so it
 * falls back to the shop's own listing rather than showing an empty rail.
 *
 * A book with editions to choose is not added blind: it links to its page
 * instead, the same rule quick-add follows on a card. Listing payloads report
 * `variants: []` either way, so the detail payload decides — on click, never on
 * render, so opening the cart costs nothing.
 */
function CartSuggestions({ items, onClose }: { items: Array<{ product_id: string }>; onClose: () => void }) {
  const t = useT();
  const { addItem, loading } = useCart();
  const [busy, setBusy] = useState<string | null>(null);
  const { items: related } = useRelatedProducts(items[0]?.product_id ?? null, { limit: 6 });
  const { products: fallback } = useProducts({ limit: 12, fetchIfMissing: items.length === 0 });

  const inCart = new Set(items.map((item) => String(item.product_id)));
  const source: Product[] = related.length > 0 ? related : fallback;
  const picks = source.filter((product) => !inCart.has(String(product.id))).slice(0, 4);
  if (picks.length === 0) return null;

  const quickAdd = async (product: Product) => {
    setBusy(String(product.id));
    const resolved =
      (product.variants?.length ?? 0) > 0 ? product : ((await fetchProductDetail(String(product.id))) ?? product);
    const choices =
      (resolved.variants?.length ?? 0) > 1 ||
      (resolved.options ?? []).some((option) => (option.values?.length ?? 0) > 1);
    if (choices) {
      setBusy(null);
      onClose();
      requestNavigate(`/products/${resolved.slug ?? resolved.id}`);
      return;
    }
    const variant = resolved.variants?.[0];
    await addItem(String(product.id), variant ? String(variant.id) : undefined, 1, variant?.option_values);
    setBusy(null);
  };

  return (
    <section className="pw-alsolike">
      <h3>{t("cart.also_like", "You may also like")}</h3>
      {picks.map((product) => {
        const cover = productImages(product)[0];
        const author = productAuthor(product);
        const format = bookFormat(product);
        return (
          <div className="pw-alsoline" key={product.id}>
            <Link to={`/products/${product.slug ?? product.id}`} onClick={onClose} aria-label={product.name}>
              {cover ? (
                <Image src={cover} alt={product.name} responsive={false} loading="lazy" />
              ) : (
                <BookJacket title={product.name} size="mini" />
              )}
            </Link>
            <div>
              <h4>
                <Link to={`/products/${product.slug ?? product.id}`} onClick={onClose}>
                  {product.name}
                </Link>
              </h4>
              {author && <p className="pw-byline">{`${t("product.by", "by")} ${author}`}</p>}
              {format && <p className="pw-format">{format}</p>}
              <p className="pw-alsoprice">
                <Money amount={product.price ?? 0} currency={product.currency} />
              </p>
            </div>
            <button
              type="button"
              className="pw-btn pw-btn-ghost pw-alsoadd"
              disabled={loading || busy === String(product.id)}
              onClick={() => void quickAdd(product)}
            >
              {busy === String(product.id) ? t("product.adding", "Adding...") : t("cart.add", "Add")}
            </button>
          </div>
        );
      })}
    </section>
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
/**
 * "You're 120 EGP away from free delivery." The threshold is the merchant's
 * theme setting, in MAJOR units like the cart itself; with none set there is no
 * meter, and a free-shipping promotion's own nudge speaks instead.
 */
function DeliveryMeter({ subtotal, threshold, currency }: { subtotal: number; threshold: number; currency?: string }) {
  const t = useT();
  const remaining = Math.max(0, threshold - subtotal);
  const [before, after = ""] = t("cart.free_delivery_left", "You're {{amount}} away from free delivery.").split("{{amount}}");
  return (
    <div className="pw-meter" data-done={remaining === 0 || undefined}>
      <p>
        {remaining > 0 ? (
          <>
            {before}
            <b>
              <Money amount={remaining} currency={currency} />
            </b>
            {after}
          </>
        ) : (
          t("cart.free_delivery_done", "Your order ships free.")
        )}
      </p>
      <span className="track" aria-hidden="true">
        <span className="fill" style={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }} />
      </span>
    </div>
  );
}

function CartDrawerPanel() {
  const t = useT();
  const { cart, updateQuantity, removeItem, loading } = useCart();
  const settings = useThemeSettings();
  const globals = asRecord(settings.global_settings);
  const threshold = asNumber(globals.free_shipping_threshold, 0);
  const ornaments = globals.show_ornaments !== false;

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
        <>
          <div className="pw-empty">
            {ornaments && <SceneEmptyBag width={190} />}
            <p>{t("cart.empty", "Your cart is empty.")}</p>
            <Link className="pw-btn pw-btn-primary" to="/products" onClick={close}>
              {t("cart.empty_cta", "Start browsing")}
            </Link>
          </div>
          <CartSuggestions items={items} onClose={close} />
        </>
      ) : (
        <>
          {threshold > 0 && <DeliveryMeter subtotal={cart?.subtotal ?? 0} threshold={threshold} currency={currency} />}
          <CartNudges skipFreeShipping={threshold > 0} />
          {items.map((item) => (
            <div className="pw-line" key={item.id}>
              <div className="pw-line-media">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} responsive={false} loading="lazy" />
                ) : (
                  <BookJacket title={item.name} size="mini" />
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
          <CartSuggestions items={items} onClose={close} />
        </>
      )}
    </Drawer>
  );
}
