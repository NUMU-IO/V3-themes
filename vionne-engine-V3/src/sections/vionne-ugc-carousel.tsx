"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocale, useProducts, useResolvedSettings } from "@numueg/theme-sdk";
import { ArrowRight, Play } from "lucide-react";
import { applyImageTransform, asImageTransform, asImageUrl, asString, imgSrc, localized, productImage, resolveVideoEmbed, responsiveImg, CARD_TRACK_IMG, CHIP_IMG, type ImageTransform, type SectionRenderProps, type VideoEmbed } from "./_shared";
import { InlineEditable } from "./_inline-editable";

// ── Progressive reel loading ────────────────────────────────────────────────
//
// Goal: click-to-play should feel instant, without paying for it at page load.
//
// ⚠️ WHY NOT SIMPLY `preload="metadata"`, or flipping `preload` from "none" to
// "metadata" when the reel nears the viewport — the two obvious options:
//
//  1. `preload="metadata"` from the start is not free. The browser opens a
//     connection per <video> and range-fetches the container header (the `moov`
//     atom) for EVERY reel immediately. With N reels that is N connections
//     competing for bandwidth during the exact window the LCP image is
//     fetching. Far cheaper than 7 MB, but it is still "preload everything at
//     once", and it costs real Core Web Vitals on a slow Egyptian mobile link.
//
//  2. Mutating the `preload` ATTRIBUTE later does not reliably do anything.
//     `preload` is a hint consulted by the media resource selection algorithm,
//     and that algorithm runs when a source is set or `load()` is invoked — not
//     when the attribute changes. An element that has already settled with
//     `preload="none"` sits in NETWORK_EMPTY/IDLE, and whether flipping the
//     attribute restarts fetching is browser-dependent (Chromium often
//     re-evaluates; WebKit historically does not). It is a coin flip, and the
//     failure mode is silent: the reel simply does not prewarm.
//
// So instead we withhold the `src` ENTIRELY until we want bytes, then attach it
// and call `load()`. That is the one path the spec guarantees kicks off
// resource selection, and at that moment `preload="metadata"` is honoured — so
// we get exactly the header, not the file. It also keeps each reel out of the
// browser's media preload accounting until we opt in, which (1) cannot do.
//
// The poster is an attribute, not media data, so it renders the whole time and
// the card looks identical at every stage.

/** How early to start prewarming, in px of scroll distance. */
const PREPARE_ROOT_MARGIN_PX = 400;

/** Ceiling on simultaneous metadata fetches (see the concurrency gate below). */
const MAX_CONCURRENT_PREPARES = 2;

type PrepareFn = () => void;

// ONE IntersectionObserver shared by every reel on the page, rather than one
// per component. Observers are cheap but not free, and a single callback also
// keeps the prewarm order deterministic (document order within a batch).
const prepareTargets = new WeakMap<Element, PrepareFn>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver | null {
  // SSR + very old browsers: caller falls back to "prepare on interaction".
  if (typeof IntersectionObserver === "undefined") return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const prepare = prepareTargets.get(entry.target);
          // One-shot: a reel only needs prewarming once.
          sharedObserver?.unobserve(entry.target);
          prepareTargets.delete(entry.target);
          prepare?.();
        }
      },
      { rootMargin: `${PREPARE_ROOT_MARGIN_PX}px` },
    );
  }
  return sharedObserver;
}

// Concurrency gate. This carousel is a horizontal track, so several cards
// satisfy the 400px margin in the SAME observer batch — without a gate they
// would all open a connection at once, which is the burst we are trying to
// avoid. Speculative prewarms queue behind at most two in flight; a slot is
// released on `loadedmetadata` (or `error`, so one dead URL cannot wedge it).
let inFlightPrepares = 0;
const queuedPrepares: Array<() => void> = [];

function withPrepareSlot(run: (release: () => void) => void): void {
  const release = () => {
    inFlightPrepares = Math.max(0, inFlightPrepares - 1);
    queuedPrepares.shift()?.();
  };
  const begin = () => {
    inFlightPrepares += 1;
    run(release);
  };
  if (inFlightPrepares < MAX_CONCURRENT_PREPARES) begin();
  else queuedPrepares.push(begin);
}

