/**
 * Added-to-bag drawer — the mini-cart.
 *
 * Adding to the bag must not cost a page. The drawer confirms the add, shows
 * the bag, and offers the next step; the full `/cart` page stays one tap away
 * for anyone who wants it. Nothing here replaces that page — it defers it.
 *
 * It is also where the AOV work becomes *visible*: free-shipping progress and
 * the active multibuy nudge both live here, at the exact moment the shopper has
 * committed to one item and is deciding whether to add another. On the cart
 * page that same nudge arrives a click too late.
 *
 * One provider owns the state, so every add path — PDP, quick add, and the
 * header bag icon — opens the same drawer instead of each growing its own.
 */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, Money, useCart, useProducts, type Product } from "@numueg/theme-sdk";
import { cx, productImages, useFocusTrap, useOverlayBehaviour } from "./shared";
import { useT } from "./i18n";
import { CartOfferNudge } from "./offers";
import { IconClose } from "./icons";
import { Price } from "./price";
import { QuickAddSheet } from "./quick-add";
import {
  CartDrawerContext,
  QuickAddContext,
  useQuickAddSheet,
  type CartDrawerApi,
  type QuickAddApi,
} from "./bag-context";

/** Re-exported so existing imports keep working. */
export { useCartDrawer, useQuickAddSheet } from "./bag-context";

export function CartDrawerProvider({
  children,
  freeShippingThreshold = 0,
}: {
  /**
   * REQUIRED, deliberately. Every `useCartDrawer()` consumer must sit in this
   * subtree; a childless `<CartDrawerProvider />` renders a perfectly styled
   * drawer that nothing on the page can open, because every consumer falls
   * through to the no-op default context below. Optional `children` made that
   * mistake type-clean and it shipped. Required makes it a compile error.
   */
  children: ReactNode;
  freeShippingThreshold?: number;
}) {
  const [openState, setOpenState] = useState(false);
  const [addedName, setAddedName] = useState("");

  const open = useCallback((name?: string) => {
    setAddedName(name ?? "");
    setOpenState(true);
  }, []);
  const close = useCallback(() => setOpenState(false), []);
  const api = useMemo<CartDrawerApi>(() => ({ open, close }), [open, close]);

  /**
   * The size picker lives HERE rather than inside the drawer, for one reason:
   * a recommendation must be addable from the bag itself. Before this, those
   * cards were plain links — tapping one closed the bag and navigated away,
   * which is an AOV *leak* dressed up as an AOV feature.
   *
   * Hoisting it to the provider also means every add path in the theme shares
   * one sheet instance instead of each section growing its own.
   */
  const [pickerFor, setPickerFor] = useState<Product | null>(null);
  const quickAdd = useMemo<QuickAddApi>(
    () => ({ open: (p: Product) => setPickerFor(p), close: () => setPickerFor(null) }),
    [],
  );

  return (
    <CartDrawerContext.Provider value={api}>
      <QuickAddContext.Provider value={quickAdd}>
        {children}
        <CartDrawer
          open={openState}
          onClose={close}
          addedName={addedName}
          threshold={freeShippingThreshold}
        />
        {pickerFor && (
          <QuickAddSheet product={pickerFor} onClose={() => setPickerFor(null)} />
        )}
      </QuickAddContext.Provider>
    </CartDrawerContext.Provider>
  );
}

