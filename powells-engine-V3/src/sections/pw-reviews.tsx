/**
 * pw-reviews — what readers said.
 *
 * Reads the store's REAL approved reviews and their aggregate. Until this
 * existed the product page could only show a rating a merchant had typed into
 * a metafield, while the reviews customers had actually left sat unread in the
 * database with a public endpoint already serving them.
 *
 * Read-only on purpose. Posting a review needs the customer auth cookie and a
 * CSRF token, and a form that silently fails for signed-out shoppers is worse
 * than no form: the section points them at sign-in instead.
 *
 * Renders nothing at all when there are no reviews. An empty "0 reviews" block
 * on every product page of a new shop advertises the wrong thing.
 */

import { Link, useProductOptional, useResolvedSettings } from "@numueg/theme-sdk";
import { asBool, asNumber, asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useProductReviews } from "../lib/store-data";
import { useT } from "../lib/i18n";
import { Twinkle } from "../lib/ornaments";

function Stars({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <span className="s" aria-hidden="true">
      {"★".repeat(Math.max(0, Math.min(5, filled)))}
      {"☆".repeat(Math.max(0, 5 - filled))}
    </span>
  );
}

export default function PwReviews({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const product = useProductOptional();
  const { reviews, stats } = useProductReviews(product?.id, asNumber(s.limit, 8));

  if (!product || stats.count === 0) return null;

  const heading = asString(s.heading) || t("reviews.title", "What our readers are saying");

  return (
    <section className="pw-section pw-reviews">
      <div className="pw-section-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Twinkle size={20} />
          </span>
        )}
        <h2>{heading}</h2>
        <span className="pw-rule" />
      </div>

      <div className="pw-reviews-body">
        <aside className="pw-reviews-summary">
          <p className="pw-reviews-average">{stats.average.toFixed(1)}</p>
          <p className="pw-stars">
            <Stars value={stats.average} />
          </p>
          <p className="pw-byline">
            {stats.count === 1
              ? t("reviews.count_one", "1 review")
              : t("reviews.count_many", "{{count}} reviews").replace("{{count}}", String(stats.count))}
          </p>

          {asBool(s.show_distribution, true) && (
            <div className="pw-reviews-bars">
              {[5, 4, 3, 2, 1].map((score) => {
                const n = Number(stats.distribution?.[String(score)] ?? 0);
                // Percentage of the TOTAL, so the five bars read as one
                // distribution rather than five unrelated meters.
                const pct = stats.count > 0 ? (n / stats.count) * 100 : 0;
                return (
                  <div className="pw-reviews-bar" key={score}>
                    <span>{score}</span>
                    <span className="track">
                      <span className="fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="n">{n}</span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="pw-note" style={{ textAlign: "start" }}>
            <Link to="/account">{t("reviews.sign_in_to_write", "Sign in to write a review")}</Link>
          </p>
        </aside>

        <div className="pw-reviews-list">
          {reviews.map((review) => (
            <article className="pw-review" key={review.id}>
              <p className="pw-stars">
                <Stars value={review.rating} />
                <span>{review.author_name || t("reviews.anonymous", "A reader")}</span>
              </p>
              {review.title && <h3>{review.title}</h3>}
              {review.body && <p className="pw-synopsis">{review.body}</p>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
