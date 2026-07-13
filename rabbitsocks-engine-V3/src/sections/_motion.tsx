"use client";
/**
 * Mashkal motion language — "the kaleidoscope turns".
 *
 * Every reveal is optical, drawn from lenses and gallery light — nothing
 * slides in like a web page:
 *   Focus     — display text settles into focus: tracking contracts from
 *               airy to set while it fades in, like a lens pulling sharp.
 *   Aperture  — imagery opens through a circular aperture (clip-path
 *               circle) and settles from a slight zoom, like a shutter.
 *   FrameSpin — the thin geometric frame outlines rotate into place from
 *               a few degrees off, the kaleidoscope pane clicking home.
 *   RuleDraw  — hairlines draw in from the reading edge (shared with the
 *               fleet's section headers; RTL-aware).
 *   Stamp     — badges land oversized→rest (cart count re-stamp).
 *   Rise      — quiet secondary reveal for supporting copy.
 *
 * All gated by useMotionOn(): the merchant's "Enable animations" global AND
 * prefers-reduced-motion. Off = fully static render, content never hidden.
 *
 * IN-VIEW RULE (learned the hard way): never put whileInView on an element
 * whose hidden state is its own clip-path/mask/zero-area transform — it
 * reports zero intersection and never fires. Observers live on UNCLIPPED
 * wrappers; hidden states reach children via variant propagation.
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

/* ── Focus ───────────────────────────────────────────────────────────── */

interface FocusProps {
  on: boolean;
  lines: string[];
  delay?: number;
  stagger?: number;
  /** true → animate on scroll into view; false → on mount (hero). */
  inView?: boolean;
  lineClassName?: string;
}

/** Lens-focus settle for display headlines: each line fades in while its
 *  tracking contracts to rest. Same prop shape as Manshet's Typeset so
 *  ported sections only rename the import. */
export function Focus({ on, lines, delay = 0, stagger = 0.1, inView = false, lineClassName }: FocusProps) {
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
    hidden: { opacity: 0, letterSpacing: "0.06em" },
    visible: { opacity: 1, letterSpacing: "0em", transition: { duration: 0.9, ease: INK } },
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
        <motion.span key={i} className={`block ${lineClassName ?? ""}`} variants={lineVariant}>
          {line}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ── Aperture ────────────────────────────────────────────────────────── */

interface ApertureProps {
  on: boolean;
  delay?: number;
  inView?: boolean;
  /** kept for API-compat with Plate; the aperture is radial so it's unused */
  from?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** Shutter-open reveal for imagery: a circular clip expands from the centre
 *  to past the corners while the media settles from a slight zoom. Observer
 *  on the unclipped wrapper (see IN-VIEW RULE above). */
export function Aperture({ on, delay = 0, inView = true, className, style, children }: ApertureProps) {
  if (!on) return <div className={className} style={style}>{children}</div>;
  const container = {
    hidden: {},
    visible: { transition: { delayChildren: delay } },
  };
  const shutter = {
    hidden: { clipPath: "circle(12% at 50% 50%)", opacity: 0 },
    visible: {
      clipPath: "circle(75% at 50% 50%)",
      opacity: 1,
      transition: { duration: 0.9, ease: INK },
    },
  };
  const settle = {
    hidden: { scale: 1.08 },
    visible: { scale: 1, transition: { duration: 1.2, ease: INK } },
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
      <motion.div className="h-full w-full" style={{ willChange: "clip-path" }} variants={shutter}>
        <motion.div className="h-full w-full" variants={settle}>
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ── FrameSpin ───────────────────────────────────────────────────────── */

interface FrameSpinProps {
  on: boolean;
  delay?: number;
  inView?: boolean;
  className?: string;
  children: ReactNode;
}

/** The kaleidoscope pane clicks home: rotates in from a few degrees off
 *  with a slight scale settle. For the geometric frame outlines. */
export function FrameSpin({ on, delay = 0, inView = true, className, children }: FrameSpinProps) {
  if (!on) return <div className={className}>{children}</div>;
  const anim = { opacity: 1, rotate: 0, scale: 1 };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, rotate: isRtl() ? 8 : -8, scale: 0.94 }}
      {...(inView
        ? { whileInView: anim, viewport: { once: true, amount: 0.3 } }
        : { animate: anim })}
      transition={{ duration: 0.8, delay, ease: INK }}
    >
      {children}
    </motion.div>
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

/** Hairline (with its diamond stud) draws in from the reading edge. */
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

/* ── Stamp ───────────────────────────────────────────────────────────── */

interface StampProps {
  on: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
}

/** Badge lands oversized → rest, no bounce. */
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

/** Quiet secondary reveal for supporting copy and grid items. */
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
