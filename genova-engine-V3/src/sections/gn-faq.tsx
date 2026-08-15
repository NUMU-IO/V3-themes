/**
 * gn-faq — grouped questions and answers.
 *
 * Nested blocks: `group` → `qa`. Built on the shared `<details>` accordion, so
 * a closed answer is still findable by the browser's own in-page search — a
 * div-based accordion hides its content from Ctrl+F entirely, which on an FAQ
 * page is the one thing you must not do.
 */

import { asBool, asString } from "@numueg/theme-kit";
import { readBlockNodes, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { AccordionItem } from "../lib/accordion";
import { Link } from "@numueg/theme-sdk";

export default function GnFaq({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();

  const groups = readBlockNodes(instance, "group")
    .map((g, i) => ({
      id: `g-${i}`,
      title: asString(g.settings.title),
      items: readBlockNodes(g, "qa").map((qa, j) => ({
        id: `g-${i}-${j}`,
        q: asString(qa.settings.question),
        a: asString(qa.settings.answer),
      })),
    }))
    // Same reason as the footer's empty columns: the preset seeder drops nested
    // blocks, so a seeded group can arrive with a title and no questions.
    .filter((g) => g.items.length > 0);

  const total = groups.reduce((n, g) => n + g.items.length, 0);


  return (
    // FAQPage MICRODATA, not JSON-LD. The BYOT contract forbids inline script
    // elements in theme source (marketplace AST scanner + CSP), and routing
    // around a security gate with an "inert" payload is the wrong instinct.
    // Microdata needs no script element AND annotates the VISIBLE text, so the
    // structured data can never drift from what the shopper actually reads —
    // which is the failure mode Google issues manual actions for.
    // Only claim FAQPage when there ARE questions. A fresh activation ships
    // this section empty, and an empty FAQPage is invalid structured data
    // asserting something the page does not contain.
    <section
      className="gn-faq"
      {...(total > 0
        ? { itemScope: true, itemType: "https://schema.org/FAQPage" }
        : {})}
    >
      <div className="gn-container gn-plp-head">
        <h1 className="gn-page-title">{asString(s.heading) || t("faq.heading", "FAQ")}</h1>
      </div>

      <div className="gn-container gn-faq-body">
        {total === 0 ? (
          <p className="gn-empty-hint">{t("faq.empty", "No questions added yet.")}</p>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="gn-faq-group">
              {asBool(s.show_group_headings, true) && group.title && (
                <h2 className="gn-section-heading gn-faq-group-title">{group.title}</h2>
              )}
              {/* Every answer starts closed, including the first — an FAQ that
                  opens one item makes the rest look already answered. */}
              {group.items.map((item) => (
                <div
                  key={item.id}
                  itemScope
                  itemProp="mainEntity"
                  itemType="https://schema.org/Question"
                >
                  <AccordionItem title={item.q} defaultOpen={false} nameProp>
                    <div
                      itemScope
                      itemProp="acceptedAnswer"
                      itemType="https://schema.org/Answer"
                    >
                      <p itemProp="text">{item.a}</p>
                    </div>
                  </AccordionItem>
                </div>
              ))}
            </div>
          ))
        )}

        {asString(s.contact_text) && (
          <p className="gn-faq-contact">
            {asString(s.contact_text)}{" "}
            <Link to={asString(s.contact_link, "/contact")} className="gn-textlink">
              {t("faq.contact_link", "Get in touch")}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
