/**
 * pw-request — "Looking for a specific book?"
 *
 * A short band with a button that opens the request form. The form itself is
 * the theme-wide dialog in lib/request-form.tsx, so this section, the search
 * page and any `#request-book` link all open the same thing.
 */

import { useResolvedSettings } from "@numueg/theme-sdk";
import { asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { openRequestForm } from "../lib/request-form";
import { IconArrow, SceneSearch } from "../lib/ornaments";

export default function PwRequest({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();

  return (
    <section className="pw-section">
      <div className="pw-request-band">
        {ornaments && <SceneSearch width={200} />}
        <div className="pw-request-copy">
          {asString(s.eyebrow) && <p className="pw-kicker">{asString(s.eyebrow)}</p>}
          <h2>{asString(s.heading) || t("request.title", "Looking for a specific book?")}</h2>
          <p className="pw-synopsis">
            {asString(s.body) ||
              t(
                "request.band_body",
                "Can't find the edition you want? Send us the ISBN-13 and we'll find it and quote you a price.",
              )}
          </p>
        </div>
        <button type="button" className="pw-btn pw-btn-primary" onClick={openRequestForm}>
          {asString(s.button) || t("request.button", "Request a book")}
          <IconArrow />
        </button>
      </div>
    </section>
  );
}
