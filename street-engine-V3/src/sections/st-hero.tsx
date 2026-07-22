"use client";

import { Link, useLocale, useResolvedSettings, useShop } from "@numueg/theme-sdk";
import { ArrowRight } from "lucide-react";
import { asBool, asImageUrl, asString, localized, type StSectionProps } from "./_shared";

/**
 * st-hero — Street's opening statement.
 *
 * Uses the theme's own topographic ground (`.st-topo-lines`), the oversized
 * 900-weight headline (`.st-hero-headline`) and the pill buttons already in
 * `styles.css`. Copy is bilingual with an Arabic field per string.
 */
export default function StHero({ instance, sectionId }: StSectionProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const locale = useLocale();
  const isAr = (locale || "").toLowerCase().startsWith("ar");

  const pick = (en: unknown, ar: unknown, fb = "") =>
    (isAr ? asString(ar) || asString(en) : asString(en) || asString(ar)) || fb;

  const eyebrow = pick(s.eyebrow, s.eyebrow_ar);
  const headline = pick(
    s.headline,
    s.headline_ar,
    shop?.name || localized(locale, "New season", "موسم جديد"),
  );
  const body = pick(s.body, s.body_ar);
  const ctaLabel = pick(
    s.cta_label,
    s.cta_label_ar,
    localized(locale, "Shop now", "تسوق دلوقتي"),
  );
  const ctaHref = asString(s.cta_href, "/products");
  const secondaryLabel = pick(s.secondary_label, s.secondary_label_ar);
  const secondaryHref = asString(s.secondary_href, "/collections");
  const image = asImageUrl(s.image);
  const showTopo = asBool(s.show_topo, true);

  return (
    <section
      data-st-section={sectionId}
      className={showTopo ? "st-topo-lines" : ""}
      style={showTopo ? undefined : { background: "var(--st-cream)" }}
    >
      <div className="mx-auto max-w-[1400px] px-4 py-16 md:py-24 grid gap-10 md:grid-cols-2 md:items-center">
        <div>
          {eyebrow && <span className="st-badge-dark">{eyebrow}</span>}
          <h1 className="st-hero-headline mt-5 text-[var(--st-dark)]">{headline}</h1>
          {body && (
            <p className="mt-5 max-w-md text-base md:text-lg font-semibold text-[var(--st-dark)]/75">
              {body}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={ctaHref} className="st-btn">
              {ctaLabel}
              <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
            </Link>
            {secondaryLabel && (
              <Link to={secondaryHref} className="st-btn-outline">
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>

        {image && (
          <div className="st-card st-wave-top md:justify-self-end w-full max-w-lg">
            <img
              src={image}
              alt={headline}
              className="w-full h-full object-cover aspect-[4/5]"
              loading="eager"
            />
          </div>
        )}
      </div>
    </section>
  );
}
