/**
 * ✦ gn-genova-girls — Genova's signature social-proof section.
 *
 * Real customers wearing the product, credited by name or handle, each linked to
 * the piece they're wearing. Different from `gn-instagram-grid` (which is a
 * decorative tile wall) and from `gn-reviews` (which is text): this one converts
 * because it answers "what does this look like on someone like me".
 *
 * Merchant-uploaded, with the customer's name as given — no API, no scraping.
 */

import { useRef } from "react";
import { Image, Link } from "@numueg/theme-sdk";
import { asBool, asImageAlt, asImageUrl, asNumber, asString } from "@numueg/theme-kit";
import { cx, readBlockNodes, useInsideEditor, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { Reveal } from "../lib/reveal";
import { IconChevronRight } from "../lib/icons";

export default function GnGenovaGirls({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const insideEditor = useInsideEditor();
  const trackRef = useRef<HTMLDivElement>(null);

  const looks = readBlockNodes(instance, "look").map((node, i) => ({
    id: `look-${i}`,
    image: asImageUrl(node.settings.image),
    alt: asImageAlt(node.settings.image, asString(node.settings.name)),
    name: asString(node.settings.name),
    caption: asString(node.settings.caption),
    productLink: asString(node.settings.product_link),
    productLabel: asString(node.settings.product_label),
  }));

  if (looks.length === 0) {
    return insideEditor ? (
      <section className="gn-ig gn-ig-empty">
        <p className="gn-label">{t("girls.empty", "Add customer looks to this section")}</p>
      </section>
    ) : null;
  }

  const heading = asString(s.heading) || t("girls.heading", "Genova girls");
  const layout = asString(s.layout, "carousel");
  const perView = asNumber(s.columns, 4);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth / perView), behavior: "smooth" });
  };

  return (
    <section className="gn-girls">
      <div className="gn-container gn-rail-head">
        <div>
          <h2 className="gn-section-heading">{heading}</h2>
          {asString(s.subtitle) && <p className="gn-girls-sub">{asString(s.subtitle)}</p>}
        </div>
        <div className="gn-rail-head-end">
          {asString(s.cta_link) && asString(s.cta_text) && (
            <Link to={asString(s.cta_link)} className="gn-textlink">
              {asString(s.cta_text)}
              <IconChevronRight size={14} />
            </Link>
          )}
          {layout === "carousel" && looks.length > perView && (
            <div className="gn-rail-arrows">
              <button
                type="button"
                className="gn-rail-arrow"
                aria-label={t("general.previous", "Previous")}
                onClick={() => scrollBy(-1)}
              >
                <IconChevronRight size={16} style={{ transform: "scaleX(-1)" }} />
              </button>
              <button
                type="button"
                className="gn-rail-arrow"
                aria-label={t("general.next", "Next")}
                onClick={() => scrollBy(1)}
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        className={cx("gn-container", layout === "carousel" ? "gn-rail-track" : "gn-grid")}
        style={{
          ["--gn-rail-per-view" as string]: String(perView),
          ["--gn-grid-cols" as string]: String(perView),
        }}
      >
        {looks.map((look, li) => (
          <Reveal key={look.id} as="article" index={li} className="gn-look">
            <span className="gn-plate gn-look-plate">
              {look.image ? (
                <Image
                  src={look.image}
                  alt={look.alt}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  loading="lazy"
                />
              ) : null}
            </span>
            <div className="gn-look-info">
              {asBool(s.show_names, true) && look.name && (
                <p className="gn-label gn-look-name">{look.name}</p>
              )}
              {look.caption && <p className="gn-look-caption">{look.caption}</p>}
              {asBool(s.show_product_link, true) && look.productLink && (
                <Link to={look.productLink} className="gn-textlink">
                  {look.productLabel || t("girls.shop_look", "Shop this look")}
                </Link>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
