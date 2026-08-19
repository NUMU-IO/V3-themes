/**
 * tn-contact — how to reach the store.
 *
 * WhatsApp first, deliberately: on an Egyptian store it is the channel people
 * actually use, and it is the one that works from a phone with no email client
 * set up. Phone and email sit beside it, and the form is LAST — and optional.
 *
 * ## The form is hidden unless it has somewhere to go
 *
 * NUMU has no contact-form endpoint. There is no `/api/contact`, no
 * `/storefront/store/{id}/contact`, nothing — the same gap the newsletter has.
 * A form posting to a route that does not exist looks like it works and drops
 * every message, so this one requires a `form_action` URL (Formspree, Getform,
 * a Google Form, the merchant's own handler) and hides itself with an
 * editor-only explanation when there isn't one.
 *
 * The map is an `iframe src` from a URL setting, never a raw-HTML embed field:
 * `sanitizeHtml` strips iframes, so a paste-your-embed-code setting would look
 * accepted in the editor and render nothing on the storefront.
 *
 * ## The store's own details are the default
 *
 * A merchant who filled in Settings → Contact has ALREADY told NUMU their
 * WhatsApp, phone and email — `store.social_links.whatsapp`,
 * `store.contact_phone`, `store.contact_email`. Ignoring them and waiting for
 * the same three values to be typed a second time into section settings is how
 * a live QA pass found this page rendering a heading and nothing else on a
 * store that had all three on file.
 *
 * So each field falls back to the store's. This is not the invention the
 * comment below warns against — inventing means making up a number nobody
 * gave us; this is using the number the merchant already gave us. A section
 * setting still wins when it is filled in, so a store that wants a different
 * number on this page can have one.
 */

import { sanitizeHtml, useResolvedSettings, useShop } from "@numueg/theme-sdk";
import { useMemo } from "react";
import { asBool, asString, useInsideEditor, waLink, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconArrowUpRight, IconWhatsApp } from "../lib/icons";

/**
 * The contact fields the platform stores on every store. The SDK's `Store`
 * type declares `social_links` but not these two, and its own docs say to
 * narrow store-level values at the read site — so that is done here rather
 * than by loosening the shared type.
 */
interface StoreContact {
  contact_email?: string | null;
  contact_phone?: string | null;
  social_links?: Record<string, string> | null;
}

export default function TnContact({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const insideEditor = useInsideEditor();
  const shop = useShop() as unknown as StoreContact | null;

  const intro = asString(s.intro);
  const safeIntro = useMemo(() => sanitizeHtml(intro), [intro]);
  // Section setting first, then whatever the merchant already gave NUMU.
  const whatsapp = waLink(asString(s.whatsapp) || (shop?.social_links?.whatsapp ?? ""));
  const phone = asString(s.phone) || (shop?.contact_phone ?? "");
  const email = asString(s.email) || (shop?.contact_email ?? "");
  const hours = asString(s.hours);
  const mapUrl = asString(s.map_url);
  const formAction = asString(s.form_action);
  const showForm = asBool(s.show_form, true) && Boolean(formAction);
  const hasAnyMethod = Boolean(whatsapp || phone || email || hours);

  return (
    <section className="tn-section tn-contact">
      <div className="tn-container">
        <header className="tn-plp-intro">
          <h1 className="tn-plp-title">{asString(s.heading) || t("contact.heading", "Get in touch")}</h1>
          {intro ? (
            <div className="tn-plp-editorial" dangerouslySetInnerHTML={{ __html: safeIntro }} />
          ) : null}
        </header>

        {/* A page with a heading and nothing under it is what a fresh install
            looks like until the merchant fills something in. Nothing is
            invented here — a made-up phone number would be far worse — but the
            editor is told what is missing. */}
        {!hasAnyMethod && insideEditor && (
          <div className="tn-editor-note">
            <p className="tn-label">{t("editor.contact_empty_title", "No way to reach you yet")}</p>
            <p className="tn-footer-text">
              {t(
                "editor.contact_empty",
                "Add a WhatsApp number, a phone number or an email and they appear here as cards.",
              )}
            </p>
          </div>
        )}

        <div className="tn-contact-grid">
          <div className="tn-contact-methods">
            {whatsapp && (
              <a
                className="tn-card tn-contact-method is-whatsapp"
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWhatsApp size={20} />
                <span className="tn-contact-methodbody">
                  <span className="tn-contact-methodlabel">{t("contact.whatsapp", "WhatsApp")}</span>
                  <span className="tn-contact-methodvalue">
                    {asString(s.whatsapp_label) || t("contact.whatsapp_cta", "Message us")}
                  </span>
                </span>
                <IconArrowUpRight size={14} className="tn-flip-rtl" />
              </a>
            )}

            {phone && (
              <a className="tn-card tn-contact-method" href={`tel:${phone.replace(/\s+/g, "")}`}>
                <span className="tn-contact-methodbody">
                  <span className="tn-contact-methodlabel">{t("contact.phone", "Phone")}</span>
                  {/* `dir="ltr"` so an Egyptian number keeps its digits in order
                      inside an Arabic page — without it the leading 0 and the
                      country code swap ends and the number is unusable. */}
                  <span className="tn-contact-methodvalue" dir="ltr">
                    {phone}
                  </span>
                </span>
              </a>
            )}

            {email && (
              <a className="tn-card tn-contact-method" href={`mailto:${email}`}>
                <span className="tn-contact-methodbody">
                  <span className="tn-contact-methodlabel">{t("contact.email", "Email")}</span>
                  <span className="tn-contact-methodvalue" dir="ltr">
                    {email}
                  </span>
                </span>
              </a>
            )}

            {hours && (
              <div className="tn-card tn-contact-method is-static">
                <span className="tn-contact-methodbody">
                  <span className="tn-contact-methodlabel">{t("contact.hours", "Hours")}</span>
                  <span className="tn-contact-methodvalue">{hours}</span>
                </span>
              </div>
            )}
          </div>

          {showForm ? (
            <form className="tn-card tn-contact-form" action={formAction} method="post">
              <label className="tn-contact-field">
                <span className="tn-contact-fieldlabel">{t("contact.name", "Your name")}</span>
                <input className="tn-input" name="name" required autoComplete="name" />
              </label>
              <label className="tn-contact-field">
                <span className="tn-contact-fieldlabel">{t("contact.your_email", "Email")}</span>
                <input className="tn-input" type="email" name="email" required autoComplete="email" />
              </label>
              <label className="tn-contact-field">
                <span className="tn-contact-fieldlabel">{t("contact.message", "Message")}</span>
                <textarea className="tn-input tn-contact-textarea" name="message" rows={5} required />
              </label>
              <button type="submit" className="tn-btn tn-btn-dark">
                {t("contact.send", "Send")}
                <IconArrowUpRight size={14} className="tn-flip-rtl" />
              </button>
            </form>
          ) : insideEditor ? (
            <div className="tn-editor-note">
              <p className="tn-label">{t("editor.contact_note_title", "Contact form is hidden")}</p>
              <p className="tn-footer-text">
                {t(
                  "editor.contact_note",
                  "Add a form endpoint and the form appears. Without one the messages have nowhere to go, so shoppers never see it — WhatsApp and phone still work.",
                )}
              </p>
            </div>
          ) : null}
        </div>

        {mapUrl && (
          <div className="tn-contact-map">
            <iframe
              src={mapUrl}
              title={t("contact.map", "Where to find us")}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </section>
  );
}
