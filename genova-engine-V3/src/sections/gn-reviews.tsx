/**
 * gn-reviews — "Customers are saying".
 *
 * Works in two contexts from one component:
 *   PDP      → the product in context (exact score, exact count).
 *   Homepage → a BOUNDED sample of products, merged.
 *
 * The distinction is stated in the UI, not hidden: the homepage summary reads
 * "across N products" because the platform has no store-wide review feed and a
 * bare "4.5 from 44 reviews" would imply one. See lib/reviews.ts.
 *
 * Stars are outline/filled glyphs plus a text score — never colour alone, since
 * Genova has no gold and colour-only meaning fails WCAG 1.4.1 anyway.
 */

import { useState } from "react";
import { useProductOptional, useProducts } from "@numueg/theme-sdk";
import { asBool, asNumber, asString } from "@numueg/theme-kit";
import { cx, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { roundHalf, useProductReviews } from "../lib/reviews";

function Stars({ value, label }: { value: number; label: string }) {
  const rounded = roundHalf(value);
  return (
    <span className="gn-stars" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={cx(
            "gn-star",
            rounded >= n ? "is-full" : rounded >= n - 0.5 ? "is-half" : "is-empty",
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function GnReviews({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const product = useProductOptional();
  const { products } = useProducts({ limit: 12, fetchIfMissing: true });
  const [index, setIndex] = useState(0);

  const sampleSize = asNumber(s.sample_products, 6);
  const ids = product
    ? [String(product.id)]
    : products.slice(0, sampleSize).map((p) => String(p.id));

  const { reviews, stats, loading } = useProductReviews(ids);

  const minRating = asNumber(s.min_rating, 4);
  const shown = reviews.filter((r) => r.rating >= minRating);

  // No reviews yet is the normal state for a new store. Render nothing rather
  // than an empty "what customers say" heading, which reads worse than silence.
  if (loading || shown.length === 0) return null;

  const active = shown[Math.min(index, shown.length - 1)];
  const heading = asString(s.heading) || t("reviews.heading", "Customers are saying");

  return (
    <section className="gn-reviews">
      <div className="gn-container gn-reviews-inner">
        <div className="gn-reviews-head">
          <h2 className="gn-section-heading">{heading}</h2>
          {asBool(s.show_summary, true) && stats.count > 0 && (
            <div className="gn-reviews-summary">
              <Stars
                value={stats.average}
                label={t("reviews.rating_of_5", "{{n}} out of 5").replace(
                  "{{n}}",
                  stats.average.toFixed(1),
                )}
              />
              <span className="gn-reviews-score">{stats.average.toFixed(2)}</span>
              <span className="gn-reviews-count">
                {product
                  ? t("reviews.from_n", "from {{n}} reviews").replace("{{n}}", String(stats.count))
                  : t("reviews.from_n_across", "from {{n}} reviews across {{p}} products")
                      .replace("{{n}}", String(stats.count))
                      .replace("{{p}}", String(ids.length))}
              </span>
            </div>
          )}
        </div>

        <blockquote className="gn-review-card" aria-live="polite">
          <Stars
            value={active.rating}
            label={t("reviews.rating_of_5", "{{n}} out of 5").replace(
              "{{n}}",
              String(active.rating),
            )}
          />
          {active.title && <p className="gn-review-title">{active.title}</p>}
          {active.body && <p className="gn-review-body">{active.body}</p>}
          <footer className="gn-review-meta">
            {active.author && <span className="gn-label">{active.author}</span>}
            {active.verified && (
              <span className="gn-review-verified gn-label">
                {t("reviews.verified", "Verified purchase")}
              </span>
            )}
          </footer>
        </blockquote>

        {shown.length > 1 && (
          <div className="gn-reviews-nav">
            <button
              type="button"
              className="gn-rail-arrow"
              aria-label={t("general.previous", "Previous")}
              onClick={() => setIndex((i) => (i - 1 + shown.length) % shown.length)}
            >
              ‹
            </button>
            <span className="gn-reviews-pos gn-label">{`${index + 1} / ${shown.length}`}</span>
            <button
              type="button"
              className="gn-rail-arrow"
              aria-label={t("general.next", "Next")}
              onClick={() => setIndex((i) => (i + 1) % shown.length)}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