function CartDrawer({
  open,
  onClose,
  addedName,
  threshold,
}: {
  open: boolean;
  onClose: () => void;
  addedName: string;
  threshold: number;
}) {
  const t = useT();
  const { cart, updateQuantity, removeItem, loading } = useCart();
  const panelRef = useRef<HTMLDivElement>(null);
  const { products } = useProducts({ limit: 8, fetchIfMissing: true });
  const quickAdd = useQuickAddSheet();

  useFocusTrap(open, panelRef);
  useOverlayBehaviour(open, onClose);

  const items = cart?.items ?? [];
  // Cart money reaches themes in MAJOR units — never divide by 100 here.
  const subtotal = cart?.subtotal ?? 0;
  const currency = cart?.currency;
  const count = items.reduce((n, i) => n + (i.quantity ?? 0), 0);

  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(1, subtotal / threshold) : 0;

  // Two suggestions, excluding what is already in the bag — a rail of things
  // they have already chosen is noise, not a recommendation.
  const inCart = new Set(items.map((i) => String(i.product_id)));
  const suggestions = products.filter((p) => !inCart.has(String(p.id))).slice(0, 2);

  return (
    <>
      <div
        className={cx("gn-sheet-scrim", open && "is-open")}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        className={cx("gn-bag", open && "is-open")}
        role="dialog"
        aria-modal="true"
        aria-label={t("cart.heading", "Your bag")}
        aria-hidden={open ? undefined : true}
      >
        <header className="gn-bag-head">
          <span className="gn-label">
            {addedName
              ? t("cart.added_name", "Added to your bag")
              : t("cart.heading", "Your bag")}
            {count > 0 && ` · ${count}`}
          </span>
          <button
            type="button"
            className="gn-icon-btn"
            aria-label={t("general.close", "Close")}
            onClick={onClose}
          >
            <IconClose />
          </button>
        </header>

        {addedName && <p className="gn-bag-added">{addedName}</p>}

        {items.length === 0 ? (
          <div className="gn-bag-empty">
            <p className="gn-empty-title">{t("cart.empty", "Your bag is empty")}</p>
            <Link to="/products" className="gn-btn gn-btn-primary" onClick={onClose}>
              {t("cart.continue", "Continue shopping")}
            </Link>
          </div>
        ) : (
          <>
            <div className="gn-bag-items">
              {items.map((item) => (
                <article key={item.id} className="gn-bag-row">
                  <span className="gn-plate gn-bag-thumb">
                    {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : null}
                  </span>
                  <div className="gn-bag-detail">
                    <p className="gn-bag-name">{item.name}</p>
                    {item.variant_name && <p className="gn-cart-variant">{item.variant_name}</p>}
                    <div className="gn-qty-control is-sm">
                      <button
                        type="button"
                        aria-label={t("product.decrease", "Decrease quantity")}
                        disabled={loading || item.quantity <= 1}
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={t("product.increase", "Increase quantity")}
                        disabled={loading}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="gn-bag-end">
                    <Money
                      amount={item.price * item.quantity}
                      currency={currency}
                      className="gn-price"
                    />
                    <button
                      type="button"
                      className="gn-bag-remove"
                      disabled={loading}
                      onClick={() => removeItem(item.id)}
                    >
                      {t("cart.remove", "Remove")}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="gn-bag-foot">
              {threshold > 0 && (
                <div className="gn-freeship">
                  <p className="gn-freeship-text">
                    {remaining > 0
                      ? t(
                          "cart.free_ship_remaining",
                          "Spend {{amount}} more for free shipping",
                        ).replace("{{amount}}", `${Math.ceil(remaining)} ${currency ?? "EGP"}`)
                      : t("cart.free_ship_reached", "Free shipping unlocked")}
                  </p>
                  <div className="gn-freeship-track" aria-hidden="true">
                    <span
                      className="gn-freeship-fill"
                      style={{ inlineSize: `${progress * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* The multibuy nudge lands here, one item in — the moment the
                  "add another" decision is actually being made. */}
              <CartOfferNudge />

              {suggestions.length > 0 && (
                <div className="gn-bag-suggest">
                  <p className="gn-label">{t("cart.recommendations", "Complete the look")}</p>
                  <div className="gn-bag-suggest-row">
                    {suggestions.map((p) => {
                      const img = productImages(p)[0];
                      return (
                        <div key={p.id} className="gn-bag-suggest-item">
                          {/* The image and name still navigate — some shoppers
                              want the full page — but ADD is a peer action, not
                              a page away. */}
                          <Link
                            to={`/products/${p.slug ?? p.id}`}
                            className="gn-bag-suggest-link"
                            onClick={onClose}
                          >
                            <span className="gn-plate">
                              {img ? <img src={img.url} alt="" loading="lazy" /> : null}
                            </span>
                            <span className="gn-bag-suggest-name">{p.name}</span>
                          </Link>
                          <Price
                            amount={p.price}
                            compareAt={p.compare_at_price}
                            currency={p.currency}
                            showSaving={false}
                          />
                          <button
                            type="button"
                            className="gn-bag-suggest-add"
                            aria-label={`${t("product.quick_add", "Quick add")} — ${p.name}`}
                            onClick={() => quickAdd.open(p)}
                          >
                            {`+ ${t("cart.add", "Add")}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="gn-bag-total">
                <span className="gn-label">{t("cart.subtotal", "Subtotal")}</span>
                <Money amount={subtotal} currency={currency} className="gn-price is-lg" />
              </div>

              <Link to="/checkout" className="gn-btn gn-btn-primary gn-bag-cta" onClick={onClose}>
                {t("cart.checkout", "Checkout")}
              </Link>
              {/* The full bag page is still one tap away — the drawer defers
                  it, never replaces it. */}
              <Link to="/cart" className="gn-textlink gn-bag-viewall" onClick={onClose}>
                {t("cart.view_bag", "View bag")}
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
