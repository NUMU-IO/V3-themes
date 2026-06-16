"use client";

import { Link, useLocale } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { asString, localized, type SectionRenderProps } from "./_shared";

/**
 * gilded-not-found — body for the `404` template, in the Gilded voice: an
 * oversized gold-tinted "404", a quiet uppercase headline + subhead, and a
 * single gold CTA back to the catalog. Keeps a missing page feeling like the
 * brand rather than a server error. All copy is editable + bilingual.
 */
export default function GildedNotFound({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();

  const status = asString(s.status_label) || "404";
  const headline =
    asString(s.headline) ||
    localized(locale, "This page slipped away", "هذه الصفحة غير موجودة");
  const subhead =
    asString(s.subhead) ||
    localized(
      locale,
      "The page you're looking for can't be found. Let's get you back to the collection.",
      "الصفحة التي تبحث عنها غير متاحة. دعنا نعيدك إلى التشكيلة.",
    );
  const ctaText =
    asString(s.cta_text) || localized(locale, "Back to shop", "العودة للتسوق");
  const ctaLink = asString(s.cta_link) || "/products";

  return (
    <section
      className="bg-background min-h-[70vh] flex items-center justify-center px-4 py-24"
      data-testid="storefront-404-page"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-lg"
      >
        <p
          className="vn-heading text-[88px] sm:text-[140px] md:text-[180px] leading-none text-[hsl(var(--gold)/0.25)] select-none"
        >
          {status}
        </p>
        {headline && (
          <h1 className="vn-heading text-2xl md:text-3xl text-[var(--vn-ink)] -mt-4 md:-mt-8">
            {headline}
          </h1>
        )}
        {subhead && (
          <p className="text-[var(--vn-muted)] text-sm leading-relaxed mt-4 max-w-sm mx-auto">
            {subhead}
          </p>
        )}
        {ctaText && (
          <Link to={ctaLink} className="vn-btn vn-btn-filled mt-8">
            <ArrowLeft size={14} className="rtl:rotate-180" />
            {ctaText}
          </Link>
        )}
      </motion.div>
    </section>
  );
}
