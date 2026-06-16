"use client";

import { Link, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import {
  applyImageTransform,
  asImageTransform,
  asImageUrl,
  asString,
  demoOrPlaceholder,
  localized,
  useDemo,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";

const FALLBACK_IMAGE = {
  image:
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=70",
};

const EmpImageWithText = ({ instance, sectionId }: SectionRenderProps) => {
  const s = useResolvedSettings(instance);
  const demo = useDemo();
  const locale = useLocale();

  const label = asString(s.label) || localized(locale, "THE PHILOSOPHY", "الفلسفة");
  const headline = asString(s.headline) || localized(locale, "THE LUXURY OF THINGS THAT LAST.", "رفاهية الأشياء اللي بتدوم.");
  const quote =
    asString(s.quote) ||
    localized(
      locale,
      "Born from a pursuit of the perfect tactile experience. We don't chase trends; we refine the invisible details of the daily ritual.",
      "اتولدنا من السعي لتجربة لمس مثالية. إحنا مبنجريش ورا الموضة؛ بنتقن التفاصيل الخفية في روتين يومك.",
    );
  const body =
    asString(s.body) ||
    localized(
      locale,
      "Our materials are sourced from the finest mills, ensuring every thread meets our standards for thermal regulation and enduring softness.",
      "خاماتنا مختارة من أجود المصانع، عشان كل خيط يوصل لمعاييرنا في توازن الحرارة ونعومة تدوم.",
    );
  const ctaText = asString(s.cta_text) || localized(locale, "LEARN MORE", "اعرف أكتر");
  const ctaLink = asString(s.cta_link) || "/about";
  // Demo-mode fills in a real photo; outside demo an unset image collapses to
  // the branded "B" placeholder block (designed empty-state, below).
  const configuredImage = asImageUrl(s.image_url);
  const imageTransform = asImageTransform(s.image_url);
  const imageUrl = configuredImage || demoOrPlaceholder(demo, [FALLBACK_IMAGE])[0].image;
  const colorScheme = asString(s.color_scheme) || "dark";

  return (
    <section className="relative py-12 md:py-20 lg:py-32 bg-[hsl(var(--foreground))] overflow-hidden" data-color-scheme={colorScheme}>
      {/* Flat editorial hairline replaces Bazar's wavy SVG divider. */}
      <div className="h-px w-full bg-[hsl(var(--emp-blue))]/25 absolute top-0 start-0" aria-hidden="true" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
          <div>
            <span className="emp-label text-[hsl(var(--emp-blue))]">
              <InlineEditable sectionId={sectionId} settingKey="label" value={label} />
            </span>
            <h2 className="font-black uppercase tracking-tight text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[hsl(var(--background))] mt-3 md:mt-4 leading-tight">
              <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} multiline />
            </h2>
            <p className="text-[hsl(var(--background))]/60 mt-6 leading-relaxed text-sm md:text-base italic">
              &ldquo;
              <InlineEditable sectionId={sectionId} settingKey="quote" value={quote} multiline />
              &rdquo;
            </p>
            <p className="text-[hsl(var(--background))]/40 mt-4 text-sm leading-relaxed">
              <InlineEditable sectionId={sectionId} settingKey="body" value={body} multiline />
            </p>
            <Link to={ctaLink} className="inline-flex items-center justify-center px-8 py-3.5 bg-[hsl(var(--emp-blue))] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:opacity-90 transition-opacity mt-6 md:mt-8">
              <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
            </Link>
          </div>
          {imageUrl ? (
            <div className="relative order-first md:order-none">
              {/* Sharp editorial frame, hairline accent border — no soft radius, no blob. */}
              <div className="rounded-[3px] overflow-hidden aspect-[4/5] bg-[hsl(var(--emp-charcoal))] border border-[hsl(var(--emp-blue))]/30">
                <img
                  src={imageUrl}
                  alt=""
                  className={`w-full h-full object-cover opacity-80 ${imageTransform ? "" : "emp-product-img"}`}
                  style={applyImageTransform(imageTransform, "cover")}
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            <div className="relative order-first md:order-none" aria-hidden="true">
              <div className="rounded-[3px] aspect-[4/5] bg-[hsl(var(--emp-charcoal))] border border-[hsl(var(--emp-blue))]/30 flex items-center justify-center">
                <div className="font-black uppercase tracking-tight text-[80px] sm:text-[100px] md:text-[120px] text-[hsl(var(--emp-blue))]/10 inline-block">
                  E
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmpImageWithText;
