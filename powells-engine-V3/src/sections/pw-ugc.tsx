/**
 * pw-ugc — customer videos, the way a bookseller would show them.
 *
 * A rail of portrait clips: unboxings, shelf tours, a reader talking about the
 * book they just finished. The merchant uploads the file in the theme editor
 * (or pastes a YouTube / Vimeo / Instagram / TikTok / Facebook link) and tags
 * the book each clip is about, so a video that earns interest has a way into
 * the catalogue instead of ending as a nice moment with no next step.
 *
 * Nothing is fetched until the shopper asks for it. A card mounts as its
 * poster image; the <video> carries NO `src`, and a third-party embed is not
 * mounted at all until a click. Video is the heaviest thing a home page can
 * carry and most visitors scroll past it. Autoplay is opt-in, muted, limited
 * to the clip on screen, and withheld from visitors who asked for less motion
 * or less data — they keep tap-to-play.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Link, useProducts, useResolvedSettings, type Product } from "@numueg/theme-sdk";
import {
  asBool,
  asImageUrl,
  asString,
  isInlineImage,
  productAuthor,
  productImages,
  readBlockNodes,
  useOrnaments,
  type SectionRenderProps,
} from "../lib/shared";
import { useT } from "../lib/i18n";
import { BookJacket } from "../lib/jacket";
import { IconArrow, Twinkle } from "../lib/ornaments";
import { resolveVideo, type VideoEmbed } from "../lib/video";

interface Reel {
  id: string;
  video: VideoEmbed | null;
  poster: string;
  caption: string;
  book?: Product;
  link: string;
}

/** Autoplay is unrequested motion and unrequested bytes — respect both signals. */
function autoplayAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return false;
  } catch {
    /* matchMedia unavailable — fall through to the connection checks */
  }
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) return false;
  return !/2g$/.test(conn?.effectiveType ?? "");
}

/** The resting state of a card: the still, with a play control over it. */
function Still({ reel, label, onPlay }: { reel: Reel; label: string; onPlay?: () => void }) {
  const still = reel.poster || (reel.book ? productImages(reel.book)[0] : "");
  const art = still ? (
    <Image src={still} alt={reel.caption} loading="lazy" responsive={!isInlineImage(still)} />
  ) : reel.book ? (
    <BookJacket title={reel.book.name} author={productAuthor(reel.book)} />
  ) : null;

  if (!onPlay) return <span className="pw-reel-still">{art}</span>;

  return (
    <button type="button" className="pw-reel-play" onClick={onPlay} aria-label={label}>
      {art}
      <span className="pw-reel-btn" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    </button>
  );
}

function Clip({ reel, label, autoplay }: { reel: Reel; label: string; autoplay: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const file = reel.video?.kind === "file" ? reel.video.src : "";

  /**
   * Attach the source on demand. Idempotent, and deliberately not state: it is
   * a DOM side effect with no bearing on what React renders.
   */
  const attach = useCallback(() => {
    const el = videoRef.current;
    if (!el || !file) return null;
    if (el.src !== file) {
      el.src = file;
      el.load();
    }
    return el;
  }, [file]);

  useEffect(() => {
    const el = videoRef.current;
    if (!autoplay || !el || !file || typeof IntersectionObserver === "undefined") return;
    if (!autoplayAllowed()) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          attach();
          el.muted = true;
          void el
            .play()
            .then(() => setStarted(true))
            .catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay, attach, file]);

  const play = () => {
    const el = attach();
    if (!el) return;
    // A click is a gesture, so the clip may speak. Autoplay above stays muted.
    el.muted = false;
    setStarted(true);
    void el.play().catch(() => setStarted(false));
  };

  if (reel.video?.kind === "iframe") {
    // The embed mounts only after a click: a third-party player loaded on
    // sight costs more than the clip itself, for every visitor.
    return started ? (
      <iframe
        src={reel.video.src}
        title={label}
        className="pw-reel-frame"
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    ) : (
      <Still reel={reel} label={label} onPlay={() => setStarted(true)} />
    );
  }

  if (!reel.video) return <Still reel={reel} label={label} />;

  return (
    <>
      <video
        ref={videoRef}
        poster={reel.poster || undefined}
        className="pw-reel-video"
        preload="none"
        loop
        playsInline
        controls={started}
        onClick={play}
      />
      {!started && <Still reel={reel} label={label} onPlay={play} />}
    </>
  );
}

export default function PwUgc({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();
  const { products } = useProducts({ limit: 300, fetchIfMissing: true });

  // The editor's product picker stores an id; a merchant typing a handle by
  // hand is the other thing that reaches this setting.
  const findBook = (key: string): Product | undefined =>
    key ? products.find((p) => String(p.id) === key || p.slug === key) : undefined;

  const reels: Reel[] = readBlockNodes(instance, "reel")
    .map((block, i) => {
      const book = findBook(asString(block.settings.book).trim());
      return {
        id: `${i}`,
        video: resolveVideo(block.settings.video),
        poster: asImageUrl(block.settings.poster),
        caption: asString(block.settings.caption),
        book,
        link: asString(block.settings.link) || (book ? `/products/${book.slug || book.id}` : ""),
      };
    })
    // A block the merchant has added but not filled in yet renders nothing.
    .filter((reel) => Boolean(reel.video || reel.poster || reel.book));

  if (reels.length === 0) return null;

  const heading = asString(s.heading);
  const note = asString(s.note);
  const viewAllText = asString(s.view_all_text);
  const viewAllLink = asString(s.view_all_link) || "/products";
  const autoplay = asBool(s.autoplay, false);
  const shopText = asString(s.shop_text) || t("ugc.shop", "Shop this book");

  return (
    <section className="pw-section">
      <div className="pw-section-head">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)", flex: "0 0 auto" }}>
            <Twinkle size={20} />
          </span>
        )}
        {heading && <h2>{heading}</h2>}
        <span className="pw-rule" />
        {note && ornaments && <span className="pw-hand">{note}</span>}
        {viewAllText && (
          <Link className="pw-viewall" to={viewAllLink}>
            {viewAllText}
            <IconArrow size={14} />
          </Link>
        )}
      </div>

      <div className="pw-reels">
        {reels.map((reel) => {
          const cover = reel.book ? productImages(reel.book)[0] : "";
          return (
            <article className="pw-reel" key={reel.id}>
              <div className="pw-reel-stage">
                <Clip reel={reel} label={reel.caption || t("ugc.play", "Play video")} autoplay={autoplay} />
              </div>
              {reel.caption && <p className="pw-reel-caption">{reel.caption}</p>}
              {reel.book && reel.link && (
                <Link className="pw-reel-book" to={reel.link}>
                  <span className="pw-reel-cover">
                    {cover ? (
                      <Image src={cover} alt="" loading="lazy" responsive={!isInlineImage(cover)} />
                    ) : (
                      <BookJacket title={reel.book.name} size="mini" />
                    )}
                  </span>
                  <span className="pw-reel-book-text">
                    <span className="pw-reel-title">{reel.book.name}</span>
                    <span className="pw-reel-cta">
                      {shopText}
                      <IconArrow size={12} />
                    </span>
                  </span>
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
