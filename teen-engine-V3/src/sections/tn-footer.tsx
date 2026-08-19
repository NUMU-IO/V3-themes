/**
 * tn-footer — a single rounded white panel, hairline-outlined like every other
 * surface in Teen.
 *
 *   newsletter (centred)
 *   ── rule ──
 *   3 columns ≥750px  ·  <details> accordion rows below that
 *   ── rule ──
 *   copyright · payment badges
 *
 * The columns are heterogeneous by design — the reference's three are social
 * icons, quick links and a block of brand copy — so a `column` block carries a
 * `kind` rather than the theme guessing from whether it has children.
 */

import { useEffect, useState } from "react";
import { Link, useResolvedSettings, useShop, useThemeSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asString,
  cx,
  readBlockNodes,
  useInheritedChrome,
  useInsideEditor,
  useIsMobile,
  type BlockNode,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { PaymentMarks } from "../lib/payment-marks";
import {
  IconArrowUpRight,
  IconFacebook,
  IconInstagram,
  IconTikTok,
  IconWhatsApp,
} from "../lib/icons";

function ColumnBody({ node }: { node: BlockNode }) {
  const themeSettings = useThemeSettings();
  const globals = (themeSettings?.global_settings ?? {}) as Record<string, unknown>;
  const kind = asString(node.settings.kind, "links");

  if (kind === "socials") {
    const socials: Array<[string, string, React.ReactNode]> = [
      ["Instagram", asString(globals.social_instagram), <IconInstagram key="ig" size={24} />],
      ["Facebook", asString(globals.social_facebook), <IconFacebook key="fb" size={24} />],
      ["TikTok", asString(globals.social_tiktok), <IconTikTok key="tt" size={24} />],
      ["WhatsApp", asString(globals.social_whatsapp), <IconWhatsApp key="wa" size={24} />],
    ];
    const shown = socials.filter(([, url]) => Boolean(url));
    if (shown.length === 0) return null;
    return (
      <div className="tn-footer-socials">
        {shown.map(([label, url, icon]) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="tn-icon-btn"
            aria-label={label}
          >
            {icon}
          </a>
        ))}
      </div>
    );
  }

  if (kind === "text") {
    const text = asString(node.settings.text);
    return text ? <p className="tn-footer-text">{text}</p> : null;
  }

  const links = readBlockNodes(node, "link");
  if (links.length === 0) return null;
  return (
    <ul className="tn-footer-links">
      {links.map((l, i) => (
        <li key={i}>
          <Link to={asString(l.settings.url, "/")} className="tn-footer-link">
            {asString(l.settings.label)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function TnFooter({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const shop = useShop();
  const t = useT();
  const isMobile = useIsMobile();
  const insideEditor = useInsideEditor();

  const withColumns = useInheritedChrome(instance, "tn-footer", "column");
  const columns = readBlockNodes(withColumns, "column");

  const accordion = asBool(s.mobile_accordion, true) && isMobile;

  // ── Newsletter ──────────────────────────────────────────────────────────
  // NUMU has no storefront newsletter endpoint — there is no `/api/newsletter`
  // on the host and no subscribe route on the API (the only "subscribe" is
  // per-product back-in-stock). A form that posts nowhere loses every address
  // a shopper types, silently, forever. So the block renders only once the
  // merchant has given it somewhere real to post; in the editor it says so
  // instead of just vanishing.
  const newsletterAction = asString(s.newsletter_action);
  const wantsNewsletter = asBool(s.show_newsletter, true);
  const showNewsletter = wantsNewsletter && Boolean(newsletterAction);
  const newsletterPrompt = wantsNewsletter && !newsletterAction && insideEditor;

  // The year is read in an EFFECT, not during render. `new Date()` at render
  // time is non-deterministic between the SSR worker and the browser, and the
  // one day a year they disagree is the day every server-rendered page hits a
  // hydration mismatch. The first paint (and therefore the crawlable HTML)
  // carries a year-less copyright, which is correct rather than merely quiet.
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  const store = shop?.name ?? "";
  const copyright =
    asString(s.copyright_text) ||
    (year
      ? t("footer.copyright", "© {{year}} {{store}}. All rights reserved.")
          .replace("{{year}}", String(year))
          .replace("{{store}}", store)
      : t("footer.copyright_noyear", "© {{store}}. All rights reserved.").replace(
          "{{store}}",
          store,
        ));

  return (
    // <footer> only maps to the `contentinfo` landmark when its nearest
    // sectioning ancestor is <body>. Inside the theme's own wrapper div it is
    // not, so the role is explicit.
    <footer className="tn-footer" role="contentinfo">
      <div className="tn-container">
        <div className="tn-footer-panel">
          {showNewsletter && (
            <div className="tn-footer-news">
              <h2 className="tn-footer-news-title">
                {asString(s.newsletter_title, t("footer.newsletter_title", "Subscribe to our emails"))}
              </h2>
              {asString(s.newsletter_subtitle) && (
                <p className="tn-footer-text">{asString(s.newsletter_subtitle)}</p>
              )}
              {/* Native form POST — works before hydration and in the SSR
                  markup, which is the whole point of not doing this in JS. */}
              <form className="tn-news-form" action={newsletterAction} method="post">
                <label className="tn-sr" htmlFor="tn-news-email">
                  {t("footer.newsletter_label", "Email address")}
                </label>
                <input
                  id="tn-news-email"
                  className="tn-news-input"
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder={asString(
                    s.newsletter_placeholder,
                    t("footer.newsletter_placeholder", "Enter your email address"),
                  )}
                />
                <button type="submit" className="tn-btn tn-btn-dark">
                  {asString(s.newsletter_cta, t("footer.newsletter_cta", "Subscribe"))}
                  <IconArrowUpRight size={16} />
                </button>
              </form>
            </div>
          )}

          {newsletterPrompt && (
            <div className="tn-editor-note">
              <p className="tn-label">{t("editor.newsletter_note_title", "Newsletter is hidden")}</p>
              <p className="tn-footer-text">
                {t(
                  "editor.newsletter_note",
                  "Add a form endpoint under Footer → Newsletter and this block appears. Without one there is nowhere to store the addresses, so shoppers never see it.",
                )}
              </p>
            </div>
          )}

          {columns.length > 0 && (
            <div className={cx("tn-footer-cols", accordion && "is-accordion")}>
              {columns.map((col, i) => {
                const title = asString(col.settings.title);
                return accordion ? (
                  <details key={i} className="tn-footer-col">
                    <summary className="tn-footer-col-title">{title}</summary>
                    <div className="tn-footer-col-body">
                      <ColumnBody node={col} />
                    </div>
                  </details>
                ) : (
                  <div key={i} className="tn-footer-col">
                    {/* h2, matching the newsletter title beside it. As an
                        h3 it skipped a level on every page whose body has
                        no h2 — which is most of them, since the newsletter
                        (the only other footer heading) hides itself when
                        the merchant has set no form endpoint. */}
                    <h2 className="tn-footer-col-title">{title}</h2>
                    <div className="tn-footer-col-body">
                      <ColumnBody node={col} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="tn-footer-bottom">
            <p className="tn-footer-copy">{copyright}</p>
            {asBool(s.show_payment_marks, true) && <PaymentMarks />}
          </div>
        </div>
      </div>
    </footer>
  );
}
