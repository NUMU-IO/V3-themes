/**
 * pw-not-found — the 404.
 *
 * Small, and worth the file: a theme that ships no `404` template hands the
 * shopper the platform's generic page with none of this theme's chrome on it,
 * which is the one moment a lost visitor most needs a way back into the shop.
 */

import { Link, useResolvedSettings } from "@numueg/theme-sdk";
import { asString, useOrnaments, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { BookStack } from "../lib/ornaments";

export default function PwNotFound({ instance }: SectionRenderProps) {
  const s = useResolvedSettings(instance);
  const t = useT();
  const ornaments = useOrnaments();

  return (
    <div className="pw-container" style={{ paddingBlock: "80px 100px" }}>
      <div className="pw-empty">
        {ornaments && (
          <span style={{ color: "var(--pw-ink-soft)" }}>
            <BookStack size={110} />
          </span>
        )}
        <h1
          style={{
            fontFamily: "var(--pw-font-heading)",
            fontWeight: 500,
            fontSize: "2.4rem",
            margin: 0,
          }}
        >
          {asString(s.heading) || t("notfound.title", "That shelf is empty")}
        </h1>
        <p className="pw-synopsis" style={{ textAlign: "center" }}>
          {asString(s.body) ||
            t(
              "notfound.body",
              "The page you were looking for is not here. It may have been moved, or the link may have a typo.",
            )}
        </p>
        <Link className="pw-btn pw-btn-primary" to={asString(s.cta_link) || "/products"}>
          {asString(s.cta_text) || t("notfound.cta", "Back to browsing")}
        </Link>
      </div>
    </div>
  );
}
