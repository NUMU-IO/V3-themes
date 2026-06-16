"use client";

import { Link, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { ShoppingBag } from "lucide-react";
import { asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * emp-not-found — body for the `404` template, in the Empire LIGHT
 * editorial voice. A big electric-BLUE "404" over the off-white page, a
 * `font-black uppercase` headline + subhead in black ink, and a BLACK
 * rounded-full CTA back to the shop. Keeps a 404 feeling like the store,
 * not a server error. NOT the dark wavy 404 it inherited from the Bazar
 * clone.
 *
 * Settings: status_label, headline, subhead, cta_label, cta_href.
 */
export default function EmpNotFound({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const status = asString(s.status_label) || "404";
  const headline = asString(s.headline) || localized(locale, "PAGE NOT FOUND", "الصفحة غير موجودة");
  const subhead =
    asString(s.subhead) ||
    localized(locale, "The page you're after wandered off. Let's get you back to the good stuff.", "الصفحة اللي بتدوّر عليها مش موجودة. تعالى نرجّعك للحاجات الحلوة.");
  const ctaLabel = asString(s.cta_label) || localized(locale, "Back to Shop", "رجوع للتسوّق");
  const ctaHref = asString(s.cta_href) || "/products";

  return (
    <section
      className="bg-[hsl(var(--background))] min-h-[70vh] flex items-center justify-center px-6 py-20"
      data-emp-section={sectionId}
    >
      <div className="text-center max-w-xl">
        <div className="font-black text-[80px] sm:text-[120px] md:text-[160px] leading-none tracking-tight text-[hsl(var(--emp-blue))]">
          <InlineEditable sectionId={sectionId} settingKey="status_label" value={status} />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-foreground mt-2">
          <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} />
        </h1>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-4 max-w-md mx-auto">
          <InlineEditable sectionId={sectionId} settingKey="subhead" value={subhead} multiline />
        </p>
        <Link
          to={ctaHref}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-black/90 transition-colors mt-8"
        >
          <ShoppingBag size={14} aria-hidden="true" />
          <InlineEditable sectionId={sectionId} settingKey="cta_label" value={ctaLabel} />
        </Link>
      </div>
    </section>
  );
}
