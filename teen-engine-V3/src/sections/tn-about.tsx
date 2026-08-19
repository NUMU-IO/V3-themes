/**
 * tn-about — the story page.
 *
 * The reference has no About page (its own `/contact` returns a bare Shopify
 * 404), so there is nothing to clone here. Built instead out of the parts Teen
 * already has — a hairline-outlined image plate, the eyebrow/heading pairing
 * from the home modules, and the same bordered value cards as the collection
 * links — so it reads as the same theme rather than a page from another one.
 */

import { Link, sanitizeHtml, useResolvedSettings } from "@numueg/theme-sdk";
import { useMemo } from "react";
import {
  asImageAlt,
  asImageUrl,
  asString,
  readBlockNodes,
  useInsideEditor,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconArrowUpRight } from "../lib/icons";

export default function TnAbout({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const insideEditor = useInsideEditor();

  const heading = asString(s.heading);
  const body = asString(s.body);
  const safeBody = useMemo(() => sanitizeHtml(body), [body]);
  const image = asImageUrl(s.image);
  const values = readBlockNodes(instance, "value")
    .map((node) => ({
      title: asString(node.settings.title),
      text: asString(node.settings.text),
    }))
    .filter((v) => v.title || v.text);

  if (!heading && !body && !image && values.length === 0) {
    return insideEditor ? (
      <section className="tn-container tn-section">
        <div className="tn-editor-note">
          <p className="tn-label">{t("editor.about_note_title", "About page is empty")}</p>
          <p className="tn-footer-text">
            {t("editor.about_note", "Add a heading and a paragraph, then up to four things you want people to know.")}
          </p>
        </div>
      </section>
    ) : null;
  }

  return (
    <section className="tn-section tn-about">
      <div className="tn-container">
        <div className="tn-about-lead">
          <div className="tn-about-copy">
            {asString(s.eyebrow) ? <p className="tn-label tn-about-eyebrow">{asString(s.eyebrow)}</p> : null}
            {heading ? <h1 className="tn-plp-title">{heading}</h1> : null}
            {body ? (
              <div className="tn-richtext tn-about-body" dangerouslySetInnerHTML={{ __html: safeBody }} />
            ) : null}
            {asString(s.cta_text) ? (
              <Link to={asString(s.cta_link, "/products")} className="tn-btn tn-btn-dark tn-about-cta">
                {asString(s.cta_text)}
                <IconArrowUpRight size={14} className="tn-flip-rtl" />
              </Link>
            ) : null}
          </div>

          {image ? (
            <div className="tn-about-media">
              <span className="tn-plate">
                <img src={image} alt={asImageAlt(s.image)} loading="lazy" decoding="async" />
              </span>
            </div>
          ) : null}
        </div>

        {values.length > 0 && (
          <div
            className="tn-grid tn-about-values"
            /* No `--tn-cols`: an inline value outranks the media queries inside
               `.tn-grid` and would pin the row to one width forever. The
               one-column mobile case is a `max-width` rule in theme.css. */
            style={
              {
                "--tn-cols-tablet": Math.min(values.length, 2),
                "--tn-cols-desktop": Math.min(values.length, 4),
              } as React.CSSProperties
            }
          >
            {values.map((v, i) => (
              <div className="tn-card tn-about-value" key={`${v.title}-${i}`}>
                {v.title ? <h2 className="tn-about-valuetitle">{v.title}</h2> : null}
                {v.text ? <p className="tn-footer-text">{v.text}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
