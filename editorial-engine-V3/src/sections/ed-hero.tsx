"use client";
import { HeroMedia, Link, useLocale } from "@numueg/theme-sdk";
import { ArrowLeft } from "lucide-react";
import { asImageAlt, asImageTransform, asImageUrl, asString, localized, useInsideEditor, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Plate, Rise, RuleDraw, Typeset, useMotionOn } from "./_motion";

/**
 * Manshet hero — green drench band, oversized uppercase headline.
 *
 * Signature entrance ("the front page is set"): the double rule inks in,
 * then the headline rises line-by-line out of baseline masks like type
 * being set, the standfirst and CTA follow, and the photo is uncovered by
 * a plate wipe. Inside the editor the headline stays a single inline-
 * editable block (typesetting would break contentEditable), so merchants
 * can still click-to-edit.
 */
export default function EdHero({ instance, sectionId }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const locale = useLocale();
  const on = useMotionOn();
  const inEditor = useInsideEditor();
  const headline =
    asString(s.headline) ||
    localized(locale, "Discover the latest\nfashion trends", "اكتشف أحدث\nصيحات الموضة");
  const subtitle =
    asString(s.subtitle) ||
    localized(locale, "A curated collection of the finest global brands", "تشكيلة منتقاة من أرقى الماركات العالمية");
  const ctaText = asString(s.cta_text) || localized(locale, "Shop the Collection", "تسوّق التشكيلة");
  const ctaLink = asString(s.cta_link) || "/products";
  const heroImage = asImageUrl(s.hero_image_url) || undefined;
  const heroImageTransform = asImageTransform(s.hero_image_url);
  const heroAlt = asImageAlt(s.hero_image_url);
  // Mobile hero (user-approved: now shown on mobile; departs from V2's hidden-on-mobile).
  const mobileEnabled = s.use_mobile_image === true;
  const heroImageMobile = mobileEnabled ? asImageUrl(s.hero_image_mobile) || undefined : undefined;
  const heroImageMobileTransform = asImageTransform(s.hero_image_mobile);

  const headlineLines = headline.split("\n").filter((l) => l.trim().length > 0);
  // Typesetting splits the text into masked lines, which would fight
  // contentEditable — in the editor keep the click-to-edit block instead.
  const typeset = on && !inEditor;

  return (
    <section className="relative overflow-hidden bg-[hsl(var(--ed-green))]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh] items-center">
          {/* Copy side — staged like a page being composed */}
          <div className="py-12 md:py-20">
            <RuleDraw on={on} inView={false} className="w-24 border-t-[3px] border-white mb-6">
              <div className="mt-[3px] border-t border-white" />
            </RuleDraw>
            <h1 className="ed-hero-title text-white mb-6">
              {typeset ? (
                <Typeset on lines={headlineLines} delay={0.15} />
              ) : (
                <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} multiline />
              )}
            </h1>
            <Rise on={on} delay={0.5}>
              <p className="text-white/80 text-base md:text-lg mb-8 max-w-sm">
                <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} multiline />
              </p>
            </Rise>
            <Rise on={on} delay={0.62} className="flex flex-wrap gap-3">
              <Link
                to={ctaLink}
                className="ed-press inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[hsl(var(--ed-dark))] font-bold text-xs uppercase tracking-[0.15em] hover:bg-white/90 transition-colors"
              >
                <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
                <ArrowLeft size={16} className="ltr:rotate-180" />
              </Link>
            </Rise>
          </div>

          {/* Image side — uncovered like a printing plate */}
          {heroImage && (
            <Plate on={on} inView={false} from="end" delay={0.3} className="relative aspect-[4/5] md:aspect-auto md:h-full">
              <HeroMedia
                src={heroImage}
                alt={heroAlt}
                transform={heroImageTransform}
                mobileSrc={heroImageMobile}
                mobileTransform={heroImageMobileTransform}
                mobileAspect="4/5"
                fit="contain"
                priority
                className="w-full h-full"
              />
            </Plate>
          )}
        </div>
      </div>
    </section>
  );
}
