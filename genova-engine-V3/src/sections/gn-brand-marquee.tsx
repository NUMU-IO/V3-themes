/**
 * gn-brand-marquee — the manifesto band under the hero.
 *
 * A narrow strip carrying one sentence, repeated, moving horizontally, with an
 * optional small credit line beneath. In the reference this is the rhythm break
 * between the campaign hero and the commerce modules — it does no commercial
 * work, so it must stay quiet: no border by default, no colour, one type size.
 *
 * The loop uses two identical tracks translated by exactly -50% (the CSS lives
 * in theme.css as `.gn-marquee`). Restarting a single element instead produces
 * a visible jump at the seam, which is the one thing a marquee cannot do.
 */

import { asBool, asNumber, asString } from "@numueg/theme-kit";
import { useDirection } from "@numueg/theme-sdk";
import { cx, useMotionOn, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

/** Enough repeats to fill a 2560px viewport without a gap at any speed. */
const REPEATS = 4;

export default function GnBrandMarquee({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const direction = useDirection();
  const motionOn = useMotionOn();

  const statement =
    asString(s.statement) ||
    t(
      "marquee.statement",
      "Real denim. Real fits. Made for how you actually live in them.",
    );
  if (!statement) return null;

  const scheme = asString(s.color_scheme, "canvas");
  const size = asString(s.size, "md");
  const showCredit = asBool(s.show_credit, false);
  const credit = asString(s.credit_text);

  // RTL flips the visual reading direction, so a left-running ticker reads
  // backwards in Arabic; the CSS mirrors it and this keeps the setting honest.
  const configured = asString(s.direction, "left");
  const runDirection = direction === "rtl" ? (configured === "left" ? "right" : "left") : configured;

  return (
    <section
      className={cx("gn-statement", `is-${scheme}`, asBool(s.show_borders, false) && "has-borders")}
      style={{ paddingBlock: `${asNumber(s.padding_y, 18)}px` }}
      aria-label={t("marquee.label", "Brand statement")}
    >
      <div
        className="gn-marquee"
        data-paused={motionOn ? "false" : "true"}
        data-pause-on-hover={asBool(s.pause_on_hover, true) ? "true" : "false"}
        data-direction={runDirection}
      >
        {[0, 1].map((track) => (
          <div
            key={track}
            className="gn-marquee-track"
            style={{ animationDuration: `${asNumber(s.speed_seconds, 32)}s` }}
            // The duplicate exists only to close the loop visually — a screen
            // reader should hear the sentence once, not eight times.
            aria-hidden={track === 1 ? true : undefined}
          >
            {Array.from({ length: REPEATS }, (_, i) => (
              <span key={`${track}-${i}`} className={cx("gn-statement-text", `is-${size}`)}>
                {statement}
              </span>
            ))}
          </div>
        ))}
      </div>

      {showCredit && credit && <p className="gn-statement-credit gn-label">{credit}</p>}
    </section>
  );
}
