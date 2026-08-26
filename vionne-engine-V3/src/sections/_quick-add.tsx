"use client";
/**
 * _quick-add — one-tap add-to-cart, shared by every surface that shows a
 * product (A8).
 *
 * Fewer clicks → more items per session. This started life as the PLP grid's
 * floating "+" and is now the single implementation behind every product
 * surface in the theme: the grids, the search results, the PDP's related and
 * recently-viewed rails, the "added to bag" drawer, the mini-cart suggestions
 * and both cart rails. One state machine, one set of labels, one add.
 *
 * Three presentations over one hook, because the surfaces have genuinely
 * different shapes — a circular overlay on a 3:4 card, a full-width button
 * under a rail card, a compact pill in a list row:
 *
 *   <QuickAddButton …/>  floating "+" over a card image
 *   <QuickAddBar    …/>  full-width outline button under a rail card
 *   <QuickAddPill   …/>  compact inline pill for list rows
 *
 * ── Why this fetches before it adds ──────────────────────────────────────
 *
 * A product does NOT arrive the same shape everywhere, and quick-add was
 * quietly wrong on two of the three shapes:
 *
 *   SSR list (`page.data.products`)  → `variants: []`, `in_stock` present
 *   related rail (`/…/related`)      → NO `variants` key, `is_in_stock`
 *   detail (`/…/products/{id}`)      → real `variants`, `is_in_stock`
 *
 * Only the PDP ever sees a variant. That broke three things at once:
 *
 *  1. **Duplicate bag lines.** The backend keys a line by
 *     `"{product_id}:{variant_id}"`, or by `"{product_id}"` alone when no
 *     variant is sent. A grid quick-add (no variant) therefore opens a
 *     SEPARATE line from the same product added on its PDP (which auto-selects
 *     `variants[0]`) — one product, two lines in the bag.
 *  2. **Blind multi-variant adds.** The `variants.length > 1` guard is
 *     computed from a payload that reports `[]` for every product, so it can
 *     never fire on a grid. A multi-variant product quick-added from a grid
 *     was added with no size/colour at all — the exact thing the guard exists
 *     to prevent.
 *  3. **A dead sold-out guard**, which read `in_stock` on payloads that spell
 *     it `is_in_stock`.
 *
 * So when the surface can't name a variant, we resolve it from the detail
 * endpoint ON CLICK — not on render, so a grid of 24 cards still costs zero
 * requests — cache it per product, and only then write to the cart. A product
 * that turns out to be multi-variant routes to the PDP instead of adding.
 *
 * The other rule the whole theme depends on: **the write decides the tick.**
 * `addItem` RESOLVES `{ok:false}` on a rejected add (out of stock, inventory
 * cap, 403) — it does not throw. The original button awaited it and set "done"
 * unconditionally, so a shopper whose add the backend had refused still got a
 * green ✓ and no line in the bag. Every presentation here gates on `ok`.
 *
 * Rendered INSIDE a card that is itself a <Link>, so the click must
 * preventDefault + stopPropagation or it would navigate instead of adding.
 */
import { useState } from "react";
import { Link, requestNavigate, useCart, type Product } from "@numueg/theme-sdk";
import { AlertCircle, Check, Plus, SlidersHorizontal } from "lucide-react";
import { localized } from "./_shared";

/**
 * The minimum a surface needs to know to add a line.
 *
 * Deliberately not `Product`: the recently-viewed trail is a slim localStorage
 * snapshot. Anything that can name a product can quick-add; the variant is
 * resolved on demand when it isn't already known.
 */
export interface QuickAddTarget {
  id: string;
  name: string;
  slug?: string;
  /** Default variant, when the surface's payload carries one. */
  variantId?: string;
  /**
   * Known variant count. `undefined`/0 means UNKNOWN (the list payloads all
   * report `[]`), not "single variant" — resolution settles it before adding.
   */
  variantCount?: number;
  inStock?: boolean;
}

