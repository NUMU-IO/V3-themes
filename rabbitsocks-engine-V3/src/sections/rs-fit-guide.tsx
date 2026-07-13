"use client";
import { useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, localized, useDemo, useInsideEditor, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Rise, RuleDraw, useMotionOn } from "./_motion";

/**
 * Fit Guide (دليل المقاسات) — a proper size chart as a SECTION, not a PDF
 * screenshot. Hairline gallery table with up to four merchant-labelled
 * columns and eight rows, plus a note line (e.g. "between sizes? size up").
 * The single most-asked question in apparel chat ("هو مقاسه ايه؟") answered
 * on the page. Live stores render nothing until rows are filled; the editor
 * shows a sock-sizing example so merchants see the format.
 */

const DEMO = {
  cols: { en: ["Size", "EU", "UK", "Foot (cm)"], ar: ["المقاس", "أوروبي", "بريطاني", "القدم (سم)"] },
  rows: [
    ["S", "35–38", "2.5–5", "22–24"],
    ["M", "39–42", "5.5–8", "24–26"],
    ["L", "43–46", "8.5–11", "26–28"],
  ],
};

export default function RsFitGuide({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();
  const showPlaceholders = demo || inEditor;

  const title = asString(s.title) || localized(locale, "Fit guide", "دليل المقاسات");
  const note = asString(s.note);

  // Columns: merchant labels, up to 4; default to the sock template labels.
  const demoCols = locale === "ar" ? DEMO.cols.ar : DEMO.cols.en;
  const cols: string[] = [];
  for (let c = 1; c <= 4; c++) {
    const v = asString(s[`col_${c}_label`]);
    if (v) cols.push(v);
  }
  const effectiveCols = cols.length >= 2 ? cols : showPlaceholders ? demoCols : [];

  // Rows: row_N_c1..c4 (up to 8). A row exists when its first cell is set.
  const rows: string[][] = [];
  for (let r = 1; r <= 8; r++) {
    const first = asString(s[`row_${r}_c1`]);
    if (!first) continue;
    rows.push([first, asString(s[`row_${r}_c2`]), asString(s[`row_${r}_c3`]), asString(s[`row_${r}_c4`])].slice(0, effectiveCols.length || 4));
  }
  const effectiveRows = rows.length > 0 ? rows : showPlaceholders ? DEMO.rows : [];

  if (effectiveCols.length === 0 || effectiveRows.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <RuleDraw on={on} className="rs-rule-double mb-4">
            <span aria-hidden="true" />
          </RuleDraw>
          <h2 className="vn-heading text-3xl md:text-4xl mb-6">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </h2>

          <Rise on={on} inView y={16}>
            <div className="overflow-x-auto">
              <table className="rs-fit-table">
                <thead>
                  <tr>
                    {effectiveCols.map((c, i) => (
                      <th key={i} scope="col">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {effectiveRows.map((row, ri) => (
                    <tr key={ri}>
                      {effectiveCols.map((_, ci) => (
                        <td key={ci} className={ci === 0 ? "font-bold" : undefined}>
                          {row[ci] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(note || showPlaceholders) && (
              <p className="mt-4 text-sm text-[var(--vn-muted)] leading-relaxed">
                <InlineEditable
                  sectionId={sectionId}
                  settingKey="note"
                  value={note || localized(locale, "Between sizes? Size up — they relax with wear.", "بين مقاسين؟ خد الأكبر، بتوسّع مع اللبس.")}
                  multiline
                />
              </p>
            )}
          </Rise>
        </div>
      </div>
    </section>
  );
}
