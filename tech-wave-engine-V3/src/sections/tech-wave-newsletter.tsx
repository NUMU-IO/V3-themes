"use client";
import { useState } from "react";
import { asString, type SectionRenderProps } from "./_shared";

/**
 * Tech Wave newsletter — faithful port of the V2 in-tree
 * numu-egyptian-bazaar/src/themes/tech-wave/sections/newsletter/TechWaveNewsletter.tsx
 * (centered neon signup with glass input + neon button), re-plumbed on the
 * V3 SDK.
 *
 * V2 used the bazaar `useNewsletterSubmit` hook (not part of the V3 SDK), so
 * email capture is handled locally with a submitted acknowledgement — the
 * markup and styling match the original.
 */
const TechWaveNewsletter = ({ instance }: SectionRenderProps) => {
  const s = instance.settings ?? {};
  const title = asString(s.title) || "اشترك في نشرتنا \u{1F4EC}";
  const subtitle =
    asString(s.subtitle) || "اعرف أول واحد عن العروض والمنتجات الجديدة";
  const buttonText = asString(s.button_text) || "اشترك";
  const placeholder = asString(s.placeholder) || "البريد الإلكتروني";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-2 text-[hsl(var(--foreground))]">
            {title}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            {subtitle}
          </p>
          {submitted ? (
            <p className="text-sm font-bold tw-neon-text py-3">
              شكراً لاشتراكك! ✨
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder={placeholder}
                dir="ltr"
                className="flex-1 h-12 px-4 rounded-xl tw-inset text-sm"
              />
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 h-12 rounded-xl tw-neon-btn text-sm relative z-[1]"
              >
                {buttonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TechWaveNewsletter;
