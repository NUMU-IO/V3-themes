/**
 * Quick add — the black `+` on a card image, and the sheet it opens.
 *
 * THE RULE THIS ENFORCES: **never blind-add a size.**
 *
 * Anything with option axes opens a sheet and makes the shopper choose. The
 * tempting shortcut — quietly adding `variants[0]` — is how a store ships an XS
 * to someone who wanted L, and the return costs more than the sale did.
 *
 * The sheet is a bottom sheet ≤749px and an end panel above, matching the
 * reference's own sheet behaviour.
 *
 * ## No provider, on purpose
 *
 * Each section that renders a grid owns its own `useQuickAdd()` and renders the
 * sheet itself. A theme-wide context provider is the tidier-looking option and
 * it is how Genova shipped a drawer that was pixel-perfect and impossible to
 * open: the provider was rendered as a childless leaf, so every consumer fell
 * through to the module-level default whose `open()` is a no-op, and TypeScript
 * never blinked because `children` was optional. Local state cannot fail that
 * way.
 */

import { useEffect, useRef, useState } from "react";
import { Image, Link, useCart, useVariantSelection, type Product } from "@numueg/theme-sdk";
import { productCurrency, productImages, useFocusTrap, useOverlayBehaviour } from "./shared";
import { useT } from "./i18n";
import { Price } from "./price";
import { continuesSelling } from "./availability";
import { IconClose } from "./icons";

/**
 * The product's option axes, derived if necessary.
 *
 * EXPORTED because the PDP needs exactly this and must not grow its own,
 * weaker copy (`product.options ?? []`). On an opt-in-variant product the API
 * returns `options: []` while the variants still carry `option_values`, so a
 * PDP reading only `product.options` renders NO picker and silently adds the
 * first variant — the same blind size-add this file exists to prevent,
 * reintroduced by a second implementation of the same idea.
 */
