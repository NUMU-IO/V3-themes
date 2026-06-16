"use client";

import { Link, useLocale } from "@numueg/theme-sdk";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { asString, localized, type SectionRenderProps } from "./_shared";

/**
 * lux-not-found — body for the `404` template, in the Luxury Minimal voice:
 * an oversized, hairline-thin "404", a quiet headline + subhead, and a single
 * understated CTA back to the catalog. Keeps a missing page feeling like the
 * brand rather than a server error. All copy is editable + bilingual.
 */
export default function LuxNotFound({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();

  const status = asString(s.status_label) || "404";
  const headline =
    asString(s.headline) || localized(locale, "This page slipped away", "هذه الصفحة غير موجودة");
  const subhead =
    asString(s.subhead) ||
    localized(
      locale,
      "The page you're looking for can't be found. Let's get you back to the collection.",
      "الصفحة التي تبحث عنها غير متاحة. دعنا نعيدك إلى التشكيلة.",
    );
  const ctaText = asString(s.cta_text) || localized(locale, "Back to shop", "العودة للتسوق");
  const ctaLink = asString(s.cta_link) || "/products";

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-lg"
      >
        <p className="lux-heading text-[88px] sm:text-[140px] md:text-[180px] leading-none text-foreground/10 select-none">
          {status}
        </p>
        {headline && (
          <h1 className="lux-heading text-2xl md:text-3xl text-foreground -mt-6 md:-mt-10">
            {headline}
          </h1>
        )}
        {subhead && (
          <p className="text-muted-foreground text-sm leading-relaxed mt-4 max-w-sm mx-auto">
            {subhead}
          </p>
        )}
        {ctaText && (
          <Link
            to={ctaLink}
            className="inline-flex items-center gap-2 lux-btn mt-8"
          >
            <ArrowLeft size={14} />
            {ctaText}
          </Link>
        )}
      </motion.div>
    </section>
  );
}
