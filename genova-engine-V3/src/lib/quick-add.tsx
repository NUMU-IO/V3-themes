/**
 * Quick add — add to bag without leaving the listing.
 *
 * THE RULE THIS ENFORCES: **never blind-add a size.**
 *
 * Anything with option axes opens a sheet and makes the shopper choose. The
 * tempting shortcut — quietly adding `variants[0]` — is how a store ships a
 * size XS to someone who wanted L, and the return costs more than the sale.
 *
 * (The sheet currently opens for every product, including single-variant ones.
 * That is the safe direction; an earlier version of this comment claimed a
 * direct-add fast path that has never existed.)
 *
 * The sheet is a bottom sheet on phones and an end panel above 768px, matching
 * the reference's quick-add and filter behaviour.
 */

import { useEffect, useRef, useState } from "react";
import { Image, Link, useCart, useVariantSelection, type Product } from "@numueg/theme-sdk";
import { productImages, useFocusTrap, useOverlayBehaviour } from "./shared";
import { useT } from "./i18n";
import { Price } from "./price";
import { IconClose } from "./icons";
import { useCartDrawer } from "./bag-context";

/**
 * The product's option axes, derived if necessary.
 *
 * EXPORTED because the PDP needs exactly this and had its own, weaker copy:
 * `product.options ?? []`. On a canonical opt-in-variant product the API
 * returns `options: []` while the variants still carry `option_values`, so the
 * PDP rendered NO picker and silently added the first variant — measured on
 * `qalab-optin`, which added "S / Red" without ever asking. That is precisely
 * the blind size-add this file's docblock promises to prevent, reintroduced by
 * a second implementation of the same idea.
 */
export function optionAxes(product: Product): { name: string; values: string[] }[] {
  if (product.options && product.options.length > 0) {
    return product.options.map((o) => ({ name: o.name, values: o.values }));
  }
  // Older payloads ship variants with `option_values` but no `options` array.
  // Derive the axes so the picker still works instead of falling through to a
  // blind add.
  const axes = new Map<string, string[]>();
  for (const v of product.variants ?? []) {
    for (const [axis, value] of Object.entries(v.option_values ?? v.options ?? {})) {
      const list = axes.get(axis) ?? [];
      if (!list.includes(value)) list.push(value);
      axes.set(axis, list);
    }
  }
  return [...axes.entries()].map(([name, values]) => ({ name, values }));
}

export function useQuickAdd() {
  const [product, setProduct] = useState<Product | null>(null);
  return {
    product,
    open: (p: Product) => setProduct(p),
    close: () => setProduct(null),
  };
}

/**
 * Does this record actually carry variant information, or is it just thin?
 *
 * The distinction matters enormously: "no axes" and "axes not loaded" look
 * identical on a listing payload, and treating the second as the first is
 * exactly how a shop ships the wrong size.
 */
function hasVariantData(p: Product): boolean {
  return (p.options?.length ?? 0) > 0 || (p.variants?.length ?? 0) > 0;
}

