/**
 * gn-trusted-strip — "Trusted by people."
 *
 * Quiet social proof: one quote at a time, editorial spacing, small pagination.
 * The reference deliberately avoids coloured review boxes and star-rating
 * clutter here — that belongs in `gn-reviews`. This is a pause, not a widget.
 *
 * Autoplay is slow (the shopper has to read it) and stops on hover or focus.
 */

import { useEffect, useState } from "react";
import { Link } from "@numueg/theme-sdk";
import { asBool, asNumber, asString } from "@numueg/theme-kit";
import { cx, readBlockNodes, useMotionOn, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

export default function GnTrustedStrip({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const motionOn = useMotionOn();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const items = readBlockNodes(instance, "item").map((node, i) => ({
    id: `item-${i}`,
    quote: asString(node.settings.quote),
    author: asString(node.settings.author),
    product: asString(node.settings.product_label),
    productLink: asString(node.settings.product_link),
  }));

  const autoplaySeconds = Math.max(6, asNumber(s.autoplay_seconds, 9));
  const autoplay = asBool(s.autoplay, true) && motionOn && items.length > 1 && !paused;

  useEffect(() => {
    if (!autoplay) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % items.length), autoplaySeconds * 1000);
    return () => clearTimeout(id);
  }, [autoplay, index, autoplaySeconds, items.length]);

  if (items.length === 0) return null;

  const active = items[Math.min(index, items.length - 1)];
  const heading = asString(s.heading) || t("trusted.heading", "Trusted by people.");

  return (
    <section
      className="gn-trusted"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="gn-container gn-trusted-inner">
        <h2 className="gn-section-heading gn-trusted-heading">{heading}</h2>

        {/* `aria-live` off while autoplaying: a panel that announces itself every
            nine seconds is unusable with a screen reader. Manual paging still
            announces, because the shopper asked for the change. */}
        <blockquote className="gn-trusted-quote" aria-live={autoplay ? "off" : "polite"}>
          <p className="gn-trusted-text">{active.quote}</p>
          {(active.author || active.product) && (
            <footer className="gn-trusted-meta">
              {active.author && <span className="gn-label">{active.author}</span>}
              {active.product &&
                (active.productLink ? (
                  <Link to={active.productLink} className="gn-textlink">
                    {active.product}
                  </Link>
                ) : (
                  <span className="gn-trusted-product">{active.product}</span>
                ))}
            </footer>
          )}
        </blockquote>

        {items.length > 1 && (
          <div className="gn-trusted-dots" role="tablist" aria-label={heading}>
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1}`}
                className={cx("gn-trusted-dot", i === index && "is-active")}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