export function optionAxes(product: Product): { name: string; values: string[] }[] {
  if (product.options && product.options.length > 0) {
    return product.options.map((o) => ({ name: o.name, values: o.values }));
  }
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

/** Local open/close state for one grid. */
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
 * The distinction matters enormously: "has no axes" and "axes not loaded" look
 * identical on a listing payload, and treating the second as the first is
 * exactly how a shop ships the wrong size.
 */
function hasVariantData(p: Product): boolean {
  return (p.options?.length ?? 0) > 0 || (p.variants?.length ?? 0) > 0;
}

export function QuickAddSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const t = useT();
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Hydrate the thin listing record.
   *
   * The catalog LIST endpoint returns no `options` and no `variants`, so a card
   * cannot tell a one-size product from a five-size one. The DETAIL endpoint
   * has the data, reachable through the host route
   * `/api/storefront/products/{id}`.
   *
   * So: open the sheet immediately (the shopper gets feedback on the tap),
   * fetch in the background, render the picker when the axes arrive. If the
   * fetch fails, say so and offer the product page — never fall back to adding
   * something that could not be verified.
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
        // envelope-shape lesson that broke `useCollections` in the SDK.
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
  // `full` first — the hydrated detail record carries `attributes`; the thin
  // listing record the card handed us may not.
  const oversells = continuesSelling(full) || continuesSelling(product);
  const image = productImages(full)[0] ?? productImages(product)[0];
  const price = vs.variant?.price ?? full.price ?? product.price;
  const compareAt =
    vs.variant?.compare_at_price ?? full.compare_at_price ?? product.compare_at_price;
  const currency = productCurrency(full) ?? productCurrency(product);
  const href = `/products/${full.slug ?? product.slug ?? product.id}`;

  const submit = async () => {
    if (!vs.isComplete && axes.length > 0) {
      setError(t("product.choose_options", "Choose your options first"));
      return;
    }
    // Never add a product whose variants could not be read. "Load failed" is
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
      setAdded(true);
    } catch {
      setError(t("product.add_failed", "Couldn’t add that — try again"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="tn-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="tn-sheet is-open"
        role="dialog"
        aria-modal="true"
        aria-label={t("product.quick_add", "Quick add")}
      >
        <div className="tn-sheet-head">
          <span className="tn-label">
            {added ? t("product.added", "Added to bag") : t("product.quick_add", "Quick add")}
          </span>
          <button
            type="button"
            className="tn-icon-btn"
            aria-label={t("common.close", "Close")}
            onClick={onClose}
          >
            <IconClose />
          </button>
        </div>

        <div className="tn-sheet-product">
          <span className="tn-plate tn-sheet-thumb">
            {image ? <Image src={image.url} alt="" sizes="72px" loading="lazy" /> : null}
          </span>
          <div className="tn-sheet-meta">
            <p className="tn-sheet-title">{product.name}</p>
            <Price amount={price} compareAt={compareAt} currency={currency} />
          </div>
        </div>

        {/* Success replaces the picker rather than closing the sheet. An
            auto-dismiss gives a shopper nothing to act on; two explicit routes
            out — back to the grid, or on to the bag — is the whole decision
            they have at that moment. The bag count in the header has already
            incremented, so the state is confirmed in two places. */}
        {added ? (
          <div className="tn-sheet-body">
            <p className="tn-sheet-done" role="status" aria-live="polite">
              {t("product.added_full", "Added to your bag.")}
            </p>
            <div className="tn-sheet-actions">
              <button type="button" className="tn-btn tn-btn-outline" onClick={onClose}>
                {t("product.keep_shopping", "Keep shopping")}
              </button>
              <Link to="/cart" className="tn-btn tn-btn-dark" onClick={onClose}>
                {t("product.view_bag", "View bag")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="tn-sheet-body">
              {loading && (
                <p className="tn-label tn-sheet-loading" role="status" aria-live="polite">
                  {t("product.loading_options", "Loading options…")}
                </p>
              )}

              {loadFailed && (
                <div className="tn-formnote" role="alert">
                  <p>
                    {t("product.load_failed", "Couldn’t load the options — open the product page")}
                  </p>
                  <Link to={href} className="tn-textlink" onClick={onClose}>
                    {t("product.view_product", "View product")}
                  </Link>
                </div>
              )}

              {!loading &&
                !loadFailed &&
                axes.map((axis) => (
                  <fieldset key={axis.name} className="tn-axis">
                    <legend className="tn-label tn-axis-legend">{axis.name}</legend>
                    <div className="tn-axis-values">
                      {axis.values.map((value) => {
                        const selected = vs.selection[axis.name] === value;
                        // `availability` only constrains axes not yet locked;
                        // an axis with no entry is fully available.
                        //
                        // An overselling product has no unavailable values at
                        // all: the SDK builds this map from variant stock, and
                        // the flag that lifts the stock limit lives on the
                        // product where the SDK cannot see it.
                        const avail = oversells ? undefined : vs.availability[axis.name];
                        const unavailable = avail ? !avail.has(value) : false;
                        return (
                          <button
                            key={value}
                            type="button"
                            className="tn-chip"
                            data-selected={selected || undefined}
                            data-unavailable={unavailable || undefined}
                            aria-pressed={selected}
                            onClick={() => vs.select(axis.name, value)}
                          >
                            {value}
                            {unavailable && (
                              <span className="tn-sr">{` — ${t("common.sold_out", "Sold out")}`}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

              {/* Red text AND a bordered card AND the words. Teen has colour
                  available, but colour is never the only carrier of the
                  message (WCAG 1.4.1). */}
              {error && (
                <p className="tn-formnote is-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              type="button"
              className="tn-btn tn-btn-primary tn-sheet-cta"
              onClick={submit}
              disabled={busy || loading || loadFailed}
            >
              {busy
                ? t("product.adding", "Adding…")
                : loading
                  ? t("product.loading_options", "Loading options…")
                  : t("common.add_to_cart", "Add to cart")}
            </button>
          </>
        )}
      </div>
    </>
  );
}
