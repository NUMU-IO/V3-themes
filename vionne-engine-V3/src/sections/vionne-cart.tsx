"use client";

import { useEffect, useState } from "react";
import {
  Link,
  Money,
  useCart,
  useLocale,
  useProducts,
  useRelatedProducts,
  useResolvedSettings,
  useShop,
  type CartItem,
  type Product,
} from "@numueg/theme-sdk";
import { ArrowRight, Check, Copy, Minus, Plus, ShoppingBag, Tag, Truck, X } from "lucide-react";
import { asNumber, asString, localized, productCurrency, productImage, responsiveImg, PRODUCT_CARD_IMG, THUMB_IMG, type SectionRenderProps, useStoreProducts } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { cartNudges, promoPagePath, useActivePromotions, visibleCodeOffers, type VisibleCodeOffer } from "./_promotions";
import { QuickAddBar } from "./_quick-add";
import { QuickPreviewButton } from "./_quick-preview";
import { entryTarget, useRecentlyViewed } from "./_recently-viewed";

/**
 * vionne-cart — the cart template body.
 *
 * Vionne shipped only a header+footer stub `cart` template (no body section),
 * so the cart page rendered blank between the chrome. This is the missing body:
 * the grayscale-and-gold editorial cart, in Vionne's `vn-*` design language —
 * an empty state (outlined bag + CTA) and a populated state (line items with
 * qty steppers + remove, plus a sticky summary with subtotal / shipping /
 * total + a checkout CTA). Data + actions are SDK-native via useCart(); copy is
 * merchant-editable (InlineEditable) and bilingual (localized defaults).
 *
 * Shipping mirrors the platform rule (bz-cart parity): the real rate needs an
 * address (only known in checkout), so the cart shows FREE when the merchant's
 * real free-ship threshold is met, otherwise "calculated at checkout" — never a
 * fabricated figure. The cart total is the items subtotal.
 */
