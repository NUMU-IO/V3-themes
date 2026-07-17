"use client";
import { Link, useCollections, useLocale, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, localized, type SectionRenderProps } from "./_shared";
import { InlineEditable } from "./_inline-editable";

/**
 * Full "All collections" browse grid — the landing for the header's
 * COLLECTIONS → "All collections" link (previously a dead /collections 404).
 * Same editorial image-card look as the mobile drawer + collection strip:
 * cover image, gradient scrim, name, product-count chip. Data is live from
 * useCollections() (the storefront pre-fetches it into page.data), so it
 * always mirrors the store's real collections with no manual upkeep.
 */
export default function VionneCollectionsIndex({ instance, sectionId }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const { collections } = useCollections();

  const heading = asString(s.title) || localized(locale, "All Collections", "كل التشكيلات");
  const subtitle =
    asString(s.subtitle) ||
    localized(locale, "Explore the full edit", "تصفّحي كل التشكيلات");

  const items = (collections ?? []).filter((c) => c && c.slug && c.name);

  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-8 md:mb-10 text-center">
          {subtitle && (
            <span className="vn-eyebrow block mb-1.5">
              <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} />
            </span>
          )}
          <h1 className="vn-heading text-2xl md:text-3xl">
            <InlineEditable sectionId={sectionId} settingKey="title" value={heading} />
          </h1>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-[var(--vn-muted)] py-10">
            {localized(locale, "No collections yet.", "لا توجد تشكيلات بعد.")}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {items.map((cat) => (
              <Link
                key={cat.id}
                to={`/collections/${cat.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-[var(--vn-band)]"
              >
                {cat.image_url ? (
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center vn-heading text-5xl text-[var(--vn-ink)] opacity-15 uppercase"
                  >
                    {cat.name.charAt(0)}
                  </span>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                <span className="absolute inset-x-0 bottom-3 px-2 text-center text-white uppercase tracking-[0.18em] text-[11px] md:text-xs font-semibold leading-tight">
                  {cat.name}
                </span>
                {cat.product_count > 0 && (
                  <span className="absolute top-2 end-2 text-[10px] tabular-nums text-white/90 bg-black/35 px-1.5 py-0.5 rounded">
                    {cat.product_count.toLocaleString(locale === "ar" ? "ar-EG" : "en")}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
