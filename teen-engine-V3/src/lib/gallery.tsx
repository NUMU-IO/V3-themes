/**
 * Product gallery — main frame, stacked arrows, zoom lightbox, thumb strip.
 *
 * ## `contain`, not `cover`
 *
 * Every other image in Teen is cropped to a fixed plate. This one is not. A PDP
 * is where a shopper inspects the thing they are about to pay for, and cropping
 * a towel to a 4:5 box hides a third of the print. Measured on the reference:
 * the tee and cap frames are 4:5 (261×329) but the beach towel's is 2:3
 * (261×392) — the frame follows the PHOTO, it is not a fixed shape.
 *
 * So the frame takes its ratio from the first image's intrinsic size, measured
 * on load, and every slide is `contain`ed inside it. That means:
 *   • the common case (all of a product's photos share a ratio) is pixel-exact
 *     and nothing is cropped;
 *   • an odd-sized photo letterboxes onto the plate colour instead of silently
 *     losing its edges;
 *   • the frame does NOT resize between slides, which a naive "natural height"
 *     gallery does — and a gallery that changes height as you page through it
 *     pushes the thumbs and the accordions around under the cursor.
 *
 * The cost is one layout shift on first load, from the 4:5 default to the real
 * ratio. `gallery_ratio` lets a merchant pin a fixed shape and remove even that.
 *
 * ## Swipe is scroll-snap, not a JS carousel
 *
 * The slides are a scroll-snap track: native momentum on a phone, no touch
 * handlers to fight with the browser, no half-transitioned state to get stuck
 * in, and it keeps working if the JS fails. The arrows drive `scrollTo`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "@numueg/theme-sdk";
import { cx, useFocusTrap, useOverlayBehaviour } from "./shared";
import { useT } from "./i18n";
import { IconChevronLeft, IconChevronRight, IconClose, IconPlay, IconZoom } from "./icons";

export interface GalleryItem {
  url: string;
  alt: string;
  /** A video slide renders a play badge on its thumb and a <video> in the frame. */
  video?: boolean;
}

/** Recognise a video by extension — the only signal the payload carries. */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export interface ProductGalleryProps {
  items: GalleryItem[];
  /** "natural" measures the first image; anything else pins the frame. */
  ratio?: string;
  showZoom?: boolean;
  showThumbs?: boolean;
  productName: string;
}