/**
 * Narrow a catalog `Product` to what quick-add uses.
 *
 * `in_stock ?? is_in_stock` because the SSR path normalizes to the former and
 * the related-products endpoint returns the latter raw; reading only `in_stock`
 * let sold-out products keep an active "+".
 */
export function productTarget(product: Product): QuickAddTarget {
  const raw = product as Product & { is_in_stock?: boolean };
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    variantId: product.variants?.[0]?.id,
    variantCount: product.variants?.length,
    inStock: product.in_stock ?? raw.is_in_stock,
  };
}

interface ResolvedProduct {
  variantId?: string;
  variantCount: number;
  inStock: boolean;
}

/**
 * The full detail payload, cached per product for the life of the page.
 *
 * Shared deliberately: quick-add needs the variant, Quick Preview needs the
 * gallery/options/description, and a shopper who previews then adds must not
 * pay for the same request twice. One cache, one in-flight promise.
 */
const detailCache = new Map<string, Record<string, unknown>>();
const detailInflight = new Map<string, Promise<Record<string, unknown> | null>>();

/**
 * Fetch (and cache) a product's DETAIL payload.
 *
 * The detail route is the only one that carries `variants`, `options` and the
 * full `images` array — the SSR list reports `variants: []` and the related
 * endpoint omits the key entirely. Returns null on any failure so callers can
 * degrade instead of blocking.
 */
export async function fetchProductDetail(
  productId: string,
): Promise<Record<string, unknown> | null> {
  const cached = detailCache.get(productId);
  if (cached) return cached;
  const pending = detailInflight.get(productId);
  if (pending) return pending;

  const task = (async (): Promise<Record<string, unknown> | null> => {
    try {
      const res = await fetch(
        `/api/storefront/products/${encodeURIComponent(productId)}`,
      );
      if (!res.ok) return null;
      const json = (await res.json()) as Record<string, unknown>;
      // Accept the bare product and the platform `{data:{…}}` envelope.
      const body = (
        json && typeof json.data === "object" && json.data !== null ? json.data : json
      ) as Record<string, unknown>;
      detailCache.set(productId, body);
      return body;
    } catch {
      return null;
    } finally {
      detailInflight.delete(productId);
    }
  })();

  detailInflight.set(productId, task);
  return task;
}

/**
 * Ask the detail endpoint what this product's variants actually are.
 *
 * Returns null on any failure — the caller then adds without a variant, which
 * is exactly the old behaviour, so a flaky network degrades to what shipped
 * before rather than blocking the add.
 */
async function resolveProduct(productId: string): Promise<ResolvedProduct | null> {
  const body = (await fetchProductDetail(productId)) as {
    variants?: { id?: string; is_in_stock?: boolean }[];
    in_stock?: boolean;
    is_in_stock?: boolean;
  } | null;
  if (!body) return null;
  const variants = Array.isArray(body.variants) ? body.variants : [];
  return {
    variantId: variants[0]?.id,
    variantCount: variants.length,
    inStock: body.in_stock ?? body.is_in_stock ?? true,
  };
}

type QuickAddState = "idle" | "busy" | "done" | "failed";

/**
 * The add itself, plus the state machine every presentation renders.
 *
 * `needsOptions` and `soldOut` live here so the three components can't drift on
 * which products they will and won't add.
 */
