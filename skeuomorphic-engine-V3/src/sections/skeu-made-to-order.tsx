"use client";
import { useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { Clock, MessageCircle, PenLine } from "lucide-react";
import { asString, localized, useDemo, useInsideEditor, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { RuleDraw, Weight, useMotionOn } from "./_motion";

/**
 * Made to Order (بيتعمل بالطلب) — the artisan's most practical section.
 * States the three things every handmade buyer asks in chat: how long it
 * takes, whether it can be personalised, and how to talk to the maker —
 * with a WhatsApp deep-link CTA (the channel Egyptian craft commerce
 * actually runs on). A stitched kraft card pressed into a walnut band.
 * Live stores render nothing until configured; the editor shows an example.
 */
export default function SkeuMadeToOrder({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const demo = useDemo();
  const inEditor = useInsideEditor();
  const on = useMotionOn();
  const showPlaceholders = demo || inEditor;

  const title = asString(s.title) || localized(locale, "Made to order", "بيتعمل بالطلب");
  const leadTime =
    asString(s.lead_time_text) ||
    (showPlaceholders ? localized(locale, "Your piece is cut and stitched after you order — ready in 5–7 working days.", "قطعتك بتتقص وتتخيط بعد ما تطلب — بتكون جاهزة في ٥–٧ أيام شغل.") : "");
  const personalization =
    asString(s.personalization_text) ||
    (showPlaceholders ? localized(locale, "Add a name, initials or a short line — embossed by hand at no extra cost.", "ضيف اسم أو حروف أو جملة قصيرة — بننقشها بإيدنا من غير تكلفة إضافية.") : "");
  const whatsapp = asString(s.whatsapp_number);
  const buttonLabel = asString(s.button_label) || localized(locale, "Ask the maker on WhatsApp", "اسأل الصنايعي على واتساب");
  const note = asString(s.note);

  // The card earns its place only when the merchant wrote SOMETHING real.
  if (!leadTime && !personalization && !whatsapp && !note) return null;

  const waHref = whatsapp ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}` : "";

  return (
    <section className="py-14 md:py-20 bg-[var(--vn-surface-dark)]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <Weight on={on}>
            <div className="skeu-card skeu-stitch p-6 md:p-9">
              <RuleDraw on={on} className="skeu-rule-double mb-4">
                <span aria-hidden="true" />
              </RuleDraw>
              <h2 className="vn-heading text-2xl md:text-3xl mb-6">
                <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
              </h2>

              <div className="space-y-5">
                {leadTime && (
                  <div className="flex items-start gap-3.5">
                    <span className="skeu-tag !min-w-[2.5rem] !h-10" aria-hidden="true"><Clock size={17} /></span>
                    <p className="text-[15px] leading-relaxed pt-1.5">
                      <InlineEditable sectionId={sectionId} settingKey="lead_time_text" value={leadTime} multiline />
                    </p>
                  </div>
                )}
                {personalization && (
                  <div className="flex items-start gap-3.5">
                    <span className="skeu-tag !min-w-[2.5rem] !h-10" aria-hidden="true"><PenLine size={17} /></span>
                    <p className="text-[15px] leading-relaxed pt-1.5">
                      <InlineEditable sectionId={sectionId} settingKey="personalization_text" value={personalization} multiline />
                    </p>
                  </div>
                )}
              </div>

              {(waHref || showPlaceholders) && (
                <div className="mt-7">
                  <a
                    href={waHref || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="vn-btn text-white gap-2.5"
                    style={{ background: "linear-gradient(180deg, hsl(142 65% 44%), hsl(142 70% 34%))" }}
                    data-testid="made-to-order-whatsapp"
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    <InlineEditable sectionId={sectionId} settingKey="button_label" value={buttonLabel} />
                  </a>
                </div>
              )}

              {note && (
                <p className="mt-5 text-sm text-[var(--vn-muted)] leading-relaxed">
                  <InlineEditable sectionId={sectionId} settingKey="note" value={note} multiline />
                </p>
              )}
            </div>
          </Weight>
        </div>
      </div>
    </section>
  );
}
