"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * emp-newsletter — faithful V3 port of V2 EmpNewsletter
 * (numu-egyptian-bazaar/src/themes/empire/sections/newsletter/EmpNewsletter.tsx).
 *
 * A BLACK `py-20` band, centered `max-w-xl`. White `font-black uppercase`
 * title, muted white subtitle, then a pill form: a translucent rounded-full
 * email input (`bg-white/10`) beside a WHITE rounded-full submit button.
 * After submit it swaps to a short thank-you note. NOT the light off-white
 * newsletter it inherited from the Bazar clone.
 *
 * Subscribe is a local confirmation (no API), matching V2.
 *
 * Settings: title, subtitle, button_text, placeholder.
 */
const EmpNewsletter = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const title = asString(s.title) || localized(locale, "JOIN OUR NEWSLETTER", "اشترك في نشرتنا");
  const subtitle =
    asString(s.subtitle) ||
    localized(locale, "Be the first to know about offers and new products", "اعرف أول واحد عن العروض والمنتجات الجديدة");
  const buttonText = asString(s.button_text) || localized(locale, "Subscribe", "اشترك");
  const placeholder = asString(s.placeholder) || localized(locale, "Email address", "البريد الإلكتروني");

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) return;
    setSubmitted(true);
  };

  return (
    <section className="py-20 bg-black" data-emp-section={sectionId}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          <h2 className="text-white font-black text-2xl md:text-4xl uppercase tracking-tight mb-3">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>
          <p className="text-white/40 text-sm mb-8">
            <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              role="status"
              aria-live="polite"
              className="py-4"
            >
              <p className="text-white font-semibold">
                {localized(locale, "Thanks for subscribing!", "شكراً لاشتراكك!")}
              </p>
              <p className="text-white/40 text-sm mt-1">
                {localized(locale, "We'll send you the latest offers.", "هنبعتلك أحدث العروض.")}
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
              <label htmlFor="emp-newsletter-email" className="sr-only">
                {placeholder}
              </label>
              <input
                id="emp-newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={placeholder}
                className="flex-1 h-12 px-5 text-sm bg-white/10 border border-white/20 rounded-full text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none transition-colors"
                dir="ltr"
                required
              />
              <button
                type="submit"
                className="h-12 px-8 bg-white text-black font-semibold text-xs uppercase tracking-wider rounded-full hover:bg-white/90 transition-colors"
              >
                {buttonText}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default EmpNewsletter;
