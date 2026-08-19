/**
 * Teen — the listing engine: option axes, facets, sorting and search.
 *
 * ## Why all of this is client-side (plan decision D3)
 *
 * Verified against the API rather than assumed:
 *
 *   • `public.py::browse_products` accepts exactly `category_id`, `page`,
 *     `limit`, `search` and `fields`. There is **no `sort` parameter at all**,
 *     so server-side sorting is not a thing this platform can do today.
 *   • The host's own escape hatch, `/api/products`, forwards only `store_id`
 *     and `limit` — not `category_id`, not `search`. A theme therefore cannot
 *     page or re-query from the browser either.
 *   • The SDK's `useSearch()` fetches `/api/storefront/search`, and that route
 *     **does not exist** in numu-storefront. Calling it 404s, which is why Teen
 *     filters `page.data.products` itself instead.
 *
 * What the host DOES pre-fetch is generous: 500 products on a collection route
 * and 1000 on `/search` (paged through in 100s by `fetchProducts`, because the
 * backend caps `limit` at 100). So the pool is nearly always the whole
 * catalogue, and sorting it in the browser is both correct and instant.
 *
 * Where it is NOT the whole catalogue, the listing says so — see `isCapped`.
 * A "Load more" button that cannot load more is worse than no button.
 *
 * ## Two sorts are conditional, on purpose
 *
 * `best` and `relevance` are only offered when they can be answered honestly:
 *
 *   • **Best selling** needs a sales figure. The list payload
 *     (`public.py`, ~line 968) carries `id, name, slug, price, compare_at_price,
 *     quantity, is_in_stock, is_on_sale, category_id, images, tags, attributes,
 *     created_at, updated_at` — and no sales count of any kind.
 *     `availableSorts` therefore hides the option unless some product in the
 *     pool actually carries one of the known fields, so it lights up by itself
 *     the day the backend adds one. The alternative — showing it and returning
 *     the payload order — is a menu entry that lies.
 *   • **Most relevant** is meaningless without a query.
 *
 * The other seven always work: `created_at` is in the payload, so both date
 * directions are real.
 */

import type { Product } from "@numueg/theme-sdk";
import { asString } from "./shared";
import { isDiscounted, toAmount } from "./price";

/* ═════════════════════════════════════════════════════════════════════════
   Option axes
   ─────────────────────────────────────────────────────────────────────────
   ONE shape-tolerant reader, shared by the card swatches (swatches.tsx) and
   the facet builder below. Two implementations of "where do a product's
   colours live" is how the grid and the filter panel end up disagreeing about
   what a store sells.
   ═════════════════════════════════════════════════════════════════════════ */

export interface AxisValue {
  label: string;
  hex?: string;
  image?: string;
}

export interface Axis {
  name: string;
  values: AxisValue[];
}

export const COLOR_AXIS_NAMES = new Set([
  "color",
  "colour",
  "colors",
  "colours",
  "لون",
  "اللون",
  "الوان",
  "ألوان",
  "الألوان",
]);

export const SIZE_AXIS_NAMES = new Set([
  "size",
  "sizes",
  "مقاس",
  "المقاس",
  "مقاسات",
  "المقاسات",
  "حجم",
  "الحجم",
]);

const axisKey = (name: string) => name.trim().toLowerCase();

export const isColorAxis = (name: string): boolean => COLOR_AXIS_NAMES.has(axisKey(name));
export const isSizeAxis = (name: string): boolean => SIZE_AXIS_NAMES.has(axisKey(name));

/** `hexValues` / `imageValues` appear as both value-keyed dicts and arrays. */
function pickExtra(extra: unknown, value: string, index: number): string | undefined {
  if (Array.isArray(extra)) return asString(extra[index]) || undefined;
  if (extra && typeof extra === "object") {
    const v = asString((extra as Record<string, unknown>)[value]);
    return v || undefined;
  }
  return undefined;
}

