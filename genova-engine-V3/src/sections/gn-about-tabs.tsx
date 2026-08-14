/**
 * gn-about-tabs — "Built to standard" brand-story block.
 *
 * Split layout: image on one side, copy on the other, with two tabs that swap
 * BOTH. The reference's own note is the important constraint — "preserve the
 * section height to avoid abrupt shifts" — so the panels share one grid cell
 * and the taller of the two sets the height. Swapping tabs never moves the page.
 *
 * Two tabs, not N. It is a brand-story module, and a third tab is how it turns
 * into a specification table.
 */

import { useId, useState } from "react";
import { asImageAlt, asImageUrl, asString } from "@numueg/theme-kit";
import { cx, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";

export default function GnAboutTabs({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();
  const [active, setActive] = useState(0);
  const baseId = useId();

  const tabs = [1, 2]
    .map((n) => ({
      label: asString(s[`tab_${n}_label`]),
      body: asString(s[`tab_${n}_body`]),
      image: asImageUrl(s[`tab_${n}_image`]),
      alt: asImageAlt(s[`tab_${n}_image`], asString(s[`tab_${n}_label`])),
    }))
    .filter((tab) => tab.label || tab.body || tab.image);

  if (tabs.length === 0) return null;

  const current = tabs[Math.min(active, tabs.length - 1)];
  const heading = asString(s.heading) || t("about_tabs.heading", "Built to standard");

  return (
    <section className={cx("gn-abouttabs", `is-${asString(s.layout, "image-start")}`)}>
      <div className="gn-container gn-abouttabs-inner">
        <div className="gn-abouttabs-media">
          {/* All images stay mounted and stacked; only opacity changes. Mounting
              one at a time would re-request the image on every tab switch and
              collapse the cell to zero height mid-swap. */}
          <span className="gn-plate gn-abouttabs-plate">
            {tabs.map((tab, i) =>
              tab.image ? (
                <img
                  key={`img-${i}`}
                  src={tab.image}
                  alt={i === active ? tab.alt : ""}
                  aria-hidden={i === active ? undefined : true}
                  className={cx("gn-abouttabs-img", i === active && "is-active")}
                  loading="lazy"
                />
              ) : null,
            )}
          </span>
        </div>

        <div className="gn-abouttabs-copy">
          <h2 className="gn-section-heading">{heading}</h2>

          {tabs.length > 1 && (
            <div className="gn-abouttabs-tablist" role="tablist" aria-label={heading}>
              {tabs.map((tab, i) => (
                <button
                  key={`tab-${i}`}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${i}`}
                  aria-selected={i === active}
                  aria-controls={`${baseId}-panel-${i}`}
                  className={cx("gn-abouttabs-tab gn-label", i === active && "is-active")}
                  onClick={() => setActive(i)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div
            role="tabpanel"
            id={`${baseId}-panel-${active}`}
            aria-labelledby={`${baseId}-tab-${active}`}
            className="gn-abouttabs-panel"
          >
            <p className="gn-abouttabs-body">{current.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
