/**
 * ✦ gn-fit-guide — Genova's signature section. No Marce equivalent.
 *
 * "Will these fit me?" is the number-one reason a denim shopper doesn't buy, and
 * the number-one reason they return. This section answers it before checkout:
 * each cut explained (rise, leg, stretch, who it suits), a measurement table,
 * and a way to just ask a human.
 *
 * Two modes: `compact` for a homepage teaser, `full` for the /fit-guide page.
 * Everything is merchant-editable — there is no hardcoded sizing advice here,
 * because wrong measurements cause exactly the returns this is meant to prevent.
 */

import { Image, Link } from "@numueg/theme-sdk";
import { asBool, asImageAlt, asImageUrl, asString } from "@numueg/theme-kit";
import { cx, readBlockNodes, type SectionRenderProps } from "../lib/shared";
import { useT } from "../lib/i18n";
import { IconArrowRight, IconWhatsApp } from "../lib/icons";
import { Reveal } from "../lib/reveal";

export default function GnFitGuide({ instance }: SectionRenderProps) {
  const s = instance.settings ?? {};
  const t = useT();

  const fits = readBlockNodes(instance, "fit").map((node, i) => ({
    id: `fit-${i}`,
    name: asString(node.settings.name),
    image: asImageUrl(node.settings.image),
    alt: asImageAlt(node.settings.image, asString(node.settings.name)),
    rise: asString(node.settings.rise),
    leg: asString(node.settings.leg),
    stretch: asString(node.settings.stretch),
    bestFor: asString(node.settings.best_for),
    link: asString(node.settings.link),
  }));

  const rows = readBlockNodes(instance, "size_row").map((node, i) => ({
    id: `row-${i}`,
    size: asString(node.settings.size),
    waist: asString(node.settings.waist),
    hip: asString(node.settings.hip),
    inseam: asString(node.settings.inseam),
  }));

  if (fits.length === 0 && rows.length === 0) return null;

  const compact = asString(s.mode, "full") === "compact";
  const heading = asString(s.heading) || t("fit.heading", "Find your fit");
  const whatsapp = asString(s.whatsapp_number);

  return (
    <section className={cx("gn-fitguide", compact && "is-compact")}>
      <div className="gn-container gn-fitguide-head">
        {/* On /fit-guide this section IS the page, so it owns the <h1>. As a
            homepage teaser it is one section among many and must not compete
            with the hero's heading — otherwise the page ships two <h1>s or, as
            here originally, none at all. */}
        {compact ? (
          <h2 className="gn-section-heading">{heading}</h2>
        ) : (
          <h1 className="gn-page-title">{heading}</h1>
        )}
        {asString(s.intro) && <p className="gn-plp-desc">{asString(s.intro)}</p>}
      </div>

      {fits.length > 0 && (
        <div
          className="gn-container gn-fitguide-grid"
          style={{ ["--gn-grid-cols" as string]: String(Math.min(fits.length, compact ? 3 : 3)) }}
        >
          {fits.slice(0, compact ? 3 : fits.length).map((fit, fi) => (
            <Reveal key={fit.id} as="article" index={fi} className="gn-fitcard">
              <span className="gn-plate gn-fitcard-plate">
                {fit.image ? (
                  <Image
                    src={fit.image}
                    alt={fit.alt}
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    loading="lazy"
                  />
                ) : null}
              </span>
              <div className="gn-fitcard-body">
                <h3 className="gn-fitcard-name">{fit.name}</h3>
                {/* A flat dl, not row-wrappers: the grid pairs dt/dd itself and
                    a hairline on each cell's top edge gives one clean rule per
                    spec, so the three cards scan as a comparison table. */}
                <dl className="gn-fitcard-specs">
                  {fit.rise && (
                    <>
                      <dt className="gn-label">{t("fit.rise", "Rise")}</dt>
                      <dd>{fit.rise}</dd>
                    </>
                  )}
                  {fit.leg && (
                    <>
                      <dt className="gn-label">{t("fit.leg", "Leg")}</dt>
                      <dd>{fit.leg}</dd>
                    </>
                  )}
                  {fit.stretch && (
                    <>
                      <dt className="gn-label">{t("fit.stretch", "Stretch")}</dt>
                      <dd>{fit.stretch}</dd>
                    </>
                  )}
                </dl>
                {fit.bestFor && <p className="gn-fitcard-best">{fit.bestFor}</p>}
                {fit.link && (
                  <Link to={fit.link} className="gn-fitcard-cta">
                    {t("fit.shop_this", "Shop this fit")}
                    <IconArrowRight size={14} />
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {!compact && asBool(s.show_measure_table, true) && rows.length > 0 && (
        <div className="gn-container gn-fitguide-table">
          <h3 className="gn-section-heading">{t("fit.measurements", "Measurements")}</h3>
          <div className="gn-table-wrap">
            <table className="gn-table">
              <thead>
                <tr>
                  <th scope="col">{t("product.size", "Size")}</th>
                  <th scope="col">{t("fit.waist", "Waist")}</th>
                  <th scope="col">{t("fit.hip", "Hip")}</th>
                  <th scope="col">{t("fit.inseam", "Inseam")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.size}</th>
                    <td>{row.waist}</td>
                    <td>{row.hip}</td>
                    <td>{row.inseam}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {asString(s.model_note) && <p className="gn-pdp-return">{asString(s.model_note)}</p>}
        </div>
      )}

      {(whatsapp || compact) && (
        <div className="gn-container gn-fitguide-cta">
          {compact ? (
            <Link to={asString(s.full_guide_link, "/pages/fit-guide")} className="gn-btn gn-btn-outline">
              {t("fit.see_full", "See the full fit guide")}
            </Link>
          ) : (
            whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`}
                className="gn-btn gn-btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconWhatsApp size={18} />
                {asString(s.whatsapp_text) || t("fit.ask", "Not sure? Ask us")}
              </a>
            )
          )}
        </div>
      )}
    </section>
  );
}