export default function VionneCart({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { cart, updateQuantity, removeItem, loading } = useCart();
  const locale = useLocale();
  // A3 — active promotions (auto-discount offers). Hook must run before the
  // loading/empty early returns (rules of hooks).
  const promos = useActivePromotions(promoPagePath(), locale, {
    productIds: (cart?.items ?? []).map((it) => it.product_id),
    categoryIds: (cart?.items ?? []).map((it) => it.category_id),
    subtotalMajor: cart?.subtotal,
  });

  // ── Editor-preview sample cart ─────────────────────────────────────────
  // In the customizer the preview session usually has an EMPTY cart, so the
  // merchant could only ever see/edit the empty state — the line items,
  // free-shipping bar, offer nudge and recommendations were invisible until
  // publish. When the cart is empty INSIDE the editor preview (detected via
  // the preview iframe's ?preview=true&editor=v3 params; effect-gated so SSR
  // hydration stays clean), render SAMPLE items built from the store's real
  // catalog. Real customers never see this: any real cart item wins, and the
  // params never appear on the live storefront.
  const [inEditorPreview, setInEditorPreview] = useState(false);
  useEffect(() => {
    try {
      const q = window.location.search;
      setInEditorPreview(/[?&](editor=v3|preview=true)/.test(q));
    } catch {
      /* SSR / sandboxed — stay false */
    }
  }, []);
  // Product source for the sample items. `useProducts()` is only populated on
  // catalog pages — on the cart route the host provides no catalog — so when
  // it's empty we fetch a few products ourselves (editor preview only).
  const { products: catalogProducts } = useProducts();
  const shop = useShop();
  const realItems: CartItem[] = cart?.items ?? [];
  const [fetchedDemo, setFetchedDemo] = useState<Product[]>([]);
  useEffect(() => {
    if (!inEditorPreview || loading || realItems.length > 0) return;
    if (catalogProducts.length > 0 || fetchedDemo.length > 0 || !shop?.id) return;
    let cancelled = false;
    fetch(`/api/products?store_id=${shop.id}&limit=4`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = j?.data?.items ?? j?.items ?? [];
        if (!cancelled && Array.isArray(list)) setFetchedDemo(list as Product[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inEditorPreview, loading, realItems.length, catalogProducts.length, fetchedDemo.length, shop?.id]);
  const catalogForDemo = catalogProducts.length > 0 ? catalogProducts : fetchedDemo;
  const demoMode = inEditorPreview && !loading && realItems.length === 0 && catalogForDemo.length > 0;
  const demoItems: CartItem[] = demoMode
    ? catalogForDemo.slice(0, 2).map((p, i) => ({
        id: `demo-${i}`,
        product_id: p.id,
        name: p.name,
        image_url: productImage(p),
        price: p.variants?.[0]?.price ?? p.price ?? 0,
        quantity: i === 0 ? 2 : 1,
        variant_name: undefined,
      }))
    : [];

  const emptyHeadline =
    asString(s.empty_headline) || localized(locale, "YOUR CART IS EMPTY", "سلتك فاضية");
  const emptySubhead =
    asString(s.empty_subhead) ||
    localized(locale, "Nothing here yet — let's find something you'll love.", "لسه مفيش حاجة هنا — تعالي نلاقي حاجة تعجبك.");
  const emptyCta = asString(s.empty_cta_label) || localized(locale, "CONTINUE SHOPPING", "كمّلي تسوّق");
  const emptyCtaHref = asString(s.empty_cta_href) || "/products";

  const populatedTitle = asString(s.populated_title) || localized(locale, "CART", "السلة");
  const checkoutCta = asString(s.checkout_cta_label) || localized(locale, "CHECKOUT", "إتمام الشراء");
  const continueLabel = asString(s.continue_label) || localized(locale, "CONTINUE SHOPPING", "كمّلي تسوّق");
  const subtotalLabel = asString(s.subtotal_label) || localized(locale, "Subtotal", "الإجمالي الفرعي");
  const shippingLabel = asString(s.shipping_label) || localized(locale, "Shipping", "الشحن");
  const totalLabel = asString(s.total_label) || localized(locale, "Total", "الإجمالي");
  const freeLabel = asString(s.free_label) || localized(locale, "Free", "مجاني");
  const shippingCalcLabel =
    asString(s.shipping_calc_label) || localized(locale, "Calculated at checkout", "يُحسب عند الدفع");
  const freeThreshold = asNumber(s.free_shipping_threshold, 0);
  // A3 — merchant-configured offer nudge (on by default; merchant can hide it).
  const showPromoNudge = s.show_promo_nudge !== false;
  // A2 — cart recommendations rail (on by default; merchant can hide it).
  const showRecs = s.show_recommendations !== false;
  const recsTitle =
    asString(s.recommendations_title) ||
    localized(locale, "You may also like", "ممكن يعجبك كمان");
  // A8 — the shopper's own browse trail, in the bag (on by default).
  const showCartRecentlyViewed = s.show_recently_viewed !== false;
  const cartRecentlyViewedTitle =
    asString(s.recently_viewed_title) ||
    localized(locale, "Recently viewed", "شفتيها قريب");

  const items: CartItem[] = demoMode ? demoItems : realItems;
  const currency = cart?.currency;
  const isEmpty = items.length === 0;
  const totalItems = items.reduce((n, it) => n + it.quantity, 0);

  // ── Initial-load state ────────────────────────────────────────────────────
  // The cart is EMPTY_CART until the on-mount GET /api/cart lands. Rendering
  // the empty state during that window flashed "YOUR CART IS EMPTY" for a
  // returning shopper who actually has items. While loading with nothing yet,
  // show a neutral placeholder (same shell height → no layout shift) instead.
  if (isEmpty && loading) {
    return (
      <section
        className="bg-background min-h-[70vh] flex items-center justify-center"
        data-vn-section={sectionId}
        data-testid="storefront-cart"
        aria-busy="true"
      >
        <div
          className="w-9 h-9 rounded-full border-2 border-[var(--vn-border)] border-t-[var(--vn-ink)] motion-safe:animate-spin"
          role="status"
          aria-label={localized(locale, "Loading your bag", "جارٍ تحميل شنطتك")}
        />
      </section>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <section
        // flex-col so the recently-viewed rail below stacks under the centred
        // empty-state block instead of sitting beside it.
        className="bg-background min-h-[70vh] flex flex-col items-center justify-center"
        data-vn-section={sectionId}
        data-testid="storefront-cart"
      >
        <div className="text-center px-6 py-20">
          <div className="w-16 h-16 mx-auto mb-7 rounded-full border border-[var(--vn-border)] flex items-center justify-center">
            <ShoppingBag size={22} className="text-[var(--vn-muted)]" aria-hidden="true" />
          </div>
          <span className="vn-eyebrow block mb-3 text-[var(--vn-muted)]">
            {localized(locale, "Your bag", "شنطتك")}
          </span>
          <h1 className="vn-heading text-3xl md:text-4xl text-[var(--vn-ink)] mb-4">
            <InlineEditable sectionId={sectionId} settingKey="empty_headline" value={emptyHeadline} />
          </h1>
          <p className="text-sm text-[var(--vn-muted)] mb-8 max-w-sm mx-auto leading-relaxed">
            <InlineEditable sectionId={sectionId} settingKey="empty_subhead" value={emptySubhead} multiline />
          </p>
          <Link to={emptyCtaHref} className="vn-btn vn-btn-filled inline-flex items-center gap-2">
            <InlineEditable sectionId={sectionId} settingKey="empty_cta_label" value={emptyCta} />
            <ArrowRight size={13} aria-hidden="true" className="rtl:rotate-180" />
          </Link>
        </div>

        {/* An empty bag is the highest-value place for the trail: it's the one
            page with nothing on it, and "pick up where you left off" beats a
            lone "continue shopping" button. Renders nothing when the trail is
            empty, so a first-time visitor still sees the original layout. */}
        {showCartRecentlyViewed && (
          <div className="w-full container mx-auto px-4 md:px-6">
            <CartRecentlyViewed
              inCartIds={EMPTY_ID_SET}
              title={cartRecentlyViewedTitle}
              sectionId={sectionId}
              locale={locale}
            />
          </div>
        )}
      </section>
    );
  }

  // ── Populated state ──────────────────────────────────────────────────────
  const subtotal = demoMode
    ? demoItems.reduce((n, it) => n + it.price * it.quantity, 0)
    : cart?.subtotal ?? 0;
  const freeShipEarned = freeThreshold > 0 && subtotal >= freeThreshold;
  const remainingForFree = freeThreshold > 0 ? Math.max(freeThreshold - subtotal, 0) : 0;
  // Offers-v2: the cart now carries the ENGINE's post-discount total — the
  // same number checkout charges. Never re-derive it from the line items:
  // before offers-v2 the cart had no discount fields so `total === subtotal`
  // and hardcoding the subtotal was harmless, but a qualifying cart now
  // returns a real total and showing the subtotal here would contradict the
  // savings row directly above it ("you saved EGP 100 … Total EGP 750").
  // All three values reach the theme in MAJOR units (the SDK's
  // `normalizeCartFromServer` is the one cents→major boundary).
  const cartDiscount = demoMode ? 0 : Math.max(0, cart?.discount_amount ?? 0);
  const appliedPromos = demoMode ? [] : (cart?.applied_promotions ?? []);
  const grandTotal = demoMode
    ? subtotal
    : typeof cart?.total === "number" && cart.total > 0
      ? cart.total
      : Math.max(0, subtotal - cartDiscount);
  // Anything the engine discounted but didn't attribute to a named promotion
  // (e.g. a pinned code) still has to appear, or subtotal − rows ≠ total.
  const namedDiscount = appliedPromos.reduce((n, pr) => n + (pr?.amount || 0), 0);
  const otherDiscount = Math.max(0, cartDiscount - namedDiscount);
  // A3 — EVERY active offer from the store's auto-discount promotions, not
  // just the top-ranked one. This used to call `bestCartNudge`, which returns
  // the first match and stops: a store running three offers advertised one and
  // the shopper never learned about the other two they also qualified for.
  // Free-shipping-kind rules are still skipped when the theme's own bar (A1)
  // already tells that story, so nobody reads the same promise twice.
  const promoNudges = showPromoNudge
    ? cartNudges(
        promos?.auto_discounts,
        subtotal,
        currency || "EGP",
        locale,
        freeThreshold > 0,
        // Units (not lines) for multibuy progress — three of one product is a
        // valid trio, exactly how the engine counts it.
        items.reduce((n, it) => n + (it?.quantity || 0), 0),
        // The engine's own per-promotion amounts, so an unlocked bundle shows
        // the REAL saving instead of a number the theme made up.
        cart?.applied_promotions,
        // The lines themselves, so a SCOPED offer counts only qualifying
        // units rather than the whole cart.
        items,
      )
    : [];
  // Merchant-published discount CODES. The host has always returned this
  // bucket and every theme surface threw it away, so a code the merchant
  // deliberately published was invisible on the storefront.
  const codeOffers = showPromoNudge
    ? visibleCodeOffers(promos?.discount_codes_visible, currency || "EGP", locale)
    : [];

  return (
    <section className="bg-background min-h-[70vh]" data-vn-section={sectionId} data-testid="storefront-cart">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <header className="mb-8 md:mb-10">
          <span className="vn-eyebrow block mb-2 text-[var(--vn-muted)]">
            {localized(locale, "Your bag", "شنطتك")}
          </span>
          <h1 className="vn-heading text-3xl md:text-5xl text-[var(--vn-ink)]">
            <InlineEditable sectionId={sectionId} settingKey="populated_title" value={populatedTitle} />
            <span className="text-[var(--vn-muted)]"> ({totalItems})</span>
          </h1>
        </header>

        {/* Editor-only sample notice — never rendered on the live storefront
            (demoMode requires the preview params + an empty cart). */}
        {demoMode && (
          <p className="mb-6 -mt-4 inline-flex items-center gap-2 border border-dashed border-[var(--vn-border)] px-3 py-1.5 text-[11px] text-[var(--vn-muted)]" data-testid="storefront-cart-demo-notice">
            {localized(
              locale,
              "Sample items so you can style this page — customers see their real bag.",
              "منتجات تجريبية علشان تظبطي شكل الصفحة — عملاؤك هيشوفوا شنطتهم الحقيقية.",
            )}
          </p>
        )}

        {/* A1 — free-shipping PROGRESS BAR. The threshold nudge used to be a
            small text line buried in the summary; a visible filling bar at the
            top of the cart is the classic "add one more item" AOV mechanic.
            Renders only when the merchant sets `free_shipping_threshold`. */}
        {freeThreshold > 0 && (
          <div className="mb-8 border border-[var(--vn-border)] p-4">
            <div className="flex items-center gap-2.5 mb-3 text-sm">
              <Truck size={16} aria-hidden="true" className="shrink-0 text-[var(--vn-ink)]" />
              {freeShipEarned ? (
                <span className="font-medium text-[var(--vn-ink)]">
                  {localized(
                    locale,
                    "You've earned free shipping!",
                    "مبروك! كسبتي الشحن المجاني",
                  )}
                </span>
              ) : (
                <span className="text-[var(--vn-ink)]">
                  {localized(locale, "Add ", "ضيفي ")}
                  <span className="font-semibold">
                    <Money amount={remainingForFree} currency={currency} />
                  </span>
                  {localized(locale, " more to get free shipping", " كمان وتحصلي على شحن مجاني")}
                </span>
              )}
            </div>
            <div
              className="h-1.5 rounded-full bg-[var(--vn-border)] overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(Math.min(100, (subtotal / freeThreshold) * 100))}
              aria-label={localized(locale, "Free shipping progress", "تقدّم الشحن المجاني")}
            >
              <div
                className="h-full rounded-full bg-[var(--vn-ink)] transition-[width] duration-500 ease-out"
                style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* A3 — offer nudges ("Add X more to unlock Y% off"). Same mechanic as
            the free-shipping bar but for the merchant's configured discounts;
            these offers previously existed in the platform yet were never
            shown to the customer, so they couldn't change behavior. ALL active
            offers render, most-actionable first — the old single-slot version
            hid every offer after the first. */}
        {(promoNudges.length > 0 || codeOffers.length > 0) && (
          <div className="mb-8 space-y-2" data-testid="storefront-cart-promo-nudge">
            {promoNudges.map((nudge, i) => (
              <div
                key={nudge.promotionId ?? `nudge-${i}`}
                className="border border-[var(--vn-border)] p-4"
                data-testid="storefront-cart-promo-nudge-item"
                data-unlocked={nudge.unlocked || undefined}
              >
                <div className="flex items-start gap-2.5 text-sm">
                  {nudge.unlocked ? (
                    <Check size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-[var(--vn-accent)]" />
                  ) : (
                    <Tag size={15} aria-hidden="true" className="shrink-0 mt-0.5 text-[var(--vn-ink)]" />
                  )}
                  <span className={nudge.unlocked ? "font-medium text-[var(--vn-ink)]" : "text-[var(--vn-ink)]"}>
                    {nudge.message}
                  </span>
                </div>
                {nudge.progressPct !== null && (
                  <div
                    className="mt-3 h-1.5 rounded-full bg-[var(--vn-border)] overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(nudge.progressPct)}
                    // Without a name this is announced as a bare percentage.
                    // The offer copy sits in a sibling <p>, which doesn't
                    // label it. Matches the free-shipping meter above.
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

            {/* Merchant-published discount codes — the shopper has to type
                these at checkout, so they render as a copyable chip rather
                than a progress meter. */}
            {codeOffers.map((offer) => (
              <CartCodeOffer key={offer.promotionId} offer={offer} locale={locale} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
          {/* Items */}
          <ul className="lg:col-span-2 divide-y divide-[var(--vn-border)] border-y border-[var(--vn-border)]">
            {items.map((it) => (
              <li key={it.id} className="flex gap-5 py-5" data-testid="storefront-cart-item">
                <div className="shrink-0">
                  {it.image_url ? (
                    <img
                      {...responsiveImg(it.image_url, THUMB_IMG)}
                      alt={it.name}
                      className="w-24 h-28 sm:w-28 sm:h-36 object-cover bg-[var(--vn-band)]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-24 h-28 sm:w-28 sm:h-36 bg-[var(--vn-band)] flex items-center justify-center">
                      <ShoppingBag size={24} className="text-[var(--vn-muted)]/40" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm md:text-base font-medium text-[var(--vn-ink)] line-clamp-2">
                        {it.name}
                      </h3>
                      {it.variant_name && (
                        <p className="vn-label text-[10px] text-[var(--vn-muted)] mt-1.5">
                          {it.variant_name}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (!demoMode) removeItem(it.id); }}
                      disabled={loading}
                      aria-label={localized(locale, "Remove item", "إزالة العنصر")}
                      className="shrink-0 p-1 text-[var(--vn-muted)]/60 hover:text-[var(--vn-ink)] transition-colors disabled:opacity-40"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-auto pt-4">
                    {/* Quantity stepper */}
                    <div className="inline-flex items-center border border-[var(--vn-border)] rounded-full">
                      <button
                        type="button"
                        onClick={() => { if (!demoMode) updateQuantity(it.id, Math.max(1, it.quantity - 1)); }}
                        disabled={loading}
                        aria-label={localized(locale, "Decrease quantity", "تقليل الكمية")}
                        className="w-9 h-9 flex items-center justify-center text-[var(--vn-muted)] hover:text-[var(--vn-accent)] transition-colors disabled:opacity-40"
                      >
                        <Minus size={13} aria-hidden="true" />
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums text-[var(--vn-ink)]">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => { if (!demoMode) updateQuantity(it.id, it.quantity + 1); }}
                        disabled={loading}
                        aria-label={localized(locale, "Increase quantity", "زيادة الكمية")}
                        className="w-9 h-9 flex items-center justify-center text-[var(--vn-muted)] hover:text-[var(--vn-accent)] transition-colors disabled:opacity-40"
                      >
                        <Plus size={13} aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-base font-semibold text-[var(--vn-ink)]">
                      <Money amount={it.price * it.quantity} currency={currency} />
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <div>
            <div className="lg:sticky lg:top-24 border border-[var(--vn-border)] p-6">
              <h2 className="vn-eyebrow text-[var(--vn-muted)] mb-5">
                {localized(locale, "Order summary", "ملخص الطلب")}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[var(--vn-ink)]">
                  <span className="text-[var(--vn-muted)]">{subtotalLabel}</span>
                  <span className="font-medium">
                    <Money amount={subtotal} currency={currency} />
                  </span>
                </div>
                <div className="flex justify-between text-[var(--vn-ink)]">
                  <span className="text-[var(--vn-muted)]">{shippingLabel}</span>
                  <span className="font-medium">
                    {freeShipEarned ? (
                      <span className="uppercase tracking-wide text-[var(--vn-accent)]">{freeLabel}</span>
                    ) : (
                      <span className="text-[var(--vn-muted)] text-xs">{shippingCalcLabel}</span>
                    )}
                  </span>
                </div>
                {/* Offers-v2 savings rows. Amounts are the ENGINE's own
                    per-promotion contributions — never recomputed here, so the
                    cart can't drift from what the order is charged. */}
                {appliedPromos.map((promo, i) => (
                  <div
                    key={promo?.id || i}
                    className="flex justify-between gap-3 text-[var(--vn-accent)]"
                    data-testid="cart-promo-savings"
                  >
                    <span>
                      {(locale?.startsWith("ar") && promo?.title_ar) ||
                        promo?.title}
                    </span>
                    <span className="font-medium whitespace-nowrap">
                      {"−"}
                      <Money amount={promo?.amount || 0} currency={currency} />
                    </span>
                  </div>
                ))}
                {otherDiscount > 0 && (
                  <div className="flex justify-between gap-3 text-[var(--vn-accent)]">
                    <span>{localized(locale, "Discount", "الخصم")}</span>
                    <span className="font-medium whitespace-nowrap">
                      {"−"}
                      <Money amount={otherDiscount} currency={currency} />
                    </span>
                  </div>
                )}
                {/* The "add X more" nudge moved to the progress bar at the top
                    of the cart (A1) — keeping it here too would say the same
                    thing twice on one screen. */}
                <div className="flex justify-between items-baseline pt-4 mt-1 border-t border-[var(--vn-border)]">
                  <span className="vn-heading text-base text-[var(--vn-ink)]">{totalLabel}</span>
                  <span className="vn-heading text-xl text-[var(--vn-ink)]">
                    <Money amount={grandTotal} currency={currency} />
                  </span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="vn-btn vn-btn-filled w-full mt-6 flex items-center justify-center gap-2"
                data-testid="storefront-cart-checkout"
              >
                <InlineEditable sectionId={sectionId} settingKey="checkout_cta_label" value={checkoutCta} />
                <ArrowRight size={13} aria-hidden="true" className="rtl:rotate-180" />
              </Link>
              <Link
                to={emptyCtaHref}
                className="mt-4 block text-center vn-label text-[10px] text-[var(--vn-muted)] hover:text-[var(--vn-accent)] transition-colors"
              >
                <InlineEditable sectionId={sectionId} settingKey="continue_label" value={continueLabel} />
              </Link>
              <p className="mt-4 text-[11px] text-[var(--vn-muted)] leading-relaxed text-center">
                {localized(
                  locale,
                  "Shipping & taxes calculated at checkout.",
                  "الشحن والضرائب بتتحسب عند الدفع.",
                )}
              </p>
            </div>
          </div>
        </div>

        {/* A2 — recommendations rail. The cart used to be a dead end: nothing
            could be added without leaving the page. Quick-add keeps the
            shopper here; multi-variant products link to their PDP instead
            (picking a size/colour blind adds the wrong thing). */}
        {showRecs && (
          <CartRecommendations
            inCartIds={new Set(items.map((it) => it.product_id))}
            seedProductId={items[0]?.product_id ?? null}
            title={recsTitle}
            sectionId={sectionId}
            locale={locale}
          />
        )}

        {/* A8 — the shopper's own trail, under the algorithm's guesses. */}
        {showCartRecentlyViewed && (
          <CartRecentlyViewed
            inCartIds={new Set(items.map((it) => it.product_id))}
            title={cartRecentlyViewedTitle}
            sectionId={sectionId}
            locale={locale}
          />
        )}
      </div>
    </section>
  );
}

/**
 * CartCodeOffer — one merchant-published discount code, with copy-to-clipboard.
 *
 * A visible code is useless if the shopper has to retype it from memory into
 * the checkout field, so the whole chip is the copy affordance and it confirms
 * in place. `navigator.clipboard` is absent on insecure origins and old
 * browsers; the code stays selectable text either way, so a failed copy
 * degrades to "read it and type it" rather than to a dead button.
 */
function CartCodeOffer({ offer, locale }: { offer: VisibleCodeOffer; locale: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try {
      navigator?.clipboard?.writeText(offer.code).catch(() => {});
    } catch {
      /* no clipboard — the code is still readable on screen */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-[var(--vn-border)] p-4"
      data-testid="storefront-cart-code-offer"
    >
      <span className="flex items-start gap-2.5 text-sm text-[var(--vn-ink)]">
        <Tag size={15} aria-hidden="true" className="shrink-0 mt-0.5" />
        {offer.message}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 border border-[var(--vn-ink)] px-3 py-1.5 vn-label text-[10px] text-[var(--vn-ink)] hover:bg-[var(--vn-ink)] hover:text-[var(--vn-white)] transition-colors"
        aria-label={localized(locale, `Copy code ${offer.code}`, `انسخي كود ${offer.code}`)}
      >
        {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
        <span dir="ltr" className="font-mono tracking-wider">{offer.code}</span>
      </button>
    </div>
  );
}

/**
 * CartRecommendations — "You may also like" rail under the cart (A2).
 *
 * Product pool: related products seeded from the first cart item (same
 * endpoint the PDP rail uses); when that returns nothing (no shared
 * category, sparse catalog) fall back to the store catalog. In-cart
 * products are always excluded; capped at 4.
 *
 * Quick-add: single-variant products add in place via useCart().addItem
 * (button shows … while pending, ✓ on success). Multi-variant products
 * render a link-only card — variant choice belongs on the PDP.
 */
function CartRecommendations({ inCartIds, seedProductId, title, sectionId, locale }: {
  inCartIds: Set<string>;
  seedProductId: string | null;
  title: string;
  sectionId: string;
  locale: string;
}) {
  // `useStoreProducts` (not `useProducts`) because the host pre-fetches
  // products only on catalog routes — never on /cart. Without it this "fall
  // back to the catalog" pool was ALWAYS empty here, so whenever the related
  // lookup came back thin (no shared category, sparse catalog) the whole rail
  // silently vanished from the one page where an extra item is worth the most.
  const products = useStoreProducts(12);
  const related = useRelatedProducts(seedProductId, { limit: 8 });

  const pool = (related.items.length > 0 ? related.items : products)
    .filter((p) => !inCartIds.has(p.id))
    .slice(0, 4);
  if (pool.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-[var(--vn-border)]" data-testid="storefront-cart-recs">
      <h2 className="vn-heading text-lg md:text-xl mb-5 text-[var(--vn-ink)]">
        <InlineEditable sectionId={sectionId} settingKey="recommendations_title" value={title} />
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-4 md:overflow-visible">
        {pool.map((p) => {
          return (
            <div key={p.id} className="w-40 shrink-0 snap-start md:w-auto">
              <Link to={`/product/${p.slug || p.id}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-muted/30 mb-2.5">
                  {productImage(p) ? (
                    <img
                      {...responsiveImg(productImage(p), PRODUCT_CARD_IMG)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 vn-shimmer" />
                  )}
                  <QuickPreviewButton product={p} locale={locale} />
                </div>
                <h3 className="text-[13px] font-medium text-foreground/90 line-clamp-1">{p.name}</h3>
                <span className="text-sm font-semibold text-foreground">
                  <Money amount={p.variants?.[0]?.price ?? p.price ?? 0} currency={productCurrency(p)} />
                </span>
              </Link>
              {/* Was a second, near-identical quick-add implementation living
                  only in this file — it never gated its ✓ on the write
                  succeeding, and its multi-variant check read a `variants`
                  array the related-products payload doesn't even send. */}
              <QuickAddBar product={p} locale={locale} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A stable empty Set for the empty-bag rail.
 *
 * Module-level on purpose: `CartRecentlyViewed` snapshots this prop with a
 * `useState` initializer, and a fresh `new Set()` per render would be a new
 * identity on every pass.
 */
const EMPTY_ID_SET: Set<string> = new Set();

/**
 * CartRecentlyViewed — the shopper's own browse trail, in the bag (A8).
 *
 * The trail already existed but rendered ONLY on the PDP — the one page where
 * it does least work, because a shopper reading a product page is already
 * engaged. The bag is where it earns: it's the page where someone decides
 * whether they're finished, and until now the only rail here was "You may also
 * like" — an algorithm's guess. This is the shopper's own shortlist, one tap
 * away, which is a far better second-item prompt than a recommendation.
 *
 * Rendered under the recommendations rail on a populated bag, and on the EMPTY
 * bag too, where it turns a dead end into a way back in.
 */
function CartRecentlyViewed({ inCartIds, title, sectionId, locale }: {
  inCartIds: Set<string>;
  title: string;
  sectionId: string;
  locale: string;
}) {
  const entries = useRecentlyViewed();
  // Snapshot the in-cart set ONCE, rather than filtering it live.
  //
  // Live filtering would make a card vanish the instant its own quick-add
  // succeeded: the shopper taps "Add", the ✓ never gets to render, and the
  // thing they just added disappears from under the cursor. The parent only
  // reaches this branch after the cart has settled (it returns early while
  // loading), so the first value is the real one.
  const [excluded] = useState(() => inCartIds);
  const pool = entries.filter((e) => !excluded.has(e.id)).slice(0, 4);
  if (pool.length === 0) return null;

  return (
    <div
      className="mt-12 pt-8 border-t border-[var(--vn-border)]"
      data-testid="storefront-cart-recently-viewed"
    >
      <h2 className="vn-heading text-lg md:text-xl mb-5 text-[var(--vn-ink)]">
        <InlineEditable sectionId={sectionId} settingKey="recently_viewed_title" value={title} />
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-4 md:overflow-visible">
        {pool.map((e) => (
          <div key={e.id} className="w-40 shrink-0 snap-start md:w-auto">
            <Link to={`/product/${e.slug || e.id}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden bg-muted/30 mb-2.5">
                {e.image ? (
                  <img
                    {...responsiveImg(e.image, PRODUCT_CARD_IMG)}
                    alt={e.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 vn-shimmer" />
                )}
                <QuickPreviewButton target={{ id: e.id, name: e.name, slug: e.slug, image: e.image }} locale={locale} />
              </div>
              <h3 className="text-[13px] font-medium text-foreground/90 line-clamp-1">{e.name}</h3>
              <span className="text-sm font-semibold text-foreground">
                <Money amount={e.price} currency={e.currency} />
              </span>
            </Link>
            {/* The entry carries the variant it was viewed with, so this adds
                without the resolve roundtrip the grids need. */}
            <QuickAddBar target={entryTarget(e)} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}
