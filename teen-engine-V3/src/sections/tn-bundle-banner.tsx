/**
 * tn-bundle-banner — the black promo strip.
 *
 * The reference reuses this exact block on the homepage, on every collection
 * page and above the product footer, which is why it is a section rather than
 * something baked into one template: the merchant decides where it appears and
 * how many times, and every instance carries its own copy.
 *
 * It is a LINK, not a calculator. Nothing here computes a discount — the
 * savings a shopper actually gets come from the store's promotion rules at
 * checkout. Quoting a number here that the cart cannot honour is the one
 * failure mode worth designing against, so the "20% OFF" pill is plain
 * merchant-authored copy and is labelled as such in the editor.
 */

import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import { asImageUrl, asString, cx, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

export default function TnBundleBanner({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();

  const heading = asString(s.heading);
  const ctaText = asString(s.cta_text);
  const collage = [s.collage_image_1, s.collage_image_2, s.collage_image_3]
    .map((v) => asImageUrl(v))
    .filter(Boolean);

  // Nothing to say and nowhere to go — render nothing rather than an empty
  // black bar. (No editor prompt here: unlike the hero, this section is
  // optional by nature and a merchant who emptied it meant to.)
  if (!heading && !ctaText) return null;

  const surface = asString(s.surface, "ink");
  const badge = asString(s.badge_text);

  return (
    <section className="tn-section tn-bundle-section">
      <div className="tn-container">
        <div className={cx("tn-bundle-banner", `is-${surface}`)}>
          {collage.length > 0 && (
            <div className="tn-bundle-collage" aria-hidden="true">
              {collage.map((url, i) => (
                // Decorative: the heading and button already carry the meaning,
                // and three product thumbnails announced individually would
                // just be three unnamed images in the way.
                <img key={i} src={url} alt="" loading="lazy" decoding="async" />
              ))}
            </div>
          )}

          <div className="tn-bundle-copy">
            {asString(s.eyebrow) ? (
              <p className="tn-label tn-bundle-eyebrow">{asString(s.eyebrow)}</p>
            ) : null}
            {heading ? <h2 className="tn-bundle-title">{heading}</h2> : null}
            {asString(s.subcopy) ? (
              <p className="tn-bundle-sub">{asString(s.subcopy)}</p>
            ) : null}
          </div>

          {ctaText ? (
            <Link
              to={asString(s.cta_link, "/pages/build-a-bundle")}
              className="tn-btn tn-btn-cream tn-bundle-cta"
            >
              {ctaText}
              {badge ? <span className="tn-badge tn-badge-lime">{badge}</span> : null}
            </Link>
          ) : (
            <span className="tn-sr">{t("bundle.no_cta", "Bundle promotion")}</span>
          )}
        </div>
      </div>
    </section>
  );
}
