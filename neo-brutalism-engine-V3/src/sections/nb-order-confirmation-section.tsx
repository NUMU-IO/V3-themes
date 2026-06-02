"use client";
import { useState } from "react";
import { Link, Money, useOrders } from "@numueg/theme-sdk";
import { Check, Copy, Package, ArrowLeft, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Neo-brutalism order-confirmation section.
 *
 * Uses neo-brutalism's design tokens + the vn-* utility block (mapped in
 * theme.css) so it matches the rest of the theme.
 *
 * Data: reads the customer's most-recent order from the SDK's `useOrders()`
 * hook (the just-placed order on a real storefront). When no order is available
 * (anonymous visitor, editor preview, or no orders yet) we still render the full
 * static layout with placeholder values and gracefully omit the total — we never
 * crash and never redirect away.
 */
export default function NBOrderConfirmationSection({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};

  const showProgress = s.show_progress ?? true;
  const showWhatsApp = s.show_whatsapp ?? true;
  const showTrackOrder = s.show_track_order ?? true;
  const showEmoji = s.show_emoji ?? false;

  const title = asString(s.title) || "Order confirmed";
  const subtitle =
    asString(s.subtitle) ||
    "Thank you for your order. We'll send you the order details via WhatsApp.";
  const continueText = asString(s.continue_shopping_text) || "Continue shopping";
  const continueLink = asString(s.continue_shopping_link) || "/";

  // Most-recent order = the one the customer just placed. `useOrders()` is
  // gated on the logged-in customer; anonymous visitors / editor preview get
  // an empty list, so `order` is undefined and we fall back to placeholders.
  const { orders } = useOrders();
  const order = orders?.[0];
  const orderNumber = order?.order_number ?? "NUM-000000";
  const total = order?.total;
  const currency = order?.currency;

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = ["Order Placed", "Processing", "On the Way", "Delivered"];

  return (
    <div
      className={
        "bg-background min-h-[60vh] flex items-start justify-center " +
        "px-4 py-10 sm:px-6 sm:py-14 md:py-16 lg:py-20"
      }
    >
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl text-center">
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
        >
          <div
            className={
              "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full nb-img-frame " +
              "flex items-center justify-center mx-auto mb-5 sm:mb-6 md:mb-7 " +
              "bg-primary text-[var(--vn-ink)]"
            }
          >
            <Check size={28} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Title */}
          <span className="nb-badge inline-block mb-3 px-3 py-1 rounded text-[10px] sm:text-[11px]">
            ORDER CONFIRMED
          </span>
          <h1 className="vn-heading text-2xl sm:text-3xl md:text-4xl text-[var(--vn-ink)] mb-2 sm:mb-3 leading-tight">
            {title}{showEmoji ? " 🎉" : ""}
          </h1>
          <p className="text-sm sm:text-[15px] text-[var(--vn-muted)] mb-7 sm:mb-9 max-w-md mx-auto leading-relaxed font-medium">
            {subtitle}
          </p>

          {/* Order detail card */}
          <div className="nb-card rounded-lg p-4 sm:p-5 md:p-6 mb-6 sm:mb-7 text-start">
            <div className="space-y-4 text-sm">
              {/* Order number */}
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-[var(--vn-muted)]">Order Number</span>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-sm sm:text-base text-[var(--vn-ink)] font-black tracking-wider"
                    dir="ltr"
                  >
                    {orderNumber}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md transition-colors hover:bg-[var(--vn-band)] active:scale-95"
                    title="Copy"
                  >
                    {copied ? (
                      <Check size={14} className="text-[var(--vn-ink)]" />
                    ) : (
                      <Copy size={14} className="text-[var(--vn-muted)]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Total — only when we have a real order total. */}
              {typeof total === "number" && total > 0 && (
                <>
                  <div className="h-px bg-[var(--vn-border)]" />
                  <div className="flex justify-between">
                    <span className="text-xs sm:text-sm text-[var(--vn-muted)]">Total</span>
                    <span className="text-xs sm:text-sm font-black text-[var(--vn-ink)]">
                      <Money amount={total} currency={currency} />
                    </span>
                  </div>
                </>
              )}

              {/* Delivery */}
              <div className="h-px bg-[var(--vn-border)]" />
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-[var(--vn-muted)]">Estimated Delivery</span>
                <span className="text-xs sm:text-sm font-black text-[var(--vn-ink)]">3-5 business days</span>
              </div>

              {/* Status */}
              <div className="flex justify-between">
                <span className="text-xs sm:text-sm text-[var(--vn-muted)]">Status</span>
                <span className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-[var(--vn-ink)]">
                  <Package size={14} /> Processing
                </span>
              </div>
            </div>

            {/* Progress tracker */}
            {showProgress && (
              <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t-[3px] border-[var(--vn-border)]">
                <div className="flex items-center justify-between">
                  {steps.map((step, i) => (
                    <div key={i} className="flex flex-col items-center flex-1">
                      <div
                        className={
                          i <= 1
                            ? "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-black mb-1.5 bg-primary text-[var(--vn-ink)] border-[2px] border-foreground"
                            : "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-black mb-1.5 bg-card text-[var(--vn-muted)] border-[2px] border-[var(--vn-border)]"
                        }
                      >
                        {i <= 1 ? <Check size={10} /> : i + 1}
                      </div>
                      <span className="text-[9px] sm:text-[10px] vn-label text-[var(--vn-muted)] text-center px-1">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex mt-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={
                        i < 1
                          ? "flex-1 h-1 mx-1 sm:mx-1.5 bg-[var(--vn-ink)]"
                          : "flex-1 h-1 mx-1 sm:mx-1.5 bg-[var(--vn-border)]"
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp card */}
          {showWhatsApp && (
            <div className="nb-card rounded-lg p-4 sm:p-5 mb-6 sm:mb-7 text-start">
              <div className="flex items-center gap-2 mb-2.5 sm:mb-3 vn-label text-[10px] sm:text-[11px]">
                <MessageCircle size={16} className="text-whatsapp" />
                <span className="text-sm font-black text-whatsapp">WhatsApp Message</span>
              </div>
              <div className="bg-[var(--vn-band)] rounded-md p-3 sm:p-4 text-xs sm:text-sm text-[var(--vn-ink)] leading-relaxed border-[2px] border-foreground">
                <p>Hello! 👋</p>
                <p className="mt-1">
                  Your order{" "}
                  <strong className="font-black text-[var(--vn-ink)]">{orderNumber}</strong> has been received successfully.
                </p>
                {typeof total === "number" && total > 0 && (
                  <p className="mt-1">
                    Total: <strong><Money amount={total} currency={currency} /></strong>
                  </p>
                )}
                <p className="mt-1">We'll deliver it within 3-5 business days. If you have any questions, contact us here.</p>
                <p className="mt-1">Thank you for shopping with us ❤️</p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            {showTrackOrder && (
              <Link
                to={`/track?tn=${orderNumber}`}
                className={
                  "vn-btn vn-btn-outline-dark flex-1 inline-flex items-center justify-center gap-2 " +
                  "py-3 sm:py-3.5 text-xs sm:text-sm"
                }
              >
                <Package size={18} /> Track Order
              </Link>
            )}
            <Link
              to={continueLink}
              className={
                "vn-btn vn-btn-filled flex-1 inline-flex items-center justify-center gap-2 " +
                "py-3 sm:py-3.5 text-xs sm:text-sm rtl:[&>svg]:rotate-180"
              }
            >
              {continueText} <ArrowLeft size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
