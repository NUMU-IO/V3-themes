"use client";
import { useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, localized, useDemo, useInsideEditor, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { RuleDraw, Stamp, Weight, useMotionOn } from "./_motion";

/**
 * Materials & Care (الخامة والعناية) — the trust section. What it's made of
 * and how to keep it alive, as hairline bench-card rows, closed by the wax
 * seal carrying the merchant's guarantee. Kills the second-most-asked chat
 * question ("الخامة ايه؟") on the page. Live stores render nothing until
 * rows are written; the editor shows a leather example.
 */

const DEMO_ROWS = [
  { term: { en: "Leather", ar: "الجلد" }, desc: { en: "Full-grain Egyptian cowhide, vegetable-tanned — darkens beautifully with use.", ar: "جلد بقري مصري كامل، مدبوغ نباتي — بيغمق ويحلو مع الاستعمال." } },
  { term: { en: "Thread", ar: "الخيط" }, desc: { en: "Waxed linen, saddle-stitched. If one stitch ever fails, the seam holds.", ar: "كتان مشمّع بغرزة سراجة. لو غرزة فلتت، الخياطة بتكمل ماسكة." } },
  { term: { en: "Care", ar: "العناية" }, desc: { en: "Wipe with a dry cloth; a drop of leather balm every few months.", ar: "امسحها بقماشة ناشفة، ونقطة بلسم جلد كل كام شهر." } },
];

export default function SkeuMaterials({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();
  const showPlaceholders = demo || inEditor;

  const title = asString(s.title) || localized(locale, "Materials & care", "الخامة والعناية");
  const guarantee =
    asString(s.guarantee_text) ||
    (showPlaceholders ? localized(locale, "Repairs on the house, for life. That's the seal.", "التصليح علينا، مدى الحياة. ده معنى الختم.") : "");

  const rows: Array<{ n: number; term: string; desc: string }> = [];
  for (let i = 1; i <= 6; i++) {
    const term = asString(s[`row_${i}_term`]);
    const desc = asString(s[`row_${i}_desc`]);
    if (term || desc) rows.push({ n: i, term, desc });
  }
  if (rows.length === 0 && showPlaceholders) {
    DEMO_ROWS.forEach((d, i) =>
      rows.push({ n: i + 1, term: localized(locale, d.term.en, d.term.ar), desc: localized(locale, d.desc.en, d.desc.ar) }),
    );
  }
  if (rows.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-[hsl(var(--background))]" style={{ backgroundImage: "var(--skeu-texture)" }}>
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <RuleDraw on={on} className="skeu-rule-double mb-4">
            <span aria-hidden="true" />
          </RuleDraw>
          <h2 className="vn-heading text-3xl md:text-4xl mb-7">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>

          <Weight on={on}>
            <div className="skeu-card px-5 md:px-7 py-2">
              {rows.map((row) => (
                <div key={row.n} className="skeu-care-row">
                  <span className="skeu-care-term">
                    <InlineEditable sectionId={sectionId} settingKey={`row_${row.n}_term`} value={row.term} />
                  </span>
                  <span className="text-[15px] leading-relaxed text-[hsl(var(--foreground))]">
                    <InlineEditable sectionId={sectionId} settingKey={`row_${row.n}_desc`} value={row.desc} multiline />
                  </span>
                </div>
              ))}
            </div>
          </Weight>

          {guarantee && (
            <div className="mt-8 flex items-center gap-4">
              <Stamp on={on} className="shrink-0 -rotate-[6deg]">
                <span className="skeu-seal text-center text-[9px] font-extrabold leading-tight tracking-[0.12em]">
                  {localized(locale, "WARSHA\nSEAL", "ختم\nالورشة")}
                </span>
              </Stamp>
              <p className="text-[15px] font-semibold leading-relaxed max-w-[42ch]">
                <InlineEditable sectionId={sectionId} settingKey="guarantee_text" value={guarantee} multiline />
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