export function QuickAddSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT();
  const { addItem } = useCart();
  const bag = useCartDrawer();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Hydrate the thin listing record.
   *
   * The catalog LIST endpoint returns `options: []` and `variants: []` for
   * every product — so a card cannot tell a one-size product from a five-size
   * one, and quick add had to be withheld entirely across the whole theme
   * rather than guess. The DETAIL endpoint has the data; it just had no host
   * route until now (`/api/storefront/products/{id}`, added alongside this).
   *
   * So: open the sheet immediately (the shopper gets feedback on the tap),
   * fetch in the background, and render the picker when the axes arrive. If
   * the fetch fails we say so and offer the PDP — we never fall back to adding
   * something we could not verify.
   */
  const [full, setFull] = useState<Product>(product);
  const [loading, setLoading] = useState(!hasVariantData(product));
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (hasVariantData(product)) {
      setFull(product);
      setLoading(false);
      setLoadFailed(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadFailed(false);
    // Slug is friendlier in logs and the route accepts either.
    const key = product.slug ?? product.id;
    fetch(`/api/storefront/products/${encodeURIComponent(String(key))}`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (!alive) return;
        // Tolerate both the bare product and a `{data}` envelope — the same
        // envelope-shape lesson that broke useCollections in the SDK.
        const p = (json?.data ?? json) as Product;
        if (p && (p.id || p.slug)) setFull({ ...product, ...p });
        else setLoadFailed(true);
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [product]);

  const vs = useVariantSelection(full, { autoSelect: false });

  useFocusTrap(true, panelRef);
  useOverlayBehaviour(true, onClose);

  const axes = optionAxes(full);
  const image = productImages(full)[0] ?? productImages(product)[0];
  const price = vs.variant?.price ?? full.price ?? product.price;
  const compareAt = vs.variant?.compare_at_price ?? full.compare_at_price ?? product.compare_at_price;
  const href = `/products/${full.slug ?? product.slug ?? product.id}`;

  const submit = async () => {
    if (!vs.isComplete && axes.length > 0) {
      setError(t("product.choose_options", "Choose your options first"));
      return;
    }
    // Never add a product whose variants we could not read. "Load failed" is
    // not "has no options" — conflating the two is the blind size-add this
    // whole file exists to prevent.
    if (loadFailed || loading) {
      setError(t("product.load_failed", "Couldn’t load the options — open the product page"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await addItem(product.id, vs.variant?.id, 1, vs.selection);
      if (res && (res as { success?: boolean }).success === false) {
        setError(t("product.add_failed", "Couldn’t add that — try again"));
        return;
      }
      onClose();
      bag.open(product.name);
    } catch {
      setError(t("product.add_failed", "Couldn’t add that — try again"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="gn-sheet-scrim is-open" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="gn-sheet is-open"
        role="dialog"
        aria-modal="true"
        aria-label={t("product.quick_add", "Quick add")}
      >
        <div className="gn-sheet-head">
          <span className="gn-label">{t("product.quick_add", "Quick add")}</span>
          <button
            type="button"
            className="gn-icon-btn"
            aria-label={t("general.close", "Close")}
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>

        <div className="gn-sheet-product">
          <span className="gn-plate gn-sheet-thumb">
            {image ? <Image src={image.url} alt="" sizes="68px" loading="lazy" /> : null}
          </span>
          <div>
            <p className="gn-sheet-title">{product.name}</p>
            <Price amount={price} compareAt={compareAt} currency={product.currency} />
          </div>
        </div>

        <div className="gn-sheet-body">
          {loading && (
            <p className="gn-sheet-loading gn-label" role="status" aria-live="polite">
              {t("product.loading_options", "Loading sizes…")}
            </p>
          )}

          {loadFailed && (
            <div className="gn-formnote" role="alert">
              <p>{t("product.load_failed", "Couldn’t load the options — open the product page")}</p>
              <Link to={href} className="gn-textlink" onClick={onClose}>
                {t("product.view_product", "View product")}
              </Link>
            </div>
          )}

          {!loading && !loadFailed && axes.map((axis) => (
            <fieldset key={axis.name} className="gn-axis">
              <legend className="gn-label gn-axis-legend">{axis.name}</legend>
              <div className="gn-axis-values">
                {axis.values.map((value) => {
                  const selected = vs.selection[axis.name] === value;
                  // `availability` only constrains axes not yet locked; an axis
                  // with no entry is fully available.
                  const avail = vs.availability[axis.name];
                  const unavailable = avail ? !avail.has(value) : false;
                  return (
                    <button
                      key={value}
                      type="button"
                      className="gn-chip"
                      data-selected={selected || undefined}
                      data-unavailable={unavailable || undefined}
                      aria-pressed={selected}
                      onClick={() => vs.select(axis.name, value)}
                    >
                      {value}
                      {unavailable && (
                        <span className="gn-sr-only">
                          {` — ${t("product.sold_out", "Sold out")}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {/* Errors are ink + an icon-free hairline card, never a red string —
              Genova has no red, and colour-only status fails WCAG 1.4.1. */}
          {error && (
            <p className="gn-formnote" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          className="gn-btn gn-btn-primary gn-sheet-cta"
          onClick={submit}
          disabled={busy || loading || loadFailed}
        >
          {busy
            ? t("product.adding", "Adding…")
            : loading
              ? t("product.loading_options", "Loading sizes…")
              : t("product.add_to_cart", "Add to cart")}
        </button>
      </div>
    </>
  );
}

/**
 * Should this product open the sheet, or can it go straight into the bag?
 * A product with any option axis always opens the sheet.
 *
 * NOTE: nothing calls this today — the sheet always opens. Kept because the
 * decision it encodes is the one rule that must not be re-litigated casually.
 */
export function needsOptions(product: Product): boolean {
  return optionAxes(product).length > 0;
}
