"use client";

import {
  Link,
  Money,
  useCart,
  useLocale,
  useResolvedSettings,
  type CartItem,
} from "@numueg/theme-sdk";
import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * emp-cart — the cart template body, ported from V2 EmpCartPage. One
 * component handles both the empty state (centered amber bag + CTA) and
 * the populated state (line items with qty steppers + remove, plus a
 * sticky summary card with subtotal / shipping / total and a checkout
 * CTA). Shipping mirrors the storefront rule: flat fee, free over a
 * threshold (both merchant-editable).
 */
export default function EmpCart({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { cart, updateQuantity, removeItem, loading } = useCart();
  const locale = useLocale();

  const emptyHeadline = asString(s.empty_headline) || localized(locale, "YOUR CART IS EMPTY", "سلتك فاضية");
  const emptySubhead =
    asString(s.empty_subhead) ||
    localized(locale, "Looks like you haven't added anything yet. Let's fix that.", "يبدو إنك لسه مضفتش حاجة. تعالى نظبط ده.");
  const emptyCta = asString(s.empty_cta_label) || localized(locale, "CONTINUE SHOPPING", "كمّل تسوّق");
  const emptyCtaHref = asString(s.empty_cta_href) || "/products";

  const populatedTitle = asString(s.populated_title) || localized(locale, "YOUR CART", "سلتك");
  const checkoutCta = asString(s.checkout_cta_label) || localized(locale, "CHECKOUT", "إتمام الشراء");
  const continueLabel = asString(s.continue_label) || localized(locale, "CONTINUE SHOPPING", "كمّل تسوّق");
  const subtotalLabel = asString(s.subtotal_label) || localized(locale, "SUBTOTAL", "الإجمالي الفرعي");
  const shippingLabel = asString(s.shipping_label) || localized(locale, "SHIPPING", "الشحن");
  const totalLabel = asString(s.total_label) || localized(locale, "TOTAL", "الإجمالي");
  const freeLabel = asString(s.free_label) || localized(locale, "FREE", "مجاني");

  const shippingFlat = asNumber(s.shipping_flat, 50);
  const freeThreshold = asNumber(s.free_shipping_threshold, 500);

  const items: CartItem[] = cart?.items ?? [];
  const currency = cart?.currency;
  const isEmpty = items.length === 0;
  const totalItems = items.reduce((n, it) => n + it.quantity, 0);

  if (isEmpty) {
    return (
      <section
        className="min-h-[70vh] bg-[var(--emp-cream)] flex items-center justify-center"
        data-emp-section={sectionId}
      >
        <div className="text-center px-6 py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--emp-amber)]/15 flex items-center justify-center">
            <ShoppingBag size={26} className="text-[var(--emp-amber)]" aria-hidden="true" />
          </div>
          <h1 className="emp-heading text-4xl md:text-5xl text-[var(--emp-dark)] mb-6">
            <InlineEditable
              sectionId={sectionId}
              settingKey="empty_headline"
              value={emptyHeadline}
            />
          </h1>
          <p className="text-sm text-[var(--emp-gray)] mb-8 max-w-sm mx-auto">
            <InlineEditable
              sectionId={sectionId}
              settingKey="empty_subhead"
              value={emptySubhead}
              multiline
            />
          </p>
          <Link
            to={emptyCtaHref}
            className="emp-btn emp-btn-filled inline-flex items-center gap-2 px-8 py-3 text-xs"
          >
            <InlineEditable
              sectionId={sectionId}
              settingKey="empty_cta_label"
              value={emptyCta}
            />
            <ArrowRight size={12} aria-hidden="true" className="rtl:-scale-x-100" />
          </Link>
        </div>
      </section>
    );
  }

  const subtotal = cart?.subtotal ?? 0;
  const shippingCost = subtotal >= freeThreshold ? 0 : shippingFlat;
  const remainingForFree = Math.max(freeThreshold - subtotal, 0);
  const grandTotal = subtotal + shippingCost;

  return (
    <section
      className="min-h-[70vh] bg-[var(--emp-cream)]"
      data-emp-section={sectionId}
    >
      <div className="container mx-auto px-4 py-12 md:py-16">
        <h1 className="emp-heading text-4xl md:text-6xl text-[var(--emp-dark)] mb-8 md:mb-10">
          <InlineEditable
            sectionId={sectionId}
            settingKey="populated_title"
            value={populatedTitle}
          />{" "}
          ({totalItems})
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex gap-5 p-5 rounded-2xl bg-white/60 border border-[var(--emp-dark)]/10"
              >
                <div className="shrink-0">
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="w-28 h-32 sm:w-32 sm:h-40 rounded-xl object-cover bg-[var(--emp-cream)]"
                    />
                  ) : (
                    <div className="w-28 h-32 sm:w-32 sm:h-40 rounded-xl bg-[var(--emp-cream)] flex items-center justify-center">
                      <ShoppingBag size={28} className="text-[var(--emp-dark)]/20" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="emp-heading text-lg md:text-xl text-[var(--emp-dark)] truncate">
                    {it.name}
                  </h3>
                  {it.variant_name && (
                    <p className="emp-label text-[var(--emp-gray)] mt-1.5">
                      {it.variant_name}
                    </p>
                  )}
                  <p className="emp-heading text-lg text-[var(--emp-dark)] mt-2">
                    <Money amount={it.price * it.quantity} currency={currency} />
                  </p>
                  <div className="flex items-end justify-between mt-auto pt-3">
                    <div className="flex items-center rounded-full border border-[var(--emp-dark)]/15 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateQuantity(it.id, it.quantity - 1)}
                        disabled={loading}
                        aria-label="Decrease quantity"
                        className="w-9 h-9 flex items-center justify-center text-[var(--emp-dark)]/60 hover:text-[var(--emp-amber)] transition-colors disabled:opacity-40"
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <span className="text-sm font-bold w-8 text-center text-[var(--emp-dark)]">
                        {it.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(it.id, it.quantity + 1)}
                        disabled={loading}
                        aria-label="Increase quantity"
                        className="w-9 h-9 flex items-center justify-center text-[var(--emp-dark)]/60 hover:text-[var(--emp-amber)] transition-colors disabled:opacity-40"
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      disabled={loading}
                      aria-label="Remove item"
                      className="w-8 h-8 flex items-center justify-center text-[var(--emp-dark)]/40 hover:text-[var(--emp-dark)] transition-colors disabled:opacity-40"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div>
            <div className="sticky top-24 rounded-2xl bg-white p-6 border border-[var(--emp-dark)]/10">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[var(--emp-dark)]">
                  <span className="text-[var(--emp-gray)]">{subtotalLabel}</span>
                  <span className="font-bold">
                    <Money amount={subtotal} currency={currency} />
                  </span>
                </div>
                <div className="flex justify-between text-[var(--emp-dark)]">
                  <span className="text-[var(--emp-gray)]">{shippingLabel}</span>
                  <span className="font-bold">
                    {shippingCost === 0 ? (
                      freeLabel
                    ) : (
                      <Money amount={shippingCost} currency={currency} />
                    )}
                  </span>
                </div>
                {shippingCost > 0 && remainingForFree > 0 && (
                  <p className="text-xs text-[var(--emp-amber)] font-medium">
                    {localized(locale, "Add ", "ضيف ")}
                    <Money amount={remainingForFree} currency={currency} />
                    {localized(locale, " more for free shipping", " كمان للحصول على شحن مجاني")}
                  </p>
                )}
                <div className="flex justify-between pt-3 border-t border-[var(--emp-dark)]/10">
                  <span className="emp-heading text-base text-[var(--emp-dark)]">
                    {totalLabel}
                  </span>
                  <span className="emp-heading text-xl text-[var(--emp-dark)]">
                    <Money amount={grandTotal} currency={currency} />
                  </span>
                </div>
              </div>
              <Link
                to="/checkout"
                className="emp-btn emp-btn-filled w-full rounded-full mt-6 py-3.5 text-center text-xs flex items-center justify-center gap-2"
              >
                <InlineEditable
                  sectionId={sectionId}
                  settingKey="checkout_cta_label"
                  value={checkoutCta}
                />
                <ArrowRight size={12} aria-hidden="true" className="rtl:-scale-x-100" />
              </Link>
              <Link
                to="/products"
                className="mt-3 block text-center emp-label text-[var(--emp-dark)]/60 hover:text-[var(--emp-amber)] transition-colors"
              >
                <InlineEditable
                  sectionId={sectionId}
                  settingKey="continue_label"
                  value={continueLabel}
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
