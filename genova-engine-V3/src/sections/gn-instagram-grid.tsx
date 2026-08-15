/**
 * gn-instagram-grid — "Follow us on Instagram".
 *
 * Merchant-uploaded tiles, deliberately NOT a live feed. A real Instagram feed
 * needs a Meta app, a long-lived token and a refresh job; when that token
 * expires the section silently empties on the live storefront. Uploaded tiles
 * cannot break, and the merchant already has the images.
 *
 * The reference's own constraint applies: "do not make the grid visually
 * heavier than the main product photography." Small tiles, tight gaps, a hover
 * that only dims.
 */

import { asBool, asImageAlt, asImageUrl, asNumber, asString } from "@numueg/theme-kit";
import { Image } from "@numueg/theme-sdk";
import { cx, readBlockNodes, useInsideEditor, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconInstagram } from "../lib/icons";

export default function GnInstagramGrid({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const insideEditor = useInsideEditor();

  const tiles = readBlockNodes(instance, "tile").map((node, i) => ({
    id: `tile-${i}`,
    image: asImageUrl(node.settings.image),
    alt: asImageAlt(node.settings.image, ""),
    link: asString(node.settings.link),
  }));

  if (tiles.length === 0) {
    return insideEditor ? (
      <section className="gn-ig gn-ig-empty">
        <p className="gn-label">{t("instagram.empty", "Add image tiles to this section")}</p>
      </section>
    ) : null;
  }

  const handle = asString(s.handle);
  const visitUrl = asString(s.visit_url) || (handle ? `https://instagram.com/${handle.replace(/^@/, "")}` : "");
  const heading = asString(s.heading) || t("instagram.heading", "Follow us on Instagram");
  const rows = asNumber(s.rows, 1);
  const perRow = asNumber(s.columns_desktop, 6);

  return (
    <section className="gn-ig">
      <div className="gn-container gn-ig-head">
        <h2 className="gn-section-heading">{heading}</h2>
        {visitUrl && (
          <a
            href={visitUrl}
            className="gn-textlink"
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconInstagram size={14} />
            {handle || t("instagram.visit", "Visit Instagram")}
          </a>
        )}
      </div>

      <div
        className={cx("gn-container", "gn-ig-grid", asBool(s.hover_effect, true) && "has-hover")}
        style={{
          ["--gn-ig-cols" as string]: String(perRow),
          ["--gn-ig-mobile-cols" as string]: String(asNumber(s.columns_mobile, 3)),
        }}
      >
        {tiles.slice(0, perRow * rows).map((tile) =>
          tile.link ? (
            <a
              key={tile.id}
              href={tile.link}
              className="gn-ig-tile"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="gn-plate">
                <Image src={tile.image} alt={tile.alt} sizes="(min-width: 1024px) 16vw, 33vw" loading="lazy" />
              </span>
            </a>
          ) : (
            <span key={tile.id} className="gn-ig-tile">
              <span className="gn-plate">
                <Image src={tile.image} alt={tile.alt} sizes="(min-width: 1024px) 16vw, 33vw" loading="lazy" />
              </span>
            </span>
          ),
        )}
      </div>
    </section>
  );
}
