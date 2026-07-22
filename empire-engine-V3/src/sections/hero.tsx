import {
  useEffect,
  useState } from "react";
import { HeroMedia } from "@numueg/theme-sdk";
import { EditableText } from "../lib/EditableText";
import type { EmpSectionProps } from "../lib/section";
import { useT } from "../lib/i18n";
import { useDemo } from "../lib/demo";

interface HeroSettings {
  headline?: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  image_1?: unknown;
  image_2?: unknown;
  image_3?: unknown;
  image_1_mobile?: unknown;
  image_2_mobile?: unknown;
  image_3_mobile?: unknown;
  use_mobile_image?: boolean;
  autoplay?: boolean;
}

/**
 * Full-bleed hero slideshow — black canvas, cross-fading cover images with a
 * dark bottom gradient, centered headline + pill CTA at the bottom, dots and
 * prev/next arrows. Slides auto-advance on a timer (client-only effect, so the
 * SSR render is deterministic — slide 0 paints first).
 */
export default function Hero({ id, settings }: EmpSectionProps) {
  const s = settings as HeroSettings;
  const t = useT();
  const demo = useDemo();
  const headline = s.headline ?? t("Discover the new collection", "اكتشف التشكيلة الجديدة");
  const subtitle = s.subtitle ?? t("Shop now", "تسوق الآن");
  const ctaText = s.cta_text ?? t("Shop", "تسوق");
  const ctaLink = s.cta_link ?? "/products";

  const imgUrl = (v: unknown): string =>
    typeof v === "string"
      ? v
      : v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string"
        ? (v as { url: string }).url
        : "";
  const mobileEnabled = s.use_mobile_image === true;
  const slides = [
    { d: imgUrl(s.image_1), m: mobileEnabled ? imgUrl(s.image_1_mobile) : "" },
    { d: imgUrl(s.image_2), m: mobileEnabled ? imgUrl(s.image_2_mobile) : "" },
    { d: imgUrl(s.image_3), m: mobileEnabled ? imgUrl(s.image_3_mobile) : "" },
  ].filter((x) => x.d);
  if (slides.length === 0 && demo) {
    // Marketplace preview only — a real store with no hero images renders
    // the copy overlay alone, never stock photography.
    slides.push({
      d: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600",
      m: "",
    });
  }

  const [current, setCurrent] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (s.autoplay === false || count <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count, s.autoplay]);

  const go = (i: number) => setCurrent(((i % count) + count) % count);

  return (
    <section className="empire-hero">
      {slides.map((sl, i) => (
        <div
          key={i}
          className={`empire-hero__slide${i === current ? " is-active" : ""}`}
          aria-hidden={i !== current}
        >
          {/* HeroMedia: responsive srcSet + AVIF via the transformer, optional
              mobile art-direction; slide 0 is the LCP (eager + high priority). */}
          <HeroMedia
            src={sl.d}
            mobileSrc={sl.m || undefined}
            alt=""
            fit="cover"
            priority={i === 0}
          />
          <div className="empire-hero__overlay" />
        </div>
      ))}

      <div className="empire-hero__content">
        <EditableText
          as="h1"
          className="empire-hero__title"
          sectionId={id}
          settingId="headline"
          value={headline}
        />
        <EditableText
          as="p"
          className="empire-hero__sub"
          sectionId={id}
          settingId="subtitle"
          value={subtitle}
        />
        <a className="empire-hero__cta" href={ctaLink}>
          <EditableText
            as="span"
            sectionId={id}
            settingId="cta_text"
            value={ctaText}
          />
        </a>

        {count > 1 ? (
          <div className="empire-hero__dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`empire-hero__dot${i === current ? " is-active" : ""}`}
                type="button"
                aria-label={`شريحة ${i + 1}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          <button
            className="empire-hero__arrow empire-hero__arrow--prev"
            type="button"
            aria-label="السابق"
            onClick={() => go(current - 1)}
          >
            <Chevron dir="start" />
          </button>
          <button
            className="empire-hero__arrow empire-hero__arrow--next"
            type="button"
            aria-label="التالي"
            onClick={() => go(current + 1)}
          >
            <Chevron dir="end" />
          </button>
        </>
      ) : null}
    </section>
  );
}

const Chevron = ({ dir }: { dir: "start" | "end" }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {dir === "start" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>
);