/**
 * One UGC reel — poster first, bytes on demand, warmed just in time.
 *
 * Deliberately NOT `autoPlay`. An autoplaying <video> downloads its entire
 * source during page load no matter what `preload` says, and the three reels on
 * the Vionne home page weighed 3,491 + 2,443 + 1,305 KiB = 7,239 KiB — the
 * single largest byte category in the waterfall, more than all 35 images on the
 * page combined, for content most visitors scroll straight past.
 *
 * Playback stays a deliberate user action. What the staged prewarm buys is that
 * by the time the shopper reaches the reel and clicks, the container header is
 * already parsed, so playback starts from a warm connection instead of a cold
 * DNS/TLS/range round-trip.
 *
 * Three escalating stages:
 *   1. mount            — poster only, no `src`, zero media bytes.
 *   2. within 400px     — attach `src` + `load()` ⇒ metadata only (queued).
 *   3. mouse hover/focus— same, but immediately and unqueued: a pointer on the
 *                         card is a much stronger signal than proximity.
 * A click always attaches first, so it works even if no stage has fired.
 */
function UgcReel({
  src,
  poster,
  label,
}: {
  src: string;
  poster?: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Ref, not state, on purpose: attaching a source is a DOM side effect with no
  // bearing on the rendered output, and routing it through state would re-render
  // every reel on every scroll-triggered prewarm for nothing.
  const attachedRef = useRef(false);

  const [started, setStarted] = useState(false);

  /** Attach the source and begin the metadata fetch. Idempotent, no re-render. */
  const attach = useCallback((): HTMLVideoElement | null => {
    const el = videoRef.current;
    if (!el) return null;
    if (attachedRef.current) return el;
    attachedRef.current = true;
    el.src = src;
    // Explicit: setting .src queues resource selection, load() runs it now.
    el.load();
    return el;
  }, [src]);

  /** Speculative prewarm — queued, so a row of cards cannot all fetch at once. */
  const prepare = useCallback(() => {
    if (attachedRef.current || !videoRef.current) return;
    withPrepareSlot((release) => {
      const el = attach();
      if (!el) return release();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.removeEventListener("loadedmetadata", finish);
        el.removeEventListener("error", finish);
        release();
      };
      el.addEventListener("loadedmetadata", finish);
      el.addEventListener("error", finish);
    });
  }, [attach]);

  // Stage 2 — prewarm as the reel approaches the viewport.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = getSharedObserver();
    if (!observer) {
      // No IntersectionObserver: stay lazy and let interaction do the work,
      // rather than eagerly fetching metadata for every reel.
      return;
    }
    prepareTargets.set(el, prepare);
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      prepareTargets.delete(el);
    };
  }, [prepare]);

  // Stage 3 — desktop hover. `pointerType` is checked per event instead of
  // sniffing the device, so a hybrid laptop prewarms on its trackpad but the
  // same machine's touchscreen does not. Touch has no hover state to exploit,
  // and firing this on a tap would just duplicate the click path.
  const onPointerEnter = (e: { pointerType?: string }) => {
    if (e.pointerType === "mouse") attach();
  };

  const start = () => {
    // Unqueued: a click is intent, not speculation, and must never sit behind
    // another reel's prewarm. Safe to call when already attached.
    const el = attach();
    if (!el) return;
    setStarted(true);
    // muted + playsInline keeps this within iOS's gesture-free play rules.
    void el.play().catch(() => setStarted(false));
  };

  return (
    <>
      {/* Only when the merchant supplied no still anywhere in the fallback
          chain: with no source attached and no poster the element paints empty. */}
      {!poster && <div className="absolute inset-0 vn-shimmer" />}
      <video
        ref={videoRef}
        // NO `src` — it is attached by `attach()`. See the header note.
        poster={poster || undefined}
        className="absolute inset-0 w-full h-full object-cover"
        preload="metadata"
        muted
        loop
        playsInline
        onClick={start}
        onPointerEnter={onPointerEnter}
      />
      {!started && (
        <button
          type="button"
          onClick={start}
          onPointerEnter={onPointerEnter}
          // Keyboard parity with hover: tabbing to the control prewarms too, so
          // Enter feels as immediate as a click does for a mouse user.
          onFocus={attach}
          aria-label={label}
          className="absolute inset-0 flex items-center justify-center group/play"
        >
          <span className="w-11 h-11 rounded-full bg-black/45 flex items-center justify-center transition-transform duration-300 group-hover/play:scale-110">
            <Play size={16} fill="currentColor" className="text-white translate-x-[1px]" />
          </span>
        </button>
      )}
    </>
  );
}

