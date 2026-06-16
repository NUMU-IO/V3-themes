"use client";

import { useState } from "react";
import { Link, Money, useOrders, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { ArrowRight, Check, Copy, MessageCircle, Package } from "lucide-react";
import { motion } from "framer-motion";
import { asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * emp-order-confirmation — the post-checkout thank-you page body, in the
 * Empire LIGHT editorial idiom (off-white page, white cards, black
 * `font-black uppercase` headings, electric-blue #0099FF accents, BLACK
 * rounded-full CTAs).
 *
 * Ported from the proven luxury-minimal order-confirmation (success icon,
 * order detail card, optional progress tracker / WhatsApp card / track +
 * continue CTAs) and re-skinned to Empire. All four display toggles
 * (show_emoji / show_progress / show_whatsapp / show_track_order) default
 * OFF, matching the reference.
 *
 * Data: most-recent order from `useOrders()` (the just-placed order). When
 * no order is available (anonymous visitor, editor preview, or a direct
 * visit outside the checkout flow) the full static layout still renders
 * with a placeholder order number, gracefully omitting the total — it
 * NEVER blanks out and NEVER redirects away.
 */
export default function EmpOrderConfirmation({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();

  const showEmoji = s.show_emoji ?? false;
  const showProgress = s.show_progress ?? false;
  const showWhatsApp = s.show_whatsapp ?? false;
  const showTrackOrder = s.show_track_order ?? false;

  const title = asString(s.title) || localized(locale, "ORDER CONFIRMED", "تم تأكيد الطلب");
  const subtitle =
    asString(s.subtitle) ||
    localized(
      locale,
      "Thank you for your order. We'll send you the order details over WhatsApp.",
      "شكراً لطلبك. هنبعتلك تفاصيل الأوردر على واتساب.",
    );
  const continueText = asString(s.continue_shopping_text) || localized(locale, "CONTINUE SHOPPING", "كمّل تسوّق");
  const continueLink = asString(s.continue_shopping_link) || "/products";

  const { orders } = useOrders();
  const order = orders?.[0];
  const orderNumber = order?.order_number ?? "NUM-000000";
  // useOrders() returns the raw server payload — order.total is in integer
  // CENTS and is NOT normalized to major units (unlike useCart()). Divide by
  // 100 before handing it to <Money>, which formats the number as-is.
  const total = typeof order?.total === "number" ? order.total / 100 : undefined;
  const currency = order?.currency;

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    localized(locale, "Ordered", "اتطلب"),
    localized(locale, "Processing", "بيتجهّز"),
    localized(locale, "On the way", "في الطريق"),
    localized(locale, "Delivered", "اتسلّم"),
  ];

  return (
    <section
      className="bg-[hsl(var(--background))] min-h-[70vh] flex items-start justify-center px-4 py-12 sm:px-6 md:py-20"
      data-emp-section={sectionId}
    >
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl text-center">
        {/* Success icon — black ring, electric-blue check (Empire accent) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
        >
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-8 rounded-full bg-black">
            <Check size={28} className="text-[hsl(var(--emp-blue))]" aria-hidden="true" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {/* Eyebrow + title */}
          <p className="emp-label mb-3">{localized(locale, "Thank you for your order", "شكراً لطلبك")}</p>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground leading-tight mb-6">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
            {showEmoji ? " 🎉" : ""}
          </h1>
          <p className="text-sm text-muted-foreground mb-9 max-w-md mx-auto leading-relaxed">
            <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
          </p>

          {/* Order detail card — white, hairline border, start-aligned rows */}
          <div className="rounded-lg bg-white border border-[hsl(var(--border))] p-6 mb-8 text-start">
            <div className="space-y-4 text-sm">
              {/* Order number */}
              <div className="flex justify-between items-center gap-3">
                <span className="emp-label">{localized(locale, "Order number", "رقم الأوردر")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground" dir="ltr">
                    {orderNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 text-muted-foreground hover:text-[hsl(var(--emp-blue))] transition-colors"
                    aria-label={localized(locale, "Copy order number", "انسخ رقم الأوردر")}
                  >
                    {copied ? (
                      <Check size={14} className="text-[hsl(var(--success))]" aria-hidden="true" />
                    ) : (
                      <Copy size={14} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Total */}
              {typeof total === "number" && total > 0 && (
                <>
                  <div className="emp-separator" />
                  <div className="flex justify-between items-center gap-3">
                    <span className="emp-label">{localized(locale, "Total", "الإجمالي")}</span>
                    <span className="text-sm font-bold text-foreground">
                      <Money amount={total} currency={currency} />
                    </span>
                  </div>
                </>
              )}

              {/* Estimated delivery */}
              <div className="emp-separator" />
              <div className="flex justify-between items-center gap-3">
                <span className="emp-label">{localized(locale, "Estimated delivery", "موعد التوصيل")}</span>
                <span className="text-sm font-medium text-foreground">
                  {localized(locale, "3-5 business days", "3-5 أيام عمل")}
                </span>
              </div>

              {/* Status */}
              <div className="flex justify-between items-center gap-3">
                <span className="emp-label">{localized(locale, "Status", "الحالة")}</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Package size={16} className="text-[hsl(var(--emp-blue))]" aria-hidden="true" />
                  {localized(locale, "Processing", "بيتجهّز")}
                </span>
              </div>
            </div>

            {/* Progress tracker */}
            {showProgress && (
              <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
                <div className="flex items-start justify-between">
                  {steps.map((step, i) => (
                    <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
                      <div
                        className={
                          i <= 1
                            ? "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-full bg-black text-white"
                            : "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-full bg-transparent text-muted-foreground border border-[hsl(var(--border))]"
                        }
                      >
                        {i <= 1 ? <Check size={12} aria-hidden="true" /> : i + 1}
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground text-center px-1">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp preview card */}
          {showWhatsApp && (
            <div className="rounded-lg bg-white border border-[hsl(var(--border))] p-5 mb-8 text-start">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={18} className="text-[hsl(var(--whatsapp))]" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--whatsapp))]">
                  {localized(locale, "WhatsApp message", "رسالة واتساب")}
                </span>
              </div>
              <div className="rounded-md bg-secondary p-4 text-xs text-foreground leading-relaxed space-y-1">
                <p>{localized(locale, "Hello! 👋", "أهلاً! 👋")}</p>
                <p>
                  {localized(locale, "Your order", "أوردرك")}{" "}
                  <strong className="font-bold" dir="ltr">{orderNumber}</strong>{" "}
                  {localized(locale, "was placed successfully.", "اتسجّل بنجاح.")}
                </p>
                {typeof total === "number" && total > 0 && (
                  <p>
                    {localized(locale, "Total", "الإجمالي")}:{" "}
                    <strong className="font-bold">
                      <Money amount={total} currency={currency} />
                    </strong>
                  </p>
                )}
                <p>
                  {localized(
                    locale,
                    "We'll deliver it within 3-5 business days. For any questions, reach out to us here.",
                    "هنوصّله خلال 3-5 أيام عمل. لو عندك أي سؤال، كلّمنا هنا.",
                  )}
                </p>
                <p>{localized(locale, "Thank you for shopping with us ❤️", "شكراً لتسوّقك معانا ❤️")}</p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showTrackOrder && (
              <Link
                to={`/track?tn=${orderNumber}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-[hsl(var(--border))] text-foreground text-xs font-semibold uppercase tracking-wider rounded-full hover:border-black transition-colors"
              >
                <Package size={16} aria-hidden="true" />
                {localized(locale, "Track order", "تتبّع الأوردر")}
              </Link>
            )}
            <Link
              to={continueLink}
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors"
            >
              <InlineEditable sectionId={sectionId} settingKey="continue_shopping_text" value={continueText} />
              <ArrowRight size={12} aria-hidden="true" className="rtl:-scale-x-100" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
