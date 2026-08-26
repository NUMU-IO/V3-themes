"use client";
/**
 * _quick-preview — the Quick Preview (quick view) modal, shared by every
 * product surface in the theme.
 *
 * A shopper can size up a product, pick a variant, see the active offer and
 * add to bag WITHOUT leaving the grid they're browsing. That's the whole
 * point: the grid is where discovery happens, and a round trip to the PDP is
 * where it stops.
 *
 * ── Architecture ─────────────────────────────────────────────────────────
 *
 * The trigger OWNS its modal. There is no theme-wide provider, because V3
 * sections mount independently — a context at the "app root" simply doesn't
 * exist for a theme, and an event bus would need a listener mounted somewhere
 * arbitrary (the header) that every section would then depend on. A shopper
 * can only click one card at a time, so one button rendering one modal is both
 * the simplest and the cheapest arrangement: closed, it renders nothing.
 *
 * ── Cost ─────────────────────────────────────────────────────────────────
 *
 * Nothing is fetched until the modal opens. A 24-card grid therefore costs
 * ZERO extra requests, and the detail payload is shared with quick-add through
 * `fetchProductDetail`'s module cache — a shopper who previews and then adds
 * pays for one request, not two. The grid card's own (already-loaded) image is
 * handed to the modal as `initialImage` so the first paint is instant rather
 * than a spinner.
 *
 * ── Why the detail endpoint at all ───────────────────────────────────────
 *
 * A product does not arrive the same shape everywhere: the SSR list reports
 * `variants: []` and the related endpoint omits the key entirely. Only the
 * detail route carries variants, options, the full gallery and the
 * description — i.e. everything this modal exists to show.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Link,
  Money,
  useAnalytics,
  useCart,
  useRelatedProducts,
  useVariantSelection,
  type Product,
} from "@numueg/theme-sdk";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import {
  localized,
  productCurrency,
  productImage,
  responsiveImg,
  useStoreProducts,
  PDP_MAIN_IMG,
  PRODUCT_CARD_IMG,
  THUMB_IMG,
} from "./_shared";
import { fetchProductDetail, QuickAddBar } from "./_quick-add";
import {
  multibuyBeatsUnitPrice,
  multibuyHeadline,
  multibuyOffers,
  pdpOfferLine,
  promoPagePath,
  useActivePromotions,
} from "./_promotions";

/* ─────────────────────────── value helpers ─────────────────────────────── */

/**
 * The detail endpoint serializes money as a STRING in major units
 * ("250.00") while the bundles endpoint uses integer CENTS (25000). Mixing
 * the two silently prices a bundle 100× wrong, so each has its own reader.
 */
const majorFromDetail = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};
const majorFromCents = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v / 100 : 0;

/** Every image URL on the product, deduped, in gallery order. */
function galleryUrls(p: Record<string, unknown> | null): string[] {
  if (!p) return [];
  const raw = Array.isArray(p.images) ? p.images : [];
  const urls = raw
    .map((im) =>
      typeof im === "string" ? im : ((im as { url?: string } | null)?.url ?? ""),
    )
    .filter(Boolean) as string[];
  return [...new Set(urls)];
}

interface DetailVariant {
  id?: string;
  option_values?: Record<string, string>;
  price?: string | number;
  compare_at_price?: string | number | null;
  inventory_quantity?: number;
  is_in_stock?: boolean;
  image_url?: string | null;
}

/** Low-stock cutoff for the honest urgency line. Above this we say nothing. */
const LOW_STOCK_AT = 5;

/* ─────────────────────────────── trigger ───────────────────────────────── */

/**
 * The card control. Sits beside the quick-add "+" (which stays exactly where
 * it was) so a card gains a capability without being redesigned.
 *
 * Desktop reveals both on hover; mobile keeps them visible, because there is
 * no hover to reveal them with and a control you cannot discover is not a
 * feature.
 */
export interface QuickPreviewTarget {
  id: string;
  name: string;
  slug?: string;
  image?: string;
}

