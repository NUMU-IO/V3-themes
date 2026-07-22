"use client";

import { useMemo, useState } from "react";
import {
  Link,
  Money,
  useListingHeading,
  useLocale,
  useProducts,
  useResolvedSettings,
  type Product,
} from "@numueg/theme-sdk";
import { Search } from "lucide-react";
import {
  asNumber,
  asString,
  localized,
  productImage,
  type StSectionProps,
} from "./_shared";

/**
 * st-product-grid — Street's listing body (PLP).
 *
 * Replaces the `numu-theme migrate` stub, which delegated to V2 components
 * (`@/components/store/shared/BaseProductsPage`) that do not exist in V3 —
 * the theme could not build at all.
 *
 * Search and sort are client-side over the catalogue the host already
 * prefetched, so no extra round-trip on a listing that is usually one page.
 */
export default function StProductGrid({ instance, sectionId }: StSectionProps) {
  const s = useResolvedSettings(instance);
  const locale = useLocale();
  const { products, loading } = useProducts();

  const cols = Math.max(2, Math.min(4, asNumber(s.columns_desktop, 3)));
  const showSearch = s.show_search !== false;
  const showSort = s.show_sort !== false;

  // The collection the shopper navigated into names the page; the section
  // setting is the wording for the unscoped /products listing.
  // Merchants can title the unscoped listing in either language; an English
  // heading sitting above Arabic body copy is exactly the mismatch the rest of
  // this theme avoids.
  const isAr = (locale || "").toLowerCase().startsWith("ar");
  const merchantTitle = isAr
    ? asString(s.title_ar) || asString(s.title)
    : asString(s.title) || asString(s.title_ar);
  const listing = useListingHeading({
    title: merchantTitle,
    description: asString(s.subtitle),
    defaultTitle: localized(locale, "Shop all", "تسوق الكل"),
  });

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");

  const visible = useMemo(() => {
    let list = (products ?? []) as Product[];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        `${p.name ?? ""} ${(p as { description?: string }).description ?? ""}`
          .toLowerCase()
          .includes(q),
      );
    }
    const price = (p: Product) => Number((p as { price?: unknown }).price ?? 0);
    const sorted = [...list];
    if (sort === "price_asc") sorted.sort((a, b) => price(a) - price(b));
    else if (sort === "price_desc") sorted.sort((a, b) => price(b) - price(a));
    else if (sort === "name")
      sorted.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return sorted;
  }, [products, query, sort]);

  return (
    <section data-st-section={sectionId} className="bg-[var(--st-cream)]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:py-16">
        <h1 className="st-section-title text-[var(--st-dark)]">{listing.title}</h1>
        {listing.description && (
          <p className="mt-3 max-w-2xl text-sm md:text-base font-semibold text-[var(--st-dark)]/70">
            {listing.description}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {showSearch && (
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <label className="sr-only" htmlFor={`st-plp-q-${sectionId}`}>
                {localized(locale, "Search products", "دور على منتج")}
              </label>
              <input
                id={`st-plp-q-${sectionId}`}
                className="st-input ps-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={localized(locale, "Search products", "دور على منتج")}
              />
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 opacity-60"
              />
            </div>
          )}
          {showSort && (
            <div className="ms-auto flex items-center gap-2">
              <label
                className="text-[11px] font-black uppercase tracking-[0.14em]"
                htmlFor={`st-plp-sort-${sectionId}`}
              >
                {localized(locale, "Sort", "ترتيب")}
              </label>
              <select
                id={`st-plp-sort-${sectionId}`}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="st-input !w-auto !py-2 !text-xs"
              >
                <option value="featured">{localized(locale, "Featured", "المميز")}</option>
                <option value="price_asc">{localized(locale, "Price: low to high", "السعر: من الأقل")}</option>
                <option value="price_desc">{localized(locale, "Price: high to low", "السعر: من الأعلى")}</option>
                <option value="name">{localized(locale, "Name", "الاسم")}</option>
              </select>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--st-dark)]/60">
          {visible.length} {localized(locale, "products", "منتج")}
        </p>

        {loading && visible.length === 0 ? (
          <div
            className="mt-8 grid gap-6"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols * 2 }).map((_, i) => (
              <div key={i} className="st-card aspect-[3/4] animate-pulse bg-black/5" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="st-section-title !text-2xl text-[var(--st-dark)]">
              {localized(locale, "Nothing here yet", "مفيش حاجة هنا لسه")}
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--st-dark)]/70">
              {query
                ? localized(locale, "Try a different search.", "جرب كلمة تانية.")
                : localized(locale, "Check back soon.", "تعالى بص تاني قريب.")}
            </p>
            <Link to="/products" className="st-btn mt-6">
              {localized(locale, "Browse everything", "اتفرج على الكل")}
            </Link>
          </div>
        ) : (
          <ul
            className="mt-8 grid gap-6 grid-cols-2"
            style={{ gridTemplateColumns: undefined }}
          >
            {visible.map((p) => {
              const img = productImage(p);
              const slug = (p as { slug?: string }).slug ?? p.id;
              return (
                <li key={p.id} className="st-card st-product-card">
                  <Link to={`/products/${slug}`} className="block">
                    <div className="st-product-img-wrap aspect-[3/4] bg-[var(--st-cream)]">
                      {img ? (
                        <img
                          src={img}
                          alt={p.name ?? ""}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-[11px] font-black uppercase tracking-[0.14em] opacity-40">
                          {localized(locale, "No image", "بدون صورة")}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-black uppercase tracking-tight text-[var(--st-dark)] line-clamp-2">
                        {p.name}
                      </p>
                      <p className="mt-2 text-sm font-black text-[var(--st-dark)]">
                        <Money amount={(p as { price?: number }).price ?? 0} />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Grid column count is a merchant setting, so it has to be a real style
          rather than a Tailwind class name the compiler never sees. */}
      <style>{`
        @media (min-width: 768px) {
          [data-st-section="${sectionId}"] ul { grid-template-columns: repeat(${cols}, minmax(0, 1fr)); }
        }
      `}</style>
    </section>
  );
}
