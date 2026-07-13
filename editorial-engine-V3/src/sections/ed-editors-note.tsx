"use client";
import { useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, localized, useDemo, useInsideEditor, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Rise, RuleDraw, useMotionOn } from "./_motion";

/**
 * Editor's Note (كلمة المحرر) — a short letter from the merchant, set like a
 * magazine editorial: narrow measure, oversized DROP CAP on the first
 * paragraph, gold foil rule, small-caps byline. This is the brand-voice
 * section: where other themes put an "about blurb card", Manshet prints a
 * signed column.
 */

const FALLBACK_BODY = {
  en: "Every piece in this store was chosen the way an editor chooses a cover: it has to earn the page. We cut what didn't, and kept what you'll wear until the seams give.",
  ar: "كل قطعة في المتجر اتاختارت زي ما المحرر بيختار الغلاف: لازم تستاهل الصفحة. شلنا اللي ما يستاهلش، وسبنا اللي هتلبسه لحد ما الخيط يفك.",
};

export default function EdEditorsNote({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();

  const kicker = asString(s.kicker) || localized(locale, "Editor's note", "كلمة المحرر");
  const configuredBody = asString(s.body);
  const body =
    configuredBody || (demo || inEditor ? localized(locale, FALLBACK_BODY.en, FALLBACK_BODY.ar) : "");
  const bylineName = asString(s.byline_name);
  const bylineRole = asString(s.byline_role);

  // A live store with no note written renders nothing.
  if (!body) return null;

  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <section className="py-16 md:py-24 bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        <div className="max-w-[62ch] mx-auto">
          <p className="vn-eyebrow text-[hsl(var(--ed-green))] mb-3">
            <InlineEditable sectionId={sectionId} settingKey="kicker" value={kicker} />
          </p>
          <RuleDraw on={on} className="ed-foil-rule !w-16 mb-7">
            <span aria-hidden="true" />
          </RuleDraw>

          <Rise on={on} inView y={16}>
            <div className="ed-editors-body">
              {inEditor ? (
                // Editing needs one contiguous editable block; the drop cap
                // still applies to the wrapper's first letter.
                <p className="ed-dropcap">
                  <InlineEditable sectionId={sectionId} settingKey="body" value={body} multiline />
                </p>
              ) : (
                paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? "ed-dropcap" : undefined}>
                    {p}
                  </p>
                ))
              )}
            </div>
            {(bylineName || bylineRole) && (
              <footer className="mt-7 flex items-baseline gap-2 vn-label">
                {bylineName && (
                  <span className="text-[hsl(var(--foreground))]">
                    <InlineEditable sectionId={sectionId} settingKey="byline_name" value={bylineName} />
                  </span>
                )}
                {bylineRole && (
                  <span className="text-[var(--vn-muted)]">
                    <InlineEditable sectionId={sectionId} settingKey="byline_role" value={bylineRole} />
                  </span>
                )}
              </footer>
            )}
          </Rise>
        </div>
      </div>
    </section>
  );
}
