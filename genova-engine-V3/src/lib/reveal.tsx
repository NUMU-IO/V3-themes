/**
 * Scroll reveal — CSS-first, one IntersectionObserver, ~1 KB (decision D2).
 *
 * ## Each element arms ITSELF
 *
 * The first version put the hidden state behind an attribute a parent effect
 * set on the app root. That was fragile in a way that is easy to miss: React
 * runs CHILD effects before PARENT effects, so every element observed itself
 * before the root was armed. Anything already on screen resolved fine, but
 * anything below the fold was painted VISIBLE first and only hidden a tick
 * later — a reverse animation on first paint, and one more moving part between
 * "I wrote a reveal" and "I can see a reveal".
 *
 * Now the element sets `data-reveal="armed"` on itself, in its own effect,
 * immediately before observing. No ordering to reason about.
 *
 * ## Two rules this must never break
 *
 * 1. **No JS, no hiding.** The hidden state lives behind `[data-reveal="armed"]`,
 *    which only ever appears from script. A failed bundle, a crawler, or SSR
 *    output shows finished content — never a blank page.
 * 2. **Already visible? Never arm it.** Elements in the viewport at mount skip
 *    arming entirely and are shown as-is. Arming them would flash the content
 *    out and back in, which is worse than no animation.
 *
 * ## The clipping trap
 *
 * Observe an UNCLIPPED wrapper. An element inside a parent with
 * `overflow: hidden` (a scroll-snap rail, a mask) reports zero intersection and
 * the callback never fires — the single most common reason a reveal silently
 * does nothing.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { cx, useMotionOn } from "./shared";

export interface RevealProps {
  children: ReactNode;
  /** Stagger step — 70ms each, capped at 6 so a long list cannot crawl. */
  index?: number;
  /** `up` rises 18px (default) · `fade` opacity only · `mask` wipes upward. */
  variant?: "up" | "fade" | "mask";
  className?: string;
  as?: "div" | "section" | "li" | "article";
}

export function Reveal({
  children,
  index = 0,
  variant = "up",
  className,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const motionOn = useMotionOn();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Motion off, or no observer support: the element must end up VISIBLE.
    //
    // "Leave it unarmed" was wrong, because it may already BE armed.
    // `useMotionOn()` starts optimistic and learns the OS preference in an
    // effect, so on a reduced-motion machine this effect runs once with
    // motionOn=true (arming the element and observing it), then re-runs with
    // motionOn=false — at which point the observer is disconnected by cleanup
    // and nothing is left to flip the attribute. Returning early stranded the
    // element at opacity 0 permanently: 22 of 22 on the homepage. Clearing the
    // attribute is what actually restores the finished state.
    if (!motionOn || typeof IntersectionObserver === "undefined") {
      delete el.dataset.reveal;
      return;
    }

    // Rule 2 — already on screen: show it, never arm it. Measured
    // synchronously so there is no frame in which it is hidden.
    const box = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (box.top < vh * 0.92 && box.bottom > 0) return;

    el.dataset.reveal = "armed";

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "in";
          io.unobserve(entry.target); // one-shot; never re-hide on scroll back
        }
      },
      // Start slightly before the top edge arrives so the motion has finished
      // by the time the element is properly in view, rather than beginning there.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motionOn]);

  return (
    <Tag
      ref={ref as never}
      className={cx("gn-reveal", `is-${variant}`, className)}
      style={index ? ({ ["--gn-reveal-delay" as string]: `${Math.min(index, 6) * 70}ms` }) : undefined}
    >
      {children}
    </Tag>
  );
}
