"use client";

import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import { ShoppingBag } from "lucide-react";
import { asString, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * emp-not-found — body for the `404` template, in the Empire voice. A big
 * amber "404" over a wavy hero, a headline + subhead, and a CTA back to
 * the shop. Keeps a 404 feeling like the store, not a server error page.
 */
export default function EmpNotFound({
  instance,
  sectionId,
}: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const status = asString(s.status_label) || "404";
  const headline = asString(s.headline) || "LOST IN THE EMPIRE";
  const subhead =
    asString(s.subhead) ||
    "The page you're after wandered off. Let's get you back to the good stuff.";
  const ctaLabel = asString(s.cta_label) || "BACK TO SHOP";
  const ctaHref = asString(s.cta_href) || "/products";

  return (
    <section
      className="emp-wavy-bg min-h-[70vh] flex items-center justify-center px-6 py-20 relative overflow-hidden"
      data-emp-section={sectionId}
    >
      {/* Decorative empire blobs */}
      <div
        aria-hidden="true"
        className="absolute -top-10 -end-10 w-48 h-48 bg-[var(--emp-cream)]/30 emp-blob pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-12 -start-8 w-40 h-40 bg-[var(--emp-navy)]/15 emp-blob emp-blob-delay-2 pointer-events-none"
      />

      <div className="relative text-center max-w-xl">
        <div className="emp-heading text-[80px] sm:text-[120px] md:text-[160px] leading-none text-[var(--emp-dark)]">
          <InlineEditable
            sectionId={sectionId}
            settingKey="status_label"
            value={status}
          />
        </div>
        <h1 className="emp-heading text-2xl sm:text-3xl md:text-4xl text-[var(--emp-dark)] mt-2">
          <InlineEditable
            sectionId={sectionId}
            settingKey="headline"
            value={headline}
          />
        </h1>
        <p className="text-sm md:text-base text-[var(--emp-dark)]/70 leading-relaxed mt-4 max-w-md mx-auto">
          <InlineEditable
            sectionId={sectionId}
            settingKey="subhead"
            value={subhead}
            multiline
          />
        </p>
        <Link
          to={ctaHref}
          className="emp-btn emp-btn-filled inline-flex items-center gap-2 px-8 py-3.5 text-xs mt-8"
        >
          <ShoppingBag size={14} aria-hidden="true" />
          <InlineEditable
            sectionId={sectionId}
            settingKey="cta_label"
            value={ctaLabel}
          />
        </Link>
      </div>
    </section>
  );
}
