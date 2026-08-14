/**
 * gn-collection-rail — "Shop by collection".
 *
 * A horizontal rail of large image cards with a label, a "View all" link beside
 * the heading, and previous/next controls. Hover is a subtle image scale — no
 * shadow, no lift; depth in this theme comes from hairlines and image plates.
 *
 * Source is either the store's own collections (default — nothing to configure,
 * and it stays correct as the merchant adds categories) or hand-authored `card`
 * blocks when they want a curated set with their own imagery.
 *
 * Collections are read through `useStoreCollections`, NOT `useCollections`: the
 * host only pre-fetches `page.data.collections` on catalog routes, so a rail
 * placed on /about or a CMS page would otherwise be empty.
 */

import { useRef } from "react";
import { Image, Link } from "@numueg/theme-sdk";
import { asBool, asImageAlt, asImageUrl, asNumber, asString } from "@numueg/theme-kit";
import {
  collectionFields,
  cx,
  readBlockNodes,
  useStoreCollections,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { Reveal } from "../lib/reveal";
import { IconChevronRight } from "../lib/icons";

interface Card {
  id: string;
  label: string;
  link: string;
  image: string;
  alt: string;
}

export default function GnCollectionRail({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const storeCollections = useStoreCollections();
  const trackRef = useRef<HTMLDivElement>(null);

  const manual: Card[] = readBlockNodes(instance, "card").map((node, i) => ({
    id: `card-${i}`,
    label: asString(node.settings.label),
    link: asString(node.settings.link, "/products"),
    image: asImageUrl(node.settings.image),
    alt: asImageAlt(node.settings.image, asString(node.settings.label)),
  }));

  const source = asString(s.source, "auto");
  const limit = asNumber(s.limit, 8);

  const auto: Card[] = storeCollections.slice(0, limit).map(collectionFields).map((c) => ({
    id: c.id,
    label: c.name,
    link: `/collections/${c.slug}`,
    image: c.image,
    alt: c.name,
  }));

  const cards = source === "manual" ? manual : auto.length > 0 ? auto : manual;
  if (cards.length === 0) return null;

  const heading = asString(s.heading) || t("collection_rail.heading", "Shop by collection");
  const viewAll = asString(s.view_all_link, "/collections");
  const layout = asString(s.layout, "rail");
  const perView = asNumber(s.cards_desktop, 4);

  // One card + gap. Scrolling by the visible width would skip a partial card at
  // the edge, which is how a rail loses items without the shopper noticing.
  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = el.clientWidth / perView;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className="gn-rail-section">
      <div className="gn-container gn-rail-head">
        <h2 className="gn-section-heading">{heading}</h2>
        <div className="gn-rail-head-end">
          {viewAll && (
            <Link to={viewAll} className="gn-textlink">
              {t("general.view_all", "View all")}
              <IconChevronRight size={14} />
            </Link>
          )}
          {layout === "rail" && asBool(s.show_arrows, true) && cards.length > perView && (
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
        className={cx("gn-container", layout === "rail" ? "gn-rail-track" : "gn-rail-grid")}
        style={{ ["--gn-rail-per-view" as string]: String(perView) }}
      >
        {cards.map((card, ci) => (
          <Reveal key={card.id} index={ci} className="gn-rail-card-wrap">
          <Link to={card.link} className="gn-rail-card">
            <span className={cx("gn-plate", "gn-rail-plate", `is-${asString(s.aspect, "portrait")}`)}>
              {card.image ? (
                <Image
                  src={card.image}
                  // Decorative: the label right below is the same word, and a
                  // screen reader would otherwise announce it twice.
                  alt=""
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  loading="lazy"
                />
              ) : null}
            </span>
            <span className="gn-rail-card-label gn-label">{card.label}</span>
          </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