export function QuickPreviewButton({
  product,
  target,
  locale,
  className = "",
  variant = "floating",
}: {
  product?: Product;
  /** For surfaces with no full `Product` (the recently-viewed trail). */
  target?: QuickPreviewTarget;
  locale: string;
  className?: string;
  /**
   * `floating` overlays a card image (grids and rails); `inline` is a compact
   * button for list rows that have no image to overlay (the mini-cart).
   */
  variant?: "floating" | "inline";
}) {
  const item: QuickPreviewTarget | null =
    target ??
    (product
      ? { id: product.id, name: product.name, slug: product.slug, image: productImage(product) }
      : null);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { track } = useAnalytics();

  /**
   * Where the modal is portalled (see the block comment at the render below).
   * Resolved lazily on open rather than at module scope: the theme root only
   * exists once the theme has mounted. Falls back to <body> so a host that
   * ever changes the root attribute degrades to a working — if unstyled —
   * modal instead of no modal at all.
   */
  const portalHost = useMemo(() => {
    if (!open || typeof document === "undefined") return null;
    return (
      document.querySelector<HTMLElement>("[data-vionne-v3-app]") ?? document.body
    );
  }, [open]);


  const onOpen = (e: React.MouseEvent) => {
    // The card is a <Link>; without this the browser navigates to the PDP —
    // the exact round trip this feature exists to avoid.
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    track("quick_preview_opened", {
      content_ids: [item?.id],
      content_type: "product",
      item_name: item?.name,
    });
  };

  const onClose = useCallback(() => {
    setOpen(false);
    // Return focus where the shopper left it (WCAG 2.4.3), with preventScroll
    // so the browser doesn't scroll the trigger into view on the way. The
    // scroll POSITION is restored by the modal's own lock effect — see there.
    triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Nothing to preview (no product and no target) — render nothing.
  if (!item) return null;

  const shell =
    variant === "inline"
      ? `shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--vn-border)] text-[var(--vn-ink)] transition-colors hover:border-[var(--vn-ink)] ${className}`
      : `absolute bottom-2.5 end-14 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[var(--vn-ink)] shadow-md transition-all hover:bg-white md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 ${className}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpen}
        aria-label={localized(locale, `Quick preview: ${item?.name ?? ""}`, `نظرة سريعة: ${item?.name ?? ""}`)}
        aria-haspopup="dialog"
        data-testid="storefront-quick-preview-trigger"
        className={shell}
      >
        <Eye size={16} aria-hidden="true" />
      </button>
      {/*
        PORTALLED OUT OF THE CARD — and specifically to the THEME ROOT, not
        <body>.

        Why portal at all: this trigger lives inside the product card, and the
        card is an <a>. A modal rendered in place is a DESCENDANT of that
        anchor, so every click inside it — the quantity stepper, a variant
        swatch — bubbles to the anchor and the browser performs its DEFAULT
        navigation to the PDP. React's `stopPropagation` does not stop that;
        only `preventDefault` would, and blanket-preventing on the modal would
        break the real links inside it. Caught in live QA: clicking "+" closed
        the modal and navigated away. Portalling also frees the panel from the
        card's `overflow-hidden` and its `group-hover:scale-[1.02]` transform —
        a transformed ancestor becomes the containing block for
        `position: fixed`, which breaks a full-screen overlay outright.

        Why NOT <body>: every `--vn-*` token is declared on
        `[data-vionne-v3-app]`, and the SDK writes the merchant's brand
        overrides as INLINE custom properties on that same mount element
        (`applyGlobalStyleTokens(gs, mountEl)`). A portal to <body> lands
        outside both, so `bg-[var(--vn-white)]` resolves to nothing and the
        panel renders transparent with the wrong fonts. Also caught in QA — the
        first portal attempt showed the product grid straight through the
        modal. The theme root is an ancestor of the card, so it is equally
        outside the anchor while keeping the whole token cascade.
      */}
      {open && portalHost
        ? createPortal(
            <QuickPreviewModal
              productId={item!.id}
              initialName={item!.name}
              initialImage={item!.image}
              initialSlug={item!.slug}
              locale={locale}
              onClose={onClose}
            />,
            portalHost,
          )
        : null}
    </>
  );
}

/* ──────────────────────────────── modal ────────────────────────────────── */

function QuickPreviewModal({
  productId,
  initialName,
  initialImage,
  initialSlug,
  locale,
  onClose,
}: {
  productId: string;
  initialName: string;
  initialImage?: string;
  initialSlug?: string;
  locale: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [failed, setFailed] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = `qp-title-${productId}`;

  // Fetch on OPEN, never on render (see the module docstring).
  useEffect(() => {
    let cancelled = false;
    fetchProductDetail(productId).then((d) => {
      if (cancelled) return;
      if (d) setDetail(d);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  /**
   * Esc to close, plus the body scroll lock — and the ONE place that owns the
   * shopper's scroll position.
   *
   * `overflow: hidden` on <body> is not a scroll lock. iOS Safari (and some
   * Android browsers) scroll the page behind the overlay anyway, so a shopper
   * who flicked while the sheet was open — or whose browser moved the page
   * when the URL bar collapsed — was returned somewhere else entirely on
   * close. That is the "closing it jumps me to the footer" report.
   *
   * The reliable lock is to take the body out of flow at a negative offset:
   * `position: fixed; top: -<scrollY>px`. The page physically cannot move
   * while that holds, and undoing it restores the exact pixel.
   *
   * Both halves live in THIS effect on purpose. The previous attempt split
   * them — the trigger restored the offset in a `requestAnimationFrame` while
   * the modal released the lock in its cleanup — and nothing ordered those two
   * against each other, so the scroll could be restored while the body was
   * still locked (a no-op) and then released to wherever the browser liked.
   * One owner, one deterministic order: release the styles, THEN scroll.
   */
  useEffect(() => {
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      // AFTER the styles are cleared — while the body is still fixed there is
      // nothing for the window to scroll and this would silently do nothing.
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  /**
   * Focus trap. A modal that lets Tab wander back into the page behind it is
   * unusable with a keyboard or a screen reader, so Tab and Shift+Tab cycle
   * within the panel and focus starts inside it.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const SELECTOR =
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
    // Move focus in once the panel exists.
    const first = focusables()[0];
    (first ?? panel).focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
    // Re-run once the body swaps from skeleton to content so the new controls
    // are inside the trap.
  }, [detail]);

  /* Drag-to-close (mobile). Vertical drag on the panel's grab handle only, so
     it can never fight the gallery's horizontal swipe or the body's scroll. */
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const onHandleStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0]?.clientY ?? null;
  };
  const onHandleMove = (e: React.TouchEvent) => {
    if (dragStart.current == null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - dragStart.current;
    if (dy > 0) setDragY(dy);
  };
  const onHandleEnd = () => {
    if (dragY > 110) onClose();
    else setDragY(0);
    dragStart.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="storefront-quick-preview"
      // Stop clicks inside the modal from reaching the card <Link> underneath.
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="vn-sheet-backdrop absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className="vn-sheet-panel relative w-full md:w-auto md:max-w-5xl bg-[var(--vn-white)] text-[var(--vn-ink)] rounded-t-2xl md:rounded-none max-h-[92vh] md:max-h-[88vh] flex flex-col outline-none shadow-2xl"
      >
        {/* Mobile grab handle — the only drag surface (see above). */}
        <div
          className="md:hidden shrink-0 pt-2.5 pb-1 flex justify-center touch-none"
          onTouchStart={onHandleStart}
          onTouchMove={onHandleMove}
          onTouchEnd={onHandleEnd}
          aria-hidden="true"
        >
          <span className="block h-1 w-10 rounded-full bg-[var(--vn-border)]" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={localized(locale, "Close quick preview", "إغلاق النظرة السريعة")}
          className="absolute top-3 end-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors"
        >
          <X size={17} aria-hidden="true" />
        </button>

        {failed ? (
          <FailedState
            locale={locale}
            href={`/product/${initialSlug || productId}`}
            onClose={onClose}
          />
        ) : detail ? (
          <PreviewBody
            detail={detail}
            locale={locale}
            titleId={titleId}
            onClose={onClose}
          />
        ) : (
          <SkeletonState name={initialName} image={initialImage} titleId={titleId} />
        )}
      </div>
    </div>
  );
}

/**
 * First paint. Shows the card's ALREADY-LOADED image rather than a spinner, so
 * opening feels instantaneous and the panel doesn't resize when data lands.
 */
function SkeletonState({
  name,
  image,
  titleId,
}: {
  name: string;
  image?: string;
  titleId: string;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-0 overflow-hidden" aria-busy="true">
      <div className="relative aspect-[4/5] md:aspect-[3/4] bg-[var(--vn-band)]">
        {image ? (
          <img
            {...responsiveImg(image, PDP_MAIN_IMG)}
            alt={name}
            className="w-full h-full object-cover"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 vn-shimmer" />
        )}
      </div>
      <div className="p-6 md:p-8 space-y-4">
        <h2 id={titleId} className="vn-heading text-xl md:text-2xl">
          {name}
        </h2>
        <div className="h-4 w-28 vn-shimmer rounded" />
        <div className="h-3 w-full vn-shimmer rounded" />
        <div className="h-3 w-4/5 vn-shimmer rounded" />
        <div className="h-11 w-full vn-shimmer rounded mt-6" />
      </div>
    </div>
  );
}

function FailedState({
  locale,
  href,
  onClose,
}: {
  locale: string;
  href: string;
  onClose: () => void;
}) {
  return (
    <div className="p-8 text-center space-y-4">
      <p className="text-sm text-[var(--vn-muted)]">
        {localized(
          locale,
          "We couldn't load this preview.",
          "مش قادرين نحمّل المعاينة دي.",
        )}
      </p>
      <Link to={href} onClick={onClose} className="vn-btn vn-btn-filled inline-flex px-6">
        {localized(locale, "Open product page", "افتحي صفحة المنتج")}
      </Link>
    </div>
  );
}

/* ──────────────────────────── modal body ───────────────────────────────── */

/**
 * Mounted only once the detail payload exists, so every hook below can assume
 * a real product and none of them run against a half-loaded shape.
 */
function PreviewBody({
  detail,
  locale,
  titleId,
  onClose,
}: {
  detail: Record<string, unknown>;
  locale: string;
  titleId: string;
  onClose: () => void;
}) {
  const { track } = useAnalytics();
  const { addItem } = useCart();

  const product = detail as unknown as Product;
  const productId = String(detail.id ?? "");
  const name = String(detail.name ?? "");
  const slug = String(detail.slug ?? productId);
  const currency = String(detail.price_currency ?? productCurrency(detail) ?? "EGP");
  const images = useMemo(() => galleryUrls(detail), [detail]);
  const variants = useMemo<DetailVariant[]>(
    () => (Array.isArray(detail.variants) ? (detail.variants as DetailVariant[]) : []),
    [detail],
  );

  // SDK-owned axis state, so a multi-axis catalog behaves exactly as it does
  // on the PDP rather than getting a second, subtly different picker.
  const vs = useVariantSelection(product);
  const selected = (vs.variant ?? null) as DetailVariant | null;
  const options = (product.options ?? []) as {
    name: string;
    values?: string[];
  }[];

  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const [failMessage, setFailMessage] = useState<string | undefined>();

  /* Price / availability follow the SELECTED variant, falling back to the
     product. Changing a variant therefore updates price, stock and image in
     one render — no separate effects to drift apart. */
  const price = selected?.price != null
    ? majorFromDetail(selected.price)
    : majorFromDetail(detail.price);
  const compareAt = selected?.compare_at_price != null
    ? majorFromDetail(selected.compare_at_price)
    : majorFromDetail(detail.compare_at_price);
  const hasDiscount = compareAt > price && price > 0;
  const discountPct = hasDiscount ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  const stockQty = selected?.inventory_quantity ?? (detail.quantity as number | undefined);
  const inStock = selected
    ? selected.is_in_stock !== false
    : (detail.is_in_stock as boolean | undefined) !== false;
  const lowStock =
    inStock && typeof stockQty === "number" && stockQty > 0 && stockQty <= LOW_STOCK_AT;

  // A variant with its own image wins the gallery (the point of a colour swap).
  useEffect(() => {
    const url = selected?.image_url;
    if (!url) return;
    const i = images.indexOf(url);
    if (i >= 0) setImgIndex(i);
  }, [selected?.image_url, images]);

  const activeImage = images[imgIndex] ?? images[0];
  const maxQty = typeof stockQty === "number" && stockQty > 0 ? stockQty : 99;

  const shortDescription = String(
    detail.short_description || detail.description || "",
  ).trim();

  /* ── offers ─────────────────────────────────────────────────────────── */
  const promos = useActivePromotions(promoPagePath(), locale, {
    productIds: [productId],
    categoryIds: [detail.category_id as string | undefined],
  });
  const offer = useMemo(() => {
    const list = multibuyOffers(promos?.auto_discounts).filter((o) =>
      multibuyBeatsUnitPrice(o, price),
    );
    const best = list[0];
    if (best) {
      const savingsMajor = (price * 100 * best.quantity - best.groupPriceCents) / 100;
      return {
        headline: multibuyHeadline(best, locale, currency),
        savings: savingsMajor > 0 ? savingsMajor : 0,
      };
    }
    const line = pdpOfferLine(promos?.auto_discounts, currency, locale, price, {
      id: productId,
      category_id: detail.category_id as string | undefined,
    } as never);
    return line ? { headline: line, savings: 0 } : null;
  }, [promos, price, locale, currency, productId, detail.category_id]);

  /* ── add to bag ─────────────────────────────────────────────────────── */
  const onAdd = async () => {
    if (state !== "idle" || !inStock) return;
    setState("busy");
    try {
      const result = await addItem(productId, selected?.id ?? variants[0]?.id, qty);
      // A refused write must never look like a success (same rule as quick-add).
      if (result && result.ok === false) {
        setFailMessage(result.message);
        setState("failed");
        setTimeout(() => setState("idle"), 2500);
        return;
      }
      track("quick_preview_add_to_cart", {
        content_ids: [productId],
        content_type: "product",
        item_name: name,
        quantity: qty,
        value: Math.round(price * qty * 100) / 100,
        currency,
      });
      setState("done");
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("failed");
      setTimeout(() => setState("idle"), 2500);
    }
  };

  /* Gallery swipe (mobile). Horizontal only, and only when there's more than
     one image, so it never swallows a vertical scroll. */
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null || images.length < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    if (Math.abs(dx) > 40) {
      setImgIndex((i) =>
        dx < 0 ? Math.min(i + 1, images.length - 1) : Math.max(i - 1, 0),
      );
    }
    touchX.current = null;
  };

  const step = (d: number) =>
    setQty((q) => Math.min(maxQty, Math.max(1, q + d)));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="grid md:grid-cols-2">
        {/* ── gallery ─────────────────────────────────────────────────── */}
        <div className="relative bg-[var(--vn-band)]">
          <div
            className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {activeImage ? (
              <img
                key={activeImage}
                {...responsiveImg(activeImage, PDP_MAIN_IMG)}
                alt={name}
                className="w-full h-full object-cover vn-qp-fade"
                // The first frame is what the shopper is waiting on; the rest
                // are lazy so a 6-image product doesn't cost 6 requests.
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="absolute inset-0 vn-shimmer" />
            )}

            {hasDiscount && (
              <span className="absolute top-3 start-3 vn-label px-2.5 py-1 bg-[var(--vn-sale)] text-white rounded-full text-[10px]">
                −{discountPct}%
              </span>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImgIndex((i) => Math.max(0, i - 1))}
                  disabled={imgIndex === 0}
                  aria-label={localized(locale, "Previous image", "الصورة السابقة")}
                  className="hidden md:inline-flex absolute start-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/85 hover:bg-white disabled:opacity-0 transition-all"
                >
                  <ChevronLeft size={17} className="rtl:rotate-180" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIndex((i) => Math.min(images.length - 1, i + 1))}
                  disabled={imgIndex === images.length - 1}
                  aria-label={localized(locale, "Next image", "الصورة التالية")}
                  className="hidden md:inline-flex absolute end-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-white/85 hover:bg-white disabled:opacity-0 transition-all"
                >
                  <ChevronRight size={17} className="rtl:rotate-180" aria-hidden="true" />
                </button>
                {/* Dots double as the mobile position indicator. */}
                <div className="md:hidden absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === imgIndex ? "w-4 bg-[var(--vn-ink)]" : "w-1.5 bg-black/25"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="hidden md:flex gap-2 p-3 overflow-x-auto">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setImgIndex(i)}
                  aria-label={localized(locale, `Image ${i + 1}`, `صورة ${i + 1}`)}
                  aria-current={i === imgIndex}
                  className={`shrink-0 w-14 h-16 overflow-hidden transition-opacity ${
                    i === imgIndex ? "ring-1 ring-[var(--vn-ink)]" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    {...responsiveImg(url, THUMB_IMG)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── details ─────────────────────────────────────────────────── */}
        <div className="p-5 md:p-8 pb-0 md:pb-8">
          <h2 id={titleId} className="vn-heading text-xl md:text-2xl pe-10">
            {name}
          </h2>

          <div className="mt-2.5 flex items-baseline gap-3 flex-wrap">
            <span className="text-lg font-semibold">
              <Money amount={price} currency={currency} />
            </span>
            {hasDiscount && (
              <span className="text-sm text-[var(--vn-muted)] line-through">
                <Money amount={compareAt} currency={currency} />
              </span>
            )}
          </div>

          {/* Honest urgency only: a real number from real inventory, and
              nothing at all when stock is healthy. */}
          {lowStock && (
            <p className="mt-2 text-xs text-[var(--vn-sale)]" data-testid="storefront-qp-low-stock">
              {localized(locale, `Only ${stockQty} left`, `فاضل ${stockQty} بس`)}
            </p>
          )}

          {shortDescription && (
            <p className="mt-4 text-sm leading-relaxed text-[var(--vn-muted)] line-clamp-4">
              {shortDescription}
            </p>
          )}

          {offer && <OfferBanner offer={offer} currency={currency} locale={locale} />}

          {/* Variant axes. Renders nothing for a single-variant catalog. */}
          {options.length > 0 && (
            <div className="mt-5 space-y-4" data-testid="storefront-qp-variants">
              {options.map((axis) => (
                <div key={axis.name}>
                  <p className="vn-label text-[10px] text-[var(--vn-muted)] mb-2">
                    {axis.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(axis.values ?? []).map((value) => {
                      const active = vs.selection[axis.name] === value;
                      // The SDK reports availability as a Set per axis. Treat
                      // "no entry for this axis" as available so an unusual
                      // catalog can never grey out its whole picker.
                      const axisAvail = vs.availability?.[axis.name];
                      const available = axisAvail ? axisAvail.has(value) : true;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            vs.select(axis.name, value);
                            track("quick_preview_variant_selected", {
                              content_ids: [productId],
                              option: axis.name,
                              value,
                            });
                          }}
                          aria-pressed={active}
                          disabled={!available}
                          // 44px min target (WCAG 2.5.5).
                          className={`min-h-[44px] min-w-[44px] px-3.5 border text-xs transition-colors ${
                            active
                              ? "border-[var(--vn-ink)] bg-[var(--vn-ink)] text-[var(--vn-white)]"
                              : "border-[var(--vn-border)] hover:border-[var(--vn-ink)]"
                          } ${available ? "" : "opacity-40 line-through cursor-not-allowed"}`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity + add. Sticky on mobile so it is always one thumb away. */}
          <div className="mt-6 md:mt-7 sticky bottom-0 md:static bg-[var(--vn-white)] pt-3 pb-4 md:pb-0 md:pt-0 -mx-5 px-5 md:mx-0 md:px-0 border-t md:border-0 border-[var(--vn-border)]">
            <div className="flex items-stretch gap-3">
              <div className="flex items-center border border-[var(--vn-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={qty <= 1}
                  aria-label={localized(locale, "Decrease quantity", "تقليل الكمية")}
                  className="h-11 w-11 inline-flex items-center justify-center disabled:opacity-40"
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={qty >= maxQty}
                  aria-label={localized(locale, "Increase quantity", "زيادة الكمية")}
                  className="h-11 w-11 inline-flex items-center justify-center disabled:opacity-40"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={onAdd}
                disabled={state === "busy" || !inStock}
                title={failMessage}
                data-testid="storefront-qp-add"
                className="vn-btn vn-btn-filled flex-1 !h-11 disabled:opacity-50"
              >
                {!inStock
                  ? localized(locale, "Sold out", "خلص المخزون")
                  : state === "done"
                    ? (
                      <>
                        <Check size={14} aria-hidden="true" />{" "}
                        {localized(locale, "Added to bag", "اتضافت للشنطة")}
                      </>
                    )
                    : state === "failed"
                      ? localized(locale, "Unavailable", "مش متاح")
                      : state === "busy"
                        ? localized(locale, "Adding…", "بنضيف…")
                        : localized(locale, "Add to bag", "أضيفي للشنطة")}
              </button>
            </div>

            <span className="sr-only" role="status" aria-live="polite">
              {state === "done"
                ? localized(locale, "Added to bag", "اتضافت للشنطة")
                : state === "failed"
                  ? failMessage || localized(locale, "Unavailable", "مش متاح")
                  : ""}
            </span>

            <Link
              to={`/product/${slug}`}
              onClick={onClose}
              className="mt-2.5 block text-center vn-label text-[10px] text-[var(--vn-muted)] hover:text-[var(--vn-ink)] transition-colors"
            >
              {localized(locale, "View full details", "شوفي كل التفاصيل")}
            </Link>
          </div>

          <TrustRow locale={locale} />
        </div>
      </div>

      {/* ── AOV blocks, below the fold of the main product area ─────────── */}
      <FrequentlyBoughtTogether
        productId={productId}
        locale={locale}
        currency={currency}
      />
      <CompleteTheLook
        productId={productId}
        categoryId={detail.category_id as string | undefined}
        locale={locale}
        onNavigate={onClose}
      />
    </div>
  );
}

/* ─────────────────────────── offer banner ──────────────────────────────── */

/**
 * The "buy more" offer. Deliberately one quiet band rather than a stack of
 * badges — the brief asks for highly noticeable AND elegant, and on a page
 * this restrained a single gold-edged block reads louder than three pills.
 */
function OfferBanner({
  offer,
  currency,
  locale,
}: {
  offer: { headline: string; savings: number };
  currency: string;
  locale: string;
}) {
  const { track } = useAnalytics();
  return (
    <div
      className="mt-5 border-s-2 border-[var(--vn-accent)] bg-[var(--vn-band)] px-4 py-3"
      data-testid="storefront-qp-offer"
      onClick={() => track("quick_preview_bundle_offer_click", { offer: offer.headline })}
    >
      <p className="vn-label text-[10px] text-[var(--vn-accent)] mb-1">
        {localized(locale, "Special offer", "عرض خاص")}
      </p>
      <p className="text-sm font-medium">{offer.headline}</p>
      {offer.savings > 0 && (
        <p className="text-xs text-[var(--vn-muted)] mt-0.5">
          {localized(locale, "You save ", "بتوفري ")}
          <Money amount={offer.savings} currency={currency} />
        </p>
      )}
    </div>
  );
}

/* ──────────────────────────── trust row ────────────────────────────────── */

function TrustRow({ locale }: { locale: string }) {
  const items = [
    { Icon: Truck, label: localized(locale, "Fast shipping", "شحن سريع") },
    { Icon: RefreshCw, label: localized(locale, "Easy exchange", "استبدال سهل") },
    { Icon: ShieldCheck, label: localized(locale, "Secure checkout", "دفع آمن") },
  ];
  return (
    <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--vn-border)] pt-4">
      {items.map(({ Icon, label }) => (
        <li key={label} className="flex flex-col items-center gap-1.5 text-center">
          <Icon size={15} className="text-[var(--vn-muted)]" aria-hidden="true" />
          <span className="text-[10px] leading-tight text-[var(--vn-muted)]">{label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────── frequently bought together ────────────────────── */

interface BundleProduct {
  id: string;
  name: string;
  slug: string;
  price: number; // CENTS on this endpoint
  image?: string | null;
  default_variant_id?: string | null;
  is_in_stock?: boolean;
}

/**
 * Renders ONLY when the merchant has real bundle data. The endpoint answers
 * with an empty `bundles` array otherwise, and inventing a "frequently bought
 * together" set from related products would be a claim we can't support.
 */
function FrequentlyBoughtTogether({
  productId,
  locale,
  currency,
}: {
  productId: string;
  locale: string;
  currency: string;
}) {
  const { track } = useAnalytics();
  const { addItem } = useCart();
  const [data, setData] = useState<{
    title: string;
    primary: BundleProduct | null;
    items: BundleProduct[];
    total: number;
  } | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/storefront/products/${encodeURIComponent(productId)}/bundles`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const d = (json.data ?? json) as Record<string, unknown>;
        const items = (Array.isArray(d.bundles) ? d.bundles : []) as BundleProduct[];
        if (items.length === 0) return; // nothing to claim
        setData({
          title:
            String(
              locale === "ar" ? d.section_title_ar : d.section_title_en,
            ) || localized(locale, "Frequently bought together", "كثيرًا ما يُشترى معًا"),
          primary: (d.primary_product as BundleProduct) ?? null,
          items,
          total: majorFromCents(d.total_discounted ?? d.total_original),
        });
      })
      .catch(() => {
        /* no bundle data — the section simply doesn't render */
      });
    return () => {
      cancelled = true;
    };
  }, [productId, locale]);

  if (!data) return null;

  const all = [data.primary, ...data.items].filter(Boolean) as BundleProduct[];

  const addAll = async () => {
    if (adding) return;
    setAdding(true);
    try {
      // Sequential on purpose: the cart is one server-side document and
      // parallel writes race each other's version.
      for (const p of all) {
        await addItem(p.id, p.default_variant_id ?? undefined, 1);
      }
      track("quick_preview_fbt_added", {
        content_ids: all.map((p) => p.id),
        content_type: "product",
        num_items: all.length,
        value: data.total,
        currency,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } finally {
      setAdding(false);
    }
  };

  return (
    <section
      className="px-5 md:px-8 py-6 border-t border-[var(--vn-border)]"
      data-testid="storefront-qp-fbt"
    >
      <h3 className="vn-eyebrow text-[var(--vn-muted)] mb-4">{data.title}</h3>
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {all.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 shrink-0">
            {i > 0 && <Plus size={13} className="text-[var(--vn-muted)]" aria-hidden="true" />}
            <div className="w-16">
              <div className="aspect-[3/4] overflow-hidden bg-[var(--vn-band)] mb-1">
                {p.image && (
                  <img
                    {...responsiveImg(p.image, THUMB_IMG)}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <p className="text-[10px] line-clamp-2 leading-tight">{p.name}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm">
          <span className="text-[var(--vn-muted)]">
            {localized(locale, "Total ", "الإجمالي ")}
          </span>
          <span className="font-semibold">
            <Money amount={data.total} currency={currency} />
          </span>
        </p>
        <button
          type="button"
          onClick={addAll}
          disabled={adding}
          data-testid="storefront-qp-fbt-add"
          className="vn-btn vn-btn-outline-dark !h-10 px-5 text-[10px] disabled:opacity-50"
        >
          {added ? (
            <>
              <Check size={12} aria-hidden="true" /> {localized(locale, "Added", "اتضافت")}
            </>
          ) : adding ? (
            localized(locale, "Adding…", "بنضيف…")
          ) : (
            localized(locale, "Add all to bag", "أضيفي الكل للشنطة")
          )}
        </button>
      </div>
    </section>
  );
}

/* ────────────────────────── complete the look ──────────────────────────── */

/**
 * Four companions, each independently addable.
 *
 * Selection order is the brief's: same collection/category first (that's what
 * `useRelatedProducts` resolves server-side), then the catalog as a fallback so
 * the rail is never empty on a sparse or uncategorised store.
 */
function CompleteTheLook({
  productId,
  categoryId,
  locale,
  onNavigate,
}: {
  productId: string;
  categoryId?: string;
  locale: string;
  onNavigate: () => void;
}) {
  const { track } = useAnalytics();
  const related = useRelatedProducts(productId, { limit: 8 });
  // `useStoreProducts` (not `useProducts`) because the host pre-fetches
  // products only on catalog routes and this modal opens on all of them.
  const catalog = useStoreProducts(12);

  const pool = useMemo(() => {
    const primary = related.items.filter((p) => p.id !== productId);
    if (primary.length >= 4) return primary.slice(0, 4);
    const seen = new Set(primary.map((p) => p.id));
    const sameCategory = catalog.filter(
      (p) =>
        p.id !== productId &&
        !seen.has(p.id) &&
        categoryId &&
        (p as { category_id?: string }).category_id === categoryId,
    );
    const rest = catalog.filter((p) => p.id !== productId && !seen.has(p.id));
    return [...primary, ...sameCategory, ...rest].slice(0, 4);
  }, [related.items, catalog, productId, categoryId]);

  if (pool.length === 0) return null;

  return (
    <section
      className="px-5 md:px-8 py-6 border-t border-[var(--vn-border)]"
      data-testid="storefront-qp-complete-look"
    >
      <h3 className="vn-eyebrow text-[var(--vn-muted)] mb-4">
        {localized(locale, "Complete the look", "كمّلي الإطلالة")}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pool.map((p) => (
          <div key={p.id}>
            <Link
              to={`/product/${p.slug || p.id}`}
              onClick={() => {
                track("quick_preview_related_click", {
                  content_ids: [p.id],
                  content_type: "product",
                  source_product_id: productId,
                });
                onNavigate();
              }}
              className="group block"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[var(--vn-band)] mb-2">
                {productImage(p) ? (
                  <img
                    {...responsiveImg(productImage(p), PRODUCT_CARD_IMG)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 vn-shimmer" />
                )}
              </div>
              <p className="text-[12px] font-medium line-clamp-1">{p.name}</p>
              <span className="text-[12px] font-semibold">
                <Money
                  amount={p.variants?.[0]?.price ?? p.price ?? 0}
                  currency={productCurrency(p)}
                />
              </span>
            </Link>
            <QuickAddBar product={p} locale={locale} />
          </div>
        ))}
      </div>
    </section>
  );
}