export function useQuickAdd(target: QuickAddTarget) {
  const { addItem } = useCart();
  const [state, setState] = useState<QuickAddState>("idle");
  // The backend's own words on a refusal ("Only 5 in stock — you already
  // have…"), surfaced as a tooltip rather than swallowed.
  const [failMessage, setFailMessage] = useState<string | undefined>();
  // Flips when resolution reveals a product the surface thought was simple.
  const [discoveredOptions, setDiscoveredOptions] = useState(false);

  const href = `/product/${target.slug || target.id}`;
  const needsOptions = discoveredOptions || (target.variantCount ?? 0) > 1;
  const soldOut = target.inStock === false;

  const fail = (message?: string) => {
    setFailMessage(message);
    setState("failed");
    setTimeout(() => {
      setState("idle");
      setFailMessage(undefined);
    }, 2500);
  };

  const goToPdp = () => {
    if (!requestNavigate(href) && typeof window !== "undefined") {
      window.location.href = href;
    }
  };

  const add = async (e?: React.MouseEvent) => {
    // The card around us is a <Link> — without this the browser navigates.
    e?.preventDefault();
    e?.stopPropagation();
    if (state !== "idle" || needsOptions || soldOut) return;
    setState("busy");
    try {
      let variantId = target.variantId;
      // The surface couldn't name a variant — settle it before writing, so the
      // line merges with the PDP's and a multi-variant product is never blind-added.
      if (!variantId) {
        const resolved = await resolveProduct(target.id);
        if (resolved) {
          if (resolved.variantCount > 1) {
            setDiscoveredOptions(true);
            setState("idle");
            goToPdp();
            return;
          }
          variantId = resolved.variantId;
        }
      }
      const result = await addItem(target.id, variantId, 1);
      // A refused write must not look like a successful one.
      if (result && result.ok === false) {
        fail(result.message);
        return;
      }
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      fail();
    }
  };

  return { state, add, needsOptions, soldOut, href, failMessage };
}

/** Shared copy, so the presentations can't label the same act differently. */
function labels(locale: string, name: string) {
  return {
    add: localized(locale, "Add", "أضيفي"),
    adding: localized(locale, "Adding…", "بنضيف…"),
    added: localized(locale, "Added", "اتضافت"),
    options: localized(locale, "Choose options", "اختاري المقاس/اللون"),
    failed: localized(locale, "Unavailable", "مش متاح"),
    addAria: localized(locale, `Add ${name} to bag`, `أضيفي ${name} للشنطة`),
    optionsAria: localized(locale, `Choose options for ${name}`, `اختاري مقاس ${name}`),
  };
}

/** Resolve whichever of `product` / `target` the caller passed. */
function useResolvedTarget(product?: Product, target?: QuickAddTarget) {
  const resolved = target ?? (product ? productTarget(product) : null);
  // Hooks must run unconditionally — the empty target is inert (the caller
  // returns null immediately below).
  return { resolved, quick: useQuickAdd(resolved ?? { id: "", name: "" }) };
}

/**
 * Floating circular "+" over a card image (PLP, featured, new arrivals,
 * search, PDP rails).
 *
 * Accepts either a full `product` or a pre-narrowed `target`, so the
 * recently-viewed trail — which has no `Product` — uses the same control.
 */
export function QuickAddButton({
  product,
  target,
  locale,
}: {
  product?: Product;
  target?: QuickAddTarget;
  locale: string;
}) {
  const { resolved, quick } = useResolvedTarget(product, target);
  if (!resolved) return null;

  const { state, add, needsOptions, soldOut, href, failMessage } = quick;
  const l = labels(locale, resolved.name);
  const shell =
    "absolute bottom-2.5 end-2.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[var(--vn-ink)] shadow-md transition-all hover:bg-white md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 disabled:opacity-60";

  // Sold out has nothing to offer here — the card still links to the PDP,
  // where the real stock message lives.
  if (soldOut) return null;

  // Multi-variant degrades to a link, it does not disappear (the old button
  // returned null, so quick-add silently vanished from part of a catalog).
  if (needsOptions) {
    return (
      <Link
        to={href}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        aria-label={l.optionsAria}
        data-testid="storefront-quick-add-options"
        className={shell}
      >
        <SlidersHorizontal size={15} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={state === "busy"}
      aria-label={l.addAria}
      title={failMessage}
      data-testid="storefront-quick-add"
      className={shell}
    >
      {state === "done" ? (
        <Check size={16} aria-hidden="true" />
      ) : state === "failed" ? (
        <AlertCircle size={16} aria-hidden="true" className="text-[var(--vn-sale)]" />
      ) : state === "busy" ? (
        <span
          className="h-3.5 w-3.5 rounded-full border-2 border-[var(--vn-ink)] border-t-transparent animate-spin"
          aria-hidden="true"
        />
      ) : (
        <Plus size={16} aria-hidden="true" />
      )}
      {/* Refusals are announced, not just drawn. */}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "failed" ? failMessage || l.failed : state === "done" ? l.added : ""}
      </span>
    </button>
  );
}

