/**
 * tn-review-strip — social proof, one quote at a time, with prev/next.
 *
 * ## Why the figures are merchant-authored (plan D7)
 *
 * The reference shows a store-wide "5.00 ★ from 138 reviews". NUMU has no
 * endpoint for that: reviews live per product
 * (`/storefront/products/{id}/reviews`) and there is no aggregate across the
 * catalogue. A theme could fake one by averaging whatever happens to be on the
 * current page — which would produce a different "store rating" on every route
 * and, worse, a number nobody can reconcile with their own data.
 *
 * So the rating row is text the merchant types, the editor says so in plain
 * language, and the whole row disappears when they leave it blank. Quotes are
 * `testimonial` blocks for the same reason.
 *
 * Autoplay is OFF by default. Text that advances on a timer moves out from
 * under anyone who reads slowly, and it is the one carousel behaviour that
 * actively costs conversions.
 */

import { useEffect, useRef, useState } from "react";
import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import {
  asBool,
  asNumber,
  asString,
  cx,
  readBlockNodes,
  useMotionOn,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconChevronLeft, IconChevronRight, IconStar } from "../lib/icons";

function Stars({ value, label }: { value: number; label: string }) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="tn-stars" role="img" aria-label={label}>
      {[0, 1, 2, 3, 4].map((i) => (
        <IconStar key={i} size={15} className={cx("tn-star", i >= full && "is-empty")} />
      ))}
    </span>
  );
}

export default function TnReviewStrip({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const motionOn = useMotionOn();

  const items = readBlockNodes(instance, "testimonial").filter((b) =>
    Boolean(asString(b.settings.quote)),
  );
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const autoplay = asBool(s.autoplay, false) && motionOn && items.length > 1;

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % items.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [autoplay, items.length]);

  // Clamp when a merchant deletes the block that was showing.
  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  if (items.length === 0) return null;

  const current = items[Math.min(index, items.length - 1)];
  const ratingValue = asString(s.rating_value);
  const ratingCount = asString(s.rating_count);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + items.length) % items.length);

  return (
    <section
      className="tn-section tn-reviews"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <div className="tn-container tn-reviews-inner">
        {asString(s.heading) ? <h2 className="tn-reviews-title">{asString(s.heading)}</h2> : null}

        {ratingValue ? (
          <div className="tn-reviews-summary">
            <Stars
              value={Number(ratingValue) || 0}
              label={t("reviews.rating_of_5", "{{n}} out of 5").replace("{{n}}", ratingValue)}
            />
            {ratingCount ? (
              <span className="tn-reviews-count">
                {t("reviews.from_count", "from {{n}} reviews").replace("{{n}}", ratingCount)}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* `aria-live` only when it is NOT advancing on its own: a live region
            that changes every seven seconds is a screen reader interrupting
            itself. With autoplay off, the region announces the quote the
            shopper just asked for, which is the whole point. */}
        <figure className="tn-review" aria-live={autoplay ? "off" : "polite"}>
          <Stars
            value={asNumber(current.settings.rating, 5)}
            label={t("reviews.rating_of_5", "{{n}} out of 5").replace(
              "{{n}}",
              String(asNumber(current.settings.rating, 5)),
            )}
          />
          <blockquote className="tn-review-quote">{asString(current.settings.quote)}</blockquote>
          <figcaption className="tn-review-meta">
            {asString(current.settings.author) ? (
              <span className="tn-review-author">{asString(current.settings.author)}</span>
            ) : null}
            {asString(current.settings.meta) ? (
              <span className="tn-review-date">{asString(current.settings.meta)}</span>
            ) : null}
            {asString(current.settings.product_label) ? (
              asString(current.settings.product_link) ? (
                <Link to={asString(current.settings.product_link)} className="tn-review-product">
                  {asString(current.settings.product_label)}
                </Link>
              ) : (
                <span className="tn-review-product">{asString(current.settings.product_label)}</span>
              )
            ) : null}
          </figcaption>
        </figure>

        {items.length > 1 && (
          <div className="tn-reviews-nav">
            <button
              type="button"
              className="tn-icon-btn"
              aria-label={t("common.previous", "Previous")}
              onClick={() => go(-1)}
            >
              <IconChevronLeft className="tn-flip-rtl" />
            </button>
            <span className="tn-reviews-index" aria-hidden="true">
              {index + 1}/{items.length}
            </span>
            <button
              type="button"
              className="tn-icon-btn"
              aria-label={t("common.next", "Next")}
              onClick={() => go(1)}
            >
              <IconChevronRight className="tn-flip-rtl" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
