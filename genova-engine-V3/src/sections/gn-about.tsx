/**
 * gn-about — the brand story page.
 *
 * A single editorial column with an image, three value statements and a CTA.
 * The reference's own guidance for informational pages applies: "a simple
 * readable column with a large page title, comfortable line length" — do NOT
 * reuse the dense product-grid spacing here.
 */

import { Image, Link } from "@numueg/theme-sdk";
import { asImageAlt, asImageUrl, asString } from "@numueg/theme-kit";
import { type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

export default function GnAbout({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();

  const image = asImageUrl(s.image);
  const values = [1, 2, 3]
    .map((n) => ({
      title: asString(s[`value_${n}_title`]),
      text: asString(s[`value_${n}_text`]),
    }))
    .filter((v) => v.title || v.text);

  return (
    <section className="gn-about">
      <div className="gn-container gn-about-head">
        {asString(s.eyebrow) && <p className="gn-label gn-about-eyebrow">{asString(s.eyebrow)}</p>}
        <h1 className="gn-page-title">
          {asString(s.headline) || t("about.headline", "About Genova")}
        </h1>
        {asString(s.body) && <p className="gn-about-body">{asString(s.body)}</p>}
      </div>

      {image && (
        <div className="gn-container">
          <span className="gn-plate gn-about-image">
            <Image
              src={image}
              alt={asImageAlt(s.image, asString(s.headline))}
              sizes="(min-width: 1600px) 1600px, 100vw"
              loading="lazy"
            />
          </span>
        </div>
      )}

      {values.length > 0 && (
        <div className="gn-container gn-about-values">
          {values.map((v, i) => (
            <div key={i} className="gn-about-value">
              {v.title && <p className="gn-label gn-about-value-title">{v.title}</p>}
              {v.text && <p className="gn-about-value-text">{v.text}</p>}
            </div>
          ))}
        </div>
      )}

      {asString(s.cta_text) && (
        <div className="gn-container gn-about-cta">
          <Link to={asString(s.cta_link, "/products")} className="gn-btn gn-btn-primary">
            {asString(s.cta_text)}
          </Link>
        </div>
      )}
    </section>
  );
}