export function ProductGallery({
  items,
  ratio = "natural",
  showZoom = true,
  showThumbs = true,
  productName,
}: ProductGalleryProps) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState<number | null>(null);
  // Only used when ratio === "natural"; starts null so server and client agree
  // on the CSS default and hydration is clean.
  const [naturalRatio, setNaturalRatio] = useState<string | null>(null);

  const count = items.length;

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(index, track.children.length - 1));
    const slide = track.children[next] as HTMLElement | undefined;
    if (!slide) return;
    // `scrollLeft` arithmetic breaks in RTL (the sign flips between engines);
    // reading the child's own offset does not.
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
    setActive(next);
  }, []);

  // Keep the active dot/thumb in step with a SWIPE, not just with the arrows.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        Array.from(track.children).forEach((child, i) => {
          const el = child as HTMLElement;
          const centre = el.offsetLeft - track.offsetLeft + el.clientWidth / 2;
          const dist = Math.abs(centre - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        setActive(best);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  if (count === 0) {
    return (
      <div className="tn-gallery">
        <span className="tn-plate tn-gallery-frame" aria-hidden="true" />
      </div>
    );
  }

  const frameStyle =
    ratio === "natural"
      ? ({ "--tn-gal-ratio": naturalRatio ?? "4 / 5" } as React.CSSProperties)
      : ({ "--tn-gal-ratio": ratio.replace(":", " / ") } as React.CSSProperties);

  return (
    <div className="tn-gallery">
      <div className="tn-gallery-main" style={frameStyle}>
        <div
          ref={trackRef}
          className="tn-gallery-track"
          role="group"
          aria-roledescription="carousel"
          aria-label={t("product.gallery", "Product images")}
        >
          {items.map((item, i) => (
            <div className="tn-gallery-slide" key={`${item.url}-${i}`}>
              {item.video ? (
                // `controls` and nothing else: no autoplay, no loop, no muted
                // background video. A product video is content the shopper
                // chooses to play.
                <video
                  className="tn-gallery-media"
                  src={item.url}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Image
                  className="tn-gallery-media"
                  src={item.url}
                  alt={item.alt || `${productName} — ${i + 1}`}
                  sizes="(min-width: 990px) 33vw, (min-width: 750px) 40vw, 100vw"
                  /* The first slide is the LCP element on this page. */
                  loading={i === 0 ? "eager" : "lazy"}
                  priority={i === 0}
                  onLoad={
                    i === 0 && ratio === "natural"
                      ? (e: React.SyntheticEvent<HTMLImageElement>) => {
                          const img = e.currentTarget;
                          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                            setNaturalRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
                          }
                        }
                      : undefined
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* Stacked pair at the end edge, as the reference draws them. Logical
            inset, and only the glyph flips in RTL — `goTo` works on child
            offsets, so the direction is already correct. */}
        {count > 1 && (
          <div className="tn-gallery-arrows">
            <button
              type="button"
              className="tn-round-btn"
              aria-label={t("common.next", "Next")}
              onClick={() => goTo(active + 1)}
            >
              <IconChevronRight size={16} className="tn-flip-rtl" />
            </button>
            <button
              type="button"
              className="tn-round-btn"
              aria-label={t("common.previous", "Previous")}
              onClick={() => goTo(active - 1)}
            >
              <IconChevronLeft size={16} className="tn-flip-rtl" />
            </button>
          </div>
        )}

        {showZoom && !items[active]?.video && (
          <button
            type="button"
            className="tn-round-btn tn-gallery-zoom"
            aria-label={t("product.zoom", "Zoom image")}
            onClick={() => setZoomed(active)}
          >
            <IconZoom size={16} />
          </button>
        )}
      </div>

      {showThumbs && count > 1 && (
        <div className="tn-gallery-thumbs" role="group" aria-label={t("product.thumbs", "Choose image")}>
          {items.map((item, i) => (
            <button
              key={`t-${item.url}-${i}`}
              type="button"
              className={cx("tn-gallery-thumb", i === active && "is-active")}
              /* `aria-current` rather than `aria-pressed`: this is "which one
                 are we looking at", not a toggle. */
              aria-current={i === active ? "true" : undefined}
              aria-label={t("product.show_image", "Show image {{n}} of {{total}}")
                .replace("{{n}}", String(i + 1))
                .replace("{{total}}", String(count))}
              onClick={() => goTo(i)}
            >
              <span className="tn-plate">
                {item.video ? (
                  <span className="tn-thumb-video" aria-hidden="true">
                    <IconPlay size={14} />
                  </span>
                ) : (
                  <Image src={item.url} alt="" sizes="96px" loading="lazy" />
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {zoomed !== null && (
        <GalleryLightbox
          items={items}
          index={zoomed}
          onIndex={setZoomed}
          onClose={() => setZoomed(null)}
          productName={productName}
        />
      )}
    </div>
  );
}

/**
 * Full-screen zoom.
 *
 * A real dialog: focus-trapped, Escape-closable, body-scroll-locked — the same
 * `useOverlayBehaviour` every other overlay in the theme uses, so the three
 * cannot drift apart. Arrow keys page through, because a lightbox that can only
 * be driven with a mouse is a lightbox half the people cannot use.
 */
function GalleryLightbox({
  items,
  index,
  onIndex,
  onClose,
  productName,
}: {
  items: GalleryItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  productName: string;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(true, ref);
  useOverlayBehaviour(true, onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex(Math.min(index + 1, items.length - 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(index - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, items.length, onIndex]);

  const item = items[index];

  return (
    <>
      <div className="tn-scrim is-dark" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        className="tn-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={t("product.zoom", "Zoom image")}
      >
        <button
          type="button"
          className="tn-round-btn tn-lightbox-close"
          aria-label={t("common.close", "Close")}
          onClick={onClose}
        >
          <IconClose size={18} />
        </button>
        <img
          className="tn-lightbox-img"
          src={item.url}
          alt={item.alt || productName}
          /* No `sizes`/transform here — the point of zoom is the original. */
        />
        {items.length > 1 && (
          <div className="tn-lightbox-nav">
            <button
              type="button"
              className="tn-round-btn"
              aria-label={t("common.previous", "Previous")}
              onClick={() => onIndex(Math.max(index - 1, 0))}
              disabled={index === 0}
            >
              <IconChevronLeft size={16} className="tn-flip-rtl" />
            </button>
            <span className="tn-lightbox-count">{`${index + 1} / ${items.length}`}</span>
            <button
              type="button"
              className="tn-round-btn"
              aria-label={t("common.next", "Next")}
              onClick={() => onIndex(Math.min(index + 1, items.length - 1))}
              disabled={index === items.length - 1}
            >
              <IconChevronRight size={16} className="tn-flip-rtl" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
