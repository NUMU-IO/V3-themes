"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useResolvedSettings } from "@numueg/theme-sdk";
import { asString, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmpNewsletter = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const title = asString(s.title) || "JOIN THE CIRCLE";
  const subtitle =
    asString(s.subtitle) ||
    "Early access to limited drops and exclusive content.";
  const buttonText = asString(s.button_text) || "SUBSCRIBE";
  const placeholder = asString(s.placeholder) || "YOUR EMAIL";

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) return;
    setSubmitted(true);
  };

  return (
    <section className="py-12 md:py-16 lg:py-24 bg-[var(--emp-cream)]">
      <div className="container mx-auto px-4 text-center">
        <h2 className="emp-heading text-2xl sm:text-3xl md:text-4xl text-[var(--emp-dark)] mb-3 md:mb-4">
          <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
        </h2>
        <p className="text-sm md:text-base text-[var(--emp-gray)] mb-6 md:mb-8 max-w-md mx-auto">
          <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
        </p>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            role="status"
            aria-live="polite"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-[var(--emp-dark)] bg-[var(--emp-amber)] text-[var(--emp-dark)] emp-label shadow-[3px_3px_0_var(--emp-dark)]"
          >
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 14 }}
              className="inline-flex"
            >
              <Check size={16} aria-hidden="true" strokeWidth={3} />
            </motion.span>
            <span>SUBSCRIBED</span>
          </motion.div>
        ) : (
          <form
            className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-md mx-auto"
            onSubmit={handleSubmit}
          >
            <label htmlFor="emp-newsletter-email" className="sr-only">
              {placeholder}
            </label>
            <input
              id="emp-newsletter-email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder={placeholder}
              dir="ltr"
              autoComplete="email"
              className="flex-1 px-4 py-3 rounded-full border-2 border-[var(--emp-dark)] bg-white text-[var(--emp-dark)] placeholder:text-[var(--emp-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--emp-amber)]"
            />
            <button type="submit" className="emp-btn emp-btn-filled px-6 py-3">
              {buttonText}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default EmpNewsletter;
