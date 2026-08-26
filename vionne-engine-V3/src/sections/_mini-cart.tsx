"use client";
/**
 * _mini-cart — slide-in cart sidebar (opened from the header cart icon).
 *
 * Keeps the shopper in context instead of navigating away to /cart: line
 * items with qty steppers + remove, subtotal, checkout/view-bag CTAs, and —
 * the AOV part — a "You may also like" list underneath, each row with a
 * one-tap quick-add (related products of the first item, catalog fallback,
 * in-cart products excluded).
 *
 * Those rows used to end in a red "Shop Now" link, which took a shopper who
 * was one tap from checkout and sent them back out to a PDP. The thumbnail and
 * name still link there for anyone who wants the detail; the add happens here.
 *
 * Bottom sheet on mobile, end-side panel on md+. `role="dialog"` +
 * aria-modal, Esc + backdrop close, body scroll-lock while open.
 */
import { useEffect } from "react";
import {
  Link,
  Money,
  useCart,
  useRelatedProducts,
  type Product,
} from "@numueg/theme-sdk";
import { ArrowRight, Banknote, Check, Minus, Plus, ShieldCheck, ShoppingBag, Tag, Truck, X } from "lucide-react";
import { localized, productCurrency, productImage, responsiveImg, useFreeShippingThreshold, THUMB_IMG, useStoreProducts } from "./_shared";
import { cartNudges, promoPagePath, useActivePromotions, visibleCodeOffers } from "./_promotions";
import { PricePair } from "./_price";
import { QuickAddPill } from "./_quick-add";

