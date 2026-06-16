"use client";
import { useState } from "react";
import { Link, Money, useOrders, useLocale } from "@numueg/theme-sdk";
import { Check, Copy, Package, ArrowLeft, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { asString, localized, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal order-confirmation section.
 *
 * Ported from the proven Vionne V3 order-confirmation (success icon, order
 * detail card, optional progress tracker / WhatsApp card, track + continue
 * CTAs) and re-skinned to luxury-minimal: sharp edges, near-black ink,
 * uppercase tracked labels, hairline borders. The V2 LuxOrderConfirmationSection
 * defaults (show_progress / show_whatsapp / show_track_order / show_emoji all
 * OFF) are honoured.
 *
 * Data: most-recent order from `useOrders()` (the just-placed order). When no
 * order is available (anonymous / editor preview) the full static layout still
 * renders with placeholder values, gracefully omitting the total — never blank,
 * never redirects away.
 */
export default function LuxOrderConfirmationSection({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};

  const showProgress = s.show_progress ?? false;
  const showWhatsApp = s.show_whatsapp ?? false;
  const showTrackOrder = s.show_track_order ?? false;
  const showEmoji = s.show_emoji ?? false;
  const locale = useLocale();

  const title = asString(s.title) || localized(locale, "Order Confirmed", "تم تأكيد الطلب");
  const subtitle =
    asString(s.subtitle) ||
    localized(
      locale,
      "Thank you for your order. We'll send you the order details over WhatsApp.",
      "شكراً لطلبك. سنرسل لك تفاصيل الطلب عبر واتساب.",
    );
  const continueText = asString(s.continue_shopping_text) || localized(locale, "Continue shopping", "متابعة التسوق");
  const continueLink = asString(s.continue_shopping_link) || "/";

  const { orders } = useOrders();
  const order = orders?.[0];
  const orderNumber = order?.order_number ?? "NUM-000000";
  // order.total is integer CENTS (useOrders doesn't normalize it, unlike
  // useCart); <Money> expects MAJOR units — divide by 100 to avoid a 100× total.
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
    localized(locale, "Ordered", "تم الطلب"),
    localized(locale, "Processing", "قيد التجهيز"),
    localized(locale, "On the way", "في الطريق"),
    localized(locale, "Delivered", "تم التوصيل"),
  ];

  return (
    <div className="bg-background min-h-[60vh] flex items-start justify-center px-4 py-10 sm:px-6 sm:py-14 md:py-20">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl text-center">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
        >
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-8 border border-foreground">
            <Check size={28} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {/* Title */}
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">{localized(locale, "Thank you for your order", "شكراً لطلبك")}</p>
          <h1 className="lux-heading text-xl mb-8 text-foreground leading-tight">
            {title}{showEmoji ? " 🎉" : ""}
          </h1>
          <p className="text-sm text-muted-foreground mb-9 max-w-md mx-auto leading-relaxed">{subtitle}</p>

          {/* Order detail card */}
          <div className="border border-border p-6 mb-8 text-right">
            <div className="space-y-4 text-sm">
              {/* Order number */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{localized(locale, "Order number", "رقم الطلب")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground" dir="ltr">
                    {orderNumber}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:opacity-50 transition-opacity"
                    title={localized(locale, "Copy", "نسخ")}
                  >
                    {copied ? (
                      <Check size={12} className="text-[hsl(var(--success))]" />
                    ) : (
                      <Copy size={12} className="text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Total */}
              {typeof total === "number" && total > 0 && (
                <>
                  <div className="lux-separator" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">{localized(locale, "Total", "الإجمالي")}</span>
                    <span className="text-xs text-foreground">
                      <Money amount={total} currency={currency} />
                    </span>
                  </div>
                </>
              )}

              {/* Delivery */}
              <div className="lux-separator" />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">{localized(locale, "Estimated delivery", "التوصيل المتوقع")}</span>
                <span className="text-xs text-foreground">{localized(locale, "3-5 business days", "3-5 أيام عمل")}</span>
              </div>

              {/* Status */}
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">{localized(locale, "Status", "الحالة")}</span>
                <span className="flex items-center gap-1.5 text-xs text-foreground">
                  <Package size={14} /> {localized(locale, "Processing", "قيد التجهيز")}
                </span>
              </div>
            </div>

            {/* Progress tracker */}
            {showProgress && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center justify-between">
                  {steps.map((step, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div
                        className={
                          i <= 1
                            ? "w-7 h-7 flex items-center justify-center text-[10px] font-medium mb-1.5 bg-foreground text-background"
                            : "w-7 h-7 flex items-center justify-center text-[10px] font-medium mb-1.5 bg-background text-muted-foreground border border-border"
                        }
                      >
                        {i <= 1 ? <Check size={10} /> : i + 1}
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground text-center px-1">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp card */}
          {showWhatsApp && (
            <div className="border border-border p-5 mb-8 text-start">
              <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-[0.2em]">
                <MessageCircle size={16} className="text-[hsl(var(--whatsapp))]" />
                <span className="text-sm font-medium text-[hsl(var(--whatsapp))]">{localized(locale, "WhatsApp message", "رسالة واتساب")}</span>
              </div>
              <div className="bg-[hsl(var(--lux-gray))] p-4 text-xs text-foreground leading-relaxed">
                <p>{localized(locale, "Hello! 👋", "مرحباً! 👋")}</p>
                <p className="mt-1">
                  {localized(locale, "Your order", "تم استلام طلبك")}{" "}
                  <strong className="font-semibold text-foreground">{orderNumber}</strong> {localized(locale, "was placed successfully.", "بنجاح.")}
                </p>
                {typeof total === "number" && total > 0 && (
                  <p className="mt-1">
                    {localized(locale, "Total", "الإجمالي")}: <strong><Money amount={total} currency={currency} /></strong>
                  </p>
                )}
                <p className="mt-1">{localized(locale, "We'll deliver it within 3-5 business days. For any questions, reach out to us here.", "سنوصله خلال 3-5 أيام عمل. لأي استفسار، تواصل معنا هنا.")}</p>
                <p className="mt-1">{localized(locale, "Thank you for shopping with us ❤️", "شكراً لتسوقك معنا ❤️")}</p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showTrackOrder && (
              <Link
                to={`/track?tn=${orderNumber}`}
                className="lux-btn-outline-dark flex-1 inline-flex items-center justify-center gap-2"
              >
                <Package size={18} /> {localized(locale, "Track order", "تتبع الطلب")}
              </Link>
            )}
            <Link
              to={continueLink}
              className="inline-flex items-center gap-2 lux-btn justify-center"
            >
              {continueText} <ArrowLeft size={12} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
