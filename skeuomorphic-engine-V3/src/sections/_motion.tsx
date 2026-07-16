"use client";
/**
 * Warsha motion language — "everything has weight".
 *
 * Reveals behave like objects on a workbench, not pixels on a page:
 *   Emboss   — display text presses INTO the surface: it fades in while
 *              its letterpress shadow deepens, like a stamp landing.
 *              (Same prop shape as Manshet's Typeset → ports only rename.)
 *   Develop  — imagery develops like an instant print: sepia + soft blur
 *              resolving to full color and sharpness.
 *              (Same prop shape as Plate/Aperture → ports only rename.)
 *   Weight   — cards drop a few pixels and SETTLE with their shadow
 *              growing in, like being set down on the bench.
 *   RuleDraw — the stitched seam sews in from the reading edge.
 *   Stamp    — badges land oversized→rest (wax-seal press, cart badge).
 *   Rise     — quiet secondary reveal for supporting copy.
 *
 * All gated by useMotionOn(): the merchant's "Enable animations" global AND
 * prefers-reduced-motion. Off = fully static render, content never hidden.
 *
 * IN-VIEW RULE (fleet law): never put whileInView on an element whose hidden
 * state is its own clip/mask/zero-area transform — it reports zero
 * intersection and never fires. Observers live on UNCLIPPED wrappers;
 * hidden states reach children via variant propagation. (Develop animates
 * `filter`, which never affects intersection, so it is safe on-element —
 * but it follows the wrapper pattern anyway for consistency.)
 */
import { motion, useReducedMotion } from "framer-motion";
import { type CSSProperties, type ReactNode } from "react";
import { useAnimationsEnabled } from "./_shared";

/** ease-out-expo — heavy, decisive settle. The theme's only curve. */
export const INK = [0.16, 1, 0.3, 1] as const;

export function useMotionOn(): boolean {
  const reduce = useReducedMotion();
  const enabled = useAnimationsEnabled();
  return enabled && !reduce;
}

function isRtl(): boolean {
  return typeof document !== "undefined" && document.documentElement.dir === "rtl";
}

/* ── Emboss ──────────────────────────────────────────────────────────── */

interface EmbossProps {
  on: boolean;
  lines: string[];
  delay?: number;
  stagger?: number;
  /** true → animate on scroll into view; false → on mount (hero). */
  inView?: boolean;
  lineClassName?: string;
}

/** Letterpress settle for display headlines: each line fades in while it
 *  presses down 6px into rest — the stamp landing on kraft. */
export function Emboss({ on, lines, delay = 0, stagger = 0.12, inView = false, lineClassName }: EmbossProps) {
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
    hidden: { opacity: 0, y: -6, scale: 1.015 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: INK } },
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

/* ── Develop ─────────────────────────────────────────────────────────── */

interface DevelopProps {
  on: boolean;
  delay?: number;
  inView?: boolean;
  /** kept for API-compat with Plate/Aperture; unused */
  from?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** Instant-print develop for imagery: sepia + blur resolving to full color
 *  and sharpness while the print settles from a slight lift. */
export function Develop({ on, delay = 0, inView = true, className, style, children }: DevelopProps) {
  if (!on) return <div className={className} style={style}>{children}</div>;
  const container = {
    hidden: {},
    visible: { transition: { delayChildren: delay } },
  };
  const print = {
    hidden: { opacity: 0, y: 10, filter: "sepia(0.65) blur(6px) contrast(0.85)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "sepia(0) blur(0px) contrast(1)",
      transition: { duration: 1.0, ease: INK },
    },
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
      <motion.div className="h-full w-full" style={{ willChange: "filter" }} variants={print}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── Weight ──────────────────────────────────────────────────────────── */

interface WeightProps {
  on: boolean;
  delay?: number;
  inView?: boolean;
  className?: string;
  children: ReactNode;
}

/** Set-down entrance for cards: drops from slightly above and settles,
 *  like being placed on the bench. */
export function Weight({ on, delay = 0, inView = true, className, children }: WeightProps) {
  if (!on) return <div className={className}>{children}</div>;
  const anim = { opacity: 1, y: 0, scale: 1 };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: -14, scale: 1.02 }}
      {...(inView
        ? { whileInView: anim, viewport: { once: true, amount: 0.3 } }
        : { animate: anim })}
      transition={{ duration: 0.7, delay, ease: INK }}
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

/** The stitched seam sews in from the reading edge (RTL-aware). */
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

/** Wax-seal press: lands oversized and slightly rotated → rest, no bounce. */
export function Stamp({ on, delay = 0, className, children }: StampProps) {
  if (!on) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={`inline-block ${className ?? ""}`}
      initial={{ opacity: 0, scale: 1.4, rotate: -8 }}
      whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, delay, ease: INK }}
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
