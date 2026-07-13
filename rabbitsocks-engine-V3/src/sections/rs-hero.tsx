"use client";
import { Link, useLocale, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asImageAlt,
  asImageUrl,
  asString,
  localized,
  productImage,
  useDemo,
  useInsideEditor,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Aperture, Focus, FrameSpin, Rise, useMotionOn } from "./_motion";

/**
 * Mashkal hero — the kaleidoscope pane. Serif display copy on gallery white
 * beside a composed arrangement of geometric frames: one ARCH-clipped image,
 * one DIAMOND-clipped image overlapping it, and a thin outlined circle —
 * the theme's shapes stated in the first viewport. Frames click home
 * (FrameSpin), imagery opens through the Aperture, the headline pulls into
 * Focus. Falls back to the store's first products for imagery so a fresh
 * store is never empty; explicit image settings win.
 */
export default function RsHero({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const { products } = useProducts();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();

  const headline =
    asString(s.headline) ||
    localized(locale, "Made to be looked at,\nworn anyway", "معمولة تتفرج عليها،\nوتتلبس برضه");
  const subtitle =
    asString(s.subtitle) ||
    localized(
      locale,
      "A small collection, displayed like a gallery and priced like a friend.",
      "تشكيلة صغيرة، معروضة كأنها معرض فني وسعرها صاحبك.",
    );
  const ctaText = asString(s.cta_text) || localized(locale, "Browse the collection", "اتفرج على التشكيلة");
  const ctaLink = asString(s.cta_link) || "/products";
  const specLabel = asString(s.spec_label);

  // Imagery: explicit settings → first products → (editor/demo) placeholders.
  const productA = productImage(products[0]);
  const productB = productImage(products[1] ?? products[0]);
  const showPlaceholders = demo || inEditor;
  const imageMain =
    asImageUrl(s.image_main) || productA || (showPlaceholders ? "https://picsum.photos/seed/mashkal-arch/900/1200" : "");
  const imageAccent =
    asImageUrl(s.image_accent) || productB || (showPlaceholders ? "https://picsum.photos/seed/mashkal-diamond/700/700" : "");
  const altMain = asImageAlt(s.image_main) || headline.replace(/\n/g, " ");
  const altAccent = asImageAlt(s.image_accent) || altMain;

  const headlineLines = headline.split("\n").filter((l) => l.trim().length > 0);
  const focus = on && !inEditor;

  return (
    <section className="relative overflow-hidden bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-y-10 md:gap-x-8 py-14 md:py-20 min-h-[68vh]">
          {/* Copy side */}
          <div className="md:col-span-6 lg:col-span-5">
            {specLabel && (
              <p className="rs-spec mb-5">
                <InlineEditable sectionId={sectionId} settingKey="spec_label" value={specLabel} />
              </p>
            )}
            <h1 className="rs-hero-title text-[hsl(var(--foreground))] mb-5">
              {focus ? (
                <Focus on lines={headlineLines} delay={0.1} />
              ) : (
                <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} multiline />
              )}
            </h1>
            <Rise on={on} delay={0.45}>
              <p className="text-base md:text-lg text-[var(--vn-muted)] max-w-[46ch] leading-relaxed mb-8">
                <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
              </p>
            </Rise>
            <Rise on={on} delay={0.58} className="flex flex-wrap items-center gap-4">
              <Link to={ctaLink} className="vn-btn vn-btn-filled">
                <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
              </Link>
            </Rise>
          </div>

          {/* Shape side — the kaleidoscope arrangement */}
          <div className="md:col-span-6 lg:col-span-7 relative flex justify-center md:justify-end" aria-hidden={!imageMain}>
            <div className="relative w-full max-w-[520px]">
              {/* Arch: the tall pane */}
              <FrameSpin on={on} inView={false} delay={0.15}>
                <div className="relative w-[78%] aspect-[3/4] ms-auto">
                  <Aperture on={on} inView={false} delay={0.25} className="absolute inset-0 rs-clip-arch rs-morph bg-[var(--rs-surface-high)]">
                    {imageMain && (
                      <img src={imageMain} alt={altMain} className="w-full h-full object-cover" />
                    )}
                  </Aperture>
                  {/* thin outline echoing the arch, offset like a gallery mat */}
                  <div
                    className="absolute -inset-3 border border-[hsl(var(--rs-line))] rs-clip-arch pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </FrameSpin>

              {/* Diamond: the accent pane, overlapping the arch's lower start edge */}
              <FrameSpin on={on} inView={false} delay={0.4} className="absolute bottom-[-6%] start-0 w-[42%]">
                <div className="relative aspect-square">
                  <svg viewBox="0 0 100 100" className="rs-frame-line text-[hsl(var(--foreground))]" aria-hidden="true">
                    <polygon points="50,1 99,50 50,99 1,50" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <Aperture on={on} inView={false} delay={0.5} className="absolute inset-[9%] rs-clip-diamond rs-morph bg-[var(--rs-surface-high)]">
                    {imageAccent && (
                      <img src={imageAccent} alt={altAccent} className="w-full h-full object-cover" />
                    )}
                  </Aperture>
                </div>
              </FrameSpin>

              {/* Circle ornament: pure line, top start corner */}
              <FrameSpin on={on} inView={false} delay={0.55} className="absolute -top-6 start-[6%] w-[18%]">
                <div className="aspect-square rounded-full border border-[hsl(var(--rs-line))]" aria-hidden="true" />
              </FrameSpin>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
