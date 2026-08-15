/**
 * gn-footer — Genova global chrome.
 *
 * Anatomy (matches the reference's footer system):
 *   ┌ trust row      — fast shipping · customer service · secure payment
 *   ├ main grid      — about + contact · link columns (blocks) · newsletter
 *   └ base bar       — socials · payment marks · credit
 *
 * Link columns are BLOCKS, not settings, so a merchant can add a column and
 * reorder links from the customizer. They are read through `useInheritedChrome`
 * so a template added by a future theme update inherits the merchant's authored
 * columns instead of silently falling back to the theme defaults.
 */

import { Link, useShop } from "@numueg/theme-sdk";
import { asBool, asString } from "@numueg/theme-kit";
import {
  cx,
  readBlockNodes,
  useInheritedChrome,
  type SectionRenderProps,
} from "../lib/shared";
import { PaymentMarks } from "../lib/payment-marks";
import {
  IconArrowRight,
  IconFacebook,
  IconHeadset,
  IconInstagram,
  IconShield,
  IconTikTok,
  IconTruck,
  IconWhatsApp,
} from "../lib/icons";
import { useT } from "../lib/i18n";

/** Inline fallbacks. `t` renders the raw KEY when the fallback is empty, so
 *  every call site must pass a real string — never "". */
const TRUST_FALLBACK: Record<string, { title: string; text: string }> = {
  shipping: { title: "Fast shipping", text: "Delivered in 2–5 days across Egypt" },
  service: { title: "Here to help", text: "Message us on WhatsApp for sizing help" },
  payment: { title: "Secure payment", text: "Card, InstaPay or cash on delivery" },
};
const ABOUT_FALLBACK =
  "Denim made for real Egyptian bodies. Cut, washed and finished to fit — then worn until it earns its creases.";
const NEWSLETTER_FALLBACK = "New drops and restocks, before anyone else.";

const TRUST_ICONS = {
  shipping: IconTruck,
  service: IconHeadset,
  payment: IconShield,
} as const;

export default function GnFooter({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const shop = useShop();
  const t = useT();

  const withColumns = useInheritedChrome(instance, "gn-footer", "column");
  const columns = readBlockNodes(withColumns, "column")
    .map((col, i) => ({
      id: `col-${i}`,
      title: asString(col.settings.title),
      links: readBlockNodes(col, "link").map((l, li) => ({
        id: `col-${i}-${li}`,
        label: asString(l.settings.label),
        url: asString(l.settings.link, "/"),
      })),
    }))
    // Drop empty columns. The platform's preset seeder copies only a block's
    // `type` + `settings` and ignores nested children, so a freshly-seeded
    // store gets columns WITH titles and NO links. Rendering those is a row of
    // headings over nothing — worse than the column being absent until the
    // merchant adds links.
    .filter((col) => col.links.length > 0);

  // Schema `default`s are seeded by the backend, not present on the instance at
  // render time — so these fall back to the bilingual locale bundle. Without it
  // a bare preset renders three empty trust slots and a nameless footer.
  const trust = (["shipping", "service", "payment"] as const)
    .map((key) => ({
      key,
      Icon: TRUST_ICONS[key],
      title: asString(s[`trust_${key}_title`]) || t(`footer.trust_${key}_title`, TRUST_FALLBACK[key].title),
      text: asString(s[`trust_${key}_text`]) || t(`footer.trust_${key}_text`, TRUST_FALLBACK[key].text),
    }))
    .filter((item) => item.title || item.text);

  const aboutText = asString(s.about_text) || t("footer.about_text", ABOUT_FALLBACK);
  const newsletterSubtitle =
    asString(s.newsletter_subtitle) || t("footer.newsletter_subtitle", NEWSLETTER_FALLBACK);

  const socials = [
    { key: "instagram", url: asString(s.social_instagram), Icon: IconInstagram, label: "Instagram" },
    { key: "tiktok", url: asString(s.social_tiktok), Icon: IconTikTok, label: "TikTok" },
    { key: "facebook", url: asString(s.social_facebook), Icon: IconFacebook, label: "Facebook" },
  ].filter((x) => x.url);

  const phone = asString(s.contact_phone);
  const email = asString(s.contact_email);
  const whatsapp = asString(s.contact_whatsapp);
  const brand = shop?.name ?? "Genova";

  return (
    // See the note on the header's role="banner" — <footer> only maps to
    // contentinfo when its nearest sectioning ancestor is <body>.
    <footer className="gn-footer" role="contentinfo">
      {asBool(s.show_trust_row, true) && trust.length > 0 && (
        <div className="gn-footer-trust">
          <div className="gn-container gn-footer-trust-inner">
            {trust.map(({ key, Icon, title, text }) => (
              <div key={key} className="gn-trust-item">
                <Icon size={22} />
                <div>
                  <p className="gn-trust-title">{title}</p>
                  {text && <p className="gn-trust-text">{text}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gn-container gn-footer-main">
        <div className="gn-footer-about">
          <p className="gn-footer-brand">{brand}</p>
          {aboutText && <p className="gn-footer-text">{aboutText}</p>}
          <div className="gn-footer-contact">
            {phone && (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="gn-footer-link">
                {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="gn-footer-link">
                {email}
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                className="gn-footer-link gn-footer-wa"
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWhatsApp size={16} />
                {t("general.whatsapp", "WhatsApp")}
              </a>
            )}
          </div>
        </div>

        {columns.map((col) => (
          <nav key={col.id} className="gn-footer-col" aria-label={col.title || undefined}>
            {col.title && <p className="gn-label gn-footer-col-title">{col.title}</p>}
            {col.links.map((l) => (
              <Link key={l.id} to={l.url} className="gn-footer-link">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}

        {asBool(s.show_newsletter, true) && (
          <div className="gn-footer-news">
            <p className="gn-label gn-footer-col-title">
              {asString(s.newsletter_title, t("footer.newsletter_title", "Join the list"))}
            </p>
            {newsletterSubtitle && <p className="gn-footer-text">{newsletterSubtitle}</p>}
            {/* Posts to the platform's newsletter endpoint. Native form submit,
                so it still works with JS disabled or before hydration. */}
            <form className="gn-news-form" action="/api/newsletter" method="post">
              <label className="gn-sr-only" htmlFor="gn-news-email">
                {t("footer.email", "Email")}
              </label>
              <input
                id="gn-news-email"
                type="email"
                name="email"
                required
                className="gn-news-input"
                placeholder={t("footer.email", "Email")}
              />
              <button
                type="submit"
                className="gn-news-submit"
                aria-label={t("footer.subscribe", "Subscribe")}
              >
                <IconArrowRight size={18} />
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="gn-footer-base">
        <div className={cx("gn-container", "gn-footer-base-inner")}>
          {socials.length > 0 && (
            <div className="gn-footer-socials">
              {socials.map(({ key, url, Icon, label }) => (
                <a
                  key={key}
                  href={url}
                  className="gn-icon-btn"
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          )}

          {asBool(s.show_payment_marks, true) && <PaymentMarks />}

          <p className="gn-footer-credit">
            {asString(s.credit_text, `© ${brand}`)}
          </p>
        </div>
      </div>
    </footer>
  );
}