/**
 * Full-width outline button under a rail card (both cart rails).
 *
 * This is the shape the cart's "You may also like" rail grew on its own; it
 * now shares the hook so every rail behaves identically.
 */
export function QuickAddBar({
  product,
  target,
  locale,
  className = "",
}: {
  product?: Product;
  target?: QuickAddTarget;
  locale: string;
  className?: string;
}) {
  const { resolved, quick } = useResolvedTarget(product, target);
  if (!resolved) return null;

  const { state, add, needsOptions, soldOut, href, failMessage } = quick;
  const l = labels(locale, resolved.name);
  const shell = `vn-btn vn-btn-outline-dark w-full mt-2.5 !h-9 text-[10px] ${className}`;

  if (soldOut) return null;

  if (needsOptions) {
    return (
      <Link
        to={href}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className={shell}
        data-testid="storefront-quick-add-options"
      >
        {l.options}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={state === "busy"}
      aria-label={l.addAria}
      title={failMessage}
      className={`${shell} disabled:opacity-50`}
      data-testid="storefront-quick-add-bar"
    >
      {state === "done" ? (
        <>
          <Check size={12} aria-hidden="true" /> {l.added}
        </>
      ) : state === "failed" ? (
        <>
          <AlertCircle size={12} aria-hidden="true" /> {l.failed}
        </>
      ) : state === "busy" ? (
        l.adding
      ) : (
        <>
          <Plus size={12} aria-hidden="true" /> {l.add}
        </>
      )}
      {/* Refusals are announced, not just drawn. */}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "failed" ? failMessage || l.failed : ""}
      </span>
    </button>
  );
}

/**
 * Compact pill for list rows (mini-cart suggestions).
 *
 * The mini-cart row used to end in a "Shop Now" link, which sent a shopper who
 * was one tap from checkout back out to a PDP. This adds in place instead.
 */
export function QuickAddPill({
  product,
  target,
  locale,
}: {
  product?: Product;
  target?: QuickAddTarget;
  locale: string;
}) {
  const { resolved, quick } = useResolvedTarget(product, target);
  if (!resolved) return null;

  const { state, add, needsOptions, soldOut, href, failMessage } = quick;
  const l = labels(locale, resolved.name);
  const shell =
    "shrink-0 inline-flex items-center gap-1 rounded-full border border-[var(--vn-ink)] px-3 py-1.5 vn-label text-[10px] text-[var(--vn-ink)] transition-colors hover:bg-[var(--vn-ink)] hover:text-[var(--vn-white)]";

  if (soldOut) return null;

  if (needsOptions) {
    return (
      <Link
        to={href}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className={shell}
        data-testid="storefront-quick-add-options"
      >
        {l.options}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={state === "busy"}
      aria-label={l.addAria}
      title={failMessage}
      className={`${shell} disabled:opacity-50`}
      data-testid="storefront-quick-add-pill"
    >
      {state === "done" ? (
        <>
          <Check size={12} aria-hidden="true" /> {l.added}
        </>
      ) : state === "failed" ? (
        <>
          <AlertCircle size={12} aria-hidden="true" /> {l.failed}
        </>
      ) : state === "busy" ? (
        l.adding
      ) : (
        <>
          <Plus size={12} aria-hidden="true" /> {l.add}
        </>
      )}
      {/* Refusals are announced, not just drawn. */}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "failed" ? failMessage || l.failed : ""}
      </span>
    </button>
  );
}
