"use client";
/**
 * Manshet motion language — "the edition goes to print".
 *
 * Every entrance is drawn from print production, so no two section types
 * share the same reveal:
 *   Typeset  — display headlines rise line-by-line out of baseline masks,
 *              the way lines of type are set on a press.
 *   RuleDraw — the newspaper double-rules ink themselves in (scaleX).
 *   Plate    — images are uncovered by a clip-path wipe (a page being
 *              turned back), while the photo settles from a slight zoom.
 *   Stamp    — quote marks / badges land like a rubber stamp: from
 *              slightly large + rotated to rest, no bounce.
 *
 * All of it is gated by useMotionOn(): the merchant's "Enable animations"
 * global AND prefers-reduced-motion. Off = fully static render (content is
 * never hidden behind a reveal).
 */
import { motion, useReducedMotion } from "framer-motion";
import { type CSSProperties, type ReactNode } from "react";
import { useAnimationsEnabled } from "./_shared";

/** ease-out-expo — confident, decisive settle. The theme's only curve. */
export const INK = [0.16, 1, 0.3, 1] as const;

export function useMotionOn(): boolean {
  const reduce = useReducedMotion();
  const enabled = useAnimationsEnabled();
  return enabled && !reduce;
}

function isRtl(): boolean {
  return typeof document !== "undefined" && document.documentElement.dir === "rtl";
}

/* ── Typeset ─────────────────────────────────────────────────────────── */

interface TypesetProps {
  on: boolean;
  lines: string[];
  delay?: number;
  stagger?: number;
  /** true → animate on scroll into view; false → on mount (hero). */
  inView?: boolean;
  lineClassName?: string;
}

/** Masked line-rise for display headlines. Render is a set of block spans,
 *  so pass pre-split lines (headline.split("\n")).
 *
 *  The in-view trigger lives on the UNCLIPPED container and reaches the
 *  masked lines via variant propagation: a translated line is fully clipped
 *  by its own overflow mask, so observing the line itself reports zero
 *  intersection and the reveal never fires. */
export function Typeset({ on, lines, delay = 0, stagger = 0.09, inView = false, lineClassName }: TypesetProps) {
  if (!on) {
    return (
      <>
        {lines.map((line, i) => (
          <span key={i} className={`block ${lineClassName ?? ""}`}>{line}</span>
        ))}
      </>
    );
  }
  const container = {
    hidden: {},
    visible: { transition: { delayChildren: delay, staggerChildren: stagger } },
  };
  const lineVariant = {
    hidden: { y: "110%" },
    visible: { y: "0%", transition: { duration: 0.7, ease: INK } },
  };
  return (
    <motion.span
      className="block"
      variants={container}
      initial="hidden"
      {...(inView
        ? { whileInView: "visible", viewport: { once: true, amount: 0.5 } }
        : { animate: "visible" })}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden">
          <motion.span
            className={`block will-change-transform ${lineClassName ?? ""}`}
            variants={lineVariant}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* ── RuleDraw ────────────────────────────────────────────────────────── */

interface RuleDrawProps {
  on: boolean;
  delay?: number;
  inView?: boolean;
  className?: string;
  children: ReactNode;
}

/** Wrap a rule (or any thin horizontal ornament) so it draws in from the
 *  reading edge. RTL-aware via transform-origin. */
export function RuleDraw({ on, delay = 0, inView = true, className, children }: RuleDrawProps) {
  const origin = isRtl() ? "right" : "left";
  if (!on) return <div className={className}>{children}</div>;
  const anim = { scaleX: 1 };
  return (
    <motion.div
      className={className}
      style={{ transformOrigin: origin }}
      initial={{ scaleX: 0 }}
      {...(inView
        ? { whileInView: anim, viewport: { once: true, amount: 0.9 } }
        : { animate: anim })}
      transition={{ duration: 0.55, delay, ease: INK }}
    >
      {children}
    </motion.div>
  );
}

/* ── Plate ───────────────────────────────────────────────────────────── */

type PlateFrom = "start" | "end" | "bottom";

interface PlateProps {
  on: boolean;
  delay?: number;
  inView?: boolean;
  from?: PlateFrom;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function plateClips(from: PlateFrom): { hidden: string; shown: string } {
  const rtl = isRtl();
  if (from === "bottom") return { hidden: "inset(100% 0 0 0)", shown: "inset(0 0 0 0)" };
  // "start" uncovers in the reading direction; "end" against it.
  const fromLeft = (from === "start") !== rtl;
  return {
    hidden: fromLeft ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)",
    shown: "inset(0 0 0 0)",
  };
}

/** Clip-path uncover for imagery. Put the <img> (or any media) inside; it
 *  also settles from a 1.06 zoom so the wipe has something to reveal.
 *
 *  The in-view observer lives on an UNCLIPPED wrapper and drives the clipped
 *  layer via variant propagation: an element fully hidden by its own
 *  clip-path reports zero intersection, so observing the clipped element
 *  itself means the reveal never fires (same trap as the Typeset masks). */
export function Plate({ on, delay = 0, inView = true, from = "start", className, style, children }: PlateProps) {
  if (!on) return <div className={className} style={style}>{children}</div>;
  const { hidden, shown } = plateClips(from);
  const container = {
    hidden: {},
    visible: { transition: { delayChildren: delay } },
  };
  const clip = {
    hidden: { clipPath: hidden },
    visible: { clipPath: shown, transition: { duration: 0.8, ease: INK } },
  };
  const zoom = {
    hidden: { scale: 1.06 },
    visible: { scale: 1, transition: { duration: 1.1, ease: INK } },
  };
  return (
    <motion.div
      className={className}
      style={style}
      variants={container}
      initial="hidden"
      {...(inView
        ? { whileInView: "visible", viewport: { once: true, amount: 0.2 } }
        : { animate: "visible" })}
    >
      <motion.div className="h-full w-full" style={{ willChange: "clip-path" }} variants={clip}>
        <motion.div className="h-full w-full" variants={zoom}>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ── Stamp ───────────────────────────────────────────────────────────── */

interface StampProps {
  on: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
}

/** Rubber-stamp settle: slightly oversized + rotated → rest. For quote
 *  marks, "EID OFFER"-style labels, order-confirmation marks. */
export function Stamp({ on, delay = 0, className, children }: StampProps) {
  if (!on) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={`inline-block ${className ?? ""}`}
      initial={{ opacity: 0, scale: 1.35, rotate: -6 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.45, delay, ease: INK }}
    >
      {children}
    </motion.span>
  );
}

/* ── Rise ────────────────────────────────────────────────────────────── */

interface RiseProps {
  on: boolean;
  delay?: number;
  y?: number;
  inView?: boolean;
  className?: string;
  children: ReactNode;
}

/** Small utility rise for secondary content (subtitles, CTAs, footers of a
 *  choreography). Deliberately quiet — the signature moves above carry the
 *  voice; this just keeps supporting copy from popping in. */
export function Rise({ on, delay = 0, y = 18, inView = false, className, children }: RiseProps) {
  if (!on) return <div className={className}>{children}</div>;
  const anim = { opacity: 1, y: 0 };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      {...(inView
        ? { whileInView: anim, viewport: { once: true, amount: 0.3 } }
        : { animate: anim })}
      transition={{ duration: 0.6, delay, ease: INK }}
    >
      {children}
    </motion.div>
  );
}