interface Item {
  n: number;
  media: string;
  mediaTransform?: ImageTransform;
  video: VideoEmbed | null;
  caption: string;
  productImage: string;
  productImageTransform?: ImageTransform;
  productLink: string;
}

const VionneUgcCarousel = ({ instance, sectionId }: SectionRenderProps) => {
  const locale = useLocale();
  const s = useResolvedSettings(instance);
  const eyebrow = asString(s.eyebrow);
  const title = asString(s.title) || localized(locale, "Tagged by you", "صوّرتونا");
  const subtitle = asString(s.subtitle);
  const ctaText = asString(s.cta_text);
  const ctaLink = asString(s.cta_link) || "/products";
  // asImageUrl (not raw) so a just-uploaded {url,alt} object renders instead
  // of [object Object] — same fix the slideshow/image-comparison already have.
  const introImage = asImageUrl(s.intro_image);
  const introImageTransform = asImageTransform(s.intro_image);
  const badgeText = asString(s.badge_text) || localized(locale, "Shop now", "تسوّقي دلوقتي");
  // Resolve the linked product (name + fallback thumb) from the catalog by
  // matching the /product/<slug-or-id> link, so each card can show the real
  // product under the video without the merchant re-typing anything.
  const { products: catalog } = useProducts();
  const linkedProduct = (link: string) => {
    const m = link.match(/\/product\/([^/?#]+)/);
    if (!m) return undefined;
    const key = decodeURIComponent(m[1]);
    return catalog.find((p) => p.slug === key || p.id === key);
  };

  const items: Item[] = [];
  for (let i = 1; i <= 6; i++) {
    const media = asImageUrl(s[`item_${i}_media`]);
    // Accepts a direct MP4/WebM OR a YouTube / Vimeo / Instagram / TikTok /
    // Facebook link — resolveVideoEmbed maps each to the right player.
    const video = resolveVideoEmbed(s[`item_${i}_video`]);
    if (!media && !video) continue;
    items.push({
      n: i,
      media,
      mediaTransform: asImageTransform(s[`item_${i}_media`]),
      video,
      caption: asString(s[`item_${i}_caption`]),
      productImage: asImageUrl(s[`item_${i}_product_image`]),
      productImageTransform: asImageTransform(s[`item_${i}_product_image`]),
      productLink: asString(s[`item_${i}_product_link`]),
    });
  }

  const trackRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-6 md:mb-8 gap-4">
          <div>
            {eyebrow && (
              <span className="vn-eyebrow block mb-1.5">
                <InlineEditable sectionId={sectionId} settingKey="eyebrow" value={eyebrow} />
              </span>
            )}
            <h2 className="vn-heading text-2xl md:text-3xl">
              <InlineEditable sectionId={sectionId} settingKey="title" value={title} />
            </h2>
            {subtitle && (
              <p className="text-sm text-[var(--vn-muted)] mt-1.5">
                <InlineEditable sectionId={sectionId} settingKey="subtitle" value={subtitle} />
              </p>
            )}
          </div>
          {ctaText && (
            <Link
              to={ctaLink}
              className="vn-label inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity shrink-0 pb-2"
            >
              <InlineEditable sectionId={sectionId} settingKey="cta_text" value={ctaText} />
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        <div
          ref={trackRef}
          className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 scrollbar-hide"
        >
          {(introImage || ctaText) && (
            <div
              className={`vn-reveal shrink-0 snap-start w-[210px] sm:w-[240px] md:w-[260px] aspect-[3/4] relative rounded-md overflow-hidden bg-[var(--vn-surface-dark)] ${
                visible ? "is-visible" : ""
              }`}
            >
              {introImage && (
                <img
                  {...responsiveImg(introImage, CARD_TRACK_IMG)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                  style={applyImageTransform(introImageTransform, "cover")}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="absolute inset-0 flex flex-col items-start justify-between p-5 text-start">
                <div>
                  <h3 className="vn-heading text-white text-2xl md:text-[26px] leading-[1.05] uppercase">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-white/75 text-xs mt-2 max-w-[80%]">{subtitle}</p>
                  )}
                </div>
                {ctaText && (
                  <Link
                    to={ctaLink}
                    className="vn-label text-white inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                  >
                    {ctaText}
                  </Link>
                )}
              </div>
            </div>
          )}

          {items.map((it, idx) => {
            // Resolved ONCE per card. The tagged product drives three things —
            // the chip image, the name under the card, and (newly) the reel's
            // poster of last resort — and this used to run linkedProduct()
            // twice per card inside separate IIFEs.
            const prod = it.productLink ? linkedProduct(it.productLink) : undefined;
            const thumb = it.productImage || (prod ? productImage(prod) : undefined);
            // Poster chain. `preload="none"` means a reel with no poster paints
            // an empty box, so fall all the way back to the tagged product's
            // own photo before giving up — a real still beats a shimmer, and
            // the reels on the live store carry no `item_N_media`.
            const reelPoster = it.media || it.video?.poster || thumb;

            return (
            <div
              key={idx}
              className={`vn-reveal shrink-0 snap-start w-[210px] sm:w-[240px] md:w-[260px] aspect-[3/4] relative bg-[var(--vn-band)] rounded-md overflow-hidden flex flex-col ${
                visible ? "is-visible" : ""
              }`}
              style={{ transitionDelay: visible ? `${idx * 70}ms` : "0ms" }}
            >
              <div className="relative flex-1 overflow-hidden">
                {it.video?.kind === "file" ? (
                  <UgcReel
                    src={it.video.src}
                    poster={imgSrc(reelPoster, CARD_TRACK_IMG.widths[1])}
                    label={
                      it.caption ||
                      localized(locale, `Play reel ${it.n}`, `شغّلي الفيديو ${it.n}`)
                    }
                  />
                ) : it.video?.kind === "iframe" ? (
                  <iframe
                    src={it.video.src}
                    title={it.caption || `${title} ${it.n}`}
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 0 }}
                    loading="lazy"
                    allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : it.media ? (
                  <img
                    {...responsiveImg(it.media, CARD_TRACK_IMG)}
                    alt={it.caption}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={applyImageTransform(it.mediaTransform, "cover")}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 vn-shimmer" />
                )}

                {it.caption && (
                  <span className="absolute top-3 start-3 vn-label px-2.5 py-1 text-[10px] bg-[var(--vn-sale)] text-white rounded-sm">
                    <InlineEditable sectionId={sectionId} settingKey={`item_${it.n}_caption`} value={it.caption} />
                  </span>
                )}

                {/* Product thumbnail OVERLAY (bottom-start, white ring) —
                    the tagged-product affordance from the reference design.
                    44 CSS px. On the live store this slot was being handed
                    full-size customization uploads — 1440×1457 (545 KiB) and
                    1170×1183 (326 KiB) — so it was the single worst
                    bytes-per-painted-pixel image on the page. */}
                {thumb && (
                  <img
                    {...responsiveImg(thumb, CHIP_IMG)}
                    alt={prod?.name || ""}
                    className="absolute bottom-3 start-3 w-11 h-11 object-cover rounded-lg ring-2 ring-white shadow-md"
                    style={applyImageTransform(it.productImageTransform, "cover")}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>

              {/* Under the media: product name + red "Shop Now". */}
              {it.productLink && (
                <Link
                  to={it.productLink}
                  className="bg-white px-3 py-2.5 block hover:bg-[var(--vn-band)] transition-colors"
                  data-testid="storefront-ugc-shop"
                >
                  {prod?.name && (
                    <span className="block text-[13px] font-medium text-[var(--vn-ink)] line-clamp-1">
                      {prod.name}
                    </span>
                  )}
                  <span className="block mt-0.5 text-[12px] font-semibold text-[var(--vn-sale)]">
                    {badgeText}
                  </span>
                </Link>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default VionneUgcCarousel;
