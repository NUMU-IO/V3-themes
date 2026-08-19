/**
 * Colour swatches on catalog cards — plan decision D6.
 *
 * ## The constraint, measured rather than assumed
 *
 * The storefront product **list** endpoint (`public.py::browse_products`)
 * builds each item by hand and emits `attributes` but **no `options` and no
 * `variants`**. The **detail** endpoint runs `_resolve_options_for_product`,
 * which prefers `product.options` (the Phase-8.1 field) and falls back to
 * `attributes.variants` (the legacy field V2 themes read).
 *
 * So on a grid:
 *   • a store whose axes live in `attributes.variants` → derivable from the
 *     list payload, free, no request;
 *   • a store whose axes live in `product.options`      → NOT in the payload.
 *
 * The reference puts a swatch row under every cap card, so "just don't show
 * them" is not an option for half the fleet. For the second case the card
 * hydrates itself from `/api/storefront/products/{id}` — but only once it is in
 * the viewport, and only a few at a time, because a 20-card grid firing 20
 * detail requests on load is a worse bug than a missing swatch row.
 *
 * If neither source yields a colour axis, the row is simply absent. It never
 * renders a placeholder: a fake swatch is a promise about stock.
 */

import { useEffect, useState } from "react";
import { asString, cx } from "./shared";
import { isColorAxis, productAxes, type Axis, type AxisValue } from "./filters";

/**
 * The shape-tolerant axis reader lives in filters.ts and is shared with the
 * facet builder. Two implementations of "where do a product's colours live"
 * is how the grid and the filter panel end up disagreeing about what a store
 * sells — one reading `attributes.variants`, the other `product.options`, and
 * a colour filter that hides products whose swatches are visibly on screen.
 */
export type ColorSwatch = AxisValue;
export type ColorAxis = Axis;

/** The product's colour axis, from whichever shape this payload carries. */
export function extractColorAxis(product: unknown): ColorAxis | null {
  return productAxes(product).find((axis) => isColorAxis(axis.name)) ?? null;
}

/* ── Lazy hydration ────────────────────────────────────────────────────────
   A module-level cache + a small semaphore. The cache is keyed by product id
   and shared across every card, so the same product appearing in a grid and a
   rail costs one request; the semaphore keeps a long grid from opening twenty
   connections the moment it scrolls into view. */

const MAX_IN_FLIGHT = 8;
const cache = new Map<string, ColorAxis | null>();
const pending = new Map<string, Promise<ColorAxis | null>>();
let inFlight = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release(): void {
  const next = queue.shift();
  if (next) {
    next();
    return;
  }
  inFlight -= 1;
}

async function fetchColorAxis(productId: string): Promise<ColorAxis | null> {
  if (cache.has(productId)) return cache.get(productId) ?? null;
  const existing = pending.get(productId);
  if (existing) return existing;

  const run = (async () => {
    await acquire();
    try {
      const r = await fetch(`/api/storefront/products/${encodeURIComponent(productId)}`, {
        credentials: "include",
      });
      // Cache the miss too. A 404 is a stable answer, and retrying it on every
      // scroll is how a grid turns into a request storm.
      const json = r.ok ? await r.json() : null;
      const data = json?.data ?? json;
      const axis = data ? extractColorAxis(data) : null;
      cache.set(productId, axis);
      return axis;
    } catch {
      cache.set(productId, null);
      return null;
    } finally {
      release();
      pending.delete(productId);
    }
  })();

  pending.set(productId, run);
  return run;
}

/** Fires once, when the element first enters the viewport. */
function useInView(ref: { current: Element | null }): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (old Safari, jsdom) ⇒ treat it as visible rather
    // than never hydrating. Degrading to "eager" is better than degrading to
    // "broken".
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

/**
 * The colour axis for a card, from the payload when possible and from the
 * detail endpoint when not.
 *
 * `ref` is the card element — hydration waits until it is near the viewport.
 */
export function useCardColorAxis(
  product: unknown,
  ref: { current: Element | null },
  enabled: boolean,
): ColorAxis | null {
  const fromPayload = enabled ? extractColorAxis(product) : null;
  const productId = asString((product as Record<string, unknown> | null)?.id);
  const needsFetch = enabled && !fromPayload && Boolean(productId);

  const inView = useInView(ref);
  const [fetched, setFetched] = useState<ColorAxis | null>(
    productId ? (cache.get(productId) ?? null) : null,
  );

  useEffect(() => {
    if (!needsFetch || !inView) return;
    let cancelled = false;
    fetchColorAxis(productId).then((axis) => {
      if (!cancelled) setFetched(axis);
    });
    return () => {
      cancelled = true;
    };
  }, [needsFetch, inView, productId]);

  return fromPayload ?? fetched;
}

/**
 * A read-only swatch row for a card.
 *
 * Deliberately NOT interactive here. On the reference's grid the swatches are
 * an at-a-glance "this comes in four colours" signal; making them change the
 * card image means a shopper can configure a product they have not opened,
 * then lose that choice on the way to the PDP. Selection lives on the product
 * page and in the quick-add sheet, where it can actually reach the cart line.
 */
export function SwatchRow({ axis, max = 5 }: { axis: ColorAxis | null; max?: number }) {
  if (!axis || axis.values.length === 0) return null;
  const shown = axis.values.slice(0, max);
  const extra = axis.values.length - shown.length;

  return (
    <div className="tn-swatches" aria-hidden="true">
      {shown.map((v) => (
        <span
          key={v.label}
          className={cx("tn-swatch", !v.hex && !v.image && "is-unknown")}
          style={
            v.image
              ? { backgroundImage: `url(${v.image})` }
              : v.hex
                ? { background: v.hex }
                : undefined
          }
          title={v.label}
        />
      ))}
      {extra > 0 && <span className="tn-swatch-more">+{extra}</span>}
    </div>
  );
}

/**
 * The same information for assistive tech, as words.
 *
 * The row above is `aria-hidden` because a screen reader announcing five
 * unlabelled boxes is noise; one sentence naming the colours is the actual
 * content.
 */
export function SwatchSummary({ axis, template }: { axis: ColorAxis | null; template: string }) {
  if (!axis || axis.values.length === 0) return null;
  return (
    <span className="tn-sr">
      {template.replace("{{colors}}", axis.values.map((v) => v.label).join(", "))}
    </span>
  );
}
