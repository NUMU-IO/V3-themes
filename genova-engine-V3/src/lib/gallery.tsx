/**
 * PDP gallery — thumbnail rail, main image, zoom lightbox.
 *
 * Desktop: a vertical thumb rail on the far side, one large 3:4 main image, a
 * Zoom control at the lower end. Mobile: the same images become a horizontal
 * scroll-snap carousel with dots, because a thumb rail on a phone wastes a
 * third of the width for something nobody taps.
 *
 * The lightbox traps focus and closes on Escape or backdrop click. The main
 * image keeps a fixed aspect ratio so switching thumbs never reflows the
 * information panel beside it.
 */

import { useCallback, useRef, useState } from "react";
import { Image } from "@numueg/theme-sdk";
import { cx, useFocusTrap, useOverlayBehaviour } from "./shared";
import { useT } from "./i18n";
import { IconClose } from "./icons";

/**
 * ONE `sizes` value shared by the desktop main image and the mobile carousel.
 *
 * This is what stops the PDP fetching its hero twice. The gallery necessarily
 * renders the same photo in two places — a main image (desktop) and a swipe
 * carousel (mobile) — with CSS hiding one. Give them different `sizes` and they
 * resolve to different srcset candidates, so the browser fetches BOTH: that was
 * D10 (desktop pulling w=1024 *and* w=1600, 34 KB of it at high priority for an
 * element never painted).
 *
 * With an identical `sizes`, both resolve to the SAME URL at every width, so the
 * second is a cache hit and costs nothing — which in turn means both can carry
 * the LCP hint. That matters because whichever one is visible IS the LCP
 * element, and it differs by viewport: main above 900px, carousel below. Fixing
 * D10 by dropping the hint from the carousel created D11 — mobile lost its LCP
 * hint entirely. Sharing the value fixes both instead of trading one for the other.
 *
 * The value is correct for whichever element is actually shown: 55vw matches the
 * desktop two-column split, 100vw the full-bleed mobile carousel.
 */
const GALLERY_SIZES = "(min-width: 1024px) 55vw, 100vw";

export interface GalleryImage {
  url: string;
  alt: string;
}

export function Gallery({
  images,
  layout = "thumbs-start",
  showZoom = true,
  title,
}: {
  images: GalleryImage[];
  layout?: "thumbs-start" | "below";
  showZoom?: boolean;
  title: string;
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const closeZoom = useCallback(() => setZoomed(false), []);

  useFocusTrap(zoomed, lightboxRef);
  useOverlayBehaviour(zoomed, closeZoom);

  if (images.length === 0) {
    return <div className="gn-plate gn-gallery-main" aria-hidden="true" />;
  }

  const current = images[Math.min(index, images.length - 1)];

  return (
    <div className={cx("gn-gallery", `is-${layout}`)}>
      {images.length > 1 && (
        <div className="gn-gallery-thumbs" role="tablist" aria-label={t("product.images", "Images")}>
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              // A tab whose only child is an alt="" image has NO accessible
              // name — a screen-reader user hears "button" five times. The
              // image must stay alt="" (it is decorative, the main image
              // carries the description), so the name goes on the control.
              aria-label={t("product.image_n", "Image {{n}}").replace("{{n}}", String(i + 1))}
              className={cx("gn-gallery-thumb", i === index && "is-active")}
              onClick={() => {
                setIndex(i);
                // Keep the mobile carousel in step with the rail.
                scrollerRef.current?.scrollTo({
                  left: i * (scrollerRef.current?.clientWidth ?? 0),
                  behavior: "smooth",
                });
              }}
            >
              <span className="gn-plate">
                <Image src={img.url} alt="" sizes="56px" loading="lazy" />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="gn-gallery-stage">
        {/* Desktop: one image. Mobile: the same list as a swipe carousel — CSS
            decides which is visible, so there is no duplicated markup and no
            JS breakpoint listener. */}
        <div className="gn-gallery-main">
          <span className="gn-plate">
            <Image
              src={current.url}
              alt={current.alt || title}
              // Above 900px this is the LCP element.
              priority
              sizes={GALLERY_SIZES}
            />
          </span>
          {showZoom && (
            <button
              type="button"
              className="gn-gallery-zoom gn-label"
              onClick={() => setZoomed(true)}
            >
              {t("product.zoom", "Zoom")}
            </button>
          )}
        </div>

        <div
          ref={scrollerRef}
          className="gn-gallery-scroller"
          // A horizontally scrollable region with no focusable child is
          // unreachable by keyboard — on a phone that hides every image after
          // the first. tabIndex + a role/name make it a real stop.
          tabIndex={0}
          role="group"
          aria-label={t("product.images", "Images")}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
            if (i !== index) setIndex(i);
          }}
        >
          {images.map((img, i) => (
            <span key={`m-${img.url}-${i}`} className="gn-plate gn-gallery-slide">
              <Image
                src={img.url}
                alt={i === 0 ? img.alt || title : ""}
                sizes={GALLERY_SIZES}
                // Below 900px THIS is the LCP element, so slide 0 keeps the
                // hint. Same URL as the main image (see GALLERY_SIZES), so the
                // hidden one is a cache hit rather than a second download.
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
              />
            </span>
          ))}
        </div>

        {images.length > 1 && (
          <div className="gn-gallery-dots" aria-hidden="true">
            {images.map((_img, i) => (
              <span key={`d-${i}`} className={cx("gn-gallery-dot", i === index && "is-active")} />
            ))}
          </div>
        )}
      </div>

      {zoomed && (
        <div
          ref={lightboxRef}
          className="gn-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("product.zoom", "Zoom")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomed(false);
          }}
        >
          <button
            type="button"
            className="gn-icon-btn gn-lightbox-close"
            aria-label={t("general.close", "Close")}
            onClick={() => setZoomed(false)}
          >
            <IconClose />
          </button>
          <img src={current.url} alt={current.alt || title} className="gn-lightbox-img" />
        </div>
      )}
    </div>
  );
}
