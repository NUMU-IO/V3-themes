"use client";
import { useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asImageAlt,
  asImageUrl,
  asString,
  localized,
  useDemo,
  useInsideEditor,
  type SectionRenderProps,
} from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Develop, RuleDraw, Weight, useMotionOn } from "./_motion";

/**
 * How It's Made (رحلة الصنعة) — Warsha's signature storytelling section.
 * The craft process as numbered steps: brass-tag numbers (a REAL sequence,
 * not decoration), kraft step cards set down with Weight, process photos
 * developing like instant prints. Handmade buyers buy the story — this
 * section is where the merchant tells it. Live stores render nothing until
 * steps are written; the editor shows a leather-goods example.
 */

const DEMO_STEPS = [
  {
    title: { en: "Cut from full-grain hide", ar: "قصّ من جلد طبيعي كامل" },
    text: { en: "Each panel is hand-cut from a single hide, so the grain runs unbroken.", ar: "كل جزء بيتقص بإيدنا من فرخ جلد واحد، علشان النقشة تفضل متواصلة." },
    image: "https://picsum.photos/seed/warsha-cut/700/500",
  },
  {
    title: { en: "Saddle-stitched by hand", ar: "خياطة سراجة يدوي" },
    text: { en: "Two needles, one waxed thread — a seam that outlives any machine stitch.", ar: "إبرتين وخيط مشمّع واحد — غرزة بتعيش أطول من أي مكنة." },
    image: "https://picsum.photos/seed/warsha-stitch/700/500",
  },
  {
    title: { en: "Burnished & signed", ar: "تشطيب وتوقيع" },
    text: { en: "Edges burnished with beeswax, then every piece gets the maker's stamp.", ar: "الحواف بتتصقل بشمع العسل، وكل قطعة بتاخد ختم الصنايعي." },
    image: "https://picsum.photos/seed/warsha-finish/700/500",
  },
];

export default function SkeuProcess({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();
  const showPlaceholders = demo || inEditor;

  const title = asString(s.title) || localized(locale, "How it's made", "رحلة الصنعة");
  const intro = asString(s.intro);

  const steps: Array<{ n: number; title: string; text: string; image: string; alt: string }> = [];
  for (let i = 1; i <= 5; i++) {
    const st = asString(s[`step_${i}_title`]);
    const tx = asString(s[`step_${i}_text`]);
    if (!st && !tx) continue;
    steps.push({
      n: i,
      title: st,
      text: tx,
      image: asImageUrl(s[`step_${i}_image`]),
      alt: asImageAlt(s[`step_${i}_image`]) || st,
    });
  }
  if (steps.length === 0 && showPlaceholders) {
    DEMO_STEPS.forEach((d, i) =>
      steps.push({
        n: i + 1,
        title: localized(locale, d.title.en, d.title.ar),
        text: localized(locale, d.text.en, d.text.ar),
        image: d.image,
        alt: localized(locale, d.title.en, d.title.ar),
      }),
    );
  }
  if (steps.length === 0) return null;

  const numberFor = (i: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(i + 1);

  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--background))]" style={{ backgroundImage: "var(--skeu-texture)" }}>
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-10 md:mb-14">
          <RuleDraw on={on} className="skeu-rule-double mb-4">
            <span aria-hidden="true" />
          </RuleDraw>
          <h2 className="vn-heading text-3xl md:text-4xl">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>
          {intro && (
            <p className="mt-3 text-[var(--vn-muted)] leading-relaxed max-w-[52ch]">
              <InlineEditable sectionId={sectionId} settingKey="intro" value={intro} multiline />
            </p>
          )}
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 list-none m-0 p-0">
          {steps.map((step, i) => (
            <Weight key={step.n} on={on} delay={(i % 3) * 0.12}>
              <li className="skeu-card p-5 md:p-6 h-full">
                {step.image && (
                  <Develop on={on} delay={(i % 3) * 0.12 + 0.15} className="skeu-print mb-5 -rotate-[0.6deg]">
                    <img src={step.image} alt={step.alt} loading="lazy" className="w-full aspect-[7/5] object-cover" />
                  </Develop>
                )}
                <div className="flex items-start gap-3">
                  <span className="skeu-tag shrink-0" aria-hidden="true">{numberFor(i)}</span>
                  <div>
                    <h3 className="vn-heading text-lg md:text-xl mb-1.5">
                      <InlineEditable sectionId={sectionId} settingKey={`step_${step.n}_title`} value={step.title} />
                    </h3>
                    {step.text && (
                      <p className="text-sm text-[var(--vn-muted)] leading-relaxed">
                        <InlineEditable sectionId={sectionId} settingKey={`step_${step.n}_text`} value={step.text} multiline />
                      </p>
                    )}
                  </div>
                </div>
              </li>
            </Weight>
          ))}
        </ol>
      </div>
    </section>
  );
}