export function MiniCartDrawer({ open, onClose, locale }: {
  open: boolean;
  onClose: () => void;
  locale: string;
}) {
  const { cart, updateQuantity, removeItem } = useCart();
  // The drawer opens on EVERY route, and the host pre-fetches products only on
  // catalog ones — so this fallback pool was empty exactly where the drawer is
  // most used (cart, checkout, account, any CMS page). `useStoreProducts`
  // fetches for itself and accepts every envelope.
  const catalogProducts = useStoreProducts(12);
  // CRO — free-shipping progress INSIDE the drawer. The threshold lives on the
  // cart SECTION's settings; read it cross-section (see useFreeShippingThreshold)
  // so the drawer, the cart page and the FAQ always quote the same number.
  const freeThreshold = useFreeShippingThreshold();
  const items = cart?.items ?? [];
  const firstProductId = items[0]?.product_id ?? null;
  const related = useRelatedProducts(open ? firstProductId : null, { limit: 8 });

  // ── Offers + real money ────────────────────────────────────────────────
  // This drawer is the cart surface shoppers actually open — it is on every
  // page behind the bag icon — and it was the ONLY one that showed no offer,
  // no saving and no post-discount total. With a qualifying "3 for EGP 650"
  // cart it read "Subtotal EGP 750" while /cart read EGP 650: same cart, two
  // numbers, and the shopper had no way to know the offer had applied.
  // Everything below mirrors vionne-cart exactly so the two can't diverge.
  const promos = useActivePromotions(promoPagePath(), locale, {
    productIds: items.map((it) => it.product_id),
    categoryIds: items.map((it) => it.category_id),
    subtotalMajor: cart?.subtotal,
  });
  const subtotal = cart?.subtotal ?? 0;
  const appliedPromos = cart?.applied_promotions ?? [];
  const cartDiscount = Math.max(0, cart?.discount_amount ?? 0);
  // The ENGINE's total — the number checkout charges. Never re-derived here.
  const grandTotal =
    typeof cart?.total === "number" && cart.total > 0
      ? cart.total
      : Math.max(0, subtotal - cartDiscount);
  // Anything discounted but not attributed to a named promotion (e.g. a pinned
  // code) still has to appear, or subtotal − rows ≠ total.
  const namedDiscount = appliedPromos.reduce((n, pr) => n + (pr?.amount || 0), 0);
  const otherDiscount = Math.max(0, cartDiscount - namedDiscount);
  const nudges = cartNudges(
    promos?.auto_discounts,
    subtotal,
    cart?.currency || "EGP",
    locale,
    // The drawer draws its own free-shipping bar above, so free-shipping rules
    // would say the same thing twice.
    freeThreshold > 0,
    items.reduce((n, it) => n + (it?.quantity || 0), 0),
    cart?.applied_promotions,
    items,
  );
  const codeOffers = visibleCodeOffers(
    promos?.discount_codes_visible,
    cart?.currency || "EGP",
    locale,
  );
  // Only break the money block into subtotal/savings/total when there IS a
  // saving — an undiscounted cart keeps the single clean subtotal line.
  const hasSavings = cartDiscount > 0 || appliedPromos.length > 0;

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

          {/* Active offers — the same set, in the same order, as /cart. */}
          {items.length > 0 && (nudges.length > 0 || codeOffers.length > 0) && (
            <div className="pt-4 space-y-2" data-testid="storefront-mini-cart-offers">
              {nudges.map((nudge, i) => (
                <div
                  key={nudge.promotionId ?? `nudge-${i}`}
                  className="border border-[var(--vn-border)] px-3 py-2.5"
                  data-unlocked={nudge.unlocked || undefined}
                >
                  <p className="text-[11px] leading-relaxed flex items-start gap-2 text-[var(--vn-ink)]">
                    {nudge.unlocked ? (
                      <Check size={12} aria-hidden="true" className="shrink-0 mt-0.5 text-[var(--vn-accent)]" />
                    ) : (
                      <Tag size={12} aria-hidden="true" className="shrink-0 mt-0.5" />
                    )}
                    <span className={nudge.unlocked ? "font-medium" : undefined}>{nudge.message}</span>
                  </p>
                  {nudge.progressPct !== null && (
                    <div
                      className="mt-2 h-1 rounded-full bg-[var(--vn-border)] overflow-hidden"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(nudge.progressPct)}
                      // Without a name this is announced as a bare percentage.
                      // The offer copy sits in a sibling <p>, which doesn't
                      // label it. Matches the free-shipping meter's wording.
                      aria-label={localized(locale, "Offer progress", "تقدّم العرض")}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--vn-ink)] transition-[width] duration-500 ease-out"
                        style={{ width: `${nudge.progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
              {codeOffers.map((offer) => (
                <div
                  key={offer.promotionId}
                  className="flex items-center justify-between gap-2 border border-dashed border-[var(--vn-border)] px-3 py-2.5"
                >
                  <span className="text-[11px] leading-relaxed text-[var(--vn-ink)]">{offer.message}</span>
                  <span
                    dir="ltr"
                    className="shrink-0 border border-[var(--vn-ink)] px-2 py-1 font-mono text-[10px] tracking-wider text-[var(--vn-ink)]"
                  >
                    {offer.code}
                  </span>
                </div>
              ))}
            </div>
          )}

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
                    <img {...responsiveImg(it.image_url, THUMB_IMG)} alt={it.name} className="w-14 h-[70px] object-cover shrink-0" loading="lazy" decoding="async" />
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
                  // The quick-add sits OUTSIDE the <Link>, not nested in it:
                  // the row's own click closes the drawer and navigates, which
                  // is the opposite of what an add should do here.
                  <li key={p.id} className="vn-sheet-item flex items-center gap-3">
                    <Link
                      to={`/product/${p.slug || p.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 group min-w-0 flex-1"
                    >
                      {productImage(p) ? (
                        <img {...responsiveImg(productImage(p), THUMB_IMG)} alt={p.name} className="w-12 h-14 object-cover rounded-md shrink-0" loading="lazy" decoding="async" />
                      ) : (
                        <div className="w-12 h-14 vn-shimmer rounded-md shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium line-clamp-1 group-hover:underline">{p.name}</p>
                        <PricePair
                          price={p.variants?.[0]?.price ?? p.price ?? 0}
                          compareAt={p.variants?.[0]?.compare_at_price ?? p.compare_at_price}
                          currency={productCurrency(p)}
                          size="sm"
                        />
                      </div>
                    </Link>
                    {/* Was a red "Shop Now" link — it sent a shopper who was one
                        tap from checkout back out to a PDP. Add in place. */}
                    <QuickAddPill product={p} locale={locale} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-[var(--vn-border)] shrink-0">
            {/* Subtotal → savings → TOTAL. The drawer used to print the
                subtotal alone and call it a day, so a shopper whose cart the
                engine had already discounted saw the pre-discount number here
                and a different one on /cart and at checkout. Every figure
                below is the engine's own. */}
            <div className="space-y-1.5 mb-3 text-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-[var(--vn-muted)]">{localized(locale, "Subtotal", "الإجمالي الفرعي")}</span>
                <span className={hasSavings ? "text-[var(--vn-muted)]" : "font-semibold"}>
                  <Money amount={subtotal} currency={cart?.currency} />
                </span>
              </div>
              {appliedPromos.map((promo, i) => (
                <div
                  key={promo?.id || i}
                  className="flex justify-between gap-3 text-xs text-[var(--vn-accent)]"
                  data-testid="storefront-mini-cart-savings"
                >
                  <span className="truncate">
                    {(locale?.startsWith("ar") && promo?.title_ar) || promo?.title}
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    {"−"}
                    <Money amount={promo?.amount || 0} currency={cart?.currency} />
                  </span>
                </div>
              ))}
              {otherDiscount > 0 && (
                <div className="flex justify-between gap-3 text-xs text-[var(--vn-accent)]">
                  <span>{localized(locale, "Discount", "الخصم")}</span>
                  <span className="font-medium whitespace-nowrap">
                    {"−"}
                    <Money amount={otherDiscount} currency={cart?.currency} />
                  </span>
                </div>
              )}
              {hasSavings && (
                <div className="flex justify-between items-baseline pt-1.5 border-t border-[var(--vn-border)]">
                  <span className="text-[var(--vn-ink)]">{localized(locale, "Total", "الإجمالي")}</span>
                  <span className="font-semibold">
                    <Money amount={grandTotal} currency={cart?.currency} />
                  </span>
                </div>
              )}
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
