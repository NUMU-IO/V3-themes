"use client";
/**
 * _mini-cart — slide-in cart sidebar (opened from the header cart icon).
 *
 * Keeps the shopper in context instead of navigating away to /cart: line
 * items with qty steppers + remove, subtotal, checkout/view-bag CTAs, and —
 * the AOV part — a "You may also like" list underneath with red "Shop Now"
 * links (related products of the first item, catalog fallback, in-cart
 * products excluded).
 *
 * Bottom sheet on mobile, end-side panel on md+. `role="dialog"` +
 * aria-modal, Esc + backdrop close, body scroll-lock while open.
 */
import { useEffect } from "react";
import {
  Link,
  Money,
  useCart,
  useProducts,
  useRelatedProducts,
  useThemeSettings,
  type Product,
} from "@numueg/theme-sdk";
import { ArrowRight, Banknote, Minus, Plus, ShieldCheck, ShoppingBag, Truck, X } from "lucide-react";
import { localized, productCurrency, productImage } from "./_shared";
import { PricePair } from "./_price";

export function MiniCartDrawer({ open, onClose, locale }: {
  open: boolean;
  onClose: () => void;
  locale: string;
}) {
  const { cart, updateQuantity, removeItem } = useCart();
  const { products: catalogProducts } = useProducts();
  // CRO — free-shipping progress INSIDE the drawer. The threshold lives on the
  // cart SECTION's settings; read it cross-section from the published
  // customization so the drawer and the cart page always tell the same story.
  const themeSettings = useThemeSettings();
  const freeThreshold = (() => {
    const tpls = themeSettings.templates ?? {};
    for (const tpl of Object.values(tpls)) {
      const sections = (tpl as { sections?: Record<string, { type?: string; settings?: Record<string, unknown> }> })?.sections ?? {};
      for (const sec of Object.values(sections)) {
        if (sec?.type === "vionne-cart") {
          const v = Number(sec.settings?.free_shipping_threshold ?? 0);
          if (v > 0) return v;
        }
      }
    }
    return 0;
  })();
  const items = cart?.items ?? [];
  const firstProductId = items[0]?.product_id ?? null;
  const related = useRelatedProducts(open ? firstProductId : null, { limit: 8 });

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const inCart = new Set(items.map((it) => it.product_id));
  const suggestions = (related.items.length > 0 ? related.items : catalogProducts)
    .filter((p: Product) => !inCart.has(p.id))
    .slice(0, 3);
  const totalItems = items.reduce((n, it) => n + it.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={localized(locale, "Your bag", "شنطتك")}
      data-testid="storefront-mini-cart"
    >
      <div className="vn-sheet-backdrop absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="vn-sheet-panel absolute inset-x-0 bottom-0 md:inset-y-0 md:end-0 md:inset-x-auto md:w-[400px] bg-[var(--vn-white)] text-[var(--vn-ink)] rounded-t-2xl md:rounded-none max-h-[88vh] md:max-h-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--vn-border)] shrink-0">
          <span className="vn-heading text-base">
            {localized(locale, "Your bag", "شنطتك")}
            {totalItems > 0 && <span className="text-[var(--vn-muted)]"> ({totalItems})</span>}
          </span>
          <button type="button" onClick={onClose} aria-label={localized(locale, "Close", "إغلاق")} className="p-1 hover:opacity-70">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {freeThreshold > 0 && items.length > 0 && (() => {
            const subtotal = cart?.subtotal ?? 0;
            const earned = subtotal >= freeThreshold;
            const pct = Math.min(100, (subtotal / freeThreshold) * 100);
            return (
              <div className="pt-4" data-testid="storefront-mini-cart-freeship">
                <p className="text-xs flex items-center gap-2 text-[var(--vn-ink)]">
                  <Truck size={13} aria-hidden="true" className="shrink-0" />
                  {earned ? (
                    <span className="font-medium">
                      {localized(locale, "You've earned free shipping!", "مبروك! كسبتي الشحن المجاني")}
                    </span>
                  ) : (
                    <span>
                      {localized(locale, "Add ", "ضيفي ")}
                      <span className="font-semibold">
                        <Money amount={freeThreshold - subtotal} currency={cart?.currency} />
                      </span>
                      {localized(locale, " more to get free shipping", " كمان وتحصلي على شحن مجاني")}
                    </span>
                  )}
                </p>
                <div className="mt-2 h-1 rounded-full bg-[var(--vn-border)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--vn-ink)] transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}
          {items.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full border border-[var(--vn-border)] flex items-center justify-center">
                <ShoppingBag size={20} className="text-[var(--vn-muted)]" aria-hidden="true" />
              </div>
              <p className="text-sm text-[var(--vn-muted)] mb-6">
                {localized(locale, "Your bag is empty.", "شنطتك فاضية.")}
              </p>
              <Link to="/products" onClick={onClose} className="vn-btn vn-btn-outline-dark inline-flex">
                {localized(locale, "Start shopping", "ابدئي التسوّق")}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--vn-border)]">
              {items.map((it) => (
                <li key={it.id} className="vn-sheet-item flex gap-3.5 py-4" data-testid="storefront-mini-cart-item">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="w-14 h-[70px] object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-[70px] vn-shimmer shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium line-clamp-1">{it.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        aria-label={localized(locale, "Remove", "إزالة")}
                        className="p-0.5 text-[var(--vn-muted)] hover:text-[var(--vn-ink)] shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {it.variant_name && (
                      <p className="text-[11px] text-[var(--vn-muted)]">{it.variant_name}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-[var(--vn-border)] rounded-full">
                        <button
                          type="button"
                          aria-label={localized(locale, "Decrease quantity", "تقليل الكمية")}
                          onClick={() => updateQuantity(it.id, Math.max(1, it.quantity - 1))}
                          className="p-1.5 hover:opacity-70"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 text-xs font-medium tabular-nums">{it.quantity}</span>
                        <button
                          type="button"
                          aria-label={localized(locale, "Increase quantity", "زيادة الكمية")}
                          onClick={() => updateQuantity(it.id, it.quantity + 1)}
                          className="p-1.5 hover:opacity-70"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        <Money amount={it.price * it.quantity} currency={cart?.currency} />
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* AOV — related products under the bag, screenshot style:
              thumb + name + red "Shop Now". */}
          {suggestions.length > 0 && (
            <div className="pt-4 pb-5 border-t border-[var(--vn-border)]" data-testid="storefront-mini-cart-recs">
              <p className="vn-eyebrow mb-3">
                {localized(locale, "You may also like", "ممكن يعجبك كمان")}
              </p>
              <ul className="space-y-3">
                {suggestions.map((p: Product) => (
                  <li key={p.id} className="vn-sheet-item">
                    <Link
                      to={`/product/${p.slug || p.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 group"
                    >
                      {productImage(p) ? (
                        <img src={productImage(p)} alt={p.name} className="w-12 h-14 object-cover rounded-md shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-12 h-14 vn-shimmer rounded-md shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium line-clamp-1">{p.name}</p>
                        <PricePair
                          price={p.variants?.[0]?.price ?? p.price ?? 0}
                          compareAt={p.variants?.[0]?.compare_at_price ?? p.compare_at_price}
                          currency={productCurrency(p)}
                          size="sm"
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-[var(--vn-sale)] shrink-0 group-hover:underline">
                        {localized(locale, "Shop Now", "اتسوّقي الآن")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-[var(--vn-border)] shrink-0">
            <div className="flex justify-between items-baseline mb-3 text-sm">
              <span className="text-[var(--vn-muted)]">{localized(locale, "Subtotal", "الإجمالي الفرعي")}</span>
              <span className="font-semibold">
                <Money amount={cart?.subtotal ?? 0} currency={cart?.currency} />
              </span>
            </div>
            <Link to="/checkout" onClick={onClose} className="vn-btn vn-btn-filled w-full flex items-center justify-center gap-2">
              {localized(locale, "Checkout", "إتمام الشراء")}
              <ArrowRight size={13} className="rtl:rotate-180" />
            </Link>
            <Link to="/cart" onClick={onClose} className="vn-btn vn-btn-outline-dark w-full mt-2 flex items-center justify-center">
              {localized(locale, "View bag", "شوفي الشنطة")}
            </Link>
            <p className="mt-3 flex items-center justify-center gap-3 text-[10px] text-[var(--vn-muted)]">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={11} aria-hidden="true" />
                {localized(locale, "Secure checkout", "دفع آمن")}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Banknote size={11} aria-hidden="true" />
                {localized(locale, "Cash on delivery", "الدفع عند الاستلام")}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
