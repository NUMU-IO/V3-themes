"use client";
import { Image as SdkImage, Link, useLocale, useResolvedSettings, useShop } from "@numueg/theme-sdk";
import {
  asImageAlt,
  asImageTransform,
  asImageUrl,
  asString,
  localized,
  useDemo,
  useInsideEditor,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Plate, Rise, RuleDraw, Typeset, useMotionOn } from "./_motion";

/**
 * The Front Page (الصفحة الأولى) — Manshet's signature section. A broadsheet
 * newspaper cover: dateline (store · today's date · issue label), heavy
 * double rule, one COVER STORY (plated image + kicker + typeset headline +
 * standfirst) and a column of BRIEFS behind a hairline column rule, exactly
 * like a front page's side column. Nothing in the theme catalog looks like
 * this — it's the section merchants use to art-direct a drop or campaign.
 */

const FALLBACK = {
  kicker: { en: "Cover story", ar: "قصة الغلاف" },
  headline: { en: "The season opens\nin plain sight", ar: "الموسم يبدأ\nعلى المكشوف" },
  standfirst: {
    en: "One collection, photographed like a front page. The pieces everyone will ask about first.",
    ar: "تشكيلة واحدة، متصوّرة كأنها مانشيت الصفحة الأولى. القطع اللي هيسأل عنها الكل.",
  },
  briefs: [
    {
      title: { en: "New in: tailored linen", ar: "جديدنا: لينين مفصّل" },
      text: { en: "Loose cuts for long days — the fabric does the cooling.", ar: "قصّات مريحة لأيام طويلة، والخامة بتبرّد." },
    },
    {
      title: { en: "Back in stock", ar: "رجع تاني" },
      text: { en: "The pieces you kept asking about are on the shelves again.", ar: "القطع اللي سألتوا عنها كتير رجعت الرفوف." },
    },
    {
      title: { en: "Free shipping weekend", ar: "ويك إند الشحن المجاني" },
      text: { en: "Two days only — every order ships on us.", ar: "يومين بس، وكل الطلبات شحنها علينا." },
    },
  ],
};

export default function EdFrontPage({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const shop = useShop();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();
  const showPlaceholders = demo || inEditor;

  const issueLabel = asString(s.issue_label);
  const kicker = asString(s.kicker) || localized(locale, FALLBACK.kicker.en, FALLBACK.kicker.ar);
  const headline =
    asString(s.headline) || localized(locale, FALLBACK.headline.en, FALLBACK.headline.ar);
  const standfirst =
    asString(s.standfirst) || localized(locale, FALLBACK.standfirst.en, FALLBACK.standfirst.ar);
  const ctaText = asString(s.cta_text) || localized(locale, "Read the story", "اقرأ القصة");
  const ctaLink = asString(s.cta_link) || "/products";
  const coverImage = asImageUrl(s.cover_image);
  const coverAlt = asImageAlt(s.cover_image) || headline.replace(/\n/g, " ");
  const coverTransform = asImageTransform(s.cover_image);

  // Briefs — the side column. Configured briefs win; the demo set only shows
  // in the editor/marketplace so a live store never prints copy it didn't write.
  const briefs: Array<{ n: number; title: string; text: string; link: string }> = [];
  for (let i = 1; i <= 3; i++) {
    const title = asString(s[`brief_${i}_title`]);
    const text = asString(s[`brief_${i}_text`]);
    if (title || text) {
      briefs.push({ n: i, title, text, link: asString(s[`brief_${i}_link`]) });
    }
  }
  if (briefs.length === 0 && showPlaceholders) {
    FALLBACK.briefs.forEach((b, i) =>
      briefs.push({ n: i + 1, title: localized(locale, b.title.en, b.title.ar), text: localized(locale, b.text.en, b.text.ar), link: "" }),
    );
  }

  // Dateline: TESTLOCAL · ١٣ يوليو ٢٠٢٦ · العدد ٠١
  const today = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const storeName = (shop?.name || "").toUpperCase();

  const headlineLines = headline.split("\n").filter((l) => l.trim().length > 0);
  const typeset = on && !inEditor;

  return (
    <section className="py-12 md:py-16 bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        {/* Dateline */}
        <div className="ed-dateline">
          <span>{storeName}</span>
          <span aria-hidden="true">·</span>
          <time>{today}</time>
          {issueLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                <InlineEditable sectionId={sectionId} settingKey="issue_label" value={issueLabel} />
              </span>
            </>
          )}
        </div>
        <RuleDraw on={on} className="ed-rule-double mt-2 mb-8 md:mb-10">
          <span aria-hidden="true" />
        </RuleDraw>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-10">
          {/* Cover story */}
          <article className={briefs.length > 0 ? "md:col-span-8" : "md:col-span-12"}>
            {(coverImage || showPlaceholders) && (
              <Plate on={on} from="start" className="relative aspect-[16/10] overflow-hidden bg-[var(--vn-band)] mb-6">
                {coverImage ? (
                  <SdkImage
                    src={coverImage}
                    alt={coverAlt}
                    transform={coverTransform}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="https://picsum.photos/seed/manshet-cover-story/1600/1000"
                    alt={coverAlt}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </Plate>
            )}
            <p className="vn-eyebrow text-[hsl(var(--ed-green))] mb-3">
              <InlineEditable sectionId={sectionId} settingKey="kicker" value={kicker} />
            </p>
            <h2 className="ed-hero-title text-[hsl(var(--foreground))] !text-[clamp(2rem,5vw,3.75rem)] mb-4">
              {typeset ? (
                <Typeset on inView lines={headlineLines} />
              ) : (
                <InlineEditable sectionId={sectionId} settingKey="headline" value={headline} multiline />
              )}
            </h2>
            <p className="text-base md:text-lg text-[var(--vn-muted)] max-w-[58ch] leading-relaxed mb-5">
              <InlineEditable sectionId={sectionId} settingKey="standfirst" value={standfirst} multiline />
            </p>
            <Link to={ctaLink} className="ed-ink-link vn-label text-[hsl(var(--foreground))]">
              <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
            </Link>
          </article>

          {/* Briefs — the side column, behind a hairline column rule */}
          {briefs.length > 0 && (
            <aside className="md:col-span-4 ed-column-rule">
              {briefs.map((brief, i) => (
                <Rise key={brief.n} on={on} inView delay={i * 0.1} className={i > 0 ? "pt-5 mt-5 border-t border-[var(--vn-border)]" : ""}>
                  <article>
                    <h3 className="vn-heading text-base md:text-lg mb-1.5">
                      {brief.link ? (
                        <Link to={brief.link} className="ed-ink-link">
                          <InlineEditable sectionId={sectionId} settingKey={`brief_${brief.n}_title`} value={brief.title} />
                        </Link>
                      ) : (
                        <InlineEditable sectionId={sectionId} settingKey={`brief_${brief.n}_title`} value={brief.title} />
                      )}
                    </h3>
                    {brief.text && (
                      <p className="text-sm text-[var(--vn-muted)] leading-relaxed">
                        <InlineEditable sectionId={sectionId} settingKey={`brief_${brief.n}_text`} value={brief.text} multiline />
                      </p>
                    )}
                  </article>
                </Rise>
              ))}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