/**
 * Every option axis a product carries, from either place it can live.
 *
 *   1. `product.options`     → `[{ name, values: [...] }]`          (Phase 8.1)
 *   2. `attributes.variants` → `[{ name, options: [...], hexValues }]` (legacy)
 *
 * Both are read because a single store can serve one shape from the list
 * endpoint and the other from the detail endpoint in the same page. First
 * source with real values wins per axis name.
 *
 * ⚠ The LIST payload carries neither for a Phase-8.1 store — it emits
 * `attributes` but no `options` and no `variants`. So on those stores this
 * returns `[]` for grid products and the colour/size facets are correctly
 * ABSENT rather than empty-but-present. See the D6 note in swatches.tsx.
 */
export function productAxes(product: unknown): Axis[] {
  const p = (product ?? {}) as Record<string, unknown>;
  const attrs = (p.attributes ?? {}) as Record<string, unknown>;
  const candidates: unknown[] = [
    ...(Array.isArray(p.options) ? p.options : []),
    ...(Array.isArray(attrs.variants) ? attrs.variants : []),
  ];

  const out: Axis[] = [];
  const byKey = new Map<string, Axis>();

  for (const raw of candidates) {
    const axis = (raw ?? {}) as Record<string, unknown>;
    const name = asString(axis.name);
    if (!name) continue;

    // Phase 8.1 calls the value list `values`; the legacy attributes shape
    // calls it `options`. Same data, two names — reading only one empties the
    // facet panel on half the fleet.
    const rawValues = Array.isArray(axis.values)
      ? axis.values
      : Array.isArray(axis.options)
        ? axis.options
        : [];

    const values = rawValues
      .map((v, i): AxisValue | null => {
        const label = asString(v);
        if (!label) return null;
        return {
          label,
          hex: pickExtra(axis.hexValues, label, i),
          image: pickExtra(axis.imageValues, label, i),
        };
      })
      .filter((v): v is AxisValue => v !== null);

    if (values.length === 0) continue;

    // MERGE, don't skip. A Phase-8.1 store carries the axis in BOTH places:
    // `product.options` has the canonical value list and no swatch colours,
    // `attributes.variants` has the same values plus `hexValues`. First-wins
    // therefore took the list from `options` and threw the colours away, and
    // every swatch in the theme — grid cards and PDP alike — rendered as an
    // empty "unknown" square on exactly the stores that had defined colours.
    const existing = byKey.get(axisKey(name));
    if (!existing) {
      const axisOut = { name, values };
      byKey.set(axisKey(name), axisOut);
      out.push(axisOut);
      continue;
    }
    for (const v of values) {
      const prev = existing.values.find(
        (e) => e.label.trim().toLowerCase() === v.label.trim().toLowerCase(),
      );
      if (!prev) existing.values.push(v);
      else {
        // Only fill gaps — never overwrite metadata the first source supplied.
        if (!prev.hex && v.hex) prev.hex = v.hex;
        if (!prev.image && v.image) prev.image = v.image;
      }
    }
  }

  return out;
}

/* ═════════════════════════════════════════════════════════════════════════
   Field readers — tolerant, because the pool mixes payload shapes
   ═════════════════════════════════════════════════════════════════════════ */

