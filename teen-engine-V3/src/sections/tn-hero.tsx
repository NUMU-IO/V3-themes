/**
 * tn-hero — the full-bleed campaign image the header capsule floats over.
 *
 * Three things the reference does that a naive hero does not:
 *
 * 1. **Two image sources, not one CSS crop.** The markup ships a real
 *    `<picture>` with a separate mobile asset. A landscape campaign shot
 *    `object-fit: cover`-ed into a portrait phone viewport crops to the middle
 *    third, which is reliably the part with nothing in it.
 *
 * 2. **Rounded bottom corners only.** The top is flush with the viewport
 *    because the capsule sits on it; the bottom curves into the page.
 *
 * 3. **A fixed height from CSS, never from the image.** The height is set
 *    before any image loads, so there is no CLS and the LCP element has its box
 *    from the first frame.
 *
 * The first image is `fetchpriority="high"` and NOT lazy: this is the LCP
 * element on the homepage, and lazy-loading it is the single most common way a
 * theme loses a second of LCP for nothing.
 */

import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import { asBool, asImageAlt, asImageUrl, asNumber, asString, cx, useDemo, useInsideEditor, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconArrowUpRight } from "../lib/icons";

/**
 * Demo imagery. Gated on `useDemo()` — the marketplace "Try theme" preview
 * only. A real installed store with no image set gets the empty state, never
 * somebody else's campaign photo.
 */
const FALLBACK_HERO =
  "https://cdn.numueg.app/theme-assets/teen/hero-desktop.jpg";
const FALLBACK_HERO_MOBILE =
  "https://cdn.numueg.app/theme-assets/teen/hero-mobile.jpg";

export default function TnHero({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const demo = useDemo();
  const insideEditor = useInsideEditor();

  const desktop = asImageUrl(s.image_desktop) || (demo ? FALLBACK_HERO : "");
  const mobile = asImageUrl(s.image_mobile) || (demo ? FALLBACK_HERO_MOBILE : "") || desktop;
  const alt = asString(s.image_alt) || asImageAlt(s.image_desktop) || "";

  const heading = asString(s.heading);
  const subheading = asString(s.subheading);
  const ctaText = asString(s.cta_text);
  const ctaLink = asString(s.cta_link, "/products");

  // Nothing configured at all. In the editor say so; on a live storefront
  // render nothing rather than a grey box the merchant cannot see to fix.
  if (!desktop && !heading) {
    return insideEditor ? (
      <section className="tn-container tn-section">
        <div className="tn-editor-note">
          <p className="tn-label">{t("editor.hero_note_title", "Campaign hero is empty")}</p>
          <p className="tn-footer-text">
            {t("editor.hero_note", "Add a desktop image and a heading to build the top of your homepage.")}
          </p>
        </div>
      </section>
    ) : null;
  }

  const overlay = Math.min(70, Math.max(0, asNumber(s.overlay_opacity, 30)));

  return (
    <section
      className={cx(
        "tn-hero",
        `is-${asString(s.height, "large")}`,
        asBool(s.round_bottom, true) && "is-rounded",
      )}
      data-align={asString(s.text_align, "center")}
    >
      {desktop ? (
        <picture className="tn-hero-media">
          <source media="(max-width: 749px)" srcSet={mobile} />
          <img
            src={desktop}
            alt={alt}
            /* The LCP element. Eager + high priority, and `alt=""` when the
               merchant gave no description — an empty alt marks it decorative,
               which is honest, where a filename-as-alt is noise. */
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      ) : null}

      {overlay > 0 && desktop ? (
        <span
          className="tn-hero-scrim"
          style={{ opacity: overlay / 100 }}
          aria-hidden="true"
        />
      ) : null}

      {(heading || subheading || ctaText) && (
        <div className="tn-hero-content">
          {heading ? <h1 className="tn-hero-title">{heading}</h1> : null}
          {subheading ? <p className="tn-hero-sub">{subheading}</p> : null}
          {ctaText ? (
            <Link to={ctaLink} className="tn-btn tn-btn-dark tn-hero-cta">
              {ctaText}
              <IconArrowUpRight size={16} />
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
