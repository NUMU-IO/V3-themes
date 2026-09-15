/**
 * pw-grading — how a used copy is graded, drawn.
 *
 * Buying a used book is a small leap of faith. Four grades, each with a line
 * drawing of the wear it allows, turn "used" from a risk into a promise the
 * shop is visibly keeping. The same scale appears on a used copy's book page
 * with that copy's grade marked.
 */

import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { GradingScale } from "../lib/condition";
import { IconArrow, SceneGrading } from "../lib/ornaments";

export default function PwGrading({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const ornaments = useOrnaments();
  const eyebrow = asString(s.eyebrow);
  const heading = asString(s.heading);
  const body = asString(s.body);
  const ctaText = asString(s.cta_text);

  return (
    <section className="pw-section">
      <div className="pw-grading">
        <div className="pw-grading-copy">
          {ornaments && <SceneGrading width={170} />}
          {eyebrow && <p className="pw-kicker">{eyebrow}</p>}
          {heading && <h2>{heading}</h2>}
          {body && <p className="pw-synopsis">{body}</p>}
          {ctaText && (
            <Link className="pw-viewall" to={asString(s.cta_link) || "/products"}>
              {ctaText}
              <IconArrow size={14} />
            </Link>
          )}
        </div>
        <GradingScale />
      </div>
    </section>
  );
}
