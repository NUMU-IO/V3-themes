"use client";
import { useEffect, useRef, useState } from "react";
import { Link, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import {
  applyImageTransform,
  asImageAlt,
  asImageTransform,
  asImageUrl,
  asString,
  localized,
  useAnimationsEnabled,
  useDemo,
  useInsideEditor,
  type ImageTransform,
  type SectionRenderProps,
} from "./_shared";
import { RuleDraw, Typeset, useMotionOn } from "./_motion";
import { InlineEditable } from "./_inline-editable";

/**
 * Manshet lookbook — the theme's signature "editorial spread". Up to six
 * looks laid out as asymmetric magazine spreads (alternating wide/narrow
 * figures with hung captions and a shop link), each revealed with a paper
 * curtain wipe as it scrolls into view. No other theme in the catalog has
 * this section; it is the reason an image-led fashion merchant picks Manshet.
 */

interface Look {
  n: number;
  image: string;
  imageTransform?: ImageTransform;
  alt: string;
  caption: string;
  link: string;
  linkLabel: string;
}

/** Demo-preview looks (marketplace "Try theme" only — gated on useDemo). */
const FALLBACK_LOOKS = [
  { image: "https://picsum.photos/seed/manshet-look-atelier/900/1200", caption: "Tailored linen, worn loose. The silhouette does the talking." },
  { image: "https://picsum.photos/seed/manshet-look-street/900/1200", caption: "City layers: structured coat over soft knit." },
  { image: "https://picsum.photos/seed/manshet-look-evening/900/1200", caption: "After dark. One sharp line from shoulder to hem." },
  { image: "https://picsum.photos/seed/manshet-look-weekend/900/1200", caption: "Weekend issue: denim, cotton, nothing extra." },
];

function useRevealOnScroll<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

function LookFigure({
  look,
  wide,
  sectionId,
}: {
  look: Look;
  wide: boolean;
  sectionId: string;
}) {
  const animate = useAnimationsEnabled();
  const [ref, revealed] = useRevealOnScroll<HTMLElement>();
  const visible = !animate || revealed;
  const locale = useLocale();
  const figure = (
    <figure
      ref={ref as React.RefObject<HTMLElement>}
      className={`ed-lookbook-figure ed-curtain ${visible ? "is-visible" : ""}`}
    >
      <div className={`relative overflow-hidden bg-[var(--vn-band)] ${wide ? "aspect-[4/5]" : "aspect-[3/4]"}`}>
        {look.image && (
          <img
            src={look.image}
            alt={look.alt || look.caption || "Lookbook"}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            style={applyImageTransform(look.imageTransform, "cover")}
          />
        )}
      </div>
      <figcaption className="flex items-start justify-between gap-4 pt-3 border-t border-[var(--vn-ink)] mt-3">
        {look.caption && (
          <p className="ed-lookbook-caption max-w-[38ch]">
            <InlineEditable sectionId={sectionId} settingKey={`look_${look.n}_caption`} value={look.caption} multiline />
          </p>
        )}
        {look.link && (
          <span className="vn-label whitespace-nowrap underline underline-offset-4 decoration-[var(--vn-accent)] decoration-2">
            {look.linkLabel || localized(locale, "Shop the look", "تسوّق الإطلالة")}
          </span>
        )}
      </figcaption>
    </figure>
  );
  const wrapClass = wide ? "md:col-span-7" : "md:col-span-5 md:mt-16";
  return look.link ? (
    <Link to={look.link} className={`block ${wrapClass}`}>
      {figure}
    </Link>
  ) : (
    <div className={wrapClass}>{figure}</div>
  );
}

export default function EdLookbook({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const motionOn = useMotionOn();

  const title = asString(s.title) || localized(locale, "The Lookbook", "اللوك بوك");
  const intro =
    asString(s.intro) ||
    localized(
      locale,
      "This season's edit, styled and shot like the pages of a magazine.",
      "تشكيلة الموسم، منسّقة ومصوّرة كصفحات مجلة.",
    );

  const looks: Look[] = [];
  for (let i = 1; i <= 6; i++) {
    const image = asImageUrl(s[`look_${i}_image`]);
    const caption = asString(s[`look_${i}_caption`]);
    if (!image && !caption) continue;
    looks.push({
      n: i,
      image,
      imageTransform: asImageTransform(s[`look_${i}_image`]),
      alt: asImageAlt(s[`look_${i}_image`]),
      caption,
      link: asString(s[`look_${i}_link`]),
      linkLabel: asString(s[`look_${i}_link_label`]),
    });
  }

  // Marketplace preview + editor canvas: show the demo spread so the section
  // sells itself (marketplace) and the merchant sees what to configure
  // (customizer). A LIVE store with no looks configured renders nothing.
  if (looks.length === 0 && (demo || inEditor)) {
    FALLBACK_LOOKS.forEach((f, i) =>
      looks.push({
        n: i + 1,
        image: f.image,
        alt: f.caption,
        caption: f.caption,
        link: "/products",
        linkLabel: "",
      }),
    );
  }
  if (looks.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        <header className="max-w-3xl mb-10 md:mb-16">
          <RuleDraw on={motionOn} className="ed-rule-double mb-5">
            <span aria-hidden="true" />
          </RuleDraw>
          <h2 className="ed-hero-title text-[hsl(var(--foreground))] !text-[clamp(2.25rem,6vw,4.5rem)]">
            {motionOn && !inEditor ? (
              <Typeset on inView lines={[title]} delay={0.1} />
            ) : (
              <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
            )}
          </h2>
          {intro && (
            <p className="mt-4 text-base md:text-lg text-[var(--vn-muted)] max-w-[60ch] leading-relaxed">
              <InlineEditable sectionId={sectionId} settingKey="intro" value={intro} multiline />
            </p>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-12 md:gap-y-20 items-start">
          {looks.map((look, i) => (
            <LookFigure key={look.n} look={look} wide={i % 2 === 0} sectionId={sectionId} />
          ))}
        </div>
      </div>
    </section>
  );
}