/** `created_at` as a timestamp, or null when the row carries no usable date. */
export function productDate(p: unknown): number | null {
  const r = (p ?? {}) as Record<string, unknown>;
  const raw = asString(r.created_at) || asString(r.createdAt) || asString(r.published_at);
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/**
 * A sales figure, if the payload has one anywhere.
 *
 * Nothing in the storefront catalog response provides this today. The reader
 * exists so "Best selling" turns itself on the moment one appears, rather than
 * being a menu entry that silently returns the default order.
 */
export function productSales(p: unknown): number | null {
  const r = (p ?? {}) as Record<string, unknown>;
  for (const key of ["sales_count", "total_sold", "units_sold", "orders_count"]) {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

/** A product's price as a number, or null when it cannot be parsed. */
export function productPrice(p: unknown): number | null {
  return toAmount((p as Record<string, unknown> | null)?.price);
}

/** In stock? `in_stock` on the normalized shape, `is_in_stock` on the raw one. */
export function productInStock(p: unknown): boolean {
  const r = (p ?? {}) as Record<string, unknown>;
  if (typeof r.in_stock === "boolean") return r.in_stock;
  if (typeof r.is_in_stock === "boolean") return r.is_in_stock;
  // Unknown ⇒ assume buyable. Hiding a product because a flag was missing is
  // the more expensive error of the two.
  return true;
}

/** Discounted? The computed truth first, the backend's flag as a fallback. */
export function productOnSale(p: unknown): boolean {
  const r = (p ?? {}) as Record<string, unknown>;
  if (isDiscounted(r.price, r.compare_at_price)) return true;
  return r.is_on_sale === true;
}

/** The collection id a product belongs to, under either key. */
export function productCollectionId(p: unknown): string {
  const r = (p ?? {}) as Record<string, unknown>;
  return asString(r.category_id) || asString(r.category);
}

/* ═════════════════════════════════════════════════════════════════════════
   Text normalisation and search
   ═════════════════════════════════════════════════════════════════════════ */

// Harakat, tatweel and the superscript alef. A shopper types "قميص"; the
// catalogue may hold "قَمِيص". Without this they do not match.
const AR_MARKS = /[ً-ْـٰ]/g;
const AR_DIGITS = /[٠-٩]/g;

/**
 * Fold a string to a comparable form.
 *
 * Lowercase, strip Arabic diacritics, unify the alef/ya/ta-marbuta variants,
 * and convert Arabic-Indic digits to ASCII. This is what makes Arabic search
 * usable on an Egyptian store: `تيشرت`, `تيشيرت` and `تِيشيرت` all fold
 * together, and `مقاس ٣` finds `Size 3`.
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(AR_MARKS, "")
    .replace(AR_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[آأإ]/g, "ا") // آ أ إ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a query into folded tokens. */
export function queryTokens(query: string): string[] {
  return normalizeText(query).split(" ").filter(Boolean);
}

/** Everything about a product a query is allowed to match. */
function haystack(p: unknown): string {
  const r = (p ?? {}) as Record<string, unknown>;
  const attrs = (r.attributes ?? {}) as Record<string, unknown>;
  const parts: string[] = [
    asString(r.name),
    asString(attrs.name_ar),
    asString(attrs.nameAr),
    asString(r.slug),
    asString(r.sku),
    asString(r.brand),
    asString(r.short_description),
    asString(r.product_type),
  ];
  if (Array.isArray(r.tags)) parts.push(r.tags.map((t) => asString(t)).join(" "));
  for (const axis of productAxes(r)) {
    parts.push(axis.name, axis.values.map((v) => v.label).join(" "));
  }
  return normalizeText(parts.filter(Boolean).join(" "));
}

/**
 * Does this product match every token in the query?
 *
 * AND across tokens, so "blue cap" narrows rather than widens — an OR match
 * returns every cap AND everything blue, which reads as a broken search.
 */
export function matchesQuery(product: unknown, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = haystack(product);
  return tokens.every((t) => hay.includes(t));
}

/**
 * Relevance score, higher is better.
 *
 * Whole-name match beats a name that starts with the query, which beats a name
 * that merely contains it, which beats a match anywhere else in the record.
 * Without this the "Most relevant" sort is just the payload order wearing a
 * different label.
 */
export function searchScore(product: unknown, query: string): number {
  const q = normalizeText(query);
  if (!q) return 0;
  const r = (product ?? {}) as Record<string, unknown>;
  const name = normalizeText(asString(r.name));
  let score = 0;
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 60;
  else if (name.includes(q)) score += 40;
  if (normalizeText(asString(r.sku)) === q) score += 30;
  if (Array.isArray(r.tags) && r.tags.some((t) => normalizeText(asString(t)) === q)) score += 20;
  if (score === 0 && haystack(r).includes(q)) score += 5;
  return score;
}

/* ═════════════════════════════════════════════════════════════════════════
   Sorting
   ═════════════════════════════════════════════════════════════════════════ */

export type SortId =
  | "featured"
  | "relevance"
  | "best"
  | "az"
  | "za"
  | "price-asc"
  | "price-desc"
  | "date-asc"
  | "date-desc";

export const ALL_SORTS: SortId[] = [
  "featured",
  "relevance",
  "best",
  "az",
  "za",
  "price-asc",
  "price-desc",
  "date-asc",
  "date-desc",
];

/**
 * Which of the nine can be answered from THIS pool.
 *
 * See the header: `best` needs a sales field nothing currently sends, and
 * `relevance` needs a query. Everything else is always available — dropping a
 * date sort would be wrong, `created_at` is in every list payload.
 */
export function availableSorts(products: readonly unknown[], hasQuery: boolean): SortId[] {
  const hasSales = products.some((p) => productSales(p) !== null);
  const hasDates = products.some((p) => productDate(p) !== null);
  return ALL_SORTS.filter((id) => {
    if (id === "relevance") return hasQuery;
    if (id === "best") return hasSales;
    if (id === "date-asc" || id === "date-desc") return hasDates;
    return true;
  });
}

/** Nulls last in BOTH directions — a product with no price is not the cheapest. */
function compareNullable(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
}

/**
 * Sort a copy of the pool.
 *
 * `Array.prototype.sort` is stable (ES2019), so equal keys keep the payload
 * order — which is exactly the "Featured" order the merchant arranged. That is
 * load-bearing: an unstable sort would shuffle same-price products on every
 * render, and the grid would visibly reorder itself between navigations.
 *
 * The collator is built ONCE per call. Constructing an `Intl.Collator` inside
 * the comparator is the classic way to make an alphabetical sort of 500 items
 * take a visible beat.
 */
export function sortProducts<T>(
  products: readonly T[],
  sort: SortId,
  opts: { locale?: string; query?: string } = {},
): T[] {
  const list = [...products];
  if (sort === "featured") return list;

  if (sort === "az" || sort === "za") {
    const collator = new Intl.Collator(opts.locale || undefined, {
      numeric: true,
      sensitivity: "base",
    });
    const dir = sort === "az" ? 1 : -1;
    return list.sort(
      (a, b) =>
        collator.compare(
          asString((a as Record<string, unknown>).name),
          asString((b as Record<string, unknown>).name),
        ) * dir,
    );
  }

  if (sort === "price-asc" || sort === "price-desc") {
    const dir = sort === "price-asc" ? 1 : -1;
    return list.sort((a, b) => compareNullable(productPrice(a), productPrice(b), dir));
  }

  if (sort === "date-asc" || sort === "date-desc") {
    const dir = sort === "date-asc" ? 1 : -1;
    return list.sort((a, b) => compareNullable(productDate(a), productDate(b), dir));
  }

  if (sort === "best") {
    return list.sort((a, b) => compareNullable(productSales(a), productSales(b), -1));
  }

  // relevance
  const q = opts.query ?? "";
  return list.sort((a, b) => searchScore(b, q) - searchScore(a, q));
}

/* ═════════════════════════════════════════════════════════════════════════
   Facets
   ═════════════════════════════════════════════════════════════════════════ */

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  hex?: string;
  image?: string;
}

export interface FacetGroup {
  id: "availability" | "color" | "size" | "collection";
  label: string;
  kind: "check" | "swatch";
  values: FacetValue[];
}

export interface FilterState {
  availability: string[];
  colors: string[];
  sizes: string[];
  collections: string[];
  onSale: boolean;
  priceMin: number | null;
  priceMax: number | null;
}

export const EMPTY_FILTERS: FilterState = {
  availability: [],
  colors: [],
  sizes: [],
  collections: [],
  onSale: false,
  priceMin: null,
  priceMax: null,
};

/** How many filters the shopper has applied — the number on the Filter button. */
export function activeFilterCount(s: FilterState): number {
  return (
    s.availability.length +
    s.colors.length +
    s.sizes.length +
    s.collections.length +
    (s.onSale ? 1 : 0) +
    (s.priceMin !== null ? 1 : 0) +
    (s.priceMax !== null ? 1 : 0)
  );
}

export function hasActiveFilters(s: FilterState): boolean {
  return activeFilterCount(s) > 0;
}

/** Values of one axis kind on one product, folded for comparison. */
function axisValuesOf(product: unknown, match: (name: string) => boolean): AxisValue[] {
  const out: AxisValue[] = [];
  for (const axis of productAxes(product)) {
    if (match(axis.name)) out.push(...axis.values);
  }
  return out;
}

/**
 * Apply the filter state.
 *
 * A product whose price cannot be parsed is EXCLUDED while a price filter is
 * active. It cannot be shown to satisfy the constraint, and silently including
 * it would put an unpriced row inside "under LE 500".
 */
export function applyFilters<T>(products: readonly T[], s: FilterState): T[] {
  const wantIn = s.availability.includes("in");
  const wantOut = s.availability.includes("out");
  const colors = new Set(s.colors);
  const sizes = new Set(s.sizes);
  const collections = new Set(s.collections);

  return products.filter((p) => {
    if (wantIn !== wantOut) {
      const inStock = productInStock(p);
      if (wantIn && !inStock) return false;
      if (wantOut && inStock) return false;
    }
    if (s.onSale && !productOnSale(p)) return false;
    if (collections.size > 0 && !collections.has(productCollectionId(p))) return false;

    if (colors.size > 0) {
      const have = axisValuesOf(p, isColorAxis).map((v) => normalizeText(v.label));
      if (!have.some((v) => colors.has(v))) return false;
    }
    if (sizes.size > 0) {
      const have = axisValuesOf(p, isSizeAxis).map((v) => normalizeText(v.label));
      if (!have.some((v) => sizes.has(v))) return false;
    }

    if (s.priceMin !== null || s.priceMax !== null) {
      const amount = productPrice(p);
      if (amount === null) return false;
      if (s.priceMin !== null && amount < s.priceMin) return false;
      if (s.priceMax !== null && amount > s.priceMax) return false;
    }
    return true;
  });
}

/** Canonical garment-size order, so the facet reads XS · S · M · L · XL. */
const SIZE_ORDER = [
  "xxxs",
  "xxs",
  "xs",
  "s",
  "small",
  "m",
  "medium",
  "l",
  "large",
  "xl",
  "xxl",
  "2xl",
  "xxxl",
  "3xl",
  "4xl",
  "one size",
  "os",
  "free size",
];

function sizeRank(label: string): number {
  const key = normalizeText(label);
  const i = SIZE_ORDER.indexOf(key);
  if (i >= 0) return i;
  // A numeric size (38, 40, 42…) sorts numerically, after the letter sizes.
  const n = Number(key.replace(/[^\d.]/g, ""));
  if (Number.isFinite(n) && key.replace(/[^\d.]/g, "") !== "") return 1000 + n;
  return 2000;
}

/**
 * Build the facet groups for a pool.
 *
 * Counts are cross-filtered: each group counts against the pool with the OTHER
 * groups applied but ITSELF cleared — the standard behaviour, and the reason a
 * count never claims "12" for a combination that yields nothing. A value that
 * reaches zero stays visible (so the shopper can see the axis exists) but is
 * disabled by the caller.
 *
 * Groups with no values are omitted entirely. On a Phase-8.1 store the LIST
 * payload carries no axes at all, so colour and size correctly do not appear
 * rather than appearing empty.
 */
export function buildFacets(
  products: readonly unknown[],
  state: FilterState,
  opts: {
    labels: { availability: string; inStock: string; outOfStock: string; color: string; size: string; collection: string };
    collectionNames?: Map<string, string>;
    includeCollections?: boolean;
  },
): { groups: FacetGroup[]; bounds: { min: number; max: number } | null } {
  const countWith = (patch: Partial<FilterState>, predicate: (p: unknown) => boolean) =>
    applyFilters(products, { ...state, ...patch }).filter(predicate).length;

  const groups: FacetGroup[] = [];

  // ── Availability ─────────────────────────────────────────────────────────
  const anyInStock = products.some((p) => productInStock(p));
  const anyOutOfStock = products.some((p) => !productInStock(p));
  if (anyInStock && anyOutOfStock) {
    groups.push({
      id: "availability",
      label: opts.labels.availability,
      kind: "check",
      values: [
        {
          value: "in",
          label: opts.labels.inStock,
          count: countWith({ availability: [] }, (p) => productInStock(p)),
        },
        {
          value: "out",
          label: opts.labels.outOfStock,
          count: countWith({ availability: [] }, (p) => !productInStock(p)),
        },
      ],
    });
  }

  // ── Colour ───────────────────────────────────────────────────────────────
  const colorMeta = new Map<string, AxisValue>();
  for (const p of products) {
    for (const v of axisValuesOf(p, isColorAxis)) {
      const key = normalizeText(v.label);
      if (!key) continue;
      const prev = colorMeta.get(key);
      // Keep the first label seen, but upgrade to one that carries a swatch.
      if (!prev || (!prev.hex && !prev.image && (v.hex || v.image))) colorMeta.set(key, v);
    }
  }
  if (colorMeta.size > 0) {
    groups.push({
      id: "color",
      label: opts.labels.color,
      kind: "swatch",
      values: [...colorMeta.entries()]
        .map(([key, meta]) => ({
          value: key,
          label: meta.label,
          hex: meta.hex,
          image: meta.image,
          count: countWith({ colors: [] }, (p) =>
            axisValuesOf(p, isColorAxis).some((v) => normalizeText(v.label) === key),
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    });
  }

  // ── Size ─────────────────────────────────────────────────────────────────
  const sizeMeta = new Map<string, string>();
  for (const p of products) {
    for (const v of axisValuesOf(p, isSizeAxis)) {
      const key = normalizeText(v.label);
      if (key && !sizeMeta.has(key)) sizeMeta.set(key, v.label);
    }
  }
  if (sizeMeta.size > 0) {
    groups.push({
      id: "size",
      label: opts.labels.size,
      kind: "check",
      values: [...sizeMeta.entries()]
        .map(([key, label]) => ({
          value: key,
          label,
          count: countWith({ sizes: [] }, (p) =>
            axisValuesOf(p, isSizeAxis).some((v) => normalizeText(v.label) === key),
          ),
        }))
        .sort((a, b) => sizeRank(a.label) - sizeRank(b.label)),
    });
  }

  // ── Collection ───────────────────────────────────────────────────────────
  // Only on the unscoped listing. Inside one collection every product shares
  // the same value, so the group would be a single checkbox that does nothing.
  if (opts.includeCollections) {
    const ids = new Map<string, string>();
    for (const p of products) {
      const id = productCollectionId(p);
      if (!id) continue;
      const name = opts.collectionNames?.get(id);
      if (name && !ids.has(id)) ids.set(id, name);
    }
    if (ids.size > 1) {
      groups.push({
        id: "collection",
        label: opts.labels.collection,
        kind: "check",
        values: [...ids.entries()]
          .map(([id, name]) => ({
            value: id,
            label: name,
            count: countWith({ collections: [] }, (p) => productCollectionId(p) === id),
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      });
    }
  }

  // ── Price bounds ─────────────────────────────────────────────────────────
  const amounts = products.map(productPrice).filter((n): n is number => n !== null);
  const bounds =
    amounts.length > 1
      ? { min: Math.floor(Math.min(...amounts)), max: Math.ceil(Math.max(...amounts)) }
      : null;

  return { groups, bounds };
}

/* ═════════════════════════════════════════════════════════════════════════
   Pool cap
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * The host's per-route pre-fetch ceiling. `fetchProducts(store.id, 500)` on
 * both collection routes; 1000 on `/search`.
 */
export const POOL_CAP = 500;

/**
 * Is the pool a TRUNCATED view of the catalogue?
 *
 * When the collection's own `product_count` is known, that is exact. Otherwise
 * a pool sitting exactly on the host's ceiling is the signal. Either way the
 * listing must say so instead of offering a "Load more" that can only ever
 * re-slice what it already has — the host's `/api/products` accepts neither
 * `page` nor `category_id`, so there is genuinely nothing more to fetch.
 */
export function isCapped(poolSize: number, knownTotal?: number | null): boolean {
  if (typeof knownTotal === "number" && knownTotal > 0) return poolSize < knownTotal;
  return poolSize >= POOL_CAP;
}

/** Narrow a raw pool to the SDK's Product shape without pretending it is typed. */
export function asProducts(list: readonly unknown[]): Product[] {
  return list as Product[];
}
