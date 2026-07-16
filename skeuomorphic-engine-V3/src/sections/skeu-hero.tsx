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
import { Develop, Emboss, Rise, Stamp, useMotionOn } from "./_motion";

/**
 * Warsha hero — the workbench. Kraft surface with grain, a slab letterpress
 * headline (Emboss), and the product photo sitting as a white-bordered PRINT
 * set down at a slight tilt, held by a wax seal stamped over its corner —
 * the maker's guarantee, front and centre. Falls back to the store's first
 * product for imagery so a fresh store is never empty.
 */
export default function SkeuHero({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const { products } = useProducts();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();

  const headline =
    asString(s.headline) ||
    localized(locale, "Made by hand,\nmade to last", "شغل إيد،\nمعمول يعيش");
  const subtitle =
    asString(s.subtitle) ||
    localized(
      locale,
      "Every piece leaves this workshop checked, stitched and signed. No two are exactly alike — that's the point.",
      "كل قطعة بتخرج من الورشة متفحوصة ومخيّطة وموقّعة. مفيش قطعتين زي بعض، ودي الفكرة.",
    );
  const ctaText = asString(s.cta_text) || localized(locale, "Browse the workshop", "اتفرج على الشغل");
  const ctaLink = asString(s.cta_link) || "/products";
  const sealText = asString(s.seal_text) || localized(locale, "HAND\nMADE", "شغل\nإيد");

  const showPlaceholders = demo || inEditor;
  const image =
    asImageUrl(s.hero_image) ||
    productImage(products[0]) ||
    (showPlaceholders ? "https://picsum.photos/seed/warsha-bench/900/1100" : "");
  const alt = asImageAlt(s.hero_image) || headline.replace(/\n/g, " ");

  const headlineLines = headline.split("\n").filter((l) => l.trim().length > 0);
  const emboss = on && !inEditor;

  return (
    <section
      className="relative overflow-hidden bg-[hsl(var(--background))]"
      style={{ backgroundImage: "var(--skeu-texture)" }}
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-y-12 md:gap-x-10 py-14 md:py-20 min-h-[64vh]">
          {/* Copy side */}
          <div className="md:col-span-6">
            <h1 className="skeu-hero-title text-[hsl(var(--foreground))] mb-5">
              {emboss ? (
                <Emboss on lines={headlineLines} delay={0.1} />
              ) : (
                <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} multiline />
              )}
            </h1>
            <Rise on={on} delay={0.45}>
              <p className="text-base md:text-lg text-[var(--vn-muted)] max-w-[48ch] leading-relaxed mb-8">
                <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
              </p>
            </Rise>
            <Rise on={on} delay={0.58} className="flex flex-wrap items-center gap-4">
              <Link to={ctaLink} className="vn-btn vn-btn-filled">
                <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
              </Link>
            </Rise>
          </div>

          {/* Print side — the product photo set down on the bench */}
          {image && (
            <div className="md:col-span-6 flex justify-center md:justify-end">
              <div className="relative w-full max-w-[440px]">
                <Develop on={on} inView={false} delay={0.3} className="skeu-print rotate-[1.5deg]">
                  <img src={image} alt={alt} className="w-full aspect-[4/5] object-cover" />
                </Develop>
                {/* Wax seal over the corner — the maker's mark */}
                <Stamp
                  on={on}
                  delay={0.9}
                  className="absolute -top-5 -end-4 rotate-[8deg]"
                >
                  <span className="skeu-seal text-center text-[10px] font-extrabold leading-tight tracking-[0.14em] whitespace-pre-line">
                    <InlineEditable sectionId={sectionId} settingKey="seal_text" value={sealText} multiline />
                  </span>
                </Stamp>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
