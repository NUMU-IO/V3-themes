/**
 * tn-faq — questions and answers, grouped.
 *
 * `<details>` again, for the reason spelled out in lib/accordion.tsx: Chrome
 * and Edge auto-expand one to reveal a find-in-page hit, so a shopper pressing
 * Ctrl+F for "استرجاع" or "delivery" finds the answer even though the panel is
 * closed. A JS-collapsed FAQ is invisible to the browser's own search, which is
 * the single most common way people use an FAQ page.
 *
 * Groups are optional. A theme that demanded them would make a five-question
 * FAQ into a one-group FAQ with a redundant heading, so a group with no title
 * simply renders its questions with no header above them.
 */

import { sanitizeHtml, useResolvedSettings, Link } from "@numueg/theme-sdk";
import { asString, readBlockNodes, useInsideEditor, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { Accordion } from "../lib/accordion";

export default function TnFaq({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const insideEditor = useInsideEditor();

  const groups = readBlockNodes(instance, "group").map((node) => ({
    title: asString(node.settings.title),
    items: readBlockNodes(node, "qa")
      .map((qa) => ({
        question: asString(qa.settings.question),
        answer: asString(qa.settings.answer),
      }))
      .filter((qa) => qa.question),
  }));

  // Questions parked directly on the section, for merchants who never open a
  // group. Same treatment, no header.
  const loose = readBlockNodes(instance, "qa")
    .map((qa) => ({ question: asString(qa.settings.question), answer: asString(qa.settings.answer) }))
    .filter((qa) => qa.question);

  const all = [...(loose.length ? [{ title: "", items: loose }] : []), ...groups].filter(
    (g) => g.items.length > 0,
  );

  if (all.length === 0) {
    return insideEditor ? (
      <section className="tn-container tn-section">
        <div className="tn-editor-note">
          <p className="tn-label">{t("editor.faq_note_title", "No questions yet")}</p>
          <p className="tn-footer-text">
            {t("editor.faq_note", "Add a question and its answer. Group them once you have more than a handful.")}
          </p>
        </div>
      </section>
    ) : null;
  }

  return (
    <section className="tn-section tn-faq">
      <div className="tn-container tn-faq-inner">
        <header className="tn-plp-intro">
          <h1 className="tn-plp-title">{asString(s.heading) || t("faq.heading", "Questions")}</h1>
          {asString(s.intro) ? <p className="tn-plp-subtitle">{asString(s.intro)}</p> : null}
        </header>

        {all.map((group, gi) => (
          <div className="tn-faq-group" key={`${group.title}-${gi}`}>
            {group.title ? <h2 className="tn-faq-grouptitle">{group.title}</h2> : null}
            {group.items.map((qa, qi) => (
              <Accordion key={`${qa.question}-${qi}`} title={qa.question}>
                <div
                  className="tn-richtext"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(qa.answer) }}
                />
              </Accordion>
            ))}
          </div>
        ))}

        {asString(s.contact_text) ? (
          <p className="tn-faq-contact">
            {asString(s.contact_text)}{" "}
            <Link to={asString(s.contact_link, "/contact")} className="tn-textlink">
              {asString(s.contact_link_text) || t("faq.contact_cta", "Talk to us")}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
