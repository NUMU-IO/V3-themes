"use client";
import { Link, useCollections, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { asBool, asNumber, asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";
import { Rise, RuleDraw, useMotionOn } from "./_motion";

/**
 * Contents (الفهرس) — the store's collections laid out like a magazine
 * table of contents: two-digit entry numbers, the collection name in the
 * heading face, a dotted leader, and the product count sitting where a page
 * number would. The numbers are literal contents-page semantics (a real
 * ordered index), not decorative section markers. Rows ink-underline on
 * hover and rise in with a small stagger.
 */
export default function EdContents({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const { collections } = useCollections();
  const locale = useLocale();
  const on = useMotionOn();

  const title = asString(s.title) || localized(locale, "Contents", "الفهرس");
  const maxItems = asNumber(s.max_items, 6);
  const showCounts = asBool(s.show_counts, true);

  const entries = (maxItems > 0 ? collections.slice(0, maxItems) : collections).filter(Boolean);
  if (entries.length === 0) return null;

  const numberFor = (i: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { minimumIntegerDigits: 2 }).format(i + 1);

  return (
    <section className="py-14 md:py-20 bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <p className="vn-eyebrow mb-2">
            <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
          </p>
          <RuleDraw on={on} className="ed-rule-double mb-2">
            <span aria-hidden="true" />
          </RuleDraw>

          <ol className="list-none m-0 p-0">
            {entries.map((col, i) => (
              <Rise key={col.id} on={on} inView delay={Math.min(i, 6) * 0.06} y={14}>
                <li className={i > 0 ? "border-t border-[var(--vn-border)]" : ""}>
                  <Link
                    to={col.slug ? `/collections/${col.slug}` : `/products?category=${col.id}`}
                    className="ed-toc-row group"
                  >
                    <span className="ed-toc-number" aria-hidden="true">{numberFor(i)}</span>
                    <span className="ed-toc-name vn-heading">
                      <span className="ed-ink-link">{col.name}</span>
                    </span>
                    <span className="ed-toc-leader" aria-hidden="true" />
                    {showCounts && (
                      <span className="ed-toc-count">
                        {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(col.product_count ?? 0)}
                      </span>
                    )}
                  </Link>
                </li>
              </Rise>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
