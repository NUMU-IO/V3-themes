"use client";
import { useState } from "react";
import { useLocale } from "@numueg/theme-sdk";
import { asString, localized, type SectionRenderProps } from "./_shared";

/**
 * Luxury Minimal newsletter — faithful port of the V2 LuxNewsletter (centered
 * eyebrow + heading + inline email field & button). V2 className strings kept
 * verbatim. The V2 `useNewsletterSubmit` hook isn't available in the V3 bundle,
 * so submission is handled with local state (no API persistence — matches the
 * other V3 ports).
 */
export default function LuxNewsletter({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const title = asString(s.title) || localized(locale, "Subscribe to Our Newsletter", "اشترك في نشرتنا");
  const subtitle = asString(s.subtitle) || localized(locale, "Be the first to know", "كن أول من يعرف");
  const buttonText = asString(s.button_text) || localized(locale, "Subscribe", "اشترك");
  const placeholder = asString(s.placeholder) || localized(locale, "Email address", "البريد الإلكتروني");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 text-center max-w-md">
        {title && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
            {title}
          </p>
        )}
        {subtitle && <h2 className="lux-heading text-xl mb-4">{subtitle}</h2>}
        <div className="flex gap-2">
          <input
            type="email"
            placeholder={placeholder}
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="flex-1 h-11 px-4 text-xs lux-input"
          />
          {buttonText && (
            <button onClick={handleSubmit} className="px-6 h-11 lux-btn">
              {submitted ? localized(locale, "Subscribed", "تم الاشتراك") : buttonText}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
