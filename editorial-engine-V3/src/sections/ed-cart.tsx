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
import { ArrowRight, Check, Minus, Plus, ShoppingBag, Tag, Truck, X } from "lucide-react";
import { asNumber, asString, localized, productCurrency, productImage, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { bestCartNudge, useActivePromotions } from "./_promotions";

/**
 * ed-cart — the cart template body.
 *
 * Manshet shipped only a header+footer stub `cart` template (no body section),
 * so the cart page rendered blank between the chrome. This is the missing body:
 * the grayscale-and-gold editorial cart, in Manshet's `vn-*` design language —
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
export default function ManshetCart({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { cart, updateQuantity, removeItem, loading } = useCart();
  const locale = useLocale();
  // A3 — active promotions (auto-discount offers). Hook must run before the
  // loading/empty early returns (rules of hooks).
  const promos = useActivePromotions("/cart", locale);

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
    localized(locale, "Nothing here yet. Let's find something you'll love.", "لسه مفيش حاجة هنا. تعالى نلاقي حاجة تعجبك.");
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
        className="bg-background min-h-[70vh] flex items-center justify-center"
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
      </section>
    );
  }

  // ── Populated state ──────────────────────────────────────────────────────
  const subtotal = demoMode
    ? demoItems.reduce((n, it) => n + it.price * it.quantity, 0)
    : cart?.subtotal ?? 0;
  const freeShipEarned = freeThreshold > 0 && subtotal >= freeThreshold;
  const remainingForFree = freeThreshold > 0 ? Math.max(freeThreshold - subtotal, 0) : 0;
  const grandTotal = subtotal;
  // A3 — best offer nudge from the store's auto-discount promotions. Skips
  // free-shipping-kind rules when the theme's own bar (A1) already tells that
  // story, so the customer never reads the same promise twice.
  const promoNudge = showPromoNudge
    ? bestCartNudge(promos?.auto_discounts, subtotal, currency || "EGP", locale, freeThreshold > 0)
    : null;

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
              "Sample items so you can style this page. Customers see their real bag.",
              "منتجات تجريبية علشان تظبط شكل الصفحة، عملاؤك هيشوفوا سلتهم الحقيقية.",
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

        {/* A3 — offer nudge ("Add X more to unlock Y% off"). Same mechanic as
            the free-shipping bar but for the merchant's configured discounts;
            these offers previously existed in the platform yet were never
            shown to the customer, so they couldn't change behavior. */}
        {promoNudge && (
          <div
            className="mb-8 border border-[var(--vn-border)] p-4"
            data-testid="storefront-cart-promo-nudge"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <Tag size={15} aria-hidden="true" className="shrink-0 text-[var(--vn-ink)]" />
              <span className={promoNudge.unlocked ? "font-medium text-[var(--vn-ink)]" : "text-[var(--vn-ink)]"}>
                {promoNudge.message}
              </span>
            </div>
            {promoNudge.progressPct !== null && (
              <div className="mt-3 h-1.5 rounded-full bg-[var(--vn-border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--vn-ink)] transition-[width] duration-500 ease-out"
                  style={{ width: `${promoNudge.progressPct}%` }}
                />
              </div>
            )}
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
                      src={it.image_url}
                      alt={it.name}
                      className="w-24 h-28 sm:w-28 sm:h-36 object-cover bg-[var(--vn-band)]"
                      loading="lazy"
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
      </div>
    </section>
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
  const { products } = useProducts();
  const related = useRelatedProducts(seedProductId, { limit: 8 });
  const { addItem } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const pool = (related.items.length > 0 ? related.items : products)
    .filter((p) => !inCartIds.has(p.id))
    .slice(0, 4);
  if (pool.length === 0) return null;

  const quickAdd = async (p: Product) => {
    if (addingId) return;
    setAddingId(p.id);
    try {
      await addItem(p.id, p.variants?.[0]?.id, 1);
      setAddedId(p.id);
      setTimeout(() => setAddedId(null), 2000);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-[var(--vn-border)]" data-testid="storefront-cart-recs">
      <h2 className="vn-heading text-lg md:text-xl mb-5 text-[var(--vn-ink)]">
        <InlineEditable sectionId={sectionId} settingKey="recommendations_title" value={title} />
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x md:grid md:grid-cols-4 md:overflow-visible">
        {pool.map((p) => {
          const multiVariant = (p.variants?.length ?? 0) > 1;
          const busy = addingId === p.id;
          const done = addedId === p.id;
          return (
            <div key={p.id} className="w-40 shrink-0 snap-start md:w-auto">
              <Link to={`/product/${p.slug || p.id}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-muted/30 mb-2.5">
                  {productImage(p) ? (
                    <img
                      src={productImage(p)}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 vn-shimmer" />
                  )}
                </div>
                <h3 className="text-[13px] font-medium text-foreground/90 line-clamp-1">{p.name}</h3>
                <span className="text-sm font-semibold text-foreground">
                  <Money amount={p.variants?.[0]?.price ?? p.price ?? 0} currency={productCurrency(p)} />
                </span>
              </Link>
              {multiVariant ? (
                <Link
                  to={`/product/${p.slug || p.id}`}
                  className="vn-btn vn-btn-outline-dark w-full mt-2.5 !h-9 text-[10px]"
                >
                  {localized(locale, "Choose options", "اختاري المقاس/اللون")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => quickAdd(p)}
                  disabled={busy}
                  className="vn-btn vn-btn-outline-dark w-full mt-2.5 !h-9 text-[10px] disabled:opacity-50"
                  data-testid="storefront-cart-recs-add"
                >
                  {done ? (
                    <>
                      <Check size={12} /> {localized(locale, "Added", "اتضافت")}
                    </>
                  ) : busy ? (
                    localized(locale, "Adding…", "بنضيف…")
                  ) : (
                    <>
                      <Plus size={12} /> {localized(locale, "Add", "أضيفي")}
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
