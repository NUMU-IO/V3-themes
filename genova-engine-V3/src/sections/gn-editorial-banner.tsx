/**
 * gn-editorial-banner — a wide photographic break between modules.
 *
 * Deliberately the least featured section in the theme: one image, an optional
 * line of copy, an optional link. The reference leans on the photography and
 * adds no UI decoration, and in a theme with zero accent colour this is one of
 * the few places the page gets any visual relief at all — so anything added
 * here (borders, badges, gradients) works against it.
 *
 * Renders nothing without an image. An empty full-bleed band is worse than a
 * missing section.
 */

import { Link } from "@numueg/theme-sdk";
import { asBool, asImageAlt, asImageUrl, asNumber, asString } from "@numueg/theme-kit";
import { cx, useInsideEditor, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

export default function GnEditorialBanner({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const insideEditor = useInsideEditor();

  const image = asImageUrl(s.image);
  const imageMobile = asImageUrl(s.image_mobile);

  if (!image) {
    // Only the editor gets a prompt — a live storefront renders nothing.
    return insideEditor ? (
      <section className="gn-banner gn-banner-empty">
        <p className="gn-label">{t("banner.empty", "Choose an image for this banner")}</p>
      </section>
    ) : null;
  }

  const heading = asString(s.overlay_text);
  const ctaText = asString(s.cta_text);
  const overlay = asNumber(s.overlay_opacity, 20) / 100;
  const hasCopy = Boolean(heading || ctaText);

  return (
    <section
      className={cx(
        "gn-banner",
        `is-${asString(s.height, "medium")}`,
        asBool(s.full_width, true) ? "is-full" : "is-contained",
      )}
    >
      <div className="gn-banner-media">
        <picture>
          {imageMobile && <source media="(max-width: 768px)" srcSet={imageMobile} />}
          <img src={image} alt={asImageAlt(s.image, heading)} loading="lazy" decoding="async" />
        </picture>
        {/* The scrim only exists to keep overlay copy legible. With no copy
            there is nothing to protect, so the photograph stays untouched. */}
        {hasCopy && overlay > 0 && (
          <div className="gn-banner-scrim" aria-hidden="true" style={{ opacity: overlay }} />
        )}
        {hasCopy && (
          <div className={cx("gn-banner-copy", `is-${asString(s.text_position, "center")}`)}>
            {heading && <h2 className="gn-banner-heading">{heading}</h2>}
            {ctaText && (
              <Link to={asString(s.cta_link, "/products")} className="gn-btn gn-banner-cta gn-on-media">
                {ctaText}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
