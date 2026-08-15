/**
 * gn-contact — contact details and a message form.
 *
 * The form posts natively to the platform's contact endpoint rather than going
 * through fetch: it then works before hydration and with JS disabled, and there
 * is no half-submitted state to design. WhatsApp is listed first because for an
 * Egyptian storefront it is the channel shoppers actually use.
 */

import { asBool, asString } from "@numueg/theme-kit";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconWhatsApp } from "../lib/icons";

export default function GnContact({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();

  const whatsapp = asString(s.whatsapp);
  const phone = asString(s.phone);
  const email = asString(s.email);
  const hours = asString(s.hours);
  const mapEmbed = asString(s.map_embed);

  return (
    <section className="gn-contact">
      <div className="gn-container gn-plp-head">
        <h1 className="gn-page-title">{asString(s.heading) || t("contact.heading", "Contact")}</h1>
        {asString(s.intro) && <p className="gn-plp-desc">{asString(s.intro)}</p>}
      </div>

      <div className="gn-container gn-contact-grid">
        <div className="gn-contact-details">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
              className="gn-btn gn-btn-outline gn-contact-wa"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconWhatsApp size={18} />
              {t("contact.whatsapp_cta", "Message us on WhatsApp")}
            </a>
          )}

          <dl className="gn-contact-list">
            {phone && (
              <div className="gn-contact-item">
                <dt className="gn-label">{t("contact.phone", "Phone")}</dt>
                <dd>
                  <a href={`tel:${phone.replace(/\s+/g, "")}`} className="gn-footer-link">
                    {phone}
                  </a>
                </dd>
              </div>
            )}
            {email && (
              <div className="gn-contact-item">
                <dt className="gn-label">{t("contact.email", "Email")}</dt>
                <dd>
                  <a href={`mailto:${email}`} className="gn-footer-link">
                    {email}
                  </a>
                </dd>
              </div>
            )}
            {hours && (
              <div className="gn-contact-item">
                <dt className="gn-label">{t("contact.hours", "Hours")}</dt>
                <dd>{hours}</dd>
              </div>
            )}
          </dl>

          {mapEmbed && (
            <div
              className="gn-contact-map"
              // Merchant-supplied embed URL only — an <iframe src>, never raw
              // HTML, so there is no injection surface here.
            >
              <iframe
                src={mapEmbed}
                title={t("contact.map", "Map")}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>

        {asBool(s.show_form, true) && (
          <form className="gn-contact-form" action="/api/contact" method="post">
            <label className="gn-field">
              <span className="gn-label">{t("contact.name", "Name")}</span>
              <input name="name" className="gn-input" required autoComplete="name" />
            </label>
            <label className="gn-field">
              <span className="gn-label">{t("contact.email", "Email")}</span>
              <input name="email" type="email" className="gn-input" required autoComplete="email" />
            </label>
            <label className="gn-field">
              <span className="gn-label">{t("contact.phone", "Phone")}</span>
              <input
                name="phone"
                type="tel"
                className="gn-input"
                autoComplete="tel"
                // Egyptian mobile format — accepted, not enforced, so an
                // international customer is never locked out of the form.
                placeholder="01xxxxxxxxx"
              />
            </label>
            <label className="gn-field">
              <span className="gn-label">{t("contact.message", "Message")}</span>
              <textarea name="message" rows={5} className="gn-input gn-textarea" required />
            </label>
            <button type="submit" className="gn-btn gn-btn-primary">
              {t("contact.send", "Send")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
